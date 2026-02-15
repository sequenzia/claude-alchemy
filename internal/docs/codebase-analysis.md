# Codebase Analysis Report

**Analysis Context**: General codebase understanding
**Codebase Path**: `/Users/sequenzia/dev/repos/agent-alchemy`
**Date**: 2026-02-15

---

## Executive Summary

Agent Alchemy is a well-architected monorepo that extends Claude Code into a structured development platform through three interconnected subsystems — a markdown-as-code plugin system (9 agents, 15 skills), a real-time Next.js 16 Kanban board, and a VS Code validation extension — all connected through Claude's filesystem-based task system (`~/.claude/tasks/`). The most significant finding is the **absence of any test framework** across the entire repository, which poses risk as the execution orchestration and real-time streaming logic grow in complexity.

---

## Architecture Overview

Agent Alchemy follows a **markdown-as-code** philosophy where the core plugin content (agents, skills, hooks) are plain markdown files with YAML frontmatter loaded directly by Claude Code — no build step required. The compiled artifacts (Task Manager app, VS Code extension) serve as auxiliary tooling for this plugin ecosystem.

The monorepo uses pnpm workspaces, though only `apps/` is a workspace package. The three subsystems connect through a shared data contract: Claude Code's native task system writes JSON files to `~/.claude/tasks/<list>/`, consumed by both the plugin's skill workflows (via Claude's TaskCreate/TaskUpdate tools) and the Task Manager app (via filesystem watching). The schemas in `schemas/` are consumed by the VS Code extension and serve as documentation for plugin authors.

Key technologies: **TypeScript** throughout compiled code, **Next.js 16** (App Router, React 19, TanStack Query v5) for the task manager, **esbuild** for the VS Code extension, **Chokidar v5** for filesystem watching, **AJV** for schema validation, and **Tailwind v4 + shadcn/ui** for the UI layer.

---

## Critical Files

| File | Purpose | Relevance |
|------|---------|-----------|
| `core/skills/deep-analysis/SKILL.md` | Hub-and-spoke team orchestration workflow | High |
| `core/skills/execute-tasks/SKILL.md` | Wave-based concurrent task execution | High |
| `core/agents/task-executor.md` | 4-phase autonomous task execution agent | High |
| `core/agents/code-explorer.md` | Codebase exploration with team communication | High |
| `core/agents/code-synthesizer.md` | Finding merger with Bash deep investigation | High |
| `apps/task-manager/src/lib/taskService.ts` | Server-side task file reading & parsing | High |
| `apps/task-manager/src/lib/fileWatcher.ts` | Chokidar filesystem watcher singleton | High |
| `apps/task-manager/src/app/api/events/route.ts` | SSE endpoint for real-time updates | High |
| `extensions/vscode/src/frontmatter/validator.ts` | AJV-based YAML frontmatter validation | High |
| `core/hooks/auto-approve-session.sh` | PreToolUse hook for autonomous execution | High |

### File Details

#### `core/skills/deep-analysis/SKILL.md`
- **Key exports**: Reusable team coordination workflow
- **Core logic**: Reconnaissance -> dynamic focus areas -> 3 explorers (sonnet) + 1 synthesizer (opus) -> completion check -> synthesis -> cleanup
- **Connections**: Composed by feature-dev, codebase-analysis, docs-manager, create-spec

#### `core/skills/execute-tasks/SKILL.md`
- **Key exports**: Task execution orchestration with wave-based parallelism
- **Core logic**: Dependency graph -> topological sort into waves -> launch up to `max_parallel` task-executors per wave -> merge context between waves -> archive
- **Connections**: Uses task-executor agents, auto-approve hook, `~/.claude/sessions/__live_session__/` for state

#### `apps/task-manager/src/lib/taskService.ts`
- **Key exports**: `getTaskLists()`, `getTasks()`, `getExecutionContext()`, `parseProgressMd()`
- **Core logic**: Reads/parses `~/.claude/tasks/` JSON files, resolves execution pointer -> session artifacts
- **Connections**: Used by all API routes and Server Components

#### `apps/task-manager/src/lib/fileWatcher.ts`
- **Key exports**: `FileWatcher` singleton class
- **Core logic**: Chokidar v5 with polling (300ms, depth 2), global singleton via `globalThis`, emits `taskEvent` and `executionEvent`
- **Connections**: Feeds SSE route; dynamically watches execution directories

#### `extensions/vscode/src/frontmatter/validator.ts`
- **Key exports**: `validateDocument()`, compiled AJV validators
- **Core logic**: Extracts YAML frontmatter via regex, validates against agent/skill schemas, maps AJV errors to VS Code diagnostics with approximate line numbers
- **Connections**: Consumes schemas from `schemas/`, pushes diagnostics to VS Code

---

## Patterns & Conventions

### Code Patterns
- **Filesystem-as-message-bus**: All cross-system communication via file reads/writes to `~/.claude/tasks/` and `~/.claude/sessions/`. No database, no IPC.
- **Model Tiering**: Sonnet for exploration/procedural (2 agents), Opus for synthesis/architecture/review (7 agents), Haiku for simple tasks. Declared in agent frontmatter `model:` field.
- **Hub-and-Spoke Topology**: Lead creates team -> spawns workers -> workers explore independently -> synthesizer merges. No cross-worker messaging.
- **Skill Composition**: Skills load other skills at runtime via `${CLAUDE_PLUGIN_ROOT}/skills/*/SKILL.md`. Deep-analysis is the most composed — used by 4 other skills as a building block.
- **Agent Tool Access Tiers**: Read-only (architect, reviewer), read-write (task-executor, docs-writer), web-capable (researcher), interactive (spec-analyzer, changelog).
- **Server Component -> Client Hydration**: RSC fetches initial data -> passes to client component -> TanStack Query takes over with `initialData` + SSE for real-time updates.
- **SSE-driven dual invalidation**: Events invalidate both TanStack Query cache (`queryClient.invalidateQueries`) and Server Component data (`router.refresh()`).
- **Reference Material System**: `references/` subdirectories with templates, criteria, and examples loaded at runtime for progressive disclosure.
- **PreToolUse hooks for autonomy**: Auto-approve scoped file operations to enable hands-off execution.
- **Markdown-as-Code**: All plugin logic in markdown files with YAML frontmatter; no build step required.

### Naming Conventions
- **Agents**: Prefixed `agent-alchemy-` (e.g., `agent-alchemy-code-explorer`), kebab-case
- **Skills**: kebab-case directories (e.g., `deep-analysis`, `execute-tasks`) with `SKILL.md` (all caps)
- **Commits**: Conventional format `type(scope): description`
- **Reference Materials**: Stored in `references/` subdirectories within skills

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
├── core/                       # Claude Code plugin (markdown-as-code)
│   ├── agents/                 # 9 agent definitions (.md with YAML frontmatter)
│   ├── skills/                 # 15 skill workflows (SKILL.md + references/)
│   └── hooks/                  # PreToolUse hooks for autonomous execution
├── extensions/vscode/          # VS Code extension for schema validation
│   └── src/
│       ├── extension.ts        # Entry point, JSON schema registration
│       └── frontmatter/        # YAML frontmatter validation subsystem
├── schemas/                    # 7 JSON schemas for plugin file formats
├── scripts/                    # Utility scripts (deploy-docs.sh)
├── internal/docs/              # Internal project documentation
└── .claude/                    # Claude Code settings
```

---

## Relationship Map

### Cross-System Integration
```
Plugin System (core/)
│
├── Skills orchestrate Agents:
│   deep-analysis -> code-explorer (x3, sonnet) + code-synthesizer (x1, opus)
│   feature-dev -> deep-analysis -> code-architect -> code-reviewer
│   execute-tasks -> task-executor (xN, opus)
│   docs-manager -> deep-analysis -> docs-writer
│   codebase-analysis -> deep-analysis [composition]
│   create-spec -> researcher [optional]
│
├── Knowledge skills preloaded by agents:
│   code-explorer loads: project-conventions, language-patterns
│   code-synthesizer loads: project-conventions, language-patterns
│   task-executor loads: execute-tasks skill
│
├── Hook enables autonomous execution:
│   auto-approve-session.sh -> PreToolUse for Write|Edit|Bash
│   Approves: .claude/sessions/*, execution_pointer.md
│
└── Shared data: ~/.claude/tasks/<list>/*.json
    |
Task Manager (apps/task-manager/)
│
├── Server: taskService.ts reads task JSON files
│   -> page.tsx (RSC) fetches initial data -> API routes
│
├── Real-time: fileWatcher.ts (Chokidar) -> SSE -> useSSE -> TanStack Query
│
└── UI: TaskBoardClient -> KanbanBoard + TaskDetail + ExecutionDialog

VS Code Extension (extensions/vscode/)
│
├── validator.ts -> AJV against agent/skill frontmatter schemas
├── completions.ts -> autocomplete for frontmatter keys/values
├── hover.ts -> documentation on hover
└── extension.ts -> JSON validation for plugin.json, hooks.json, .mcp.json, .lsp.json
```

### Task Manager Data Flow
```
~/.claude/tasks/*.json -> Chokidar watcher -> SSE route -> useSSE hook -> TanStack Query invalidation -> KanbanBoard
Server Component (initial) -> taskService.ts -> parallel fetch -> TaskBoardClient props -> initialData for TanStack Query
```

---

## Challenges & Risks

| Challenge | Severity | Impact |
|-----------|----------|--------|
| No test framework | High | Zero automated tests in the entire repo. Logic in taskService, fileWatcher, execution orchestration, and schema validation is untested. Risk of regressions during refactoring. |
| Schema synchronization is manual | Medium | Schemas exist in both `/schemas/` and `/extensions/vscode/schemas/`. Manual sync creates drift risk — VS Code extension could validate against stale schemas. |
| Chokidar polling performance | Medium | 300ms polling interval with depth 2 is CPU-intensive for large task lists with many concurrent executors. |
| Execution context file contention | Medium | Multiple task-executor agents writing per-task context files during wave execution. Merge failures could lose cross-task learnings. |
| Plugin discovery is implicit | Medium | No `plugin.json` manifest found. Relies on Claude Code's auto-discovery, making the plugin boundary unclear. |
| Docs site content deleted | Low | Commit `6a22653` removed entire MkDocs docs/ directory (~6000 lines). `site/` still referenced in CLAUDE.md but content is gone. |
| Recent rapid renaming | Low | Last 5 commits show agent renames and restructuring. Skills referencing agents by name would break if names change again. |

---

## Recommendations

1. **Add a test framework**: Start with Vitest for the task manager (`taskService.ts` parsing, `parseProgressMd`, SSE route). This is the highest-impact gap.
2. **Automate schema synchronization**: Add a script or build step that copies `schemas/*.json` -> `extensions/vscode/schemas/` to prevent drift.
3. **Add an explicit plugin manifest**: Create a `plugin.json` to make the plugin boundary explicit and enable the extension's own validation.
4. **Consider native filesystem events**: Chokidar supports FSEvents on macOS (`usePolling: false`) for lower CPU overhead.
5. **Document the execution system**: The execute-tasks skill is the most complex piece. An architecture doc tracing the full flow would aid maintainability.

---

## Analysis Methodology

- **Exploration agents**: 3 agents with focus areas: Core Plugin System, Task Manager App, VS Code Extension + Schemas
- **Synthesis**: Findings merged by Opus-tier synthesizer with git history analysis, dependency tree inspection, and cross-reference validation
- **Scope**: All source files read in depth for critical paths (deep-analysis -> feature-dev -> execute-tasks, filesystem -> SSE -> UI, frontmatter validation pipeline). Spec-related skills read at summary level.
