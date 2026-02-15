# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agent Alchemy is a monorepo that extends Claude Code into a structured development platform. It combines Claude Code plugins (markdown-based agents and skills), a real-time task manager web app, and a VS Code extension for schema validation.

## Repository Structure

```
agent-alchemy/
├── apps/task-manager/     # Next.js 16 real-time Kanban board for Claude tasks
├── core/                  # Claude Code plugin content (markdown-as-code)
│   ├── agents/            # Agent definitions (9 agents, all team-enabled)
│   ├── skills/            # Skill workflows (15 skills with YAML frontmatter)
│   └── hooks/             # PreToolUse hooks for autonomous execution
├── extensions/vscode/     # VS Code extension for plugin schema validation
├── schemas/               # JSON schemas for plugin file formats
├── scripts/               # Utility scripts
├── site/                  # MkDocs documentation site
└── internal/docs/         # Internal project documentation
```

## Build & Development Commands

**Monorepo (root):**
```bash
pnpm install                    # Install all workspace dependencies
pnpm dev:task-manager           # Dev server on port 3030
pnpm build:task-manager         # Production build
pnpm lint                       # Lint all packages
```

**Task Manager (apps/task-manager/):**
```bash
pnpm dev                        # Next.js dev server
pnpm build                      # Production build
pnpm lint                       # ESLint
```

**VS Code Extension (extensions/vscode/):**
```bash
npm run build                   # Compile with esbuild
npm run watch                   # Dev watch mode
npm run package                 # Package as .vsix
npm run lint                    # TypeScript type check (tsc --noEmit)
```

## Architecture

### Core Plugin System (Markdown-as-Code)

Plugins are **not compiled** — they are markdown files with YAML frontmatter that Claude Code loads directly. No build step required.

- **Agents** (`core/agents/*.md`): Define specialized agent roles (code-explorer, deep-synthesizer, code-architect, code-reviewer, task-executor, etc.) with system prompts and model preferences. All exploration/synthesis agents are team-enabled with SendMessage and TaskUpdate tools for Agent Teams coordination
- **Skills** (`core/skills/*/SKILL.md`): Multi-phase workflows with explicit state transitions. Each skill directory contains a `SKILL.md` and a `references/` subdirectory with templates and criteria
- **Hooks** (`core/hooks/`): PreToolUse hooks that auto-approve file operations during autonomous task execution

**Model tiering convention:** Sonnet for exploration/procedural work, Opus for synthesis/architecture/review, Haiku for simple procedural tasks.

### Task Manager App

Next.js 16 App Router application that reads Claude task files from `~/.claude/tasks/` and displays them as a real-time Kanban board.

**Key data flow:** Filesystem (Chokidar watcher) → SSE route handler → React client (useSSE hook) → TanStack Query cache invalidation → UI re-render.

- Server Components fetch initial data; client components manage real-time state
- SSE endpoint at `/api/events` streams filesystem change events
- FileWatcher is a global singleton to prevent duplicate watchers during HMR
- See `apps/task-manager/CLAUDE.md` for detailed app architecture

### VS Code Extension

TypeScript extension built with esbuild that provides JSON schema validation for plugin config files (`plugin.json`, `hooks.json`, `.mcp.json`, `.lsp.json`) and YAML frontmatter validation for skill/agent markdown files. Uses AJV for schema validation.

### JSON Schemas

Seven schemas in `/schemas/` define the structure for plugin manifests, skill/agent frontmatter, hooks, MCP/LSP configs, and marketplace entries. These are used by both the VS Code extension and for documentation.

## Environment Configuration

- **`.claude/settings.json`**: Sets `CLAUDE_CODE_TASK_LIST_ID=agent-alchemy` and `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`
- **MCP Server**: `context7` is enabled for fetching library documentation
- **Node**: >=18.0.0, **pnpm**: >=8.0.0

## Conventions

- **Conventional Commits**: `type(scope): description` — types: feat, fix, docs, style, refactor, test, chore
- **Skill files**: YAML frontmatter at top of `SKILL.md`, reference materials in `references/` subdirectory
- **Agent files**: YAML frontmatter defining model, description, and allowed tools
- **No tests currently**: No test framework is set up in the repository
