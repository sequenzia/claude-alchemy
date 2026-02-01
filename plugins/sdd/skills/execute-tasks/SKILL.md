---
name: execute-tasks
description: Execute pending Claude Code Tasks in dependency order with adaptive verification. Supports task group filtering. Use when user says "execute tasks", "run tasks", "start execution", "work on tasks", or wants to execute generated tasks autonomously.
argument-hint: "[task-id] [--task-group <group>] [--retries <n>]"
user-invocable: true
disable-model-invocation: false
allowed-tools:
  - Task
  - Read
  - Write
  - Glob
  - Grep
  - Bash
  - AskUserQuestion
  - TaskList
  - TaskGet
  - TaskUpdate
arguments:
  - name: task-id
    description: Optional specific task ID to execute. If omitted, executes all unblocked tasks in dependency order.
    required: false
  - name: task-group
    description: Optional task group name to filter tasks. Only tasks with matching metadata.task_group will be executed.
    required: false
  - name: retries
    description: Number of retry attempts for failed/partial tasks before moving on. Default is 3.
    required: false
---

# Execute Tasks Skill

This skill orchestrates autonomous task execution for Claude Code Tasks. It builds a dependency-aware execution plan, launches a dedicated agent for each task through a 4-phase workflow (Understand, Implement, Verify, Complete), handles retries with failure context, and shares learnings across tasks through a shared execution context file.

## Core Principles

### 1. Understand Before Implementing

Never write code without first understanding:
- What the task requires (acceptance criteria or inferred requirements)
- What code already exists (read before modify)
- What conventions the project follows (CLAUDE.md, existing patterns)
- What earlier tasks discovered (shared execution context)

### 2. Follow Existing Patterns

Match the codebase's established patterns:
- Coding style, naming conventions, file organization
- Error handling approach, logging patterns
- Test framework, test structure, assertion style
- Import ordering, module organization

### 3. Verify Against Criteria

Do not assume implementation is correct. Verify by:
- Walking through each acceptance criterion for spec-generated tasks
- Running tests and linters for all tasks
- Confirming the core change works as intended
- Checking for regressions in existing functionality

### 4. Report Honestly

Produce accurate verification results:
- PASS only when all Functional criteria pass and tests pass
- PARTIAL when non-critical criteria fail but core works
- FAIL when Functional criteria or tests fail
- Never mark a task complete if verification fails

## Orchestration Workflow

This skill orchestrates task execution through a 9-step loop. See `references/orchestration.md` for the full detailed procedure.

### Step 1: Load Task List
Retrieve all tasks via `TaskList`. If a `--task-group` argument was provided, filter tasks to only those with matching `metadata.task_group`. If a specific `task-id` argument was provided, validate it exists.

### Step 2: Validate State
Handle edge cases: empty list, all completed, specific task blocked, no unblocked tasks, circular dependencies.

### Step 3: Build Execution Plan
Collect unblocked pending tasks (filtered by task group if specified), sort by priority (critical > high > medium > low > unprioritized), break ties by "unblocks most others."

### Step 4: Check Settings
Read `.claude/sdd-tools.local.md` if it exists for execution preferences.

### Step 5: Initialize Execution Directory
Generate a `task_execution_id` using three-tier resolution: (1) if `--task-group` provided → `{task_group}-{YYYYMMDD}-{HHMMSS}`, (2) else if all open tasks share the same `metadata.task_group` → `{task_group}-{YYYYMMDD}-{HHMMSS}`, (3) else → `exec-session-{YYYYMMDD}-{HHMMSS}`. Create `.claude/{task_execution_id}/` directory containing:
- `execution_plan.md` — saved execution plan from Step 5
- `execution-context.md` — initialized with standard template
- `task_log.md` — initialized with table headers (Task ID, Subject, Status, Attempts, Token Usage)
- `tasks/` — subdirectory for archiving completed task files
- `execution_pointer.txt` at `~/.claude/tasks/{CLAUDE_CODE_TASK_LIST_ID}/` — created immediately with path to `.claude/{task_execution_id}/`

### Step 6: Present Execution Plan and Confirm
Display the plan showing tasks to execute, blocked tasks, and completed count. Also display the the details of step 5 which includes the execution directory path and files created, including the execution pointer file location.

Then ask the user to confirm before proceeding with execution. If the user cancels, stop without modifying any tasks.

### Step 7: Initialize Execution Context
Read `.claude/{task_execution_id}/execution-context.md` (created in Step 5). If a prior execution context exists from a previous session, merge relevant learnings into the new one.

### Step 8: Execute Loop
For each task: get details, mark in progress, launch `sdd-tools:task-executor` agent, process result (PASS/PARTIAL/FAIL), handle retries, track token usage (placeholder/estimated), log result to `.claude/{task_execution_id}/task_log.md`, archive completed task files to `.claude/{task_execution_id}/tasks/`, refresh task list for newly unblocked tasks.

### Step 9: Session Summary
Display execution results with pass/fail counts, failed task list, newly unblocked tasks, and token usage summary (placeholder). Save `session_summary.md` to `.claude/{task_execution_id}/`. Update `execution_pointer.txt` at `~/.claude/tasks/{CLAUDE_CODE_TASK_LIST_ID}/` pointing to the execution directory.

### Step 10: Update CLAUDE.md
Review execution context for project-wide changes (new patterns, dependencies, commands, structure changes, design decisions). Make targeted edits to CLAUDE.md if meaningful changes occurred. Skip if only task-specific or internal implementation details.

## Task Classification

Determine whether a task is spec-generated or general to select the right verification approach.

### Detection Algorithm

1. **Check description format**: Look for `**Acceptance Criteria:**` with categorized criteria (`_Functional:_`, `_Edge Cases:_`, etc.)
2. **Check metadata**: Look for `metadata.spec_path` field
3. **Check source reference**: Look for `Source: {path} Section {number}` in the description

If any check matches -> **spec-generated task** (use criterion-based verification)

If none match -> **General task** (use inferred verification)

## 4-Phase Workflow

Each task is executed by the `sdd-tools:task-executor` agent through these phases:

### Phase 1: Understand

Load context and understand scope before writing code.

- Read the execute-tasks skill and references
- Read `.claude/{task_execution_id}/execution-context.md` for learnings from prior tasks
- Load task details via `TaskGet`
- Classify the task (spec-generated vs general)
- Parse acceptance criteria or infer requirements from description
- Explore affected files via Glob/Grep
- Read `CLAUDE.md` for project conventions

### Phase 2: Implement

Execute the code changes following project patterns.

- Read all target files before modifying them
- Follow the project's implementation order (data -> service -> interface -> tests)
- Match existing coding patterns and conventions
- Write tests if specified in testing requirements
- Run mid-implementation checks (linter, existing tests) to catch issues early

### Phase 3: Verify

Verify implementation against task requirements using the adaptive approach.

- **spec-generated tasks**: Walk each acceptance criteria category (Functional, Edge Cases, Error Handling, Performance), check testing requirements, run tests
- **General tasks**: Infer "done" from description, run existing tests, run linter, verify core change is implemented

### Phase 4: Complete

Report results and share learnings.

- Determine status (PASS/PARTIAL/FAIL) based on verification results
- If PASS: mark task as `completed` via `TaskUpdate`
- If PARTIAL or FAIL: leave as `in_progress` for the orchestrator to decide on retry
- Append learnings to `.claude/{task_execution_id}/execution-context.md` (files discovered, patterns learned, issues encountered)
- Return structured report with verification results

## Adaptive Verification Overview

Verification adapts based on task type:

| Task Type | Verification Method | Pass Threshold |
|-----------|-------------------|----------------|
| spec-generated | Criterion-by-criterion evaluation | All Functional + Tests must pass |
| General | Inferred checklist from description | Core change works + Tests pass |

**Critical rule**: All Functional criteria must pass for a PASS result. Edge Cases, Error Handling, and Performance failures result in PARTIAL but do not block completion.

## Shared Execution Context

Tasks within an execution session share learnings through `.claude/{task_execution_id}/execution-context.md`:

- **Read at start**: Check for prior task learnings before beginning work
- **Write at end**: Always append learnings regardless of PASS/PARTIAL/FAIL
- **Sections**: Project Patterns, Key Decisions, Known Issues, File Map, Task History

This enables later tasks to benefit from earlier discoveries and retry attempts to learn from previous failures.

## Key Behaviors

- **Autonomous execution loop**: After the user confirms the execution plan, no further prompts occur between tasks. The loop runs without interruption once started.
- **One agent per task**: Each task gets a fresh agent invocation with isolated context.
- **Configurable retries**: Default 3 attempts per task, configurable via `retries` argument.
- **Retry with context**: Each retry includes the previous attempt's failure details so the agent can try a different approach.
- **Dynamic unblocking**: After each task completes, the dependency graph is refreshed and newly unblocked tasks are added to the plan.
- **Honest failure handling**: After retries exhausted, tasks stay `in_progress` (not completed), and execution continues to the next task.
- **Circular dependency detection**: If all remaining tasks are blocked by each other, break at the weakest link (task with fewest blockers) and log a warning.
- **Shared context**: Agents read and write `.claude/{task_execution_id}/execution-context.md` so later tasks benefit from earlier discoveries.
- **Execution directory is pre-authorized**: All file operations within `.claude/{task_execution_id}/` and `~/.claude/tasks/{CLAUDE_CODE_TASK_LIST_ID}/execution_pointer.txt` are performed without prompting for user authorization. These are the skill's working files.

## Example Usage

### Execute all unblocked tasks
```
/sdd-tools:execute-tasks
```

### Execute a specific task
```
/sdd-tools:execute-tasks 5
```

### Execute with custom retry limit
```
/sdd-tools:execute-tasks --retries 1
```

### Execute specific task with retries
```
/sdd-tools:execute-tasks 5 --retries 5
```

### Execute tasks for a specific group
```
/sdd-tools:execute-tasks --task-group user-authentication
```

### Execute specific group with custom retries
```
/sdd-tools:execute-tasks --task-group payments --retries 1
```

## Reference Files

- `references/orchestration.md` - 9-step orchestration loop with execution plan, retry handling, and session summary
- `references/execution-workflow.md` - Detailed phase-by-phase procedures for the 4-phase workflow
- `references/verification-patterns.md` - Task classification, criterion verification, pass/fail rules, and failure reporting format
