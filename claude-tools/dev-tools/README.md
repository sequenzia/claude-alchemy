# dev-tools

Developer tools for feature development, Git workflows, and release automation.

## Installation

Add the plugin to your Claude Code configuration:

```bash
claude mcp add-json dev-tools '{"type": "claude-plugin", "path": "/path/to/dev-tools"}'
```

Or symlink to your Claude plugins directory.

## Skills

All dev-tools functionality is now provided through skills following the latest Claude Code guidelines.

### Workflow Skills (User-Invocable)

These skills are invoked with `/dev-tools:<skill-name>` and have `disable-model-invocation: true` to prevent automatic triggering.

#### `/dev-tools:feature-dev` - Feature Development Workflow

A comprehensive 7-phase workflow for developing features with specialized agents for codebase exploration, architecture design, and quality review.

```bash
/dev-tools:feature-dev <description>    # Run feature development workflow
```

**Phases:**
1. **Discovery** - Understand the feature requirements
2. **Codebase Exploration** - Map relevant code areas using parallel explorer agents
3. **Clarifying Questions** - Resolve ambiguities before designing
4. **Architecture Design** - Design implementation with multiple architectural approaches
5. **Implementation** - Build the feature with explicit approval
6. **Quality Review** - Review code with specialized reviewer agents
7. **Summary** - Document accomplishments and generate changelog

**Skills Loaded:**
- Phase 2: `project-conventions`, `language-patterns`
- Phase 4: `architecture-patterns`, `language-patterns`
- Phase 6: `code-quality`

**Artifacts Generated:**
- ADR saved to `internal/docs/adr/NNNN-feature-slug.md`
- Changelog entry added to `CHANGELOG.md` under `[Unreleased]`

---

#### `/dev-tools:analyze-codebase` - Codebase Analysis

Generates a comprehensive analysis report of a codebase, including architecture, patterns, technology stack, and recommendations.

```bash
/dev-tools:analyze-codebase           # Analyze current directory
/dev-tools:analyze-codebase src/      # Analyze specific path
```

**Phases:**
1. **Codebase Exploration** - Launch 3 parallel explorer agents
2. **Deep Analysis** - Analyze findings for architecture and patterns
3. **Output & Context Loading** - Choose output format (report, session context, or project docs update)

**Output Options:**
- Save detailed report to `internal/reports/codebase-analysis-report.md`
- Load analysis into session context
- Update README.md and/or CLAUDE.md with analysis

---

#### `/dev-tools:release` - Python Release Manager

Automates the complete pre-release workflow for Python packages using `uv` and `ruff`.

```bash
/dev-tools:release           # Calculate version from changelog
/dev-tools:release 1.0.0     # Use specific version override
```

**Steps:**
1. Pre-flight checks (branch, clean working directory)
2. Run tests (`uv run pytest`)
3. Run linting (`uv run ruff check`, `uv run ruff format --check`)
4. Verify build (`uv build`)
5. Changelog update check (optional changelog-agent)
6. Calculate version from changelog entries
7. Update CHANGELOG.md
8. Commit changelog
9. Create and push tag

---

#### `/dev-tools:git-commit` - Git Commit

Commit changes with a conventional commit message.

```bash
/dev-tools:git-commit
```

- Stages all changes
- Analyzes diff to determine commit type and scope
- Creates conventional commit message

---

#### `/dev-tools:git-push` - Git Push

Push local commits to remote with automatic conflict handling.

```bash
/dev-tools:git-push
```

- Checks for commits to push
- Handles upstream conflicts with automatic rebase
- Retries push after successful rebase

---

#### `/dev-tools:bump-plugin-version` - Plugin Version Bumper

Bump the version of any plugin in this repository.

```bash
/dev-tools:bump-plugin-version
```

- Discovers available plugins
- Prompts for bump level (patch, minor, major)
- Updates plugin.json and marketplace.json
- Offers to commit changes

---

#### `/dev-tools:update-changelog` - Changelog Updater

Update CHANGELOG.md with recent changes, optionally scoped to a sub-project.

```bash
/dev-tools:update-changelog              # Prompts for scope selection
/dev-tools:update-changelog all          # All changes, auto-groups by sub-project
/dev-tools:update-changelog sdd-tools    # Only sdd-tools changes
/dev-tools:update-changelog dev-tools    # Only dev-tools changes
/dev-tools:update-changelog task-manager # Only task-manager changes
/dev-tools:update-changelog project      # Only root project files
```

**Steps:**
1. Pre-flight checks (git repo, commits exist, CHANGELOG.md presence)
2. Load changelog-format guidelines
3. Determine scope from argument or prompt user
4. Launch changelog-agent with scope and path filter
5. Report completion with next steps

---

### Reference Skills (Claude-Only)

These skills are automatically loaded by Claude when relevant. They have `user-invocable: false` so they don't appear in the `/` menu.

| Skill | Description |
|-------|-------------|
| `git-workflow` | Routes git operations (commit, push, commit and push) based on user intent |
| `architecture-patterns` | Provides architectural pattern knowledge (MVC, event-driven, microservices, CQRS) |
| `language-patterns` | Language-specific patterns for TypeScript, Python, and React |
| `code-quality` | Code quality principles (SOLID, DRY, testing strategies) |
| `project-conventions` | Guides discovery of project-specific conventions |
| `changelog-format` | Keep a Changelog format guidelines and best practices |

---

## Agents

### Code Explorer Agent

Explores codebases to find relevant files, trace execution paths, and map architecture for feature development.

- **Model:** Sonnet
- **Focus areas:** Entry points, data models, utilities, shared infrastructure
- **Output:** Structured exploration report with key files, patterns, and integration points

### Code Architect Agent

Designs implementation blueprints for features using exploration findings and architectural best practices.

- **Model:** Opus
- **Approaches:** Minimal/simple, flexible/extensible, project-aligned
- **Output:** Detailed implementation blueprint with files, data flow, risks, and testing strategy

### Code Reviewer Agent

Reviews code implementations for correctness, security, and maintainability with confidence-scored findings.

- **Model:** Opus
- **Focus areas:** Correctness, security, error handling, maintainability
- **Output:** Review report with issues (confidence >= 80) and suggestions

### Codebase Analyzer Agent

Analyzes codebase exploration results to identify architecture, patterns, and key insights.

- **Model:** Opus
- **Input:** Exploration findings from code-explorer agents
- **Output:** Comprehensive analysis including architecture style, module mapping, dependency graph, technology stack, and recommendations

### Report Generator Agent

Generates comprehensive markdown reports from codebase analysis findings.

- **Model:** Sonnet
- **Input:** Analysis findings from codebase-analyzer agent
- **Output:** Polished markdown report with diagrams, tables, and structured documentation

### Changelog Agent

Analyzes git history and updates CHANGELOG.md with entries for the `[Unreleased]` section.

- Reads CHANGELOG.md to find last release version
- Gets git commits since the last release tag
- Categorizes changes based on conventional commit prefixes
- Presents entries for review before updating

---

## Directory Structure

```
dev-tools/
├── .claude-plugin/
│   └── plugin.json           # Plugin manifest
├── agents/
│   ├── changelog-agent.md
│   ├── code-architect.md
│   ├── code-explorer.md
│   ├── code-reviewer.md
│   ├── codebase-analyzer.md
│   └── report-generator.md
├── skills/
│   ├── analyze-codebase/
│   │   └── SKILL.md
│   ├── architecture-patterns/
│   │   └── SKILL.md
│   ├── bump-plugin-version/
│   │   └── SKILL.md
│   ├── changelog-format/
│   │   ├── SKILL.md
│   │   └── references/
│   │       └── entry-examples.md
│   ├── code-quality/
│   │   └── SKILL.md
│   ├── feature-dev/
│   │   ├── SKILL.md
│   │   └── references/
│   │       ├── adr-template.md
│   │       └── changelog-entry-template.md
│   ├── git-commit/
│   │   └── SKILL.md
│   ├── git-push/
│   │   └── SKILL.md
│   ├── git-workflow/
│   │   └── SKILL.md
│   ├── language-patterns/
│   │   └── SKILL.md
│   ├── project-conventions/
│   │   └── SKILL.md
│   ├── release/
│   │   └── SKILL.md
│   └── update-changelog/
│       └── SKILL.md
├── CHANGELOG.md
└── README.md
```

---

## Requirements

- Python 3.8+ (for release workflow)
- [uv](https://github.com/astral-sh/uv) package manager
- [ruff](https://github.com/astral-sh/ruff) linter
- Git repository with remote configured

## License

MIT
