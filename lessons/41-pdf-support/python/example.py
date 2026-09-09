"""Lesson 41 - PDF support.

Base64, Files API, and citations. The Files API is the addition that matters:
ask three questions about one document without resending the bytes three times.

    uv run lesson 41
"""

from __future__ import annotations

import base64

from course.blocks import text_of
from course.config import MODEL, REPO_ROOT, create_client

PDF_PATH = REPO_ROOT / "assets" / "pdf" / "earth.pdf"

QUESTIONS = [
    "What is this document about? One sentence.",
    "Name one specific figure or measurement it gives.",
    "What is the document's structure - what are its main sections?",
]


def main() -> None:
    client = create_client()
    raw = PDF_PATH.read_bytes()
    # No newlines in the base64 payload - standard_b64encode does not add any.
    encoded = base64.standard_b64encode(raw).decode("utf-8")

    print(f"pdf: {PDF_PATH.name}  ({len(raw) / 1024:.0f} KB)")
    print("limits: 100 pages on 200k-context models, up to 600 otherwise;")
    print("        32 MB request size, which usually binds first.\n")

    # 1. base64 - the Academy form. Document block BEFORE the text block.
    base64_block = {
        "type": "document",
        "source": {
            "type": "base64",
            "media_type": "application/pdf",
            "data": encoded,
        },
    }
    base64_tokens = client.messages.count_tokens(
        model=MODEL,
        messages=[
            {
                "role": "user",
                "content": [base64_block, {"type": "text", "text": QUESTIONS[0]}],
            }
        ],
    ).input_tokens
    print(f"1. base64   {base64_tokens} input tokens per request")

    # 2. Files API - out of beta, so client.files with no beta header.
    with PDF_PATH.open("rb") as handle:
        uploaded = client.files.upload(
            file=(PDF_PATH.name, handle, "application/pdf")
        )
    file_block = {
        "type": "document",
        "source": {"type": "file", "file_id": uploaded.id},
    }
    print(f"2. file_id  uploaded as {uploaded.id}\n")

    print("three questions against the same file_id:")
    for question in QUESTIONS:
        response = client.messages.create(
            model=MODEL,
            max_tokens=400,
            messages=[
                {
                    "role": "user",
                    "content": [file_block, {"type": "text", "text": question}],
                }
            ],
        )
        print(f"  Q: {question}")
        print(f"     {text_of(response).strip()[:220]}")

    print(
        f"\n  With base64 that would have re-uploaded {len(encoded) / 1024:.0f} KB "
        f"three times.\n  The token cost is the same either way - what a file_id "
        f"saves is the upload.\n"
    )

    # 3. Citations. Page-level spans you can check.
    # NOTE: citations cannot be combined with output_config.format (400).
    cited_block = {**file_block, "citations": {"enabled": True}}
    response = client.messages.create(
        model=MODEL,
        max_tokens=600,
        messages=[
            {
                "role": "user",
                "content": [
                    cited_block,
                    {
                        "type": "text",
                        "text": "Give two specific facts from this document.",
                    },
                ],
            }
        ],
    )
    print("3. citations")
    print(f"   {text_of(response).strip()[:300]}\n")
    for block in response.content:
        if block.type != "text":
            continue
        for citation in getattr(block, "citations", None) or []:
            start = getattr(citation, "start_page_number", None)
            end = getattr(citation, "end_page_number", None)
            quoted = getattr(citation, "cited_text", "")[:90]
            print(f"   p{start}-{end}: {quoted}...")

    client.files.delete(uploaded.id)
    print(f"\ncleaned up file {uploaded.id}")


if __name__ == "__main__":
    main()
