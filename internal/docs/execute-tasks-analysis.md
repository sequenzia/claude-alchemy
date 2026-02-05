# Execute-Tasks Skill: Architecture & Analysis Report

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Component Inventory](#3-component-inventory)
4. [Orchestration Workflow (10 Steps)](#4-orchestration-workflow)
5. [Task Executor: 4-Phase Workflow](#5-task-executor-4-phase-workflow)
6. [Execution Context & Knowledge Sharing](#6-execution-context--knowledge-sharing)
7. [Artifact Lifecycle](#7-artifact-lifecycle)
8. [Integration with Task Manager App](#8-integration-with-task-manager-app)
9. [Adaptive Verification System](#9-adaptive-verification-system)
10. [Dependency Resolution & Scheduling](#10-dependency-resolution--scheduling)
11. [Failure Handling & Retry Strategy](#11-failure-handling--retry-strategy)
12. [Recommendations](#12-recommendations)
13. [Risks & Edge Cases](#13-risks--edge-cases)

---

## 1. Executive Summary

The `execute-tasks` skill is the central orchestrator of the SDD (Spec-Driven Development) plugin. It sits at the culmination of a four-skill pipeline:

```
create-spec → analyze-spec → create-tasks → execute-tasks
```

Its role is to autonomously execute Claude Code Tasks in dependency order by delegating each task to a dedicated `task-executor` agent, managing retries on failure, sharing learnings across task boundaries through a persistent execution context, and integrating with a real-time Task Manager UI via a filesystem-as-message-bus pattern.

**Key characteristics:**
- 10-step orchestration loop with user confirmation gate
- One agent per task (isolation by design)
- Adaptive verification (spec-generated vs. general tasks)
- Shared execution context for cross-task learning
- Dynamic dependency graph refresh after each completion
- Session archival with interrupted-session recovery
- Real-time UI integration via execution pointer + Chokidar + SSE

---

## 2. System Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SDD Pipeline                                    │
│                                                                         │
│  create-spec ──→ SPEC-*.md ──→ create-tasks ──→ ~/.claude/tasks/*.json  │
│       │                            │                     │              │
│       │         analyze-spec ◄─────┘                     │              │
│       │         (optional QA)                            ▼              │
│       │                                          execute-tasks          │
│       │                                    (10-step orchestrator)       │
│       │                                          │         │            │
│       │                                     ┌────┘         └────┐       │
│       │                                     ▼                   ▼       │
│       │                              task-executor       task-executor  │
│       │                              (4-phase agent)     (4-phase agent)│
│       │                                     │                   │       │
│       │                                     ▼                   ▼       │
│       │                              Code Changes         Code Changes  │
└───────│─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Filesystem Integration Layer                         │
│                                                                         │
│  ~/.claude/tasks/{listId}/          .claude/sessions/__live_session__/  │
│  ├── {id}.json (task files)         ├── execution_plan.md               │
│  └── execution_pointer.md ─────────→├── execution_context.md            │
│       (absolute path)               ├── task_log.md                     │
│                                     ├── session_summary.md              │
│                                     └── tasks/ (archived JSON)          │
└─────────────────────────────────────────────────────────────────────────┘
        │                                       │
        ▼                                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Task Manager App (Real-Time UI)                      │
│                                                                         │
│  Chokidar (300ms poll) → SSE Route → useSSE hook → TanStack Query       │
│                                                      + router.refresh() │
└─────────────────────────────────────────────────────────────────────────┘
```

### Separation of Concerns

| Layer | Component | Responsibility |
|-------|-----------|---------------|
| **Orchestration** | `execute-tasks` skill | Dependency resolution, scheduling, retry logic, session management |
| **Execution** | `task-executor` agent | Single-task implementation, verification, learning capture |
| **Knowledge** | `execution_context.md` | Cross-task learning persistence |
| **Integration** | `execution_pointer.md` | Bridges task system to session artifacts |
| **Presentation** | Task Manager app | Real-time Kanban UI via filesystem events |

---

## 3. Component Inventory

### Files That Define the Skill

| File | Purpose |
|------|---------|
| `plugins/sdd/skills/execute-tasks/SKILL.md` | Skill definition with frontmatter, core principles, workflow summary |
| `plugins/sdd/skills/execute-tasks/references/orchestration.md` | Detailed 10-step orchestration procedure |
| `plugins/sdd/skills/execute-tasks/references/execution-workflow.md` | 4-phase task executor workflow |
| `plugins/sdd/skills/execute-tasks/references/verification-patterns.md` | Task classification, verification rules, pass/fail thresholds |
| `plugins/sdd/agents/task-executor.md` | Agent definition with system prompt for autonomous task execution |

### Supporting Infrastructure

| File | Purpose |
|------|---------|
| `plugins/sdd/hooks/auto-approve-session.sh` | PreToolUse hook auto-approving session file operations (currently deleted in git) |
| `plugins/sdd/hooks/hooks.json` | Hook configuration (currently deleted in git) |
| `apps/task-manager/src/lib/taskService.ts` | Server-side task/execution-context reader with path traversal protection |
| `apps/task-manager/src/lib/fileWatcher.ts` | Chokidar singleton watching task files and execution artifacts |
| `apps/task-manager/src/app/api/events/route.ts` | SSE endpoint streaming task/execution events |
| `apps/task-manager/src/hooks/useSSE.ts` | Client hook for SSE connection + TanStack Query invalidation |

### Configuration

| File | Purpose |
|------|---------|
| `.claude/claude-alchemy.local.md` | Optional per-project execution preferences |
| `.claude/settings.json` | Contains `CLAUDE_CODE_TASK_LIST_ID` |
| `plugins/sdd/.claude-plugin/plugin.json` | Plugin manifest (v0.1.4) |

---

## 4. Orchestration Workflow

The skill follows a 10-step loop (numbered with a 5.5 sub-step in the reference):

### Step 1: Load Task List
- Calls `TaskList` to retrieve all tasks
- Applies `--task-group` filter if provided (matches `metadata.task_group`)
- Validates specific `task-id` exists if provided

### Step 2: Validate State
Guards against five edge cases:
1. **Empty task list** — reports and stops
2. **All completed** — displays summary and stops
3. **Specific task blocked** — reports blockers and stops
4. **No unblocked tasks** — reports blocking graph
5. **Circular dependencies** — detects and reports

### Step 3: Build Execution Plan
- Filters to tasks where `status === 'pending'` and `blockedBy` is empty
- Sorts by priority: `critical > high > medium > low > unprioritized`
- Breaks ties by "unblocks most others" (counts how many other tasks list this one in `blockedBy`)

### Step 4: Check Settings
- Reads `.claude/claude-alchemy.local.md` (optional, non-blocking if absent)

### Step 5: Initialize Execution Directory
**Session ID generation** (3-tier):
1. `--task-group` flag → `{task_group}-{YYYYMMDD}-{HHMMSS}`
2. All open tasks share `task_group` → `{task_group}-{YYYYMMDD}-{HHMMSS}`
3. Fallback → `exec-session-{YYYYMMDD}-{HHMMSS}`

**Stale session cleanup:**
- If `__live_session__/` has leftover files → archives to `interrupted-{timestamp}/`

**Creates:**
- `.claude/sessions/__live_session__/execution_plan.md`
- `.claude/sessions/__live_session__/execution_context.md` (template with 5 sections)
- `.claude/sessions/__live_session__/task_log.md` (table headers)
- `.claude/sessions/__live_session__/tasks/` (empty directory)
- `~/.claude/tasks/{listId}/execution_pointer.md` (absolute path to live session)

### Step 6: Present Plan & Confirm
- Displays formatted plan with task count, retry limit, execution order, blocked tasks, completed count
- `AskUserQuestion` with "Yes, start execution" / "Cancel"
- **Hard gate**: cancel stops everything, no tasks modified

### Step 7: Initialize Execution Context
- Reads newly created `execution_context.md`
- Looks for most recent prior archived session in `.claude/sessions/`
- Merges relevant prior learnings (patterns, decisions, issues, file map)

### Step 8: Execute Loop (Autonomous)
For each task:
1. **7a**: `TaskGet` for full details
2. **7b**: `TaskUpdate` → `in_progress`
3. **7c**: Launch `task-executor` agent via `Task` tool with full context prompt
4. **7d**: Append result to `task_log.md`
5. **7e**: Process result — PASS continues; PARTIAL/FAIL retries or moves on
6. **7f**: `TaskList` refresh to find newly unblocked tasks → insert into plan
7. **7g**: Archive completed task JSON to `__live_session__/tasks/`

### Step 9: Session Summary
- Displays pass/fail counts, failed task list, newly unblocked tasks
- Saves `session_summary.md`
- Archives entire `__live_session__/` to `.claude/sessions/{task_execution_id}/`
- Leaves `__live_session__/` empty (pointer continues pointing to it)

### Step 10: Update CLAUDE.md
- Reviews execution context for project-wide changes
- Only updates for: new patterns, dependencies, commands, structure, design decisions
- Skips for: internal details, temporary workarounds, task-specific learnings

---

## 5. Task Executor: 4-Phase Workflow

Each task gets a fresh `task-executor` agent invocation. The agent has access to Read, Write, Edit, Glob, Grep, Bash, TaskGet, TaskUpdate, TaskList.

### Phase 1: Understand
1. Load knowledge from skill references
2. Read `execution_context.md` for prior learnings
3. `TaskGet` for full task details
4. Classify task (spec-generated vs. general)
5. Parse requirements (structured criteria or inferred)
6. Explore codebase (CLAUDE.md, Glob, Grep, read target files)
7. Summarize implementation scope

### Phase 2: Implement
1. Read all target files before editing
2. Follow dependency order: Data → Service → API → Tests → Config
3. Match existing coding patterns (from CLAUDE.md and codebase)
4. Mid-implementation checks: run linter, run existing tests
5. Write tests per acceptance criteria or task requirements

### Phase 3: Verify
**Spec-generated tasks** — criterion-by-criterion:
- Functional (ALL must pass)
- Edge Cases (flagged, don't block)
- Error Handling (flagged, don't block)
- Performance (flagged, don't block)
- Testing Requirements (ALL must pass)

**General tasks** — inferred checklist:
- Core change implemented
- Existing tests pass
- Linter passes
- No regressions

### Phase 4: Complete
- Determine PASS/PARTIAL/FAIL
- PASS → `TaskUpdate: status=completed`
- PARTIAL/FAIL → leave as `in_progress`
- Append learnings to `execution_context.md`
- Return structured verification report

---

## 6. Execution Context & Knowledge Sharing

The execution context (`execution_context.md`) is the key mechanism for cross-task learning:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Task 1      │     │  Task 2      │     │  Task 3      │
│  executor    │     │  executor    │     │  executor    │
│              │     │              │     │              │
│ Read ctx ────┼────→│ Read ctx ────┼────→│ Read ctx     │
│ Implement    │     │ Implement    │     │ Implement    │
│ Append ctx ──┼────→│ Append ctx ──┼────→│ Append ctx   │
└──────────────┘     └──────────────┘     └──────────────┘
                                                │
                                                ▼
                                    execution_context.md
                                    (accumulates learnings)
```

**Template sections:**
- **Project Patterns**: Coding conventions, tech stack details discovered
- **Key Decisions**: Architecture choices made during execution
- **Known Issues**: Problems encountered, workarounds applied
- **File Map**: Important files and their purposes
- **Task History**: Brief log of task outcomes

**Cross-session inheritance**: When starting a new session, the orchestrator looks for the most recent archived session and merges its learnings into the new context.

---

## 7. Artifact Lifecycle

```
Session Start                During Execution              Session End
─────────────               ─────────────────              ───────────

Create __live_session__/    task-executor reads/writes     Archive to
├── execution_plan.md       execution_context.md           {task_execution_id}/
├── execution_context.md    ├── Appends learnings          ├── all files moved
├── task_log.md             ├── Updates sections           └── __live_session__/
├── tasks/                  │                                   left empty
│                           task_log.md appended
│                           ├── Row per task result
│                           │
│                           tasks/ receives copies
│                           ├── Completed task JSONs
│                           │
execution_pointer.md        execution_pointer.md           pointer stays
(created at task dir)       (exists, pointing to           (points to empty
                            __live_session__/)              __live_session__/)
```

**Interrupted session handling**: If `__live_session__/` has files from a prior run, they're archived to `interrupted-{timestamp}/` before the new session begins.

---

## 8. Integration with Task Manager App

### Data Flow (Real-Time)

```
execute-tasks writes *.json      taskService.ts reads
to ~/.claude/tasks/               ├── parseTask() with defensive normalization
        │                         ├── resolveExecutionDir() with path traversal guard
        ▼                         └── getExecutionContext() reads all .md artifacts
Chokidar (300ms poll)
        │
        ▼
SSE Route (/api/events)
├── task:created / task:updated / task:deleted
├── execution:updated
        │
        ▼
useSSE hook (browser)
├── TanStack Query cache invalidation
└── router.refresh() for Server Component revalidation
```

### Security Boundaries

| Check | Location | Mechanism |
|-------|----------|-----------|
| Path traversal | `taskService.ts:145-160` | `path.relative()` ensures pointer target stays under `$HOME` |
| ListId validation | API routes | Rejects `..` and `/` in listId params |
| Task parsing | `taskService.ts:13-49` | Defensive normalization: status defaults, array coercion, required field checks |

---

## 9. Adaptive Verification System

### Task Classification Algorithm

```
Task Description
    │
    ├── Contains "**Acceptance Criteria:**" with _Functional:_ etc? → SPEC-GENERATED
    ├── Has metadata.spec_path? → SPEC-GENERATED
    ├── Contains "Source: {path} Section {n}"? → SPEC-GENERATED
    └── None match → GENERAL
```

### Pass Threshold Matrix

**Spec-generated tasks:**

| Scenario | Result |
|----------|--------|
| All Functional PASS + All Tests PASS | **PASS** |
| All Functional PASS + All Tests PASS + Edge/Error/Perf issues | **PARTIAL** |
| Any Functional FAIL | **FAIL** |
| Any Test FAIL | **FAIL** |

**General tasks:**

| Scenario | Result |
|----------|--------|
| Core change implemented + tests pass + linter clean | **PASS** |
| Core change + tests pass + linter violations | **PARTIAL** |
| Core change missing OR test failures OR regressions | **FAIL** |

### Verification Evidence Types

| Category | How Verified | Evidence |
|----------|-------------|----------|
| Functional | Code inspection + test execution | File exists, function works, test passes |
| Edge Cases | Guard clause inspection + targeted tests | Boundary handled, test covers scenario |
| Error Handling | Error path inspection + error tests | Try/catch exists, error message clear |
| Performance | Approach inspection + benchmarks | Efficient algorithm, no obvious bottlenecks |

---

## 10. Dependency Resolution & Scheduling

### Priority Sort Algorithm

```python
# Pseudocode for execution order
unblocked = [t for t in tasks if t.status == 'pending' and len(t.blockedBy) == 0]

priority_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3, None: 4}

def sort_key(task):
    # Primary: priority level
    pri = priority_order.get(task.metadata.priority, 4)
    # Secondary: unblocks most others (negative for descending)
    unblock_count = sum(1 for t in all_tasks if task.id in t.blockedBy)
    return (pri, -unblock_count)

execution_plan = sorted(unblocked, key=sort_key)
```

### Dynamic Unblocking

After each task completes:
1. Refresh full task list via `TaskList`
2. Check each blocked task: are all its `blockedBy` tasks now `completed`?
3. Newly unblocked tasks get inserted into the execution plan using the same priority sort
4. Loop continues until plan is empty

### Circular Dependency Handling

If all remaining tasks are blocked by each other:
- Detect the cycle
- Break at the "weakest link" (task with fewest blockers)
- Log a warning
- Execute the broken-out task

---

## 11. Failure Handling & Retry Strategy

### Retry Flow

```
Task Attempt 1
    │
    ├── PASS → completed, next task
    │
    └── PARTIAL/FAIL
            │
            ├── Retries remaining?
            │       │
            │       ├── YES → Fresh agent with failure context in prompt
            │       │           "RETRY ATTEMPT {n} of {max}"
            │       │           "Previous attempt failed with: {report}"
            │       │           "Focus on fixing the specific failures"
            │       │
            │       └── NO → Log final failure
            │                Leave as in_progress
            │                Continue to next task
            │
            └── Each retry logged to task_log.md
```

### Key Retry Behaviors

- **Fresh agent per retry**: New invocation, no stale state
- **Failure context forwarded**: Previous verification report included in prompt
- **Execution context consulted**: Retry can read prior attempt's learnings from context file
- **Conservative status**: Failed tasks stay `in_progress`, never marked `completed`
- **Configurable**: Default 3 retries, overridable via `--retries` argument
- **Non-blocking**: Exhausted retries don't halt the overall execution loop

---

## 12. Recommendations

### High Priority

1. **Add execution context concurrency guard**
   - Multiple task-executor agents could theoretically run in parallel if the orchestrator is modified
   - The current sequential design prevents this, but `execution_context.md` has no locking mechanism
   - Document the single-threaded invariant explicitly, or add append-only file access patterns

### Medium Priority

4. **Implement token usage tracking**
   - Token usage is currently `N/A` placeholders throughout (task_log.md, session_summary.md)
   - Claude Code's Task tool may now provide usage data in responses
   - Tracking would enable cost estimation and budget management for large execution sessions

5. **Add execution time tracking**
   - No duration tracking per task or per session
   - Adding start/end timestamps to task_log.md rows would help identify slow tasks and optimization opportunities

6. **Add task-group validation to create-tasks**
   - `execute-tasks` supports `--task-group` filtering, but `create-tasks` doesn't explicitly set `metadata.task_group`
   - The linkage depends on implicit behavior — making it explicit would improve reliability
   - Consider having create-tasks always set `task_group` to the spec name

7. **Consider parallel task execution**
   - Currently one task at a time, sequentially
   - Tasks at the same dependency level with no mutual dependencies could execute in parallel
   - This would require solving execution_context.md concurrent writes (append-only log format)
   - Significant speedup potential for large task sets with wide dependency trees

### Low Priority

8. **Add session cleanup command**
   - Archived sessions accumulate in `.claude/sessions/` with no cleanup mechanism
   - A utility to prune sessions older than N days would prevent directory bloat

9. **Add progress callback/events during execution**
   - The Task Manager sees task status changes but has no visibility into intra-task progress
   - Periodic writes to a `progress.md` file in `__live_session__/` could provide richer real-time feedback

10. **Document the PARTIAL→retry→PASS path more explicitly**
    - PARTIAL results (non-critical failures) trigger retries, but the retry agent is told to "fix failures"
    - Since PARTIAL means functional criteria passed, retries may not be cost-effective
    - Consider making PARTIAL-retry optional or configurable

---

## 13. Risks & Edge Cases

### Critical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Path inconsistency (session vs sessions)** | Agent writes to wrong directory; context lost between tasks | Fix the singular/plural mismatch in `task-executor.md` |
| **Missing auto-approve hooks** | Every file write prompts user, breaking autonomous loop | Restore hooks or run in bypass-permissions mode |
| **Execution pointer points to empty dir after archival** | Task Manager shows no artifacts between sessions | Expected behavior, but could confuse users |
| **Agent fails to append to execution_context.md** | Later tasks lose learnings from earlier ones | Agent has no error handling for context append failures |

### Edge Cases

| Edge Case | Current Handling | Gap |
|-----------|-----------------|-----|
| **All tasks blocked (circular deps)** | Breaks at weakest link + warning | No user confirmation before breaking the cycle |
| **Interrupted mid-execution** | Next run archives stale `__live_session__` | Tasks left as `in_progress` need manual reset or re-run |
| **Task file deleted externally during execution** | `TaskGet` would fail | No graceful handling; agent would likely error |
| **Execution context grows very large** | No size management | After many tasks, context could exceed agent context window |
| **Task description contains no actionable info** | General task classification, inferred verification | Agent makes best-effort; may produce vague results |
| **Retry succeeds but previous attempt left partial changes** | Fresh agent may not know what to clean up | Retry prompt says "focus on failures" but doesn't mention cleanup |
| **Multiple execute-tasks invocations simultaneously** | No locking on `__live_session__` or `execution_pointer` | Race condition on session files; undefined behavior |
| **Task group filter matches zero tasks** | Reports "no tasks found" | Good — no silent failure |
| **Extremely long task descriptions** | Passed in full via agent prompt | Could consume significant context window budget |
| **Network/filesystem errors during archival** | No explicit error handling in step 9 | Partial archival could leave inconsistent state |

### Reliability Considerations

1. **No checkpointing**: If the orchestrator crashes mid-loop, the only recovery is re-running. Completed tasks stay completed (safe), but in-progress tasks need manual review.

2. **No idempotency guarantees**: Re-running execute-tasks is safe because it filters to `pending` tasks, but tasks left as `in_progress` from a crash won't be re-executed automatically (they're not `pending`).

3. **Shared mutable state**: `execution_context.md` is read-write by every agent in sequence. Corruption of this file affects all subsequent tasks in the session.

4. **Agent context window budget**: Each task-executor agent loads the skill definition, three reference files, the execution context, the task description, and explores the codebase. For complex projects with large execution contexts, this could leave limited room for actual implementation work.
