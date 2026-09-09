"""Shared helpers for the *Building with the Claude API* companion repository.

Lessons import from here so that model IDs, block handling and retrieval
primitives live in exactly one place - the mirror of `shared/typescript/`.
"""

from course.blocks import (
    append_assistant_turn,
    block_types,
    format_usage,
    parse_structured,
    text_of,
    thinking_of,
    tool_uses,
)
from course.config import (
    EMBEDDING_MODEL,
    FAST_MODEL,
    MAX_TOKENS,
    MODEL,
    create_client,
    require_env,
)

__all__ = [
    "EMBEDDING_MODEL",
    "FAST_MODEL",
    "MAX_TOKENS",
    "MODEL",
    "append_assistant_turn",
    "block_types",
    "create_client",
    "format_usage",
    "parse_structured",
    "require_env",
    "text_of",
    "thinking_of",
    "tool_uses",
]
