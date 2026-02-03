# Claude Alchemy Tools Plugin

Developer tools for feature development, codebase analysis, documentation management, Git workflows, and release automation.

## Agents

| Agent | Model | Description |
|-------|-------|-------------|
| `code-explorer` | sonnet | Explores codebases to find relevant files, trace execution paths, and map architecture |
| `code-architect` | opus | Designs implementation blueprints using exploration findings and architectural best practices |
| `code-reviewer` | opus | Reviews code for correctness, security, and maintainability with confidence-scored findings |
| `codebase-synthesizer` | opus | Synthesizes raw exploration findings from multiple code-explorer agents into unified analysis |
| `docs-writer` | opus | Generates MkDocs-flavored Markdown documentation from codebase analysis findings |
| `researcher` | inherit | Researches technical documentation and domain knowledge via web search and Context7 |

## Skills

### User-Invocable

| Skill | Model | Description |
|-------|-------|-------------|
| `feature-dev` | inherit | 7-phase feature development workflow with exploration, architecture, implementation, and review |
| `codebase-analysis` | inherit | 4-phase codebase exploration and analysis workflow |
| `docs-manager` | inherit | 5-phase documentation management workflow for MkDocs sites |
| `git-commit` | haiku | Commit staged changes with conventional commit messages |
| `release` | haiku | Prepare and execute a Python package release with verification steps |
| `bump-plugin-version` | haiku | Bump plugin version in plugin.json and marketplace.json |

### Supporting Skills

| Skill | Description |
|-------|-------------|
| `architecture-patterns` | Architectural pattern knowledge (MVC, event-driven, microservices, CQRS) |
| `language-patterns` | Language-specific patterns and idioms |
| `project-conventions` | Project convention detection and guidance |
| `code-quality` | Code quality review standards |
| `changelog-format` | Keep a Changelog formatting guidelines |