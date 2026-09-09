/**
 * Voyage AI embeddings for the RAG lessons (34-38).
 *
 * Anthropic does not ship an embedding model; the documentation points at
 * Voyage AI. Voyage has no official TypeScript SDK, so this is a small typed
 * wrapper over the REST API - which is the correct shape for a TS project, not
 * a workaround.
 *
 * Two corrections to the Academy version, both from current documentation:
 *
 *   1. `voyage-3-large` is previous-generation. Voyage 4 is current.
 *   2. `input_type` is NOT optional and NOT the same for both sides of a
 *      retrieval task: chunks are "document", searches are "query". The course
 *      helper defaults everything to one value, which quietly degrades recall.
 */
import { EMBEDDING_MODEL, requireEnv } from "./config.ts";

const ENDPOINT = "https://api.voyageai.com/v1/embeddings";

export type InputType = "document" | "query";

interface VoyageResponse {
  data: { embedding: number[]; index: number }[];
  model: string;
  usage: { total_tokens: number };
}

export interface EmbedResult {
  embeddings: number[][];
  model: string;
  totalTokens: number;
}

/**
 * Embed a batch of texts.
 *
 * Batch. The Academy's implementation embeds chunks one at a time, which is
 * both slower and more expensive in request overhead for no benefit.
 */
export async function embed(
  texts: readonly string[],
  inputType: InputType,
  model: string = EMBEDDING_MODEL,
): Promise<EmbedResult> {
  if (texts.length === 0) {
    return { embeddings: [], model, totalTokens: 0 };
  }
  const apiKey = requireEnv("VOYAGE_API_KEY");

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ input: texts, model, input_type: inputType }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Voyage ${response.status} ${response.statusText}: ${body}`);
  }

  const payload = (await response.json()) as VoyageResponse;
  // The API does not promise ordering. Sort by index before returning.
  const ordered = [...payload.data].sort((a, b) => a.index - b.index);
  return {
    embeddings: ordered.map((entry) => entry.embedding),
    model: payload.model,
    totalTokens: payload.usage.total_tokens,
  };
}

/** Embed one document chunk. Prefer `embed` for a batch. */
export async function embedDocument(text: string, model?: string): Promise<number[]> {
  const { embeddings } = await embed([text], "document", model);
  return embeddings[0]!;
}

/** Embed a search query. Note the input type - this is the lesson-34 trap. */
export async function embedQuery(text: string, model?: string): Promise<number[]> {
  const { embeddings } = await embed([text], "query", model);
  return embeddings[0]!;
}

// ---------------------------------------------------------------------------
// Reranking (lesson 38)
// ---------------------------------------------------------------------------

const RERANK_ENDPOINT = "https://api.voyageai.com/v1/rerank";

export interface RerankHit {
  index: number;
  relevanceScore: number;
}

/**
 * Rerank candidates against a query with a cross-encoder.
 *
 * A reranker reads the query and each document *together*, so it is much more
 * accurate than comparing two independently-computed vectors - and much too
 * slow to run over a whole corpus. Retrieve cheaply, then rerank the shortlist.
 */
export async function rerank(
  query: string,
  documents: readonly string[],
  topK = 5,
  model = "rerank-2.5-lite",
): Promise<RerankHit[]> {
  if (documents.length === 0) return [];
  const apiKey = requireEnv("VOYAGE_API_KEY");

  const response = await fetch(RERANK_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      documents,
      model,
      top_k: Math.min(topK, documents.length),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Voyage rerank ${response.status}: ${body}`);
  }

  const payload = (await response.json()) as {
    data: { index: number; relevance_score: number }[];
  };
  return payload.data.map((entry) => ({
    index: entry.index,
    relevanceScore: entry.relevance_score,
  }));
}
