import Anthropic from "@anthropic-ai/sdk";
import { requireEnv } from "./config.ts";

/**
 * Build an Anthropic client.
 *
 * `new Anthropic()` already resolves ANTHROPIC_API_KEY from the environment;
 * we call requireEnv first only so a missing key produces a readable message
 * at startup rather than a 401 halfway through a lesson.
 */
export function createClient(): Anthropic {
  requireEnv("ANTHROPIC_API_KEY");
  return new Anthropic();
}
