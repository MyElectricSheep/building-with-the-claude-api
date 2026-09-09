"""Lesson 40 - Image support.

Three source types, the token cost of each, and the patch formula checked
against count_tokens.

    uv run lesson 40
    uv run lesson 40 -- --image assets/images/sat1.png
"""

from __future__ import annotations

import argparse
import base64
import math
import struct

from course.blocks import text_of
from course.config import MODEL, REPO_ROOT, create_client

QUESTION = "Describe this image in one sentence."


def png_dimensions(data: bytes) -> tuple[int, int] | None:
    """Read width/height from a PNG header - no image library needed."""
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    width, height = struct.unpack(">II", data[16:24])
    return width, height


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", default="assets/images/marbles1.png")
    args = parser.parse_args()

    path = REPO_ROOT / args.image
    raw = path.read_bytes()
    encoded = base64.standard_b64encode(raw).decode("utf-8")
    client = create_client()

    print(f"image: {args.image}  ({len(raw) / 1024:.0f} KB on disk, ", end="")
    print(f"{len(encoded) / 1024:.0f} KB base64)")
    print("limit: 10 MB per image on the Claude API (5 MB on Bedrock/Google Cloud)\n")

    # 1. base64 - the Academy form.
    base64_block = {
        "type": "image",
        "source": {"type": "base64", "media_type": "image/png", "data": encoded},
    }
    base64_tokens = client.messages.count_tokens(
        model=MODEL,
        messages=[
            # Image before text: Claude works best that way.
            {
                "role": "user",
                "content": [base64_block, {"type": "text", "text": QUESTION}],
            }
        ],
    ).input_tokens
    print(f"1. base64     {base64_tokens} input tokens")

    # 2. Files API - the addition that matters in a multi-turn app. The Files
    #    API is out of beta: client.files, no beta header.
    with path.open("rb") as handle:
        uploaded = client.files.upload(file=(path.name, handle, "image/png"))
    file_block = {
        "type": "image",
        "source": {"type": "file", "file_id": uploaded.id},
    }
    file_tokens = client.messages.count_tokens(
        model=MODEL,
        messages=[
            {
                "role": "user",
                "content": [file_block, {"type": "text", "text": QUESTION}],
            }
        ],
    ).input_tokens
    print(f"2. file_id    {file_tokens} input tokens   (id {uploaded.id})")
    print(
        "   Same token cost - the image still enters the context. What a file_id\n"
        "   saves is RESENDING the bytes on every turn of a conversation.\n"
    )

    response = client.messages.create(
        model=MODEL,
        max_tokens=300,
        messages=[
            {
                "role": "user",
                "content": [file_block, {"type": "text", "text": QUESTION}],
            }
        ],
    )
    print(f"answer: {text_of(response).strip()}\n")

    # 3. The patch formula, checked.
    dimensions = png_dimensions(raw)
    if dimensions:
        width, height = dimensions
        patches = math.ceil(width / 28) * math.ceil(height / 28)
        print(f"dimensions:      {width}x{height}")
        print(f"visual tokens:   ceil(w/28) * ceil(h/28) = {patches}")
        print(f"counted tokens:  {base64_tokens} (includes the prompt text)")
        print(
            "\nA model is capped by its resolution tier: 1568 visual tokens on the\n"
            "standard tier, 4784 on high-resolution (Claude 4.7 and later). An\n"
            "image above the cap is downscaled before processing - which is why a\n"
            "4K screenshot costs the same as a 2576px one on the same tier."
        )

    # Multiple images. Over 20 in one request, a stricter per-image dimension
    # limit applies to EVERY image in it - including images inside tool_result
    # content.
    second = (REPO_ROOT / "assets/images/marbles2.png").read_bytes()
    both = client.messages.create(
        model=MODEL,
        max_tokens=300,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Image 1:"},
                    base64_block,
                    {"type": "text", "text": "Image 2:"},
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": base64.standard_b64encode(second).decode("utf-8"),
                        },
                    },
                    {"type": "text", "text": "What differs between them?"},
                ],
            }
        ],
    )
    print(f"\ntwo images: {text_of(both).strip()[:300]}")

    client.files.delete(uploaded.id)
    print(f"\ncleaned up file {uploaded.id}")


if __name__ == "__main__":
    main()
