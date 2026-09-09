# 58 · Claude Code setup

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 58, _Claude Code setup_
>
> **2026 status: 🟠 Installation guidance outdated**

## What the lesson teaches

Install Claude Code and log in.

## What the Academy does

```bash
npm install -g @anthropic-ai/claude-code
```

…presented as _the_ route, with Node and npm as prerequisites, and WSL as the Windows
story.

## What changed

### The native installer is the recommended route

```bash
# macOS, Linux, WSL
curl -fsSL https://claude.ai/install.sh | bash

# Windows PowerShell
irm https://claude.ai/install.ps1 | iex

# Windows CMD
curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd
```

Native installs **auto-update in the background**. That is the main practical difference
from every other method.

### npm still works, but Node is no longer a prerequisite

```bash
npm install -g @anthropic-ai/claude-code
```

The npm package downloads the **same native binary**; `claude` does not invoke Node at
runtime. So this mental dependency:

```
Claude Code → Node.js → npm
```

is simply wrong now. npm is one distribution channel among several:

| Method                                         | Auto-updates | Notes                                                         |
| ---------------------------------------------- | ------------ | ------------------------------------------------------------- |
| **Native installer**                           | **yes**      | recommended                                                   |
| Homebrew (`brew install --cask claude-code`)   | no           | `claude-code` = stable channel, `claude-code@latest` = latest |
| WinGet (`winget install Anthropic.ClaudeCode`) | no           |                                                               |
| apt / dnf / apk                                | no           | signed repositories                                           |
| npm                                            | yes          | requires Node 22+ to _install_, not to run                    |

### Native Windows is supported

WSL is no longer the primary Windows path. Native Windows works; Git for Windows is
_optional_ (it enables the Bash tool — without it, Claude Code uses PowerShell). WSL 2 is
still the choice if you want Linux toolchains or sandboxed command execution.

### Requirements and login

- macOS 13+, Windows 10 1809+, Ubuntu 20.04+, Debian 10+, Alpine 3.19+
- 4 GB+ RAM, x64 or ARM64
- A **Pro, Max, Team, Enterprise or Console** account. The free claude.ai plan does not
  include Claude Code. Bedrock / Google Cloud / Microsoft Foundry also work.
- Run `claude` and follow the browser prompt. If `ANTHROPIC_API_KEY` is set, it asks once
  to approve that key instead.

### Verify

```bash
claude --version   # e.g. 2.1.211 (Claude Code)
claude doctor      # read-only diagnostics: install health, settings errors, fixes
```

`claude doctor` is the command the lesson does not mention and the one to reach for when
something is off.

## The current implementation

No code — this lesson is a set of shell commands, and the correct ones are above. Running
an installer from a lesson script would be the wrong shape.

## Run it

Follow the commands above in your own terminal, then:

```bash
claude doctor
```

## Environment variables

- `ANTHROPIC_API_KEY` — optional; only if you want to authenticate with an API key
  rather than a browser login

## References

- [Claude Code setup](https://code.claude.com/docs/en/setup)
- [Troubleshoot installation](https://code.claude.com/docs/en/troubleshoot-install)
- [Authentication](https://code.claude.com/docs/en/authentication)
