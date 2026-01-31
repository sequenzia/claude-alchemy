# CLAUDE.md

## Project Overview

This monorepo combines Claude Code plugins and applications into a unified workspace:

- **claude-tools/**: Claude Code plugins (sdd-tools, dev-tools)
- **claude-apps/**: Applications (task-manager)

**Repository:** `sequenzia/claude-alchemy`
**License:** MIT

## Repository Structure

```
claude-alchemy/
├── .claude/                          # Claude Code configuration
├── .claude-plugin/
│   └── marketplace.json              # Plugin registry
├── claude-tools/                     # Claude Code plugins
│   ├── sdd-tools/                    # Spec generation and analysis
│   ├── dev-tools/                    # Feature development, Git workflows
│   └── shared/                       # Shared resources (future)
├── claude-apps/                      # Applications
│   └── task-manager/                 # Kanban board for Claude tasks
├── pnpm-workspace.yaml               # Workspace configuration
├── package.json                      # Root scripts
├── CLAUDE.md                         # This file
└── README.md                         # User documentation
```

## Development Commands

```bash
# Install all dependencies
pnpm install

# Start task-manager dev server (port 3030)
pnpm dev:task-manager

# Build task-manager for production
pnpm build:task-manager

# Run linting across workspaces
pnpm lint
```

## Workspaces

### claude-tools (@claude-alchemy/tools)

Claude Code plugins for spec-driven development and developer workflows.

**Plugins:**
- `sdd-tools` (v0.1.0) - Spec generation, analysis, task generation, and task execution
- `dev-tools` (v0.3.0) - Feature development, Git workflows, release automation

**Commands:**
| Command | Description |
|---------|-------------|
| `/sdd-tools:create-spec` | Start spec creation workflow |
| `/sdd-tools:analyze-spec <path>` | Analyze existing spec for quality issues |
| `/sdd-tools:create-tasks <path>` | Generate Claude Code native Tasks from spec |
| `/sdd-tools:execute-tasks [task-id]` | Execute pending tasks in dependency order with adaptive verification |
| `/dev-tools:analyze-codebase [path]` | Generate comprehensive codebase analysis |
| `/dev-tools:feature-dev <description>` | Feature development workflow (7 phases) |
| `/dev-tools:git-commit` | Stage and commit with conventional message |
| `/dev-tools:git-push` | Push to remote with automatic rebase |
| `/dev-tools:release [version]` | Python package release workflow |
| `/dev-tools:bump-plugin-version` | Bump plugin version in this repo |

### claude-apps/task-manager (@claude-alchemy/task-manager)

Real-time Kanban board for visualizing Claude AI task files from `~/.claude/tasks/`.

**Tech Stack:** Next.js 16.1.4, React 19.2.3, TanStack Query v5, shadcn/ui (Radix primitives), Tailwind CSS v4, Chokidar v5, TypeScript 5.9.3 (strict), ESLint 9

**Key Features:**
- Three-column Kanban board (Pending, In Progress, Completed)
- Real-time updates via SSE file watching
- Task filtering and search
- Dark/light theme support

## Plugin Development

### Plugin Structure

```
claude-tools/{plugin-name}/
├── .claude-plugin/
│   └── plugin.json           # Plugin manifest (required)
├── commands/                 # Slash commands (auto-discovered)
│   └── *.md                  # Command definitions
├── agents/                   # Subagents (auto-discovered)
│   └── *.md                  # Agent definitions
├── skills/                   # Skills (auto-discovered)
│   └── *.md                  # Skill definitions
├── references/               # Reference files
└── README.md                 # Plugin documentation
```

### Plugin Manifest (plugin.json)

```json
{
  "name": "plugin-name",
  "version": "0.1.0",
  "description": "Brief description",
  "commands": "auto",
  "agents": "auto",
  "skills": "auto"
}
```

### Command/Agent Frontmatter

Commands use YAML frontmatter:
```yaml
---
description: Short description
allowed-tools:
  - Read
  - Write
arguments:
  - name: arg-name
    required: true
---
```

Agents use YAML frontmatter:
```yaml
---
description: When to use this agent
tools:
  - Read
  - AskUserQuestion
model: opus  # optional: sonnet (default), opus, haiku
---
```

## Workflow Integration

```
1. Spec Creation (sdd-tools:create-spec)
   ↓
2. Spec Analysis (sdd-tools:analyze-spec) [optional]
   ↓
3. Task Generation (sdd-tools:create-tasks)
   ↓
4. Task Visualization (task-manager app)
   ↓
5. Task Execution (sdd-tools:execute-tasks) [autonomous]
   ↓  or: Manual execution (dev-tools:feature-dev) [per task]
   ↓
6. Git Operations (dev-tools: commit, push)
   ↓
7. Release (dev-tools: changelog, release)
```

## Architecture

### Architecture Style

Modular monorepo with plugin-based architecture. The task-manager app uses a layered (N-tier) design with event-driven real-time updates. The plugin system is entirely declarative/configuration-driven.

### Task Manager Architecture

- **Server Components** → parallel data fetching via `Promise.all` in page routes
- **Service Layer** → `taskService.ts` (repository pattern over `~/.claude/tasks/` filesystem)
- **Real-time Pipeline** → Chokidar file watcher (singleton) → EventEmitter → SSE ReadableStream → EventSource → TanStack Query invalidation
- **Client State** → TanStack Query v5 with query key factories, SSR hydration via `initialData`
- **UI Layer** → Smart/presentational component split (TaskBoardClient orchestrates, KanbanBoard renders)

### Plugin Architecture

- **Convention-over-configuration** → agents/skills auto-discovered from directory structure
- **Orchestrator pattern** → Skills launch parallel sub-agents with specialized focus areas
- **Execution context** → `.claude/execution-context.md` accumulates learnings across task executions
- **Multi-tier agents** → Sonnet for exploration, Opus for complex analysis/architecture/execution

### Key Design Decisions

- **File system as database** → No traditional DB; reads JSON from `~/.claude/tasks/` directly
- **SSE over WebSocket** → Simpler unidirectional push; sufficient for read-only task visualization
- **Polling file watcher** → `usePolling: true` (300ms) for cross-platform reliability over native events
- **Global singleton watcher** → `globalThis` pattern prevents duplicate Chokidar instances during HMR
- **No authentication** → Local-only tool; path traversal validation is the primary security measure

### Data Flow

```
Plugin writes task files → ~/.claude/tasks/<list>/*.json
                                    ↓ (chokidar)
                            FileWatcher singleton
                                    ↓ (EventEmitter)
                            /api/events SSE stream
                                    ↓ (EventSource)
                              useSSE hook
                                    ↓ (invalidateQueries)
                            TanStack Query cache
                                    ↓ (re-render)
                            KanbanBoard UI
```

## Conventions

### Conventional Commits

- `feat(scope): description` - New features
- `fix(scope): description` - Bug fixes
- `docs(scope): description` - Documentation
- `refactor(scope): description` - Refactoring
- `test(scope): description` - Tests
- `chore(scope): description` - Maintenance

Use `/dev-tools:git-commit` to auto-generate conventional commit messages.

### Changelog

Keep CHANGELOG.md updated following Keep a Changelog format. Use the `changelog-agent` to analyze git history.

## Marketplace Registration

Update `.claude-plugin/marketplace.json` when adding/modifying plugins:
```json
{
  "plugins": [
    {
      "name": "plugin-name",
      "version": "0.1.0",
      "source": "./claude-tools/plugin-name",
      "category": "development"
    }
  ]
}
```
