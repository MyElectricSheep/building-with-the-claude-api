"""Lesson 2 - Getting an API key.

A credential doctor. Reports what is configured without ever printing a secret.

    uv run lesson 02
"""

from __future__ import annotations

import os

from course.config import EMBEDDING_MODEL, FAST_MODEL, MODEL


def mask(value: str) -> str:
    """Show enough to identify a key, never enough to use it."""
    if len(value) <= 12:
        return "*" * len(value)
    return f"{value[:8]}...{value[-4:]}"


def report(name: str, needed_by: str) -> bool:
    value = os.environ.get(name)
    if value:
        print(f"  [ok]      {name:<20} {mask(value)}")
        return True
    print(f"  [missing] {name:<20} needed by {needed_by}")
    return False


def main() -> None:
    print("Credentials")
    has_anthropic = report("ANTHROPIC_API_KEY", "almost every lesson")
    report("VOYAGE_API_KEY", "lessons 34, 36, 38")

    print("\nModel configuration")
    print(f"  CLAUDE_MODEL       {MODEL}")
    print(f"  CLAUDE_FAST_MODEL  {FAST_MODEL}")
    print(f"  VOYAGE_MODEL       {EMBEDDING_MODEL}")

    print("\nConnectivity")
    if not has_anthropic:
        print("  skipped - no ANTHROPIC_API_KEY. Copy .env.example to .env.")
        print("  (An `ant auth login` profile also works; run `ant auth status`.)")
        return

    import anthropic

    try:
        client = anthropic.Anthropic()
        model = client.models.retrieve(MODEL)
        print(f"  [ok]      reached the API; {model.id} is available")
    except anthropic.AuthenticationError:
        print("  [fail]    the key was rejected (401). Check it in the Console.")
    except anthropic.NotFoundError:
        print(f"  [fail]    {MODEL} not found for this key. Set CLAUDE_MODEL in .env.")
    except anthropic.APIConnectionError as error:
        print(f"  [fail]    could not reach the API: {error}")


if __name__ == "__main__":
    main()
