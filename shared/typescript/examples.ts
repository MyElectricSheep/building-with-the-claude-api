/**
 * Few-shot examples for the triage task (lesson 19).
 *
 * Four pairs, chosen to be diverse rather than representative: each one covers
 * a case the terse prompt gets wrong. Examples earn their tokens on the edge
 * cases, not on the easy ones.
 */
export interface Shot {
  email: string;
  label: { category: string; urgency: string; has_order_id: boolean };
}

export const SHOTS: Shot[] = [
  {
    // "URGENT" shouted about something with no deadline.
    email: "URGENT!! Please add a dark theme, my eyes are dying. Whenever though.",
    label: { category: "feedback", urgency: "low", has_order_id: false },
  },
  {
    // The bare word "order" with no identifier.
    email: "I placed an order on Monday, roughly when does it ship? No hurry.",
    label: { category: "shipping", urgency: "low", has_order_id: false },
  },
  {
    // A real identifier, and work is blocked.
    email: "Checkout 500s every time on order #QT-4471. Our whole team is stuck.",
    label: { category: "bug", urgency: "high", has_order_id: true },
  },
  {
    // Routine account work, no drama.
    email: "How do I move my subscription to a different email address?",
    label: { category: "account", urgency: "medium", has_order_id: false },
  },
];

/** Render the shots as tagged example pairs. */
export function renderShots(shots: readonly Shot[] = SHOTS): string {
  const blocks = shots
    .map(
      (shot) =>
        `<example>\n<email>${shot.email}</email>\n` +
        `<labels>${JSON.stringify(shot.label)}</labels>\n</example>`,
    )
    .join("\n");
  return `<examples>\n${blocks}\n</examples>`;
}
