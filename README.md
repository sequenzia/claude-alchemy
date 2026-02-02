# Claude Alchemy

**Supercharge your Claude Code workflow with powerful plugins and a visual task manager.**

Claude Alchemy is a collection of tools and apps designed to help developers get the most out of [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

![Claude Task Manager](./internal/images/claude-task-manager.png)

**See more screenshots [screenshots](#screenshots) below**

## Task Manager

**See your Claude Code Tasks in real-time.**

The Task Manager is a real-time Kanban board that visualizes Claude's native task system (`~/.claude/tasks/`). Watch tasks flow from Pending → In Progress → Completed as Claude works through your project.

**Key Features:**
- **Real-time updates** — Tasks update instantly via Server-Sent Events as Claude works
- **Dependency tracking** — See which tasks block others and track completion flow
- **Statistics dashboard** — Monitor progress with completion percentages and blocked task counts
- **Search & filter** — Quickly find tasks across large task lists
- **Dark/light themes** — Easy on the eyes during those long coding sessions

```bash
cd apps/task-manager
pnpm install && pnpm dev  # Starts on http://localhost:3030
```

> **New to Claude Code Tasks?** Check out the [Tasks Cheatsheet](./internal/docs/claude-tasks-cheatsheet.md) for tips on setting up `CLAUDE_CODE_TASK_LIST_ID`, task dependencies, and best practices.

## Architecture

Claude Alchemy is a pnpm monorepo with two systems:

| Component | Location | Description |
|-----------|----------|-------------|
| **Tools Plugin** | `plugins/tools/` | 5 agents, 10 skills for code exploration, architecture, review, and release workflows |
| **SDD Plugin** | `plugins/sdd/` | 2 agents, 4 skills for spec-driven development (create-spec → create-tasks → execute-tasks) |
| **Task Manager** | `apps/task-manager/` | Next.js 16 app with real-time Kanban board for Claude Code Tasks |

### Plugins

The plugin system uses a "markdown-as-code" design — all workflow logic lives in declarative `SKILL.md` and agent markdown files. Skills orchestrate specialized agents in parallel using Claude Code's Task tool.

**Tools Plugin (`claude-alchemy-tools`):**
- `/codebase-analysis` — 4-phase codebase exploration with parallel agents
- `/feature-dev` — 7-phase feature development (explore → design → implement → review)
- `/git-commit` — Conventional commit creation
- `/bump-plugin-version` — Semantic version management

**SDD Plugin (`claude-alchemy-sdd`):**
- `/create-spec` — Adaptive interview to generate specifications
- `/analyze-spec` — Spec quality analysis
- `/create-tasks` — Decompose specs into Claude Code Tasks with dependency inference
- `/execute-tasks` — Autonomous task execution with shared context

## Screenshots

### Task Manager Kanban View
![Claude Task Manager](./internal/images/claude-task-manager.png)

### Tasks Generated from sdd-tools
![Spec Tasks](./internal/images/tasks-generated-by-sdd-tools.png)

### Single Task View with Dependencies, Test Cases and Acceptance Criteria
![Task Detail View](./internal/images/task-in-task-manager.png)

### Completed Tasks in Claude Code
![Completed Tasks](./internal/images/completed-tasks-in-claude.png)


## Development

### Prerequisites

- Node.js >= 18
- pnpm >= 8

### Setup

```bash
# Clone the repository
git clone https://github.com/sequenzia/claude-alchemy.git
cd claude-alchemy

# Install dependencies
pnpm install

# Start task-manager
pnpm dev:task-manager
```

### Workspace Commands

```bash
pnpm dev:task-manager     # Start task-manager dev server
pnpm build:task-manager   # Build task-manager for production
pnpm lint                 # Run linting across all workspaces
```

## License

MIT
