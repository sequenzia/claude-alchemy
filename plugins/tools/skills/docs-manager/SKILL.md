---
name: docs-manager
description: Documentation management workflow for MkDocs sites — initialize, generate pages, update existing docs, and create change summaries. Use when asked to "create docs", "update documentation", "generate docs site", "manage documentation", or "docs changelog".
argument-hint: <action-or-description>
model: inherit
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task, AskUserQuestion
---

# Documentation Manager Workflow

Execute a structured 5-phase workflow for managing MkDocs documentation sites. Supports four action types: initialize a new docs site, generate documentation pages, update existing docs, and create change summaries.

**CRITICAL: Complete ALL applicable phases.** Phase 2 is conditional (only for initialization). After completing each phase, immediately proceed to the next phase without waiting for user prompts.

## Phase Overview

Execute these phases in order, completing ALL of them:

1. **Discovery & Detection** — Classify the action, detect existing MkDocs project, load supporting skills
2. **MkDocs Initialization** — *(Conditional)* Scaffold `mkdocs.yml` and starter pages if no MkDocs project exists
3. **Codebase Analysis & Planning** — Launch code-explorer agents, produce a doc plan for user approval
4. **Documentation Generation** — Launch docs-writer agents to generate or update page content
5. **Integration & Finalization** — Write files, update `mkdocs.yml` nav, validate, and present results

---

## Phase 1: Discovery & Detection

**Goal:** Determine what the user wants and what already exists.

1. **Parse the request from `$ARGUMENTS`:**
   Classify the action as one of:
   - **initialize** — Set up a new MkDocs project (user says "init docs", "set up docs site", "create documentation project")
   - **generate** — Create new documentation pages (user says "generate docs", "write API docs", "document this project")
   - **update** — Update existing documentation (user says "update docs", "sync docs with code", "docs are outdated")
   - **change-summary** — Summarize recent code changes (user says "changelog", "what changed", "release notes", "summarize changes")

   If the action is ambiguous, use `AskUserQuestion` to clarify:
   - "Initialize a new docs site"
   - "Generate documentation pages"
   - "Update existing documentation"
   - "Create a change summary"

2. **Detect existing MkDocs project:**
   - Use Glob to check for `mkdocs.yml` or `mkdocs.yaml` in the project root
   - If found, read it to understand the current site structure (theme, nav, extensions)
   - If not found and action is not `initialize`, ask the user whether to initialize first or proceed without MkDocs

3. **Detect project metadata:**
   - Check for `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `pom.xml`, or similar manifests
   - Run `git remote get-url origin 2>/dev/null` to detect repository URL
   - Note the primary language and framework

4. **Check for existing docs:**
   - Glob for `docs/**/*.md` to find existing documentation pages
   - Glob for `README.md`, `CONTRIBUTING.md`, `ARCHITECTURE.md` for existing prose
   - Note which areas already have documentation coverage

5. **Set action-specific context:**

   For **update** actions, determine the update mode:
   - **git-diff** — Update docs affected by recent code changes (default if user mentions "recent changes" or a branch/tag)
   - **full-scan** — Compare all source code against all docs for gap analysis (default if user says "full update" or "sync all")
   - **targeted** — Update specific pages or sections (default if user specifies file paths or page names)

   For **change-summary** actions, determine the range:
   - A git tag or version reference (e.g., "since v1.2.0")
   - A branch comparison (e.g., "main vs develop")
   - A time range (e.g., "last week")
   - If unspecified, use `AskUserQuestion` to determine the comparison range

6. **Summarize detection results to the user:**
   - Action type and mode
   - MkDocs project status (found/not found)
   - Existing documentation coverage
   - Proposed next steps

---

## Phase 2: MkDocs Initialization

**Goal:** Scaffold a new MkDocs project. *(Skip this phase if `mkdocs.yml` already exists AND action is not `initialize`.)*

1. **Load the configuration template:**
   - Read `${CLAUDE_PLUGIN_ROOT}/skills/docs-manager/references/mkdocs-config-template.md`

2. **Gather project information:**
   - Use detected project metadata from Phase 1 (name, description, repo URL)
   - If metadata is incomplete, use `AskUserQuestion` to fill gaps:
     - Site name
     - Site description

3. **Generate `mkdocs.yml`:**
   - Fill the template with project-specific values
   - Include Material theme with standard features (navigation, search, code copy, dark/light toggle)
   - Include pymdownx extensions (highlight, superfences, tabbed, details) and Mermaid support
   - Set up initial nav with Home and Getting Started

4. **Create starter pages:**
   - Write `docs/index.md` with project overview from README or manifest description
   - Write `docs/getting-started.md` with installation and basic usage from README or detected package manager

5. **Present the scaffold to the user:**
   - Show the generated `mkdocs.yml` configuration
   - List the created starter pages
   - Confirm before writing files

6. **If action is `initialize` only (not followed by generate/update):**
   - Skip to Phase 5 for finalization
   - Otherwise, proceed to Phase 3

---

## Phase 3: Codebase Analysis & Planning

**Goal:** Analyze the codebase and produce a documentation plan.

1. **Load skills for this phase:**
   - Read `${CLAUDE_PLUGIN_ROOT}/skills/project-conventions/SKILL.md` and apply its guidance

2. **Launch code-explorer agents based on action type:**

   ### For `generate` (new pages):
   Launch 2 code-explorer agents in parallel using the Task tool with `subagent_type: "dev-tools:code-explorer"`:

   ```
   Agent 1 — Public APIs:
   Path to analyze: [project root]
   Analysis context: Documentation generation — find public APIs
   Focus area: Public functions, classes, methods, and types that should be documented.
   Find exported/public interfaces, their signatures, parameters, return types,
   and any existing docstrings or JSDoc/pydoc comments.
   Return a structured report of your findings.
   ```

   ```
   Agent 2 — Existing Documentation:
   Path to analyze: [project root]
   Analysis context: Documentation generation — find existing docs and docstrings
   Focus area: Existing documentation files, README content, inline documentation,
   code comments, and architecture docs. Identify what is already documented
   and what documentation patterns the project uses.
   Return a structured report of your findings.
   ```

   ### For `update` with git-diff mode:
   Run `git diff --name-only [base-ref]` to get changed files, then launch 1 code-explorer agent:

   ```
   Agent 1 — Changed Files:
   Path to analyze: [project root]
   Analysis context: Documentation update — analyze changed files
   Focus area: These files have changed since [base-ref]:
   [list of changed files]

   For each changed file, identify:
   - What public APIs were added, modified, or removed
   - What behavior changes occurred
   - Which existing doc pages reference this code
   Return a structured report of your findings.
   ```

   Also use Grep to search existing docs for references to changed files and functions.

   ### For `update` with full-scan mode:
   Launch 2 code-explorer agents in parallel:

   ```
   Agent 1 — Source APIs:
   Path to analyze: [project root]
   Analysis context: Documentation gap analysis — find all public APIs
   Focus area: All public functions, classes, methods, and types across the codebase.
   For each, note whether it appears to be documented (has docstrings, appears in docs/).
   Return a structured report of your findings.
   ```

   ```
   Agent 2 — Existing Doc Pages:
   Path to analyze: [project root]/docs
   Analysis context: Documentation gap analysis — audit existing pages
   Focus area: Read all existing documentation pages. For each page, identify:
   - What code/APIs it references
   - Whether the references are current (check if referenced functions still exist)
   - Sections that appear outdated or incomplete
   Return a structured report of your findings.
   ```

   ### For `update` with targeted mode:
   Launch 1 code-explorer agent on the user-specified paths:

   ```
   Agent 1 — Targeted Analysis:
   Path to analyze: [project root]
   Analysis context: Targeted documentation update
   Focus area: Analyze these specific files/paths: [user-specified paths]

   For each, identify public APIs, behavior, existing documentation references,
   and what documentation changes are needed.
   Return a structured report of your findings.
   ```

   ### For `change-summary`:
   Run `git log --oneline [range]` and `git diff --stat [range]` to get change overview, then launch 1 code-explorer agent:

   ```
   Agent 1 — Change Analysis:
   Path to analyze: [project root]
   Analysis context: Change summary for [range]
   Focus area: These files changed in the specified range:
   [list from git diff --stat]

   For each significant change, identify:
   - What was added, modified, or removed
   - Impact on public APIs and user-facing behavior
   - Whether any changes are breaking
   Return a structured report of your findings.
   ```

3. **Produce a documentation plan:**

   Based on exploration findings, create a plan listing:
   - Pages to create (with proposed file paths under `docs/`)
   - Pages to update (with specific sections to change)
   - Proposed `mkdocs.yml` nav structure updates
   - For change summaries: which output formats to generate

4. **Present the plan for user approval:**
   Use `AskUserQuestion` to let the user:
   - "Approve the plan as-is"
   - "Modify the plan" (describe changes)
   - "Reduce scope" (select specific pages only)

---

## Phase 4: Documentation Generation

**Goal:** Generate documentation content using docs-writer agents.

1. **Load the change summary templates (if applicable):**
   - If action is `change-summary`, read `${CLAUDE_PLUGIN_ROOT}/skills/docs-manager/references/change-summary-templates.md`

2. **Group pages by dependency:**
   - **Independent pages** — Can be written without referencing other new pages (API reference, standalone guides)
   - **Dependent pages** — Reference or summarize content from other pages (index pages, overview pages)

3. **Launch docs-writer agents for independent pages:**

   Launch agents in parallel using the Task tool with `subagent_type: "dev-tools:docs-writer"` and `model: "opus"`:

   ```
   Documentation task: [page type — API reference / architecture / how-to / change summary]
   Target file: [docs/path/to/page.md]
   Project: [project name] at [project root]

   MkDocs site context:
   - Theme: Material for MkDocs
   - Extensions available: admonitions, code highlighting, tabbed content, Mermaid diagrams
   - Existing pages: [list of current doc pages]

   Exploration findings:
   [Relevant findings from Phase 3 for this page]

   Existing page content (if updating):
   [Current content of the page, or "New page — no existing content"]

   Generate the complete page content in MkDocs-flavored Markdown.
   ```

4. **Launch docs-writer agents for dependent pages:**

   After independent pages complete, launch agents for pages that reference them. Include the generated content from independent pages in the prompt context.

5. **Review generated content:**
   - Verify each page has appropriate structure (title, sections, examples)
   - Check for placeholder text that was not filled in
   - Ensure cross-references between pages use correct relative paths

---

## Phase 5: Integration & Finalization

**Goal:** Write files, update navigation, validate, and present results.

1. **Write documentation files:**
   - Write each generated page to its target path under `docs/`
   - For updates, use the Edit tool to modify existing pages
   - For new pages, use the Write tool

2. **Update `mkdocs.yml` navigation:**
   - Read the current `mkdocs.yml`
   - Add new pages to the `nav` section in logical positions
   - Preserve existing nav structure — only add or modify entries for generated pages
   - Write the updated `mkdocs.yml`

3. **Validate the documentation:**
   - Verify all files referenced in `nav` exist on disk using Glob
   - Check for broken cross-references between pages using Grep
   - If `mkdocs` CLI is available, run `mkdocs build --strict 2>&1` to check for warnings (non-blocking — report issues but don't fail)

4. **Present results to the user:**

   Summarize what was done:
   - Pages created (with file paths)
   - Pages updated (with description of changes)
   - Navigation changes made to `mkdocs.yml`
   - Any validation warnings

   For **change-summary** action, present the generated output(s) directly:
   - Markdown changelog entry — show inline for review
   - Git commit message — show inline for review
   - MkDocs page — show the file path where it was written

5. **Offer next steps:**
   Use `AskUserQuestion` with relevant options:
   - "Preview the site" (if `mkdocs serve` is available)
   - "Commit the changes"
   - "Generate additional pages"
   - "Done — no further action"

---

## Error Handling

If any phase fails:
1. Explain what went wrong
2. Ask the user how to proceed:
   - Retry the phase
   - Skip to next phase (with partial results)
   - Abort the workflow

### Non-Git Projects
If the project is not a git repository:
- Skip git remote detection in Phase 1 (omit `repo_url` and `repo_name` from mkdocs.yml)
- The `update` action with git-diff mode is unavailable — fall back to full-scan or targeted mode
- The `change-summary` action is unavailable — inform the user and suggest alternatives

---

## Agent Coordination

When launching parallel agents:
- Give each agent a distinct focus area to minimize overlap
- Wait for all agents to complete before proceeding
- Handle agent failures gracefully — continue with partial results

When calling Task tool for agents:
- Use `model: "opus"` for docs-writer agents (high-quality content generation)
- Use default model (sonnet) for code-explorer agents (fast exploration)

---

## Additional Resources

- For MkDocs configuration template, see [references/mkdocs-config-template.md](references/mkdocs-config-template.md)
- For change summary formats, see [references/change-summary-templates.md](references/change-summary-templates.md)
