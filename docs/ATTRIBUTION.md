# Attribution

## The Claude Academy course

[Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api)
is Anthropic's, and this repository does not reproduce its prose.

What each lesson README contains:

- a **summary in original wording** of what the lesson teaches — enough to know whether
  you need it, not a substitute for watching it;
- a description of the Academy's _approach_, which is a factual statement about what the
  code does;
- short code fragments quoted **only where they are the thing being corrected** — the
  `temperature=0.2` line, the `add_assistant_message(messages, "```json")` line, the
  `FastMCP` import. Quoting the broken line is what makes the correction checkable;
- original implementations, written from scratch against the current SDKs.

If you want the course, take the course. This is a companion, not a replacement.

## The public Python/Jupyter repository

[`jaygaha/Building-with-the-Claude-API`](https://github.com/jaygaha/Building-with-the-Claude-API)
was used to understand the shape of the original executable material — which notebooks
exist, which helpers they share, what the reminder-agent and document-server projects
look like.

**That repository carries no licence file.** With no licence, the default is "all rights
reserved", so **none of its code is copied here**. Every implementation in `lessons/` and
`shared/` was written from scratch.

Where this repository builds the same _project_ — the reminder agent (lessons 21–28), the
document MCP server (lessons 47–56) — that is because the Academy course sets those
projects, not because the code was taken. The implementations differ substantially:
`strict: true` schemas, idempotency in the mutating tool, MCP SDK v2, unit tests.

## Third-party code and services

|                                                                                       |                                                        |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| [`@anthropic-ai/sdk`](https://github.com/anthropics/anthropic-sdk-typescript)         | MIT — a dependency, not vendored                       |
| [`anthropic`](https://github.com/anthropics/anthropic-sdk-python)                     | MIT — a dependency, not vendored                       |
| [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) | MIT — a dependency, not vendored                       |
| [`mcp`](https://github.com/modelcontextprotocol/python-sdk)                           | MIT — a dependency, not vendored                       |
| [`voyageai`](https://github.com/voyage-ai/voyageai-python)                            | MIT — a dependency, not vendored                       |
| [Voyage AI](https://www.voyageai.com/)                                                | a third-party embedding service; you need your own key |

## Assets

Everything in `assets/` is either written for this repository (the corpus, the eval
datasets, the incident notes, the CSV, the deliberately-buggy fixtures) or carried over
from the previous version of this repository (the images and the PDF).

## This repository

MIT licensed — see [`LICENSE`](../LICENSE). Documentation and code alike.
