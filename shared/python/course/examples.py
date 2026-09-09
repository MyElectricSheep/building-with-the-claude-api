"""Few-shot examples for the triage task (lesson 19).

Four pairs, chosen to be diverse rather than representative: each one covers a
case the terse prompt gets wrong. Examples earn their tokens on the edge cases,
not on the easy ones.
"""

from __future__ import annotations

import json
from typing import Any

SHOTS: list[dict[str, Any]] = [
    {
        # "URGENT" shouted about something with no deadline.
        "email": (
            "URGENT!! Please add a dark theme, my eyes are dying. Whenever though."
        ),
        "label": {"category": "feedback", "urgency": "low", "has_order_id": False},
    },
    {
        # The bare word "order" with no identifier.
        "email": "I placed an order on Monday, roughly when does it ship? No hurry.",
        "label": {"category": "shipping", "urgency": "low", "has_order_id": False},
    },
    {
        # A real identifier, and work is blocked.
        "email": "Checkout 500s every time on order #QT-4471. Our whole team is stuck.",
        "label": {"category": "bug", "urgency": "high", "has_order_id": True},
    },
    {
        # Routine account work, no drama.
        "email": "How do I move my subscription to a different email address?",
        "label": {"category": "account", "urgency": "medium", "has_order_id": False},
    },
]


def render_shots(shots: list[dict[str, Any]] | None = None) -> str:
    """Render the shots as tagged example pairs."""
    blocks = "\n".join(
        f"<example>\n<email>{shot['email']}</email>\n"
        f"<labels>{json.dumps(shot['label'])}</labels>\n</example>"
        for shot in (shots if shots is not None else SHOTS)
    )
    return f"<examples>\n{blocks}\n</examples>"
