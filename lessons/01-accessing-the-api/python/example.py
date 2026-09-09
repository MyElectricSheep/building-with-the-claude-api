"""Lesson 1 - Accessing the API.

Verify access without spending output tokens: list the models the key can reach.

    uv run lesson 01
"""

from course.config import FAST_MODEL, MODEL, create_client


def is_available(configured: str, available: list[str]) -> bool:
    """Does a configured model id match a listed one?

    The Models API returns a dated id for some models
    (``claude-haiku-4-5-20251001``) while the documented id you write in code is
    undated (``claude-haiku-4-5``). Both work - the undated form resolves to the
    dated one - so an exact-match check reports a working model as missing.
    """
    return any(
        listed == configured or listed.startswith(f"{configured}-")
        for listed in available
    )


def main() -> None:
    client = create_client()

    print(f"{'model id':<28} {'context':>10} {'max output':>11}  display name")
    print("-" * 78)

    available: list[str] = []
    # The SDK auto-paginates: iterate the pager, don't index into `.data`.
    for model in client.models.list():
        available.append(model.id)
        context = getattr(model, "max_input_tokens", None)
        output = getattr(model, "max_tokens", None)
        print(
            f"{model.id:<28} "
            f"{(f'{context:,}' if context else '-'):>10} "
            f"{(f'{output:,}' if output else '-'):>11}  "
            f"{model.display_name}"
        )

    print()
    for variable, configured in (
        ("CLAUDE_MODEL", MODEL),
        ("CLAUDE_FAST_MODEL", FAST_MODEL),
    ):
        if is_available(configured, available):
            print(f"{variable}={configured} is available to this key.")
        else:
            print(
                f"{variable}={configured} was NOT listed for this key. "
                f"Pick one of the ids above and set {variable} in .env."
            )


if __name__ == "__main__":
    main()
