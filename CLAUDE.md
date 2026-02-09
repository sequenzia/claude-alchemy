# CLAUDE.md

## Project Overview

Claude Alchemy is a pnpm monorepo with two Claude Code plugins and a Next.js Task Manager app. The three subsystems communicate through a **filesystem-as-message-bus** pattern — no shared runtime code, no database, no IPC.

## Tech Stack

- Next.js 16.1.4, React 19.2.3, TypeScript 5, TanStack Query v5.90.20
- Tailwind CSS v4, shadcn/ui (Radix primitives), Chokidar 5
- pnpm workspaces (Node >=18, pnpm >=8)
- Plugins are markdown-only with no build step (NOT in pnpm workspace)

## Monorepo Structure

- `apps/task-manager/` — Next.js 16 app (React 19, TanStack Query, Tailwind v4, shadcn/ui)
- `plugins/tools/` — Developer tools plugin (5 agents, 10 skills)
- `plugins/sdd/` — Spec-driven development plugin (5 agents, 4 skills)
- `internal/docs/` — Internal documentation and cheatsheets
- `.claude-plugin/marketplace.json` — Plugin registry

## Key Conventions

- **Plugin format**: Skills are `SKILL.md` with YAML frontmatter; agents are `{agent-name}.md` (kebab-case)
- **Plugin naming**: `claude-alchemy-{category}` (e.g., `claude-alchemy-tools`)
- **Skill invocation**: `/tools:{skill-name}` or `/sdd:{skill-name}`
- **Commits**: Conventional Commits — `type(scope): description`
- **Changelog**: Keep a Changelog format in `CHANGELOG.md`

## Critical Integration Points

- **execution_pointer.md**: Written by `execute-tasks` skill to `~/.claude/tasks/{listId}/`, contains absolute path to `.claude/sessions/__live_session__/`, read by Task Manager's `taskService.ts` to display execution artifacts
- **Session files in `__live_session__/`**: `execution_context.md`, `task_log.md`, `progress.md`, `execution_plan.md`, `.lock`, `tasks/` subdirectory, and `team_activity_task-{id}.md` files for team strategies. Written by `execute-tasks` skill, readable by Task Manager via `getExecutionContext()`
- **`progress.md`**: Real-time execution status (current task, phase, timestamp). Updated during execution — Chokidar picks up changes automatically
- **`team_activity_task-{id}.md`**: Per-team activity files with agent roles, statuses, and activity logs. Parsed by `parseTeamActivityMd()` in `taskService.ts`. Only created for non-solo strategies (review, research, full)
- **`.lock` file**: Prevents concurrent execution sessions. Created at session start, archived with session on completion. Stale locks (>4h) auto-expire
- **Task storage**: `~/.claude/tasks/claude-alchemy/` (set via CLAUDE_CODE_TASK_LIST_ID in .claude/settings.json)

## Task Manager Architecture

- Server Components fetch from `~/.claude/tasks/`, pass to Client Components as `initialData` for TanStack Query
- Chokidar singleton (via `globalThis` to survive HMR) watches filesystem with 300ms polling
- SSE endpoint (`/api/events`) streams filtered events to browser
- `useSSE` hook receives events, performs dual invalidation: TanStack Query cache + `router.refresh()` for Server Components
- Key files: `src/lib/taskService.ts`, `src/lib/fileWatcher.ts`, `src/app/api/events/route.ts`

### Real-Time Data Flow

```
~/.claude/tasks/*.json → Chokidar → SSE route → useSSE → TanStack Query invalidation → UI
```

### Security Patterns

- `resolveExecutionDir()` in `taskService.ts` guards against path traversal using `path.relative()` — ensure pointer targets stay under `$HOME`
- API routes validate `listId` against `..` and `/` patterns
- `parseTask()` defensively normalizes JSON: defaults status to `pending`, coerces arrays, converts id to string

## Plugin Architecture

- Skills orchestrate agents via Task tool with model tiering (Sonnet/Opus/Haiku)
- **Team strategies**: `execute-tasks` supports 4 strategies via `--team-strategy` argument: `solo` (default, single agent), `review` (implementer + reviewer), `research` (explorer + implementer), `full` (explorer + implementer + reviewer). Strategies cascade: per-task metadata > CLI arg > settings file > default solo
- Team agent definitions: `team-implementer.md` (Sonnet, writes code), `team-reviewer.md` (Opus, read-only review), `team-explorer.md` (Sonnet, read-only exploration)
- Reference materials in `skills/*/references/` loaded at runtime
- Multi-phase workflows with explicit transition directives
- All user interactions through `AskUserQuestion` tool
- SDD plugin has PreToolUse hook (`hooks/auto-approve-session.sh`) for autonomous session file operations
- Interrupted sessions are auto-recovered — stale `__live_session__/` files are archived and `in_progress` tasks are reset to `pending` on next invocation
- Plugin versions tracked in both `.claude-plugin/plugin.json` and root `marketplace.json` (update both when versioning)
