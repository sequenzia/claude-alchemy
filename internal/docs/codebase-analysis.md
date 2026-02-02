# Codebase Analysis Report

**Analysis Context**: General codebase understanding
**Codebase Path**: `/Users/sequenzia/dev/repos/claude-alchemy`
**Date**: 2026-02-01

---

## Executive Summary

Claude Alchemy is a monorepo combining two Claude Code plugins (14 skills, 7 agents) with a Next.js Task Manager web application — together they formalize development workflows through spec-driven development and provide real-time Kanban visualization of Claude's native task system. The most distinctive architectural decision is the "markdown-as-code" plugin design where all workflow logic lives in declarative SKILL.md and agent markdown files with no executable code. The primary risk is the absence of automated tests for the Task Manager's non-trivial service logic.

---

## Architecture Overview

The codebase has two conceptually linked but technically independent systems:

**Plugin System** — Two Claude Code plugins (`claude-alchemy-tools` and `claude-alchemy-sdd`) define structured development methodologies entirely through markdown files. Skills are multi-phase workflows (up to 10 steps) that orchestrate specialized agents in parallel using Claude Code's Task tool. Agents are spawned with model tiering — Sonnet for exploratory breadth, Opus for synthesis/architecture/review depth, Haiku for simple procedural tasks. A reference material system (`references/` subdirectories) provides templates, criteria, and patterns loaded at runtime.

**Task Manager App** — A Next.js 16 application using App Router with a clear server/client boundary. Server Components fetch initial task data from `~/.claude/tasks/`, Client Components manage state via TanStack Query, and a Chokidar-based file watcher pushes real-time updates through Server-Sent Events. The cross-system bridge is an `execution_pointer.txt` file written by the `execute-tasks` skill and read by the Task Manager to display execution artifacts.

**Tech Stack**: Next.js 16.1.4, React 19.2.3, TypeScript 5, TanStack Query v5, Tailwind CSS v4, shadcn/ui, Chokidar 5, pnpm workspaces.

---

## Critical Files

| File | Purpose | Relevance |
|------|---------|-----------|
| `.claude-plugin/marketplace.json` | Plugin registry defining both plugins | High |
| `plugins/tools/skills/feature-dev/SKILL.md` | 7-phase feature development workflow | High |
| `plugins/tools/skills/codebase-analysis/SKILL.md` | 4-phase codebase exploration workflow | High |
| `plugins/sdd/skills/create-spec/SKILL.md` | Adaptive interview to generate specs | High |
| `plugins/sdd/skills/create-tasks/SKILL.md` | Decomposes specs into Claude Code Tasks | High |
| `plugins/sdd/skills/execute-tasks/SKILL.md` | Autonomous task execution with retry | High |
| `apps/task-manager/src/lib/taskService.ts` | Server-side task file reading/parsing | High |
| `apps/task-manager/src/lib/fileWatcher.ts` | Chokidar singleton for real-time events | High |
| `apps/task-manager/src/app/api/events/route.ts` | SSE endpoint for real-time updates | High |
| `apps/task-manager/src/hooks/useSSE.ts` | Client SSE hook + TanStack Query invalidation | High |
| `apps/task-manager/src/components/TaskBoardClient.tsx` | Primary client component composing the board | High |
| `apps/task-manager/src/types/task.ts` | Shared TypeScript type definitions | Medium |

### Key File Details

#### `plugins/tools/skills/feature-dev/SKILL.md`
- **Key interface**: 7 sequential phases (Discovery through Summary); 3 user interaction checkpoints
- **Core logic**: Spawns up to 10 agents — 3x code-explorer (Sonnet), 1x codebase-synthesizer (Opus), 2-3x code-architect (Opus), 3x code-reviewer (Opus). Loads non-invocable "knowledge" skills at phase boundaries.
- **Connections**: References `project-conventions`, `language-patterns`, `architecture-patterns`, `code-quality`, `changelog-format` skills. Writes ADRs to `internal/docs/adr/` and updates CHANGELOG.md.

#### `apps/task-manager/src/lib/taskService.ts`
- **Key exports**: `getTaskLists()`, `getTasks(listId)`, `getTask(listId, taskId)`, `getExecutionContext(listId)`, `getTasksDir()`
- **Core logic**: Reads `~/.claude/tasks/` directory, parses JSON task files with defensive validation (handles malformed JSON, missing fields, status normalization). `resolveExecutionDir` includes path traversal protection.
- **Connections**: Used by API routes and server components.

#### `apps/task-manager/src/lib/fileWatcher.ts`
- **Key exports**: `FileWatcher` class extending `EventEmitter`, `fileWatcher` singleton instance
- **Core logic**: Watches `~/.claude/tasks/` with Chokidar using polling mode (300ms interval). Emits `taskEvent` for JSON changes, `executionEvent` for markdown/txt changes.
- **Connections**: Global singleton on `globalThis` prevents duplicate watchers during Next.js HMR. Consumed by SSE route handler.

---

## Patterns & Conventions

### Code Patterns
- **Markdown-as-Code**: All plugin logic in markdown files (SKILL.md, agent-name.md) with YAML frontmatter
- **Parallel Agent Fan-Out / Synthesize**: Spawn multiple agents, collect reports, synthesize with Opus
- **Model Tiering**: Sonnet (exploration), Opus (synthesis/architecture/review), Haiku (procedural)
- **Multi-Phase Workflows**: 4-10 phases per skill with explicit transition directives
- **Reference Material System**: `references/` subdirectories with templates and criteria loaded at runtime
- **AskUserQuestion Mandate**: All user interactions through structured tool, never plain text questions

### Naming Conventions
- Skills: `SKILL.md` (all caps), invoked via `/tools:{name}` or `/sdd:{name}`
- Agents: `{agent-name}.md` (kebab-case)
- Plugins: `claude-alchemy-{category}`
- Commits: Conventional Commits (`type(scope): description`)

### Project Structure
```
claude-alchemy/
├── apps/task-manager/      # Next.js app (pnpm workspace)
├── plugins/
│   ├── tools/              # 5 agents, 10 skills
│   └── sdd/                # 2 agents, 4 skills
├── internal/               # Documentation and images
│   ├── docs/               # Cheatsheets, workflow guides
│   └── images/             # Screenshots
├── .claude/                # Claude Code settings
└── .claude-plugin/         # Plugin marketplace config
```

### Task Manager Patterns
- **Server Component / Client Component Boundary**: Server components fetch initial data, pass to client components
- **SSE + TanStack Query**: SSE events trigger cache invalidation for real-time updates
- **Global Singleton**: `globalThis` pattern for file watcher persistence across HMR

---

## Relationship Map

### Plugin Orchestration
```
feature-dev → spawns code-explorer (3x) → codebase-synthesizer → code-architect (2-3x) → code-reviewer (3x)
codebase-analysis → spawns code-explorer (2-3x) → codebase-synthesizer
create-spec → spawns researcher → writes specs/SPEC-{name}.md
create-tasks → reads spec → calls TaskCreate/TaskUpdate APIs
execute-tasks → spawns task-executor (1 per task) → writes execution-context.md, execution_pointer.txt
```

### Task Manager Data Flow
```
~/.claude/tasks/*.json → Chokidar watcher → SSE route → useSSE hook → TanStack Query invalidation → KanbanBoard
```

### Cross-System Bridge
```
execute-tasks skill → writes execution_pointer.txt → Task Manager reads via getExecutionContext() → ExecutionDialog
```

---

## Challenges & Risks

| Challenge | Severity | Impact |
|-----------|----------|--------|
| No automated tests | High | Task Manager service logic (parsing, validation, path traversal protection) is unverified |
| Plugin workflow complexity | Medium | Up to 10 agent invocations per skill; failures require user-driven retry/skip/abort |
| Context file growth | Medium | execution-context.md grows with each task; may exceed context limits for later agents |
| Release skill mismatch | Medium | Python-centric release skill in a TypeScript/pnpm monorepo |
| Claude Code API dependency | Medium | Plugins depend on Task tool, subagent_type, TaskCreate APIs that could change |
| Empty root CLAUDE.md | Low | First execution session operates without project-wide context |

---

## Recommendations

1. **Add tests for Task Manager**: `taskService.ts` has significant parsing/validation logic that should have unit tests. `fileWatcher.ts` and the SSE route handler would benefit from integration tests.
2. **Populate root CLAUDE.md**: Document monorepo structure, plugin-app relationship, and common workflows.
3. **Budget context size for execute-tasks**: Implement truncation or summarization of execution-context.md for long sessions.
4. **Adapt or document the release skill**: Either adapt for TypeScript/pnpm or document as a template for Python projects.
5. **Document the execution_pointer bridge**: The contract between execute-tasks and Task Manager is a critical integration point.

---

## Analysis Methodology

- **Exploration agents**: 2 agents — Agent 1: Application structure and core logic; Agent 2: Configuration, infrastructure, and utilities
- **Synthesis**: Findings merged by Opus-tier synthesizer agent with in-depth file reads of critical service modules
- **Scope**: Full monorepo including plugins, application, configuration, and documentation
