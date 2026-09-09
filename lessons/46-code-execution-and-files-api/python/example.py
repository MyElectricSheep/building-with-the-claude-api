"""Lesson 46 - Code execution and the Files API.

Current tool version, correct result-block parsing, safe file download, and
container reuse.

    uv run lesson 46
"""

from __future__ import annotations

import os

from course.blocks import block_types, text_of
from course.config import MODEL, REPO_ROOT, create_client

CSV_PATH = REPO_ROOT / "assets" / "data" / "deploys.csv"
OUTPUT_DIR = REPO_ROOT / "outputs" / "lesson-46"

# Current latest. 20250522 is the legacy Python-only version; 20260120 is still
# current if you want programmatic tool calling.
CODE_EXECUTION = {"type": "code_execution_20260521", "name": "code_execution"}


def describe_results(response) -> None:  # noqa: ANN001
    """Walk the response with the CURRENT block types.

    A bare `code_execution_output` block is not what current versions return.
    """
    for block in response.content:
        if block.type == "server_tool_use":
            print(f"  [running] {block.name}")
        elif block.type == "bash_code_execution_tool_result":
            result = block.content
            # An error arrives as content being an error object, not a result.
            if result.type != "bash_code_execution_result":
                print(f"  [tool error] {getattr(result, 'error_code', result.type)}")
                continue
            print(f"  [exit {result.return_code}]")
            if result.stdout:
                for line in result.stdout.rstrip().split("\n")[:12]:
                    print(f"    {line}")
            if result.stderr:
                print(f"    stderr: {result.stderr.rstrip()[:200]}")
        elif block.type == "text_editor_code_execution_tool_result":
            print(f"  [file op] {block.content}")


def download_outputs(client, response) -> None:  # noqa: ANN001
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for block in response.content:
        if block.type != "bash_code_execution_tool_result":
            continue
        result = block.content
        if result.type != "bash_code_execution_result" or not result.content:
            continue
        for reference in result.content:
            if reference.type != "bash_code_execution_output":
                continue
            metadata = client.files.retrieve_metadata(reference.file_id)
            # The filename comes from the sandbox. Sanitise it before writing:
            # otherwise a generated name is a path traversal in YOUR process.
            safe_name = os.path.basename(metadata.filename)
            if not safe_name or safe_name in (".", ".."):
                print(f"  [skipped] unsafe filename {metadata.filename!r}")
                continue
            content = client.files.download(reference.file_id)
            destination = OUTPUT_DIR / safe_name
            content.write_to_file(str(destination))
            print(f"  [saved] {destination.relative_to(REPO_ROOT)}")


def main() -> None:
    client = create_client()

    # Upload the input. Note the block type below: container_upload, NOT document.
    with CSV_PATH.open("rb") as handle:
        uploaded = client.files.upload(file=(CSV_PATH.name, handle, "text/csv"))
    print(f"uploaded {CSV_PATH.name} as {uploaded.id}\n")

    print("=== request 1: analyse and chart ===")
    first = client.messages.create(
        model=MODEL,
        max_tokens=8000,
        tools=[CODE_EXECUTION],
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            "Load this CSV. Report the trend in deploys per week "
                            "and the rollback rate, then save a single PNG chart "
                            "of deploys and rollbacks over time."
                        ),
                    },
                    {"type": "container_upload", "file_id": uploaded.id},
                ],
            }
        ],
    )
    print(f"blocks: {block_types(first)}")
    describe_results(first)
    download_outputs(client, first)
    print(f"\n{text_of(first).strip()[:500]}\n")

    # Containers persist. Reuse the id and the REPL state is still there.
    container_id = first.container.id if first.container else None
    if container_id:
        print(f"=== request 2: reusing container {container_id} ===")
        second = client.messages.create(
            container=container_id,
            model=MODEL,
            max_tokens=4000,
            tools=[CODE_EXECUTION],
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Using the dataframe you already loaded, what was the "
                        "worst week by rollback rate?"
                    ),
                }
            ],
        )
        describe_results(second)
        print(f"\n{text_of(second).strip()[:300]}")

    client.files.delete(uploaded.id)
    print(f"\ncleaned up {uploaded.id}")
    print(
        "\nNote what changed from the Academy version: the tool type, and the\n"
        "result block types. Copying its `if block.type == 'code_execution_output'`\n"
        "check into current code silently matches nothing."
    )


if __name__ == "__main__":
    main()
