# Orchestration Reference

This reference provides the detailed 9-step orchestration loop for executing Claude Code Tasks in dependency order. The execute-tasks skill uses this procedure to manage the full execution session.

## Step 1: Load Task List

Use `TaskList` to get all tasks and their current state.

If a `--task-group` argument was provided, filter the task list to only tasks where `metadata.task_group` matches the specified group. If no tasks match the group, inform the user and stop.

If a specific `task-id` argument was provided, validate it exists. If it doesn't exist, inform the user and stop.

## Step 2: Validate State

Handle edge cases before proceeding:

- **Empty task list**: Report "No tasks found. Use `/sdd-tools:create-tasks` to generate tasks from a spec, or create tasks manually with TaskCreate." and stop.
- **All completed**: Report a summary of completed tasks and stop.
- **Specific task-id is blocked**: Report which tasks are blocking it and stop.
- **No unblocked tasks**: Report which tasks exist and what's blocking them. Detect circular dependencies and report if found.

## Step 3: Build Execution Plan

Collect all unblocked pending tasks (status `pending`, empty `blockedBy` list, matching task group if filtered).

If a specific `task-id` was provided, the plan contains only that task.

Otherwise, sort by priority:
1. `critical` tasks first
2. `high` tasks next
3. `medium` tasks next
4. `low` tasks last
5. Tasks without priority metadata last

Break ties by "unblocks most others" — tasks that appear in the most `blockedBy` lists of other tasks execute first.

## Step 4: Check Settings

Read `.claude/sdd-tools.local.md` if it exists, for any execution preferences.

This is optional — proceed without settings if not found.

## Step 5: Present Execution Plan

Display the execution plan (informational only, no confirmation needed):

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXECUTION PLAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tasks to execute: {count}
Retry limit: {retries} per task

EXECUTION ORDER:
  1. [{id}] {subject} ({priority})
  2. [{id}] {subject} ({priority})
  ...

BLOCKED (waiting on dependencies):
  [{id}] {subject} — blocked by: {blocker ids}
  ...

COMPLETED:
  {count} tasks already completed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Step 5.5: Initialize Execution Directory

Generate a unique `task_execution_id` using three-tier resolution:
1. IF `--task-group` was provided → `{task_group}-{YYYYMMDD}-{HHMMSS}` (e.g., `user-auth-20260131-143022`)
2. ELSE IF all open tasks (pending + in_progress) share the same non-empty `metadata.task_group` → `{task_group}-{YYYYMMDD}-{HHMMSS}`
3. ELSE → `exec-session-{YYYYMMDD}-{HHMMSS}` (e.g., `exec-session-20260131-143022`)

Create the execution directory at `.claude/{task_execution_id}/` with:

1. **`execution_plan.md`** - Save the execution plan displayed in Step 5
2. **`execution-context.md`** - Initialize with standard template:
   ```markdown
   # Execution Context

   ## Project Patterns
   <!-- Discovered coding patterns, conventions, tech stack details -->

   ## Key Decisions
   <!-- Architecture decisions, approach choices made during execution -->

   ## Known Issues
   <!-- Problems encountered, workarounds applied, things to watch out for -->

   ## File Map
   <!-- Important files discovered and their purposes -->

   ## Task History
   <!-- Brief log of task outcomes with relevant context -->
   ```
3. **`task_log.md`** - Initialize with table headers:
   ```markdown
   # Task Execution Log

   | Task ID | Subject | Status | Attempts | Token Usage |
   |---------|---------|--------|----------|-------------|
   ```
4. **`tasks/`** - Empty subdirectory for archiving completed task files
5. **`execution_pointer.txt`** at `~/.claude/tasks/{CLAUDE_CODE_TASK_LIST_ID}/` — Create immediately with the path to `.claude/{task_execution_id}/`. This ensures the pointer exists even if the session is interrupted before completing.

## Step 6: Initialize Execution Context

Read `.claude/{task_execution_id}/execution-context.md` (created in Step 5.5).

If a prior execution session's context exists, merge relevant learnings (Project Patterns, Key Decisions, Known Issues, File Map) into the new execution context.

## Step 7: Execute Loop

Execute tasks fully autonomously. No user interaction between tasks.

For each task in the execution plan:

### 7a: Get Task Details

Use `TaskGet` to load full task details.

### 7b: Mark In Progress

Use `TaskUpdate` to set status to `in_progress`.

### 7c: Launch Executor Agent

Launch the `sdd-tools:task-executor` agent using the `Task` tool:

```
Task:
  subagent_type: sdd-tools:task-executor
  prompt: |
    Execute the following task.

    Task ID: {id}
    Task Subject: {subject}
    Task Description:
    ---
    {full description}
    ---

    Task Metadata:
    - Priority: {priority}
    - Complexity: {complexity}
    - Source Section: {source_section}
    - Spec Path: {spec_path}
    - Feature: {feature_name}

    {If retry attempt:}
    RETRY ATTEMPT {n} of {max_retries}
    Previous attempt failed with:
    ---
    {previous verification report}
    ---
    Focus on fixing the specific failures listed above.

    Instructions:
    1. Read the execute-tasks skill and reference files
    2. Read .claude/{task_execution_id}/execution-context.md for prior learnings
    3. Understand the task requirements and explore the codebase
    4. Implement the necessary changes
    5. Verify against acceptance criteria (or inferred criteria for general tasks)
    6. Update task status if PASS (mark completed)
    7. Append learnings to .claude/{task_execution_id}/execution-context.md
    8. Return a structured verification report
    9. Report token usage estimate (N/A or estimated)
```

### 7d: Log Task Result

After the agent returns, append a row to `.claude/{task_execution_id}/task_log.md`:

```markdown
| {id} | {subject} | {PASS/PARTIAL/FAIL} | {attempt_number}/{max_retries} | N/A |
```

### 7e: Process Result

After logging:

- Log a brief status line: `[{id}] {subject}: {PASS|PARTIAL|FAIL}`
- **If PASS**: Continue to next task
- **If PARTIAL or FAIL**: Check retry count
  - If retries remaining: Launch a fresh agent invocation with the failure context included in the prompt
  - If retries exhausted: Log final failure, leave task as `in_progress`, move to next task

### 7f: Refresh Task List

After each task completes (PASS or retries exhausted):

1. Use `TaskList` to refresh the full task state
2. Check if any previously blocked tasks are now unblocked
3. If newly unblocked tasks found, insert them into the execution plan using the priority sort from Step 3
4. Continue until no more tasks remain in the plan

### 7g: Archive Completed Task Files

If the task result is PASS, copy the task's JSON file from `~/.claude/tasks/{CLAUDE_CODE_TASK_LIST_ID}/` to `.claude/{task_execution_id}/tasks/`. Do not delete the original file.

## Step 8: Session Summary

After all tasks in the plan have been processed:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXECUTION SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tasks executed: {total attempted}
  Passed: {count}
  Failed: {count} (after {total retries} total retry attempts)

Token Usage: N/A (placeholder - token tracking not yet available)

Remaining:
  Pending: {count}
  In Progress (failed): {count}
  Blocked: {count}

{If any tasks failed:}
FAILED TASKS:
  [{id}] {subject} — {brief failure reason}
  ...

{If newly unblocked tasks were discovered:}
NEWLY UNBLOCKED:
  [{id}] {subject} — unblocked by completion of [{blocker_id}]
  ...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

After displaying the summary:
1. Save `session_summary.md` to `.claude/{task_execution_id}/` with the full summary content
2. Update `execution_pointer.txt` at `~/.claude/tasks/{CLAUDE_CODE_TASK_LIST_ID}/` containing the path to `.claude/{task_execution_id}/` so future sessions can find the latest execution

## Step 9: Update CLAUDE.md

Review `.claude/{task_execution_id}/execution-context.md` for project-wide changes that should be reflected in CLAUDE.md.

Update CLAUDE.md if the session introduced:
- New architectural patterns or conventions
- New dependencies or tech stack changes
- New development commands or workflows
- Changes to project structure
- Important design decisions that affect future development

Do NOT update CLAUDE.md for:
- Internal implementation details
- Temporary workarounds
- Task-specific learnings that don't generalize
- If no meaningful project-wide changes occurred, skip this step

Process:
1. Read current CLAUDE.md
2. Identify sections needing updates from execution context
3. Make targeted edits (do not rewrite the entire file)
4. Keep updates concise and factual

## Notes

- Tasks are executed using Claude Code's native task system (TaskGet/TaskUpdate/TaskList)
- Each task is handled by the `sdd-tools:task-executor` agent in isolation
- The execution context file enables knowledge sharing across task boundaries
- Failed tasks remain as `in_progress` for manual review or re-execution
- Run the execute-tasks skill again to pick up where you left off — it will execute any remaining unblocked tasks
- All file operations within `.claude/{task_execution_id}/` and execution_pointer.txt are pre-authorized and should never prompt for user confirmation
