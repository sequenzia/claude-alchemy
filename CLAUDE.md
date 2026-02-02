# CLAUDE.md

## Project Overview

Claude Alchemy is a pnpm monorepo with two Claude Code plugins and a Next.js Task Manager app.

## Monorepo Structure

- `apps/task-manager/` — Next.js 16 app (React 19, TanStack Query, Tailwind v4, shadcn/ui)
- `plugins/tools/` — Developer tools plugin (5 agents, 10 skills)
- `plugins/sdd/` — Spec-driven development plugin (2 agents, 4 skills)
- `internal/docs/` — Internal documentation and cheatsheets
- `.claude-plugin/marketplace.json` — Plugin registry

## Key Conventions

- **Plugin format**: Skills are `SKILL.md` with YAML frontmatter; agents are `{agent-name}.md` (kebab-case)
- **Plugin naming**: `claude-alchemy-{category}` (e.g., `claude-alchemy-tools`)
- **Skill invocation**: `/tools:{skill-name}` or `/sdd:{skill-name}`
- **Commits**: Conventional Commits — `type(scope): description`
- **Changelog**: Keep a Changelog format in `CHANGELOG.md`

## Critical Integration Points

- **execution_pointer.txt**: Written by `execute-tasks` skill to `~/.claude/tasks/{listId}/`, read by Task Manager's `taskService.ts` to display execution artifacts
- **Task storage**: `~/.claude/tasks/claude-alchemy/` (set via CLAUDE_CODE_TASK_LIST_ID in .claude/settings.json)

## Task Manager Architecture

- Server Components fetch from `~/.claude/tasks/`, pass to Client Components
- Chokidar singleton watches filesystem, pushes events via SSE
- `useSSE` hook receives events, invalidates TanStack Query cache
- Key files: `src/lib/taskService.ts`, `src/lib/fileWatcher.ts`, `src/app/api/events/route.ts`

## Plugin Architecture

- Skills orchestrate agents via Task tool with model tiering (Sonnet/Opus/Haiku)
- Reference materials in `skills/*/references/` loaded at runtime
- Multi-phase workflows with explicit transition directives
- All user interactions through `AskUserQuestion` tool
