"""Lesson 42 - Citations.

Cited answers, a verification pass that actually checks the spans, and the one
new incompatibility: citations plus output_config.format is a 400.

    uv run lesson 42
"""

from __future__ import annotations

import anthropic
from course.blocks import text_of
from course.config import MODEL, create_client
from course.corpus import load_corpus

QUESTION = (
    "What are the severity levels, and what is the deadline for the "
    "retrospective?"
)


def main() -> None:
    client = create_client()
    corpus = {doc.name: doc.text for doc in load_corpus()}
    chosen = ["incidents.md", "on-call.md"]

    # citations is all-or-nothing across the documents in a request.
    content = [
        {
            "type": "document",
            "source": {
                "type": "text",
                "media_type": "text/plain",
                "data": corpus[name],
            },
            "title": name,
            "citations": {"enabled": True},
        }
        for name in chosen
    ]
    content.append({"type": "text", "text": QUESTION})

    response = client.messages.create(
        model=MODEL,
        max_tokens=800,
        system="Answer from the documents. Cite what you use.",
        messages=[{"role": "user", "content": content}],
    )

    print("=== answer ===")
    print(text_of(response).strip())

    print("\n=== citations, verified against the source ===")
    checked = 0
    mismatched = 0
    for block in response.content:
        if block.type != "text":
            continue
        for citation in getattr(block, "citations", None) or []:
            checked += 1
            title = getattr(citation, "document_title", "?")
            quoted = getattr(citation, "cited_text", "")
            # Branch on the location type. A PDF citation has no char indices.
            if citation.type == "char_location":
                where = (
                    f"chars {citation.start_char_index}-{citation.end_char_index}"
                )
            elif citation.type == "page_location":
                where = f"p{citation.start_page_number}-{citation.end_page_number}"
            else:
                where = citation.type

            # THE check almost nobody writes: does the cited span actually
            # appear in the document it claims to come from?
            source = corpus.get(title, "")
            verified = quoted.strip() and quoted.strip() in source
            if not verified:
                mismatched += 1
            mark = "ok " if verified else "MISMATCH"
            print(f"  [{mark}] {title} {where}")
            print(f"          {quoted.strip()[:110]}")

    print(f"\n{checked} citation(s) checked, {mismatched} did not match the source.")
    print(
        "A citation is a pointer, not a paraphrase - so it is checkable, and\n"
        "checking it is the entire reason to turn citations on."
    )

    print("\n=== citations + output_config.format ===")
    try:
        client.messages.create(
            model=MODEL,
            max_tokens=400,
            messages=[{"role": "user", "content": content}],
            output_config={
                "format": {
                    "type": "json_schema",
                    "schema": {
                        "type": "object",
                        "properties": {"answer": {"type": "string"}},
                        "required": ["answer"],
                        "additionalProperties": False,
                    },
                }
            },
        )
        print("  (accepted - check whether this restriction still applies)")
    except anthropic.BadRequestError as error:
        print(f"  400: {error.message}")
        print(
            "\n  You have to choose per request: verifiable spans OR a guaranteed\n"
            "  shape. The usual resolution is two calls - a cited answer for the\n"
            "  human, a structured extraction for the machine."
        )


if __name__ == "__main__":
    main()
