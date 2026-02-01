---
name: update-changelog
description: Update CHANGELOG.md with recent changes, optionally scoped to a sub-project. Use for changelog updates, pre-release prep, or documenting recent work.
argument-hint: "[scope]"
model: haiku
user-invocable: true
disable-model-invocation: true
allowed-tools: Read, Bash, Task, AskUserQuestion
---

# Update Changelog

Orchestrate changelog updates with optional sub-project scoping. Handles pre-checks and scope selection, then delegates to the changelog-agent for git analysis and entry generation.

## Arguments

- `$ARGUMENTS` - Optional scope: `all`, `sdd-tools`, `dev-tools`, `task-manager`, or `project`. If not provided, prompts for selection.

## Workflow

Execute these 5 steps in order.

---

### Step 1: Pre-flight Checks

Verify the environment is ready:

```bash
git rev-parse --is-inside-work-tree
```
- If not a git repo, stop and report: "Not inside a git repository."

```bash
git log --oneline -1
```
- If no commits exist, stop and report: "No commits found in this repository."

```bash
ls CHANGELOG.md 2>/dev/null
```
- Note whether CHANGELOG.md exists. If it does not, inform the user: "No CHANGELOG.md found. The changelog-agent will offer to create one."

---

### Step 2: Load Context

Read the changelog-format skill for formatting guidelines:

```
${CLAUDE_PLUGIN_ROOT}/skills/changelog-format/SKILL.md
```

This provides Keep a Changelog conventions that the changelog-agent will follow.

---

### Step 3: Determine Scope

**If `$ARGUMENTS` is provided and matches a known scope**, use it directly.

**Known scopes:**

| Scope | Description | Git path filter |
|-------|-------------|----------------|
| `sdd-tools` | SDD tools plugin | `-- claude-tools/sdd-tools/` |
| `dev-tools` | Dev tools plugin | `-- claude-tools/dev-tools/` |
| `task-manager` | Task manager app | `-- claude-apps/task-manager/` |
| `project` | Root project files only | `-- . ':!claude-tools' ':!claude-apps'` |
| `all` | Entire repository | *(no filter)* |

**If `$ARGUMENTS` is empty or does not match a known scope**, use `AskUserQuestion` to ask:

```
Which scope should the changelog update cover?
```

Options:
1. "All changes (Recommended)" - Entire repository, auto-detects sub-projects
2. "sdd-tools" - Only claude-tools/sdd-tools/ changes
3. "dev-tools" - Only claude-tools/dev-tools/ changes
4. "task-manager" - Only claude-apps/task-manager/ changes

*(User can also type "project" for root-only files.)*

---

### Step 4: Launch Changelog Agent

Use the `Task` tool to spawn the changelog-agent with the determined scope.

**Agent configuration:**
- `subagent_type`: `dev-tools:changelog-agent`

**Prompt construction:**

For **scoped** updates (sdd-tools, dev-tools, task-manager, project):
```
Analyze commits since the last release and update the CHANGELOG.md [Unreleased] section.

SCOPE: {scope}
PATH FILTER: {path_filter}

Append the path filter to all git log, git diff --name-status, and git diff --dirstat commands.
For example: git log v{version}..HEAD --format="%H|%s|%b" --no-merges {path_filter}

When writing entries, place them under a sub-project heading:
### {scope}
Use #### for categories (Added, Changed, Fixed, etc.) within the sub-project heading.
```

For **all** (no filter):
```
Analyze commits since the last release and update the CHANGELOG.md [Unreleased] section.

SCOPE: all

No path filter — analyze all commits. When changes span multiple sub-projects, group entries under sub-project headings:
### sdd-tools
### dev-tools
### task-manager
### project

Use #### for categories (Added, Changed, Fixed, etc.) within each sub-project heading.
Determine sub-projects from the file paths in each commit. Commits touching only root files (not under claude-tools/ or claude-apps/) belong under "project".
If all changes belong to a single area, you may omit sub-project headings and use ### for categories directly.
```

Wait for the agent to complete before proceeding.

---

### Step 5: Report Completion

After the changelog-agent finishes, report to the user:

```
Changelog updated. Suggested next steps:
- Review the diff: git diff CHANGELOG.md
- Commit: /dev-tools:git-commit
- Push: /dev-tools:git-push
```
