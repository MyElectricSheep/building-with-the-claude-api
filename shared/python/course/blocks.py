"""Content-block helpers.

The single most important 2026 correction to the Academy course: a Claude
response is a *list of typed blocks*, not "text at index 0". Current models run
adaptive thinking by default, so ``response.content[0]`` is frequently a
``thinking`` block and ``response.content[1]`` is not reliably the tool call.

Every helper here dispatches on ``block.type``. None of them index by position.

Docs: https://platform.claude.com/docs/en/build-with-claude/working-with-messages
"""

from __future__ import annotations

import json
from typing import Any


def text_of(message: Any) -> str:
    """Concatenate every ``text`` block. Returns "" when the turn produced none."""
    return "".join(block.text for block in message.content if block.type == "text")


def tool_uses(message: Any) -> list[Any]:
    """Every ``tool_use`` block in the turn, in order. May be empty."""
    return [block for block in message.content if block.type == "tool_use"]


def thinking_of(message: Any) -> list[str]:
    """Thinking summaries, when ``thinking.display`` is set to ``"summarized"``."""
    return [
        block.thinking
        for block in message.content
        if block.type == "thinking" and block.thinking
    ]


def block_types(message: Any) -> list[str]:
    """A compact ``type`` census, useful for showing what actually came back."""
    return [block.type for block in message.content]


def parse_structured(message: Any) -> Any:
    """Parse a structured-output response.

    With ``output_config.format`` the model is constrained to emit JSON matching
    the schema, but you still have to defend against a non-``end_turn`` stop: a
    refusal or a ``max_tokens`` truncation yields text that will not parse.
    """
    if message.stop_reason == "refusal":
        category = getattr(message.stop_details, "category", None)
        suffix = f" ({category})" if category else ""
        raise RuntimeError(f"Model refused the request{suffix}")
    if message.stop_reason != "end_turn":
        raise RuntimeError(
            f"Response did not complete (stop_reason: {message.stop_reason}); "
            "raise max_tokens or shorten the request before parsing JSON."
        )
    return json.loads(text_of(message))


def append_assistant_turn(messages: list[dict[str, Any]], message: Any) -> None:
    """Append an assistant turn to a conversation, preserving every block.

    Do not collapse the turn to its text: thinking blocks and tool_use blocks
    must be echoed back verbatim or the next request loses the model's state.
    """
    messages.append({"role": "assistant", "content": message.content})


def format_usage(usage: Any) -> str:
    """Pretty-print token usage, including the cache counters."""
    parts = [f"{usage.input_tokens} in", f"{usage.output_tokens} out"]
    if getattr(usage, "cache_creation_input_tokens", None):
        parts.append(f"{usage.cache_creation_input_tokens} cache write")
    if getattr(usage, "cache_read_input_tokens", None):
        parts.append(f"{usage.cache_read_input_tokens} cache read")
    return ", ".join(parts)
