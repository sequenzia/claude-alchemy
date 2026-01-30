# CLAUDE.md

## Project Overview

This monorepo combines Claude Code plugins and applications into a unified workspace:

- **claude-tools/**: Claude Code plugins (prd-tools, dev-tools)
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
│   ├── prd-tools/                    # PRD generation and analysis
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

Claude Code plugins for PRD generation and developer workflows.

**Plugins:**
- `prd-tools` (v0.2.0) - PRD generation, analysis, task generation, and task execution
- `dev-tools` (v0.2.6) - Feature development, Git workflows, release automation

**Commands:**
| Command | Description |
|---------|-------------|
| `/prd-tools:create-prd` | Start PRD creation workflow |
| `/prd-tools:analyze-prd <path>` | Analyze existing PRD for quality issues |
| `/prd-tools:create-tasks <path>` | Generate Claude Code native Tasks from PRD |
| `/prd-tools:execute-tasks [task-id]` | Execute pending tasks in dependency order with adaptive verification |
| `/dev-tools:analyze-codebase [path]` | Generate comprehensive codebase analysis |
| `/dev-tools:feature-dev <description>` | Feature development workflow (7 phases) |
| `/dev-tools:git-commit` | Stage and commit with conventional message |
| `/dev-tools:git-push` | Push to remote with automatic rebase |
| `/dev-tools:release [version]` | Python package release workflow |
| `/dev-tools:bump-plugin-version` | Bump plugin version in this repo |

### claude-apps/task-manager (@claude-alchemy/task-manager)

Real-time Kanban board for visualizing Claude AI task files from `~/.claude/tasks/`.

**Tech Stack:** Next.js 16, TanStack Query, shadcn/ui, Tailwind CSS v4

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
1. PRD Creation (prd-tools:create-prd)
   ↓
2. PRD Analysis (prd-tools:analyze-prd) [optional]
   ↓
3. Task Generation (prd-tools:create-tasks)
   ↓
4. Task Visualization (task-manager app)
   ↓
5. Task Execution (prd-tools:execute-tasks) [autonomous]
   ↓  or: Manual execution (dev-tools:feature-dev) [per task]
   ↓
6. Git Operations (dev-tools: commit, push)
   ↓
7. Release (dev-tools: changelog, release)
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
