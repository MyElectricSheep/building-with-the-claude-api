/**
 * Validation for generated eval cases (lesson 11). Pure - unit tested.
 *
 * A model generating its own test data will produce duplicates, labels outside
 * the enum, and emails that contradict their own labels. Catch what code can
 * catch; a human still reviews the rest.
 */
import { CATEGORIES, URGENCIES } from "./triage.ts";

export interface GeneratedCase {
  id: string;
  input: string;
  expected: {
    category: string;
    urgency: string;
    has_order_id: boolean;
  };
  reviewed?: boolean;
}

export interface ValidationIssue {
  id: string;
  problem: string;
}

/** An order identifier: a token with a digit, introduced by # or the word "order". */
export const ORDER_ID_PATTERN = /(?:#|\border\s+#?)([A-Za-z]*-?\d[\w-]*)/i;

export function validateCases(cases: readonly GeneratedCase[]): {
  accepted: GeneratedCase[];
  issues: ValidationIssue[];
} {
  const accepted: GeneratedCase[] = [];
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();

  for (const candidate of cases) {
    const problems: string[] = [];

    if (!candidate.id) problems.push("missing id");
    else if (seen.has(candidate.id)) problems.push("duplicate id");

    if (!candidate.input || candidate.input.trim().length < 20) {
      problems.push("email too short to be a realistic case");
    }
    if (!CATEGORIES.includes(candidate.expected?.category as never)) {
      problems.push(`category "${candidate.expected?.category}" not in the enum`);
    }
    if (!URGENCIES.includes(candidate.expected?.urgency as never)) {
      problems.push(`urgency "${candidate.expected?.urgency}" not in the enum`);
    }

    // The label must agree with the text. This is the check that actually
    // catches bad generated data.
    const looksLikeItHasAnId = ORDER_ID_PATTERN.test(candidate.input ?? "");
    if (
      typeof candidate.expected?.has_order_id === "boolean" &&
      candidate.expected.has_order_id !== looksLikeItHasAnId
    ) {
      problems.push(
        `has_order_id=${candidate.expected.has_order_id} contradicts the email text`,
      );
    }

    if (problems.length > 0) {
      issues.push({ id: candidate.id || "(no id)", problem: problems.join("; ") });
      continue;
    }
    seen.add(candidate.id);
    accepted.push({ ...candidate, reviewed: false });
  }

  return { accepted, issues };
}
