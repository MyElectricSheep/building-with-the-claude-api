/**
 * Central model + environment configuration for every lesson.
 *
 * The Academy course hardcodes `claude-sonnet-4-5` in almost every notebook.
 * This repository never hardcodes a model in a lesson file: lessons import
 * from here so that a single change re-points the whole course.
 *
 * Docs: https://platform.claude.com/docs/en/about-claude/models/overview
 */

/**
 * Default model for lessons.
 *
 * `claude-sonnet-5` is the current-generation successor to the course's
 * `claude-sonnet-4-5`, and is the modernization target used throughout the
 * repository README. Override with the CLAUDE_MODEL environment variable.
 */
export const MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-5";

/**
 * A cheaper, faster model for bulk work where the lesson is about the
 * *mechanism* rather than answer quality: generating eval datasets,
 * classification, routing, and fan-out workers.
 */
export const FAST_MODEL = process.env.CLAUDE_FAST_MODEL ?? "claude-haiku-4-5";

/**
 * Voyage AI embedding model for the RAG lessons (32-38).
 * The course uses `voyage-3-large`; Voyage 4 is the current generation.
 * Docs: https://platform.claude.com/docs/en/build-with-claude/embeddings
 */
export const EMBEDDING_MODEL = process.env.VOYAGE_MODEL ?? "voyage-4-lite";

/**
 * Conservative default output cap. Lessons that legitimately need more
 * (thinking, code execution, long generation) raise it explicitly and stream.
 */
export const MAX_TOKENS = Number(process.env.CLAUDE_MAX_TOKENS ?? 1024);

/**
 * Read a required environment variable, failing with an actionable message
 * instead of an opaque 401 from the API.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}.\n` +
        `Copy .env.example to .env and fill it in, then re-run with:\n` +
        `  npm run lesson -- <number>\n` +
        `(the lesson runner loads .env automatically)`,
    );
  }
  return value;
}
