# Codebase Analysis Report

**Analysis Context**: General codebase understanding
**Codebase Path**: `/Users/sequenzia/dev/repos/agent-alchemy`
**Date**: 2026-02-02

---

## Executive Summary

Claude Alchemy is a three-subsystem monorepo where two Claude Code plugins (SDD and Tools) communicate with a Next.js 16 Task Manager through a **filesystem-as-message-bus** pattern — plugins write task JSON and session artifacts to `~/.claude/tasks/`, and the Task Manager watches those files with chokidar, streaming changes to the browser via SSE. The most significant risk is the complete absence of test infrastructure for security-critical paths like path traversal protection and permission hooks.

---

## Architecture Overview

The monorepo contains three independently useful subsystems connected through filesystem conventions rather than shared code:

**Plugin System** — Two Claude Code plugins (`agent-alchemy-tools` v0.1.1, `agent-alchemy-sdd` v0.1.3) define structured development methodologies entirely through markdown files. Skills are multi-phase workflows (up to 10 steps) that orchestrate specialized agents in parallel using Claude Code's Task tool. Agents are spawned with model tiering — Sonnet for exploratory breadth, Opus for synthesis/architecture/review depth, Haiku for simple procedural tasks. A reference material system (`references/` subdirectories) provides templates, criteria, and patterns loaded at runtime.

**Task Manager App** — A Next.js 16.1.4 application (React 19, TanStack Query v5, Tailwind v4, shadcn/ui) using App Router with a clear server/client boundary. Server Components fetch initial task data from `~/.claude/tasks/`, Client Components manage state via TanStack Query, and a chokidar-based file watcher pushes real-time updates through Server-Sent Events. The cross-system bridge is an `execution_pointer.md` file written by the `execute-tasks` skill and read by the Task Manager to display execution artifacts.

**Design Philosophy**: Pragmatic separation — no shared runtime code, the filesystem is the universal API, plugins are markdown-only with no build step. Each subsystem is independently useful. The filesystem serves as a universal integration layer that requires no shared code.

**Tech Stack**: Next.js 16.1.4, React 19.2.3, TypeScript 5, TanStack Query v5.90.20, Tailwind CSS v4, shadcn/ui, Chokidar 5, pnpm workspaces.

---

## Critical Files

| File | Purpose | Relevance |
|------|---------|-----------|
| `apps/task-manager/src/lib/taskService.ts` | Reads task JSON, resolves execution pointers, path traversal protection | High |
| `apps/task-manager/src/lib/fileWatcher.ts` | Chokidar singleton, emits task/execution events | High |
| `apps/task-manager/src/app/api/events/route.ts` | SSE endpoint, bridges fileWatcher to browser | High |
| `apps/task-manager/src/hooks/useSSE.ts` | Client-side SSE consumer, dual cache invalidation | High |
| `apps/task-manager/src/components/TaskBoardClient.tsx` | Main client component, composes all hooks and UI | High |
| `plugins/sdd/skills/execute-tasks/SKILL.md` | Orchestrates autonomous task execution, writes execution_pointer.md | High |
| `plugins/sdd/skills/create-tasks/SKILL.md` | Transforms specs into Claude Code native Tasks | High |
| `plugins/sdd/agents/task-executor.md` | 4-phase per-task execution agent (opus) | High |
| `plugins/sdd/hooks/auto-approve-session.sh` | PreToolUse hook for autonomous file operations | Medium |
| `plugins/tools/skills/feature-dev/SKILL.md` | 7-phase feature development workflow | Medium |
| `plugins/tools/skills/codebase-analysis/SKILL.md` | 4-phase codebase analysis with parallel agents | Medium |
| `apps/task-manager/src/types/task.ts` | Shared TypeScript type definitions | Medium |
| `.claude-plugin/marketplace.json` | Plugin registry defining both plugins | Medium |

### Key File Details

#### `apps/task-manager/src/lib/taskService.ts`
- **Key exports**: `getTaskLists()`, `getTasks(listId)`, `getTask(listId, taskId)`, `getExecutionContext(listId)`, `getTasksDir()`
- **Core logic**: Reads `~/.claude/tasks/` directory structure. `parseTask()` validates and normalizes JSON with defensive defaults (status normalization, array coercion, id-to-string). `resolveExecutionDir()` reads `execution_pointer.md`, resolves the path, and guards against path traversal using `path.relative()` to ensure the target stays under `$HOME`.
- **Connections**: Read by all API routes and the Server Component page. All file operations use `node:fs/promises` (async). Returns empty results rather than throwing on failure.

#### `apps/task-manager/src/lib/fileWatcher.ts`
- **Key exports**: `FileWatcher` class extending `EventEmitter`, `fileWatcher` singleton instance
- **Core logic**: Watches `~/.claude/tasks/` with chokidar using polling mode (300ms interval, depth 2). Emits `taskEvent` for JSON changes, `executionEvent` for markdown/txt changes. `watchExecutionDir()` dynamically adds execution directories, deduplicating by taskListId.
- **Connections**: Global singleton on `globalThis` prevents duplicate watchers during HMR. Consumed by SSE route handler.

#### `apps/task-manager/src/app/api/events/route.ts`
- **Key exports**: `GET` route handler with `dynamic = 'force-dynamic'`, `runtime = 'nodejs'`
- **Core logic**: Creates `ReadableStream` subscribing to fileWatcher events. Lazily starts watcher, resolves execution directory, streams filtered SSE data with 30s heartbeat. Uses `X-Accel-Buffering: no` for nginx compatibility. Cleans up listeners on abort.
- **Connections**: Bridge between fileWatcher and useSSE hook.

#### `apps/task-manager/src/hooks/useSSE.ts`
- **Key exports**: `useSSE(taskListId)`
- **Core logic**: Opens `EventSource` connection. Registers listeners for task and execution events. Dual invalidation: TanStack Query cache (`queryClient.invalidateQueries`) and Server Component data (`router.refresh()`). Reconnects after 3s on error via `reconnectKey` state.
- **Connections**: Drives cache invalidation for useTasks and useExecutionContext.

#### `plugins/sdd/skills/execute-tasks/SKILL.md`
- **Key directives**: 10-step orchestration loop, dependency-aware execution plan, 4-phase per-task workflow, adaptive verification
- **Core logic**: Creates `.claude/sessions/__live_session__/` with execution artifacts (execution_plan.md, execution_context.md, task_log.md). Writes `execution_pointer.md` to `~/.claude/tasks/{TASK_LIST_ID}/`. Spawns `task-executor` subagents one-per-task. Archives to timestamped directory on completion. Shared `execution_context.md` enables cross-task learning.
- **Connections**: Produces artifacts consumed by Task Manager via filesystem.

#### `plugins/sdd/hooks/auto-approve-session.sh`
- **Core logic**: Intercepts PreToolUse events for Write, Edit, and Bash tools. Approves Write/Edit targeting `$HOME/.claude/tasks/*/execution_pointer.md` or `*/.claude/session/*`. Approves Bash `mkdir`/`mv` commands containing `.claude/session/`. Exits silently for non-matching operations.
- **Connections**: Enables autonomous execution without user prompts.

---

## Patterns & Conventions

### Code Patterns
- **Filesystem-as-message-bus**: All cross-system communication via file reads/writes. No database, no IPC, no HTTP between plugins and Task Manager.
- **Server Components with client hydration**: Server Component fetches initial data, passes to Client Component as `initialData` for TanStack Query.
- **SSE-driven dual invalidation**: Events invalidate both TanStack Query cache (`queryClient.invalidateQueries`) and Server Component data (`router.refresh()`).
- **Parallel Agent Fan-Out / Synthesize**: Spawn multiple agents, collect reports, synthesize with Opus.
- **Model Tiering**: Sonnet (exploration), Opus (synthesis/architecture/review/execution), Haiku (procedural).
- **Multi-Phase Workflows**: 4-10 phases per skill with explicit transition directives.
- **Reference Material System**: `references/` subdirectories with templates and criteria loaded at runtime.
- **Defensive parsing**: `parseTask()` normalizes missing fields, returns empty results on failure rather than throwing.
- **PreToolUse hooks for autonomy**: Auto-approve scoped file operations to enable hands-off execution.
- **Markdown-as-Code**: All plugin logic in markdown files (SKILL.md, agent-name.md) with YAML frontmatter; no build step required.

### Naming Conventions
- Plugin names: `agent-alchemy-{category}` (e.g., `agent-alchemy-tools`)
- Skill invocation: `/tools:{name}` or `/sdd:{name}`
- Skills: `SKILL.md` (all caps) with YAML frontmatter in `skills/{name}/`
- Agents: `{agent-name}.md` (kebab-case) in `agents/`
- Commits: Conventional Commits (`type(scope): description`)
- Task subjects: imperative mood; `activeForm`: present continuous

### Project Structure
```
agent-alchemy/
├── apps/task-manager/          # Next.js 16 app (pnpm workspace)
│   └── src/
│       ├── app/                # App Router pages and API routes
│       ├── components/         # React components (UI + domain)
│       ├── hooks/              # Custom React hooks
│       ├── lib/                # Server-side services (taskService, fileWatcher)
│       └── types/              # TypeScript type definitions
├── plugins/
│   ├── tools/                  # 5 agents, 10 skills
│   │   ├── agents/             # code-explorer, code-architect, etc.
│   │   └── skills/             # feature-dev, codebase-analysis, etc.
│   └── sdd/                    # 2 agents, 4 skills
│       ├── agents/             # spec-analyzer, task-executor
│       ├── hooks/              # auto-approve-session.sh
│       └── skills/             # create-spec, create-tasks, etc.
├── internal/
│   └── docs/                   # Cheatsheets, workflow guides, analysis
├── .claude/                    # Claude Code settings
│   └── settings.json           # CLAUDE_CODE_TASK_LIST_ID, permissions
└── .claude-plugin/
    └── marketplace.json        # Plugin registry
```

---

## Relationship Map

### Cross-System Integration
```
SDD Plugin                          Task Manager
  execute-tasks                       taskService.ts
  |                                     |
  |--writes--> ~/.claude/tasks/         |--reads---> ~/.claude/tasks/
  |            ├── *.json (tasks)       |            ├── *.json (tasks)
  |            └── execution_pointer.md |            └── execution_pointer.md
  |                                     |
  |--writes--> .claude/sessions/        |--reads---> (resolved from pointer)
  |            __live_session__/        |
  |            ├── execution_context.md |
  |            ├── task_log.md         fileWatcher.ts (chokidar singleton)
  |            └── execution_plan.md     |
  |                                     |--emits--> events/route.ts (SSE)
  task-executor agents (opus)                        |
  |                                     useSSE.ts <--+
  auto-approve-session.sh                |
  (PreToolUse hook)                  TanStack Query invalidation
                                         |
                                     KanbanBoard, TaskDetail, ExecutionDialog
```

### Plugin Orchestration
```
feature-dev → code-explorer (3x, sonnet) → codebase-synthesizer (opus) → code-architect (2-3x, opus) → code-reviewer (3x, opus)
codebase-analysis → code-explorer (2-3x, sonnet) → codebase-synthesizer (opus)
create-spec → researcher → writes specs/SPEC-{name}.md
create-tasks → reads spec → calls TaskCreate/TaskUpdate APIs
execute-tasks → task-executor (1 per task, opus) → writes session artifacts
```

### Task Manager Data Flow
```
~/.claude/tasks/*.json → Chokidar watcher → SSE route → useSSE hook → TanStack Query invalidation → KanbanBoard
Server Component (initial) → taskService.ts → parallel fetch → TaskBoardClient props → initialData for TanStack Query
```

---

## Challenges & Risks

| Challenge | Severity | Impact |
|-----------|----------|--------|
| No test infrastructure | High | Security-sensitive logic (path traversal protection, permission hooks) and complex state management (SSE, cache invalidation) have zero test coverage, creating significant regression risk |
| Auto-approve hook scope | Medium | Bash command approval matches `.claude/session/` anywhere in the command string; could be tightened to match as an argument rather than substring |
| Filesystem polling latency | Medium | 300ms chokidar polling interval introduces latency and higher CPU overhead vs. native fsevents; rapid task transitions could feel sluggish |
| Execution pointer staleness | Medium | After session archival, `execution_pointer.md` still points to the now-empty `__live_session__/` directory until the next execution |
| No CI/CD pipeline | Medium | No GitHub Actions, no automated lint/type checking on push/PR; every change validated only by manual testing |
| Context file growth | Medium | execution_context.md grows with each task; may exceed context limits for later agents |
| SSE reconnection strategy | Low | Fixed 3-second retry with no backoff, no max retries, no user-visible disconnection state |
| Manual version management | Low | Plugin versions in marketplace.json and plugin.json updated manually; no automated synchronization |

---

## Recommendations

1. **Add test coverage for critical paths**: Prioritize `taskService.ts` (path traversal protection, `parseTask()` normalization), the SSE event route (event filtering, cleanup), and `auto-approve-session.sh` (verify rejection of out-of-scope operations). These are the security and reliability boundaries.

2. **Tighten auto-approve hook patterns**: Make the Bash command approval more specific by requiring `.claude/session/` as an argument rather than anywhere in the command string. Anchor path patterns more precisely.

3. **Add SSE connection status visibility**: Expose connection state (connected/disconnected/reconnecting) to the UI. Add exponential backoff with a maximum retry count.

4. **Set up minimal CI**: A GitHub Actions workflow running `pnpm lint` and `pnpm build:task-manager` on push/PR would catch TypeScript errors and lint violations before they reach main.

5. **Parallelize file reads in taskService**: Replace sequential `for...of` loop in `getTasks()` with `Promise.all()` for reading task files, improving initial page load for large task lists.

---

## Analysis Methodology

- **Exploration agents**: 2 agents — Agent 1: Application structure, entry points, core logic; Agent 2: Configuration, infrastructure, shared utilities
- **Synthesis**: Opus-tier synthesizer agent merged findings, read critical files in depth, mapped cross-system relationships
- **Scope**: Full monorepo including apps, plugins, internal docs, and configuration. Excluded node_modules and build artifacts.
