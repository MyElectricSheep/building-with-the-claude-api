/**
 * A static audit for prompt-cache invalidators (lesson 44).
 *
 * Caching is a prefix match over `tools` -> `system` -> `messages`. Most
 * "why is my hit rate zero" bugs are a value in that prefix that changes
 * between requests. This checks for the usual suspects without spending a
 * request.
 *
 * It is a heuristic, not a proof: the authoritative check is
 * `usage.cache_read_input_tokens` across two real requests.
 */
export interface CacheFinding {
  where: string;
  problem: string;
}

const PATTERNS: { pattern: RegExp; problem: string }[] = [
  {
    pattern: /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    problem: "an ISO timestamp - changes every request",
  },
  {
    pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i,
    problem: "a UUID - changes every request",
  },
  {
    pattern: /\b\d{13}\b/,
    problem: "what looks like an epoch-millisecond timestamp",
  },
  {
    pattern: /\brequest[_-]?id\b/i,
    problem: "a request id in the cacheable prefix",
  },
];

/** Scan the parts of a request that form the cacheable prefix. */
export function auditPrefix(parts: {
  tools?: readonly { name: string }[];
  system?: string;
  /** Only messages BEFORE the last breakpoint are part of the stable prefix. */
  stableMessages?: readonly string[];
}): CacheFinding[] {
  const findings: CacheFinding[] = [];

  const scan = (where: string, text: string) => {
    for (const { pattern, problem } of PATTERNS) {
      if (pattern.test(text)) findings.push({ where, problem });
    }
  };

  if (parts.system) scan("system", parts.system);
  parts.stableMessages?.forEach((text, index) => scan(`messages[${index}]`, text));

  if (parts.tools) {
    const names = parts.tools.map((tool) => tool.name);
    const sorted = [...names].sort();
    if (JSON.stringify(names) !== JSON.stringify(sorted)) {
      findings.push({
        where: "tools",
        problem:
          "tool order is not deterministic - if this list is built from a Set " +
          "or object, the order can vary between processes and invalidate the cache",
      });
    }
  }

  return findings;
}

/**
 * Is a prefix long enough to cache at all?
 *
 * The minimum is model-dependent (roughly 1024-4096 tokens). Below it nothing
 * caches and nothing warns you. This uses a rough 4-chars-per-token estimate;
 * `count_tokens` is the accurate check and it is free.
 */
export function likelyBelowMinimum(text: string, minimumTokens = 1024): boolean {
  return text.length / 4 < minimumTokens;
}
