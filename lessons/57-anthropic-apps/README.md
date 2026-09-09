# 57 · Anthropic apps

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 57, _Anthropic apps_
>
> **2026 status: 🟢 Broadly current — the ecosystem simply grew**

## What the lesson teaches

The API is not the only surface. There are first-party applications built on it, and
knowing which one fits a job saves you building it.

## What changed

Nothing was withdrawn. The map is bigger. The version worth carrying in 2026:

| Surface                        | What it is                                                                                             | Reach for it when                                                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claude API**                 | `POST /v1/messages` and friends                                                                        | You are building the product. Everything in lessons 1–46                                                                                    |
| **Claude Code**                | An agentic coding tool, in the terminal, IDE, desktop app and web                                      | You want an agent over a codebase and you do not want to build the harness. Lessons 58–60                                                   |
| **Claude Agent SDK**           | Claude Code packaged as a library (`claude-agent-sdk` / `@anthropic-ai/claude-agent-sdk`)              | You want Claude Code's harness — built-in file/bash tools, permissions, subagents — inside **your** application, on **your** infrastructure |
| **Claude Managed Agents**      | Server-hosted agents: persisted, versioned configs, a per-session sandbox, sessions, memory, schedules | You want Anthropic to run the loop **and** host the container. Lesson 61                                                                    |
| **Agent Skills**               | Folders of instructions + code the model loads on demand                                               | You want to teach the model a repeatable procedure without changing your prompt                                                             |
| **MCP**                        | The protocol connecting any of the above to your tools and data                                        | Lessons 47–56                                                                                                                               |
| **claude.ai / Claude Desktop** | The end-user products                                                                                  | Not a build surface, but where an MCP server you write can end up                                                                           |

### The distinction people get wrong

**Tool Runner ≠ Claude Agent SDK ≠ Managed Agents.** They sound alike and solve
different problems:

|                                                      | Who writes the loop             | Who hosts it  | Built-in tools                        |
| ---------------------------------------------------- | ------------------------------- | ------------- | ------------------------------------- |
| Manual loop (lesson 27)                              | you                             | you           | none                                  |
| **Tool Runner** (`client.beta.messages.tool_runner`) | the SDK                         | you           | none — only tools you define          |
| **Claude Agent SDK**                                 | the SDK (Claude Code's harness) | you           | file read/write/edit, bash, grep, web |
| **Managed Agents**                                   | Anthropic                       | **Anthropic** | a hosted sandbox + Skills + MCP       |

Only Managed Agents hosts anything. The other three all leave deployment to you.

## The current implementation

No code. This is a map, and a wrong map is worse than none — the table above is the
lesson.

If you want something to run, lesson 61 builds against the two surfaces that matter for
this course: the Messages API agent loop, and Managed Agents.

## Run it

Nothing to run. Read the table, then continue to lesson 58.

## Environment variables

None.

## References

- [Claude Code](https://code.claude.com/docs/en/overview)
- [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk)
- [Managed Agents](https://platform.claude.com/docs/en/managed-agents/overview)
- [Agent Skills](https://platform.claude.com/docs/en/agents-and-tools/skills)
- [MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector)
