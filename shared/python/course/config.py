"""Central model + environment configuration for every lesson.

The Academy course hardcodes ``claude-sonnet-4-5`` in almost every notebook.
No lesson file in this repository hardcodes a model: they import from here so
a single change re-points the whole course.

Docs: https://platform.claude.com/docs/en/about-claude/models/overview
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# Load the repository-root .env once, on import, without overriding anything
# already exported in the shell.
_REPO_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(_REPO_ROOT / ".env", override=False)

#: Default model for lessons. ``claude-sonnet-5`` is the current-generation
#: successor to the course's ``claude-sonnet-4-5``. Override with CLAUDE_MODEL.
MODEL = os.environ.get("CLAUDE_MODEL", "claude-sonnet-5")

#: Cheaper, faster model for bulk work where the lesson teaches a mechanism
#: rather than answer quality: dataset generation, classification, routing.
FAST_MODEL = os.environ.get("CLAUDE_FAST_MODEL", "claude-haiku-4-5")

#: Voyage AI embedding model for the RAG lessons (32-38). The course uses
#: ``voyage-3-large``; Voyage 4 is the current generation.
#: Docs: https://platform.claude.com/docs/en/build-with-claude/embeddings
EMBEDDING_MODEL = os.environ.get("VOYAGE_MODEL", "voyage-4-lite")

#: Conservative default output cap. Lessons that need more raise it explicitly.
MAX_TOKENS = int(os.environ.get("CLAUDE_MAX_TOKENS", "1024"))

#: Repository root, for lessons that read files from ``assets/``.
REPO_ROOT = _REPO_ROOT


def require_env(name: str) -> str:
    """Return an environment variable, or fail with an actionable message."""
    value = os.environ.get(name)
    if not value:
        raise SystemExit(
            f"Missing {name}.\n"
            f"Copy .env.example to .env and fill it in, then re-run with:\n"
            f"  uv run lesson <number>"
        )
    return value


def create_client():  # noqa: ANN201 - anthropic is an optional import cost
    """Build an Anthropic client.

    ``Anthropic()`` already resolves ANTHROPIC_API_KEY from the environment;
    ``require_env`` runs first only so a missing key produces a readable
    message at startup instead of a 401 partway through a lesson.
    """
    import anthropic

    require_env("ANTHROPIC_API_KEY")
    return anthropic.Anthropic()
