"""A static audit for prompt-cache invalidators (lesson 44).

Caching is a prefix match over ``tools`` -> ``system`` -> ``messages``. Most
"why is my hit rate zero" bugs are a value in that prefix that changes between
requests. This checks for the usual suspects without spending a request.

It is a heuristic, not a proof: the authoritative check is
``usage.cache_read_input_tokens`` across two real requests.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (
        re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}"),
        "an ISO timestamp - changes every request",
    ),
    (
        re.compile(
            r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b",
            re.IGNORECASE,
        ),
        "a UUID - changes every request",
    ),
    (re.compile(r"\b\d{13}\b"), "what looks like an epoch-millisecond timestamp"),
    (
        re.compile(r"request[_-]?id", re.IGNORECASE),
        "a request id in the cacheable prefix",
    ),
]


@dataclass(frozen=True)
class CacheFinding:
    where: str
    problem: str


def audit_prefix(
    tools: list[dict[str, Any]] | None = None,
    system: str | None = None,
    stable_messages: list[str] | None = None,
) -> list[CacheFinding]:
    """Scan the parts of a request that form the cacheable prefix.

    Only messages BEFORE the last breakpoint are part of the stable prefix.
    """
    findings: list[CacheFinding] = []

    def scan(where: str, text: str) -> None:
        for pattern, problem in _PATTERNS:
            if pattern.search(text):
                findings.append(CacheFinding(where, problem))

    if system:
        scan("system", system)
    for index, text in enumerate(stable_messages or []):
        scan(f"messages[{index}]", text)

    if tools:
        names = [tool["name"] for tool in tools]
        if names != sorted(names):
            findings.append(
                CacheFinding(
                    "tools",
                    "tool order is not deterministic - if this list is built from "
                    "a set or dict, the order can vary between processes and "
                    "invalidate the cache",
                )
            )

    return findings


def likely_below_minimum(text: str, minimum_tokens: int = 1024) -> bool:
    """Is a prefix long enough to cache at all?

    The minimum is model-dependent (roughly 1024-4096 tokens). Below it nothing
    caches and nothing warns you. This uses a rough 4-chars-per-token estimate;
    ``count_tokens`` is the accurate check and it is free.
    """
    return len(text) / 4 < minimum_tokens
