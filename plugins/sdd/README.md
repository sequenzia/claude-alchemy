# SDD (Spec Driven Development): End-to-End Workflow

The SDD pipeline takes you from idea to working implementation in four steps:

```
/sdd:create-spec  →  /sdd:analyze-spec  →  /sdd:create-tasks  →  /sdd:execute-tasks
     (Spec)             (Quality Check)        (Task List)           (Implementation)
```

Each step produces artifacts that feed into the next, and you can re-enter the pipeline at any point. Optional settings in `.claude/claude-alchemy.local.md` configure output paths, author name, and other preferences across all skills.

## Step 1: Create a Spec (`/sdd:create-spec`)

The spec creation skill launches an adaptive interview that builds a structured specification from your answers.

**Settings Check** — The skill first loads `.claude/claude-alchemy.local.md` (if present) for custom configuration like output path or author name.

**Initial Gathering** — You provide four pieces of context:
1. **Spec name** — identifies the output file
2. **Product type** — "new product" or "new feature" (new feature enables codebase exploration)
3. **Depth level** — controls interview length and spec detail
4. **Description** — free-form context that shapes the interview

**Codebase Exploration** — For "new feature" type, the skill offers to explore the existing codebase to understand patterns, conventions, integration points, and data models. Findings inform follow-up questions and the final spec.

**Adaptive Interview** — The interview walks through four categories, adjusting question count and depth based on your chosen level:

| Category | Covers |
|----------|--------|
| Problem & Goals | Problem statement, success metrics, user personas, business value |
| Functional Requirements | Must-have features, user stories, acceptance criteria, edge cases |
| Technical Specifications | Architecture, tech stack, data models, APIs, performance, security |
| Implementation Planning | Phases, milestones, dependencies, risks, out-of-scope items |

| Depth Level | Rounds | Questions | Focus |
|-------------|--------|-----------|-------|
| High-level overview | 2-3 | 6-10 | Problem, goals, key features, success metrics |
| Detailed specifications | 3-4 | 12-18 | Balanced coverage, acceptance criteria, technical constraints |
| Full technical documentation | 4-5 | 18-25 | Deep probing, API endpoints, data models, security |

**Proactive Recommendations** — As you answer, the skill detects patterns (e.g., mentioning "login", "millions of users", "GDPR") and offers best-practice recommendations inline. For compliance topics (HIPAA, GDPR, PCI, WCAG), it can automatically research current requirements without you asking. Recommendations are tracked internally with their source round and acceptance status. A limit of 2 inline insights per round prevents disruption. Proactive research is capped at 2 calls per interview.

**Recommendations Round** — For detailed and full-tech specs, a dedicated round presents accumulated best-practice recommendations organized by category (Architecture, Security, User Experience, Operational). Each recommendation is presented individually with Accept/Modify/Skip options. Skipped for high-level specs or when no triggers were detected.

**Pre-Compilation Summary** — Before generating the spec, a summary of everything gathered is presented for your review. You can add, correct, or remove information at this stage. Accepted recommendations appear in a distinct "Agent Recommendations" section for transparency.

**Early Exit** — If you signal you want to wrap up early, the skill presents a truncated summary and offers to generate the spec with what was gathered. The resulting spec is marked with `**Status**: Draft (Partial)` to indicate incomplete coverage.

**Output** — The final spec is written to `specs/SPEC-{name}.md` (configurable via settings). The template used depends on your depth level — high-level, detailed, or full-tech.

## Step 2: Analyze a Spec (`/sdd:analyze-spec`)

The spec analysis skill performs a comprehensive quality review of an existing spec, identifying issues and optionally guiding you through interactive resolution.

```
/sdd:analyze-spec specs/SPEC-User-Authentication.md
```

**Workflow** — The skill validates the file, reads the spec, detects its depth level (high-level, detailed, or full-tech), checks settings, then launches the Spec Analyzer agent to perform a systematic 5-phase analysis:

1. **Load Knowledge** — Read analysis criteria and common issue patterns for the detected depth level
2. **Systematic Analysis** — Four sequential scans: Structure, Consistency, Completeness, Clarity
3. **Categorize Findings** — Assign each finding to a category and severity level
4. **Generate Report** — Write findings to `{spec-filename}.analysis.md` alongside the spec
5. **Present Results** — Summary with counts by category and severity, then offer interactive update mode

**Finding Categories:**

| Category | What It Catches |
|----------|----------------|
| Inconsistencies | Internal contradictions, naming mismatches, priority conflicts, metric misalignment |
| Missing Information | Required sections absent for depth level, undefined terms, features without acceptance criteria |
| Ambiguities | Vague quantifiers ("fast", "scalable"), undefined scope boundaries, ambiguous pronouns |
| Structure Issues | Missing template sections, content in wrong section, inconsistent formatting, orphaned references |

**Severity Levels:**

| Severity | Definition | Example |
|----------|-----------|---------|
| Critical | Would cause implementation to fail or go significantly wrong | "User authentication required" but no auth requirements defined |
| Warning | Could cause confusion or implementation problems | "Search should be fast" without defining "fast" |
| Suggestion | Quality improvement, not blocking | User stories formatted inconsistently |

**Depth-Aware Analysis** — The analysis respects the intended depth level. A high-level spec is not flagged for missing API specifications, just as a full-tech spec is scrutinized for technical completeness. Only flag what's expected at the document's depth level.

**Interactive Update Mode** — After presenting the analysis, the agent offers to walk through findings one by one:

- **Apply** — The proposed fix is applied to the spec, finding marked as "Resolved"
- **Modify** — You provide your preferred text, which is applied instead
- **Skip** — Finding is marked as "Skipped" with an optional reason

After all findings are processed, the report is updated with a Resolution Summary showing resolved and skipped counts.

**Output** — The analysis report is saved alongside the spec with an `.analysis.md` suffix (e.g., `specs/SPEC-User-Auth.analysis.md`).

## Step 3: Generate Tasks (`/sdd:create-tasks`)

The task generation skill decomposes a spec into Claude Code native Tasks with metadata, dependencies, and acceptance criteria.

```
/sdd:create-tasks specs/SPEC-User-Authentication.md
```

The skill works through eight phases: validate & load spec, detect depth & check for existing tasks, analyze spec structure, decompose features into atomic tasks, infer dependencies, preview & confirm with user, create tasks via TaskCreate/TaskUpdate, and handle errors.

**Task Metadata** — Each generated task includes:

| Field | Description |
|-------|-------------|
| `priority` | critical, high, medium, low — mapped from P0-P3 |
| `complexity` | XS, S, M, L, XL — estimates implementation scope |
| `spec_path` | Link back to the source spec |
| `source_section` | Which spec section this task implements |
| `feature_name` | Logical feature grouping |
| `task_uid` | Unique ID for merge tracking (`{spec_path}:{feature}:{type}:{seq}`) |
| `task_group` | Group name derived from spec title (slug format) |

Tasks also include categorized acceptance criteria (Functional, Edge Cases, Error Handling, Performance) and testing requirements extracted from the spec.

**Complexity Estimation:**

| Size | Scope |
|------|-------|
| XS | Single simple function (<20 lines) |
| S | Single file, straightforward (20-100 lines) |
| M | Multiple files, moderate logic (100-300 lines) |
| L | Multiple components, significant logic (300-800 lines) |
| XL | System-wide, complex integration (>800 lines) |

**Dependency Inference** — Dependencies are automatically inferred from layer relationships. The general order follows: data model → API/service → business logic → UI → tests. Tasks that set up foundational code block tasks that consume it. Cross-feature dependencies are detected when features share data models, services, or auth requirements.

**Preview & Confirmation** — Before creating tasks, the agent presents a preview summary showing the task breakdown, dependency graph, and metadata. You confirm before any tasks are written.

**Merge Mode** — Re-running `create-tasks` on the same spec merges intelligently with existing tasks using `task_uid` matching:
- **Completed tasks** are never modified
- **Pending/in-progress tasks** merge with the new generation
- **Potentially obsolete tasks** (no matching spec requirement) are flagged for user decision
- A summary reports how many existing tasks were found and their statuses

**Storage** — Tasks are created through the Claude Code native `TaskCreate` and `TaskUpdate` tools, stored as JSON files in `~/.claude/tasks/`.

**Error Handling** — The skill handles three error types: spec parsing issues (flags uncertain tasks with `needs_review: true` metadata), circular dependencies (breaks at weakest link, flags for review), and missing information (creates task with available info, adds `incomplete: true` metadata).

## Step 4: Execute Tasks (`/sdd:execute-tasks`)

The execution skill runs each task autonomously in its own subagent, following a structured 4-phase workflow.

```
/sdd:execute-tasks                              # execute all pending tasks
/sdd:execute-tasks 5                            # execute a specific task
/sdd:execute-tasks --retries 1                  # limit retries per task
/sdd:execute-tasks --task-group user-authentication   # execute tasks for a specific group
/sdd:execute-tasks --task-group payments --retries 1  # combine group filter with retries
```

**Orchestration** — The orchestrator loads the task list, builds an execution plan sorted by priority (critical → high → medium → low), and breaks ties by choosing tasks that unblock the most others. After each task completes, the dependency graph is refreshed and newly unblocked tasks are dynamically added to the plan.

**Execution Directory Initialization** — Before execution begins, the skill sets up a session directory:

| Session File | Purpose |
|-------------|---------|
| `execution_plan.md` | Saved execution plan with task order and priorities |
| `execution_context.md` | Shared learnings across tasks (patterns, decisions, issues, file map) |
| `task_log.md` | Table tracking Task ID, Subject, Status, Attempts, Token Usage |
| `tasks/` | Subdirectory for archiving completed task files |

The session lives at `.claude/sessions/__live_session__/`. A `task_execution_id` is generated using three-tier resolution: (1) `--task-group` argument → `{group}-{YYYYMMDD}-{HHMMSS}`, (2) all open tasks share the same `task_group` → `{group}-{YYYYMMDD}-{HHMMSS}`, (3) fallback → `exec-session-{YYYYMMDD}-{HHMMSS}`.

If stale files exist in `__live_session__/` from a previous interrupted run, they are archived to `.claude/sessions/interrupted-{YYYYMMDD}-{HHMMSS}/` before the new session starts.

An `execution_pointer.md` is written to `~/.claude/tasks/{CLAUDE_CODE_TASK_LIST_ID}/` containing the absolute path to `.claude/sessions/__live_session__/`. The Task Manager reads this pointer to locate and display execution artifacts.

**4-Phase Execution** — Each task runs through:

| Phase | What Happens |
|-------|-------------|
| **Understand** | Reads execution context and CLAUDE.md, loads task details, classifies the task (spec-generated vs general), explores affected files, summarizes scope |
| **Implement** | Reads all target files before modifying, follows data → service → interface → test order, matches existing patterns, runs mid-implementation checks |
| **Verify** | Spec-generated tasks: walks each acceptance criterion by category. General tasks: infers checklist from description. Runs tests and linter |
| **Complete** | Determines PASS/PARTIAL/FAIL, updates task status, appends learnings to execution context |

**Execution Context** — Tasks share learnings through `.claude/sessions/__live_session__/execution_context.md`. This file accumulates:
- **Project Patterns** — coding patterns, conventions, tech stack details
- **Key Decisions** — architecture choices and approach rationale
- **Known Issues** — problems encountered and workarounds
- **File Map** — important files and their purposes
- **Task History** — brief log of outcomes

Each task reads this file before starting and writes to it after finishing, regardless of outcome. If a prior execution context exists from a previous session, relevant learnings are merged into the new one.

**Adaptive Verification** — Verification adjusts based on task type:

| Task Type | Verification Method | Pass Threshold |
|-----------|-------------------|----------------|
| Spec-generated (has acceptance criteria) | Criterion-by-criterion evaluation across Functional, Edge Cases, Error Handling, Performance | All Functional criteria + tests pass |
| General (no acceptance criteria) | Inferred checklist from task description | Core change implemented + tests pass |

PARTIAL status means non-functional criteria failed but functional criteria passed. FAIL means functional criteria or tests failed.

**Retry Mechanism** — Failed tasks retry up to 3 times by default (configurable with `--retries`). Each retry includes the previous attempt's failure details so the agent can try a different approach. After retries are exhausted, the task remains `in_progress` and execution continues to the next task.

**Task File Archival** — After each task completes, its task file is archived to `.claude/sessions/__live_session__/tasks/` for the session record.

**Token Usage Tracking** — Each task's token usage is tracked (placeholder/estimated) and logged to `task_log.md`. The session summary includes aggregate token usage.

**Session Summary** — After all tasks are processed, you get a summary showing pass/fail counts, failed task details with failure reasons, newly unblocked tasks, and token usage. The session is then archived by moving contents from `__live_session__/` to `.claude/sessions/{task_execution_id}/`.

**CLAUDE.md Update** — After archival, the skill reviews the execution context for project-wide changes (new patterns, dependencies, commands, structure changes). If meaningful changes occurred, targeted edits are made to CLAUDE.md. Task-specific or internal implementation details are skipped.

## Monitoring with Task Manager

The [task-manager app](../../apps/task-manager/) provides a real-time Kanban board that visualizes task execution as it happens.

```bash
# In one terminal — start the dashboard
pnpm dev:task-manager    # opens on http://localhost:3030

# In another terminal — run task execution
/sdd:execute-tasks
```

The `execution_pointer.md` file written during initialization tells the Task Manager where to find session artifacts. The `taskService.ts` reads this pointer, resolves the absolute path (with path-traversal guards), and surfaces execution context and logs in the UI.

The board watches `~/.claude/tasks/` for file changes using Chokidar and pushes updates via Server-Sent Events. As `execute-tasks` moves tasks through pending → in_progress → completed, the Kanban board updates in near real-time:

- **Three columns** — Pending, In Progress, Completed
- **Active badge** — shows which task is currently executing
- **Dependency tracking** — blocked tasks display their blockers
- **Completion stats** — progress counts update as tasks finish
- **Search & filter** — find specific tasks across all columns

## Settings & Configuration

All SDD skills check for an optional settings file at `.claude/claude-alchemy.local.md`. This file is not checked into version control and allows per-project or per-user configuration.

| Setting | Used By | Description |
|---------|---------|-------------|
| Output path | create-spec, create-tasks | Custom directory for spec output (default: `specs/`) |
| Author name | create-spec, analyze-spec | Attribution in generated specs and reports |
| Custom preferences | All skills | Any additional preferences the skills should respect |

Example:
```markdown
# SDD Tools Settings

- **Output Path**: docs/specs/
- **Author**: Jane Smith
```

## Hooks

The SDD plugin includes a `PreToolUse` hook (`hooks/auto-approve-session.sh`) that enables autonomous task execution by auto-approving file operations targeting session directories.

**Approved Operations:**

| Tool | Pattern | What It Covers |
|------|---------|---------------|
| Write/Edit | `$HOME/.claude/tasks/*/execution_pointer.md` | Execution pointer updates |
| Write/Edit | `*/.claude/session/*` | Session files (context, logs, plans, task archives) |
| Bash | `mkdir` or `mv` targeting `.claude/session/` | Session directory creation and archival |

All other operations fall through to the normal permission flow. This hook is what allows `execute-tasks` to run its full loop without prompting for authorization on every session file write.
