"""Lesson 1 - Accessing the API.

Verify access without spending output tokens: list the models the key can reach.

    uv run lesson 01
"""

from course.config import MODEL, create_client


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
    if MODEL in available:
        print(f"CLAUDE_MODEL={MODEL} is available to this key.")
    else:
        print(
            f"CLAUDE_MODEL={MODEL} was NOT listed for this key.\n"
            "Pick one of the ids above and set CLAUDE_MODEL in .env."
        )


if __name__ == "__main__":
    main()
