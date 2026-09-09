/**
 * The workflow-vs-agent decision, as a function (lesson 67).
 *
 * Pure and unit tested. The point is that "should this be an agent?" has an
 * answer you can defend, not a vibe - and that the answer is usually "no".
 */
export type Tier = "single-call" | "workflow" | "agent" | "hosted-agent";

export interface TaskShape {
  /** Can you write the steps down in advance? */
  stepsAreKnowable: boolean;
  /** Does it need more than one model call at all? */
  needsMultipleSteps: boolean;
  /** Does the outcome justify 5-20x the tokens and latency of a workflow? */
  outcomeJustifiesCost: boolean;
  /** Have you MEASURED that the model can do this task? (lesson 9-15) */
  measuredViable: boolean;
  /** Can a mistake be caught and undone? */
  errorsAreRecoverable: boolean;
  /** Long-running, scheduled, or needing a hosted sandbox? */
  needsHostedRuntime: boolean;
}

export interface Recommendation {
  tier: Tier;
  reason: string;
  /** Checks that failed, in the order they were evaluated. */
  failed: string[];
}

export function recommendTier(shape: TaskShape): Recommendation {
  const failed: string[] = [];

  if (!shape.needsMultipleSteps) {
    return {
      tier: "single-call",
      reason: "One model call answers it. Anything more is machinery you own for free.",
      failed,
    };
  }

  if (shape.stepsAreKnowable) {
    return {
      tier: "workflow",
      reason:
        "The sequence is knowable, so it is testable, predictable and cheaper. " +
        "Chain, route, parallelize, or evaluate-and-optimize.",
      failed,
    };
  }

  // From here the sequence is genuinely unknown - an agent is on the table.
  // Every remaining check is a reason to drop back down anyway.
  if (!shape.outcomeJustifiesCost) failed.push("value");
  if (!shape.measuredViable) failed.push("viability");
  if (!shape.errorsAreRecoverable) failed.push("cost of error");

  if (failed.length > 0) {
    const why: Record<string, string> = {
      value: "the outcome does not justify an agent's cost and latency",
      viability: "you have not measured that the model can do this task",
      "cost of error": "a mistake would not be catchable or reversible",
    };
    return {
      tier: "workflow",
      reason:
        "The sequence is unknown, but " +
        failed.map((name) => why[name]).join("; ") +
        ". Constrain it into a workflow, even an imperfect one.",
      failed,
    };
  }

  if (shape.needsHostedRuntime) {
    return {
      tier: "hosted-agent",
      reason:
        "All four checks pass, and it is long-running, scheduled, or needs a " +
        "hosted sandbox. Managed Agents supplies the loop and the deployment.",
      failed,
    };
  }

  return {
    tier: "agent",
    reason:
      "All four checks pass and you can host it. A manual loop or the SDK tool " +
      "runner, on your own infrastructure.",
    failed,
  };
}
