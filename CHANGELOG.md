# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### sdd-tools

#### Added

- Spec metadata fields (Spec Type, Spec Depth, Description) in templates and interview agent
- Task group support (`metadata.task_group`) for organizing tasks from the same spec
- Task group filtering (`--task-group`) argument for execute-tasks skill
- Execution directory structure (`.claude/{task_execution_id}/`) for session isolation
- Task execution logging (`task_log.md`) and session summary persistence (`session_summary.md`)
- Task file archiving for completed tasks
- Token usage tracking placeholders
- Settings-aware spec path resolution in create-tasks

#### Changed

- Renamed `prd_path` metadata field to `spec_path` across all agents and references
- Execution context path moved from `.claude/execution-context.md` to `.claude/{task_execution_id}/execution-context.md`
- Spec title format changed from `# Spec: {Product Name}` to `# {Spec Name} PRD`
- Spec depth detection now checks `**Spec Depth**:` metadata field first before heuristic detection

## [0.1.0] - 2026-01-31

### Project

#### Added

- Monorepo combining claude-plugins and claude-task-manager
- MIT License
- CODEOWNERS file
- pnpm workspace configuration
- Architecture documentation in CLAUDE.md and README

### task-manager

#### Added

- Real-time Kanban board for Claude AI task files
- Three-column board (Pending, In Progress, Completed)
- SSE-based real-time updates via Chokidar file watcher
- Task filtering and search
- Dark/light theme support
- Built with Next.js 16, React 19, TanStack Query v5, shadcn/ui, Tailwind CSS v4

### dev-tools v0.3.0

#### Added

- Feature development workflow (`feature-dev`) with 7 phases
- Codebase analysis (`analyze-codebase`) with project docs update option
- Git workflow commands (`git-commit`, `git-push`)
- Release automation (`release`, `bump-plugin-version`)
- Changelog agent for git history analysis
- Architecture patterns, language patterns, project conventions, and code quality skills

### sdd-tools v0.1.0

#### Added

- Spec creation workflow (`create-spec`) with adaptive interview agent
- Spec analysis (`analyze-spec`) for quality checking
- Task generation (`create-tasks`) from specs with dependency management
- Autonomous task execution (`execute-tasks`) with adaptive verification
- Testing requirements and categorized acceptance criteria in spec templates
- Three spec depth levels: High-Level, Detailed, Full-Tech

#### Changed

- Renamed from `prd-tools` to `sdd-tools`
- Merged commands into skills for streamlined workflows

#### Fixed

- Spec generation proceeding correctly in plan mode
