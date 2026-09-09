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
    // A missing environment variable is a setup instruction, not a crash, so
    // print it and exit rather than dumping a stack trace at someone who has
    // simply not filled in .env yet. This mirrors Python's SystemExit.
    process.stderr.write(
      `Missing ${name}.\n` +
        `Copy .env.example to .env and fill it in, then re-run with:\n` +
        `  npm run lesson -- <number>\n` +
        `(the lesson runner loads .env automatically)\n`,
    );
    process.exit(1);
  }
  return value;
}

/**
 * Does a model accept `output_config.effort`?
 *
 * Effort is not universal. Claude Haiku 4.5 rejects it with
 * `400 This model does not support the effort parameter.` - verified live.
 * It is accepted on Sonnet 4.6, Sonnet 5, Opus 4.6+ and the Fable family.
 *
 * This matters most when routing (lesson 64), where the whole point is that
 * different branches use different models.
 */
export function supportsEffort(model: string): boolean {
  return !/^claude-haiku-/.test(model) && !/^claude-sonnet-4-5/.test(model);
}
