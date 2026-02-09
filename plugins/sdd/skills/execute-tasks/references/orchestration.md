# Orchestration Reference

This reference provides the detailed 10-step orchestration loop for executing Claude Code Tasks in dependency order. The execute-tasks skill uses this procedure to manage the full execution session.

## Step 1: Load Task List

Use `TaskList` to get all tasks and their current state.

If a `--task-group` argument was provided, filter the task list to only tasks where `metadata.task_group` matches the specified group. If no tasks match the group, inform the user and stop.

If a specific `task-id` argument was provided, validate it exists. If it doesn't exist, inform the user and stop.

## Step 2: Validate State

Handle edge cases before proceeding:

- **Empty task list**: Report "No tasks found. Use `/claude-alchemy-sdd:create-tasks` to generate tasks from a spec, or create tasks manually with TaskCreate." and stop.
- **All completed**: Report a summary of completed tasks and stop.
- **Specific task-id is blocked**: Report which tasks are blocking it and stop.
- **No unblocked tasks**: Report which tasks exist and what's blocking them. Detect circular dependencies and report if found.

## Step 3: Build Execution Plan

### 3a: Resolve Max Parallel

Determine the maximum number of concurrent tasks per wave using this precedence:
1. `--max-parallel` CLI argument (highest priority)
2. `max_parallel` setting in `.claude/claude-alchemy.local.md`
3. Default: 5

### 3b: Build Dependency Graph

Collect all tasks and build a dependency graph from `blockedBy` relationships.

If a specific `task-id` was provided, the plan contains only that task (single-task mode, effectively `max_parallel = 1`).

### 3c: Assign Tasks to Waves

Use topological sorting to assign tasks to dependency-based waves:
- **Wave 1**: All pending tasks with empty `blockedBy` list (no dependencies)
- **Wave 2**: Tasks whose dependencies are ALL in Wave 1
- **Wave 3**: Tasks whose dependencies are ALL in Wave 1 or Wave 2
- Continue until all tasks are assigned to waves

If task group filtering is active, only include tasks matching the specified group.

### 3d: Sort Within Waves

Within each wave, sort by priority:
1. `critical` tasks first
2. `high` tasks next
3. `medium` tasks next
4. `low` tasks last
5. Tasks without priority metadata last

Break ties by "unblocks most others" -- tasks that appear in the most `blockedBy` lists of other tasks execute first.

If a wave contains more tasks than `max_parallel`, split into sub-waves of `max_parallel` size, maintaining the priority ordering.

### 3e: Circular Dependency Detection

Detect circular dependencies: if any tasks remain unassigned after topological sorting, they form a cycle. Report the cycle to the user and attempt to break at the weakest link (task with fewest blockers).

## Step 4: Check Settings

Read `.claude/claude-alchemy.local.md` if it exists, for any execution preferences.

This is optional -- proceed without settings if not found.

## Step 4.5: Resolve Team Strategy

Determine the team strategy for each task in the execution plan. Strategy resolution uses a four-level cascade with highest-precedence-wins semantics. See `references/team-strategies.md` for strategy definitions.

### 4.5a: Resolve Session Default Strategy

Determine the session-level default strategy using this precedence:
1. `--team-strategy <name>` CLI argument (highest priority)
2. `team_strategy` setting in `.claude/claude-alchemy.local.md`
3. Default: `solo`

**Settings file missing**: If `.claude/claude-alchemy.local.md` does not exist or does not contain a `team_strategy` field, skip to the next level. The default `solo` is used if no higher-priority source provides a value.

**Malformed settings file**: If the settings file exists but cannot be parsed or the `team_strategy` field contains non-string data, log a warning: `WARNING: Could not read team_strategy from .claude/claude-alchemy.local.md -- defaulting to solo` and use `solo`.

### 4.5b: Validate Strategy Name

Validate the resolved session default against the allowed values: `solo`, `review`, `research`, `full`.

If the strategy name is not in the allowed list:
- Log: `WARNING: Invalid team strategy "{name}" -- falling back to solo`
- Fall back to `solo`

Validation is case-sensitive. Only lowercase values are accepted.

### 4.5c: Resolve Per-Task Strategies

For each task in the execution plan, resolve its effective strategy:

1. Check `metadata.team_strategy` on the task
2. If present and valid (`solo`, `review`, `research`, `full`): use it as this task's strategy
3. If present but invalid: log `WARNING: Invalid team strategy "{name}" on task [{id}] -- falling back to session default` and use the session default
4. If absent: use the session default

Each task resolves its strategy independently. A single session may have tasks using different strategies (e.g., some tasks use `solo` while others use `review`).

### 4.5d: Record Resolved Strategies

Store the resolved strategy for each task so it can be:
- Displayed in the execution plan (Step 5)
- Used by the execute loop (Step 7) to determine whether to spawn a solo agent or a team

Record format per task:
```
task_id: {id}
resolved_strategy: {solo|review|research|full}
strategy_source: {default|settings|cli|task_metadata}
```

Where `strategy_source` indicates which cascade level provided the value:
- `default` -- no configuration specified, using built-in default
- `settings` -- from `.claude/claude-alchemy.local.md`
- `cli` -- from `--team-strategy` CLI argument
- `task_metadata` -- from `metadata.team_strategy` on the individual task

## Step 5: Present Execution Plan and Confirm

Display the execution plan:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXECUTION PLAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tasks to execute: {count}
Retry limit: {retries} per task
Max parallel: {max_parallel} per wave
Team strategy: {session_default_strategy}

{If any tasks have per-task overrides:}
Per-task overrides: {count} tasks with non-default strategies

WAVE 1 ({n} tasks):
  1. [{id}] {subject} ({priority}) [{strategy}]
  2. [{id}] {subject} ({priority}) [{strategy}]
  ...

WAVE 2 ({n} tasks):
  3. [{id}] {subject} ({priority}) [{strategy}] -- after [{dep_ids}]
  4. [{id}] {subject} ({priority}) [{strategy}] -- after [{dep_ids}]
  ...

{Additional waves...}

BLOCKED (unresolvable dependencies):
  [{id}] {subject} -- blocked by: {blocker ids}
  ...

COMPLETED:
  {count} tasks already completed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

The `[{strategy}]` tag is shown for each task. When all tasks use the session default, the tag may be omitted from individual task lines for brevity (the header `Team strategy:` line communicates the default). When any tasks differ from the session default, show the `[{strategy}]` tag on every task line to make overrides visible.

After displaying the plan, use AskUserQuestion to confirm:

```yaml
questions:
  - header: "Confirm Execution"
    question: "Ready to execute {count} tasks in {wave_count} waves (max {max_parallel} parallel, strategy: {session_default_strategy}) with up to {retries} retries per task?"
    options:
      - label: "Yes, start execution"
        description: "Proceed with the execution plan above"
      - label: "Cancel"
        description: "Abort without executing any tasks"
    multiSelect: false
```

If the user selects **"Cancel"**, report "Execution cancelled. No tasks were modified." and stop. Do not proceed to Step 5.5 or any subsequent steps.

## Step 5.5: Initialize Execution Directory

Generate a unique `task_execution_id` using three-tier resolution:
1. IF `--task-group` was provided -> `{task_group}-{YYYYMMDD}-{HHMMSS}` (e.g., `user-auth-20260131-143022`)
2. ELSE IF all open tasks (pending + in_progress) share the same non-empty `metadata.task_group` -> `{task_group}-{YYYYMMDD}-{HHMMSS}`
3. ELSE -> `exec-session-{YYYYMMDD}-{HHMMSS}` (e.g., `exec-session-20260131-143022`)

### Clean Stale Live Session

Before creating new files, check if `.claude/sessions/__live_session__/` contains leftover files from a previous session (e.g., due to interruption):

1. Check if `.claude/sessions/__live_session__/` exists and contains any files
2. If files are found:
   - Create `.claude/sessions/interrupted-{YYYYMMDD}-{HHMMSS}/` using the current timestamp
   - Move all contents from `__live_session__/` to the interrupted archive folder
   - Log: `Archived stale session to .claude/sessions/interrupted-{YYYYMMDD}-{HHMMSS}/`
   - **Recover interrupted tasks**:
     1. Use `TaskList` to get all tasks
     2. Filter to tasks with status `in_progress`
     3. If an archived `task_log.md` exists, cross-reference: only reset tasks that appear in the log (they were part of the interrupted session)
     4. If no `task_log.md` available in the archive, reset ALL `in_progress` tasks (conservative approach)
     5. Reset matched tasks to `pending` via `TaskUpdate`
     6. Log each reset: `Reset interrupted task [{id}] "{subject}" from in_progress to pending`
     7. Log: `Recovered {n} interrupted tasks (reset to pending)`
3. If `__live_session__/` is empty or doesn't exist, proceed normally

### Concurrency Guard

Check for an active execution session before proceeding:

1. Check if `.claude/sessions/__live_session__/.lock` exists
2. If lock exists, read its timestamp:
   - If timestamp is **less than 4 hours old**: another session may be active. Use `AskUserQuestion` with options:
     - "Force start (remove lock)" -- delete the lock and proceed
     - "Cancel" -- abort execution
   - If timestamp is **more than 4 hours old**: treat as stale, delete the lock, and proceed
3. If no lock exists, proceed normally

### Create Lock File

After the concurrency check passes, create `.claude/sessions/__live_session__/.lock` with:

```markdown
task_execution_id: {task_execution_id}
timestamp: {ISO 8601 timestamp}
pid: orchestrator
```

This lock is automatically cleaned up in Step 8 when `__live_session__/` contents are archived to the timestamped session folder.

### Create Session Files

Create `.claude/sessions/__live_session__/` (and `.claude/sessions/` parent if needed) with:

1. **`execution_plan.md`** - Save the execution plan displayed in Step 5
2. **`execution_context.md`** - Initialize with standard template:
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

   | Task ID | Subject | Status | Attempts | Duration | Token Usage |
   |---------|---------|--------|----------|----------|-------------|
   ```
4. **`tasks/`** - Empty subdirectory for archiving completed task files
5. **`progress.md`** - Initialize with status template:
   ```markdown
   # Execution Progress
   Status: Initializing
   Wave: 0 of {total_waves}
   Max Parallel: {max_parallel}
   Updated: {ISO 8601 timestamp}

   ## Active Tasks

   ## Completed This Session
   ```
6. **`execution_pointer.md`** at `$HOME/.claude/tasks/{CLAUDE_CODE_TASK_LIST_ID}/execution_pointer.md` -- Create immediately with the fully resolved absolute path to the live session directory (e.g., `/Users/sequenzia/dev/repos/my-project/.claude/sessions/__live_session__/`). Construct this by prepending the current working directory to `.claude/sessions/__live_session__/`. This ensures the pointer exists even if the session is interrupted before completing.

## Step 6: Initialize Execution Context

Read `.claude/sessions/__live_session__/execution_context.md` (created in Step 5.5).

If a prior execution session's context exists, look in `.claude/sessions/` for the most recent timestamped subfolder and merge relevant learnings (Project Patterns, Key Decisions, Known Issues, File Map) into the new execution context.

### Context Compaction

After merging prior learnings, check the Task History section. If it has 10 or more entries from merged sessions, compact older entries:

1. Keep the 5 most recent Task History entries in full
2. Summarize all older entries into a single "Prior Sessions Summary" paragraph at the top of the Task History section
3. Replace the old individual entries with this summary

This prevents the execution context from growing unbounded across multiple execution sessions.

## Step 7: Execute Loop

Execute tasks in waves. No user interaction between waves.

### 7a: Initialize Wave

1. Identify all unblocked tasks (pending status, all dependencies completed)
2. Sort by priority (same rules as Step 3d)
3. Take up to `max_parallel` tasks for this wave
4. If no unblocked tasks remain, exit the loop

#### 7a.1: Detect Team Groups

After selecting tasks for the wave, identify tasks that share a `metadata.team_group` value:

1. For each task in the wave, check `metadata.team_group`
2. Group tasks with the same non-empty `team_group` value together
3. Tasks without `team_group` (or with an empty value) are treated as ungrouped -- they follow standard solo or per-task team behavior

**Team group records**: For each detected group, create a group record:
```
group_id: {team_group value}
tasks: [{task_id_1}, {task_id_2}, ...]
resolved_strategy: {most complex strategy among group members}
team_name: group-team-{team_group}-{timestamp}
status: pending
```

**Strategy resolution for groups**: If group members have different `resolved_strategy` values (from Step 4.5), use the most complex strategy for the entire group. Complexity order (highest to lowest):
1. `full`
2. `research`
3. `review`
4. `solo`

For example, if one task resolved to `review` and another to `full`, the group uses `full`. Log the override: `Group "{team_group}": resolved strategy to {strategy} (highest complexity among {n} members)`

**Single-task groups**: If only one task has a particular `team_group` value (no other tasks share it, either in this wave or in later waves), treat it as an ungrouped task -- it follows standard per-task behavior. The `team_group` metadata is effectively ignored when the group contains a single task.

#### 7a.2: Check for Active Cross-Wave Groups

Before forming new groups, check for team groups that were started in a previous wave and still have pending tasks:

1. Scan the active group registry for groups with `status: active` and remaining tasks
2. If any tasks in the current wave belong to an already-active group, assign them to the existing group's team (do NOT create a new team)
3. Update the group record with the newly assigned tasks

This ensures team context carries forward across wave boundaries without re-reading the full codebase.

### 7b: Snapshot Execution Context

Read `.claude/sessions/__live_session__/execution_context.md` and hold it as the baseline for this wave. All agents in this wave will read from this same snapshot. This prevents concurrent agents from seeing partial context writes from sibling tasks.

### 7c: Launch Wave Agents

1. Mark all wave tasks as `in_progress` via `TaskUpdate`
2. Record `wave_start_time`
3. Update `progress.md`:
   ```markdown
   # Execution Progress
   Status: Executing
   Wave: {current_wave} of {total_waves}
   Max Parallel: {max_parallel}
   Updated: {ISO 8601 timestamp}

   ## Active Tasks
   - [{id}] {subject} -- Launching agent
   - [{id}] {subject} -- Launching agent
   ...

   ## Completed This Session
   {accumulated completed tasks from prior waves}
   ```
4. Launch all wave agents simultaneously using **parallel Task tool calls in a single message turn**:

For each task in the wave, look up the task's `resolved_strategy` from Step 4.5d. If the strategy is `solo`, use the standard task-executor agent. For team strategies (`review`, `research`, `full`), use the team orchestration flow defined in `references/team-strategies.md`.

**Solo strategy** -- use the Task tool:

```
Task:
  subagent_type: claude-alchemy-sdd:task-executor
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

    CONCURRENT EXECUTION MODE
    Context Write Path: .claude/sessions/__live_session__/context-task-{id}.md
    Do NOT write to execution_context.md directly.
    Do NOT update progress.md -- the orchestrator manages it.
    Write your learnings to the Context Write Path above instead.

    {If retry attempt:}
    RETRY ATTEMPT {n} of {max_retries}
    Previous attempt failed with:
    ---
    {previous verification report}
    ---
    Focus on fixing the specific failures listed above.

    Before implementing fixes:
    1. Read execution_context.md for learnings from the failed attempt
    2. Check for partial changes: incomplete files, broken imports, partial implementations
    3. Run linter and tests to assess codebase state before making changes
    4. Clean up incomplete artifacts before proceeding
    5. If previous approach was fundamentally wrong, consider reverting and trying differently

    Instructions (follow in order):
    1. Read the execute-tasks skill and reference files
    2. Read .claude/sessions/__live_session__/execution_context.md for prior learnings
    3. Understand the task requirements and explore the codebase
    4. Implement the necessary changes
    5. Verify against acceptance criteria (or inferred criteria for general tasks)
    6. Update task status if PASS (mark completed)
    7. Write learnings to .claude/sessions/__live_session__/context-task-{id}.md
    8. Return a structured verification report
    9. Report any token/usage information available from your session
```

**Team strategies** (`review`, `research`, `full`) -- the orchestrator manages the full team lifecycle for each task. Multiple tasks in the same wave may each have their own independent team running concurrently. File naming prevents collisions: each team writes to `team_activity_task-{id}.md`.

**Solo tasks do not create any team infrastructure** -- no TeamCreate, no team_activity file, zero overhead compared to existing behavior.

#### Team Lifecycle

For each task with a non-solo strategy, the orchestrator executes the following lifecycle. All steps happen within the scope of a single task's execution slot in the wave.

##### 1. Create Team

```
TeamCreate:
  name: task-team-{task-id}-{timestamp}
  description: "{Strategy} team for task [{task-id}]: {subject}"
```

Where `{timestamp}` is Unix epoch seconds at creation time. This ensures unique team names even when the same task is retried.

Immediately after TeamCreate, write the initial `team_activity_task-{id}.md` file to `.claude/sessions/__live_session__/` (see `team-strategies.md` for the full format specification):

```markdown
# Team Activity: Task {task-id}

Team: task-team-{task-id}-{timestamp}
Strategy: {review|research|full}
Status: active
Created: {ISO 8601 timestamp}
Updated: {ISO 8601 timestamp}

## Team Members

- [{role}] {agent-name} — spawning — Initializing
- [{role}] {agent-name} — waiting — Pending {previous-role}
{additional roles per strategy}

## Activity Log

{ISO 8601 timestamp} | orchestrator | Team created with strategy: {strategy}
```

Update `progress.md` active task entry to reflect team creation:
```markdown
- [{id}] {subject} -- Team: {strategy} (members spawning)
```

##### 2. Spawn Agents

Spawn agents into the team based on the resolved strategy. Agents are spawned sequentially (not all at once) because the team workflow is sequential -- each agent depends on the previous agent's output.

**Review strategy** -- spawn 2 agents:

| Order | Role | Agent Type | Model |
|-------|------|-----------|-------|
| 1 | implementer | `claude-alchemy-sdd:team-implementer` | sonnet |
| 2 | reviewer | `claude-alchemy-sdd:team-reviewer` | opus |

**Research strategy** -- spawn 2 agents:

| Order | Role | Agent Type | Model |
|-------|------|-----------|-------|
| 1 | explorer | `claude-alchemy-sdd:team-explorer` | sonnet |
| 2 | implementer | `claude-alchemy-sdd:team-implementer` | sonnet |

**Full strategy** -- spawn 3 agents:

| Order | Role | Agent Type | Model |
|-------|------|-----------|-------|
| 1 | explorer | `claude-alchemy-sdd:team-explorer` | sonnet |
| 2 | implementer | `claude-alchemy-sdd:team-implementer` | sonnet |
| 3 | reviewer | `claude-alchemy-sdd:team-reviewer` | opus |

**Agent spawn failure**: If any agent fails to spawn, log the error to `team_activity_task-{id}.md` and trigger strategy degradation (see Error Handling below). Do not leave a partially-spawned team running.

##### 3. Coordinate Sequential Workflow

The orchestrator drives the sequential workflow within the team. Agents do not communicate directly with each other -- all coordination flows through the orchestrator acting as team lead.

**Review strategy coordination flow:**

```
1. Launch implementer with task requirements + execution context snapshot
2. Wait for implementer to complete (10-minute timeout)
3. Receive implementer's summary via SendMessage (files modified, approach, tests, limitations)
4. Update team_activity: implementer -> completed
5. Update progress.md: Team: review (implementer: completed, reviewer: active)
6. Prepare reviewer handoff context: task description, acceptance criteria, list of changed
   files, implementation summary, execution context snapshot
7. Launch reviewer with full handoff context
8. Reviewer reads changed files directly from filesystem (read-only, no Write/Edit tools)
9. Reviewer verifies each acceptance criterion independently
10. Reviewer runs full test suite and linter
11. Reviewer checks for regressions, security issues, convention violations
12. Wait for reviewer to complete (5-minute timeout)
13. Update team_activity: reviewer -> completed
14. Collect reviewer's structured review report (verdict: PASS | ISSUES_FOUND | FAIL)
15. Translate verdict: PASS -> PASS, ISSUES_FOUND -> PARTIAL, FAIL -> FAIL
```

**Review edge cases:**
- Reviewer finds no issues: fast PASS path -- mark task completed immediately
- Implementer produces no code changes: reviewer still verifies correctness of no-op outcome
- Reviewer reports FAIL: include detailed issue list in retry context

See `references/team-strategies.md` Strategy 2 for full details on reviewer handoff context, review report format, result translation rules, and edge case handling.

**Research strategy coordination flow:**

```
1. Launch explorer with task requirements + execution context snapshot
2. Wait for explorer to complete (5-minute timeout)
3. Validate explorer findings report (structured format: relevant files, patterns,
   dependencies, challenges, recommended approach -- see team-strategies.md for full format)
4. Update team_activity: explorer -> completed
5. Update progress.md: Team: research (explorer: completed, implementer: active)
6. Forward explorer's structured findings report to implementer via SendMessage
7. Launch implementer with task requirements + explorer's findings
8. Implementer uses explorer's file map and patterns to accelerate Phase 1 (Understand)
9. Implementer executes Implement phase using explorer's recommended approach
10. Implementer self-verifies against acceptance criteria (no reviewer in Research strategy)
11. Wait for implementer to complete (10-minute timeout)
12. Update team_activity: implementer -> completed
13. Collect implementer's self-verification report
14. Translate implementer status directly: PASS -> PASS, PARTIAL -> PARTIAL, FAIL -> FAIL
```

**Research edge cases:**
- Explorer finds nothing relevant: implementer proceeds with own exploration; not a failure
- Explorer times out: degrade to Solo (see team-strategies.md for details)
- SendMessage fails: log warning, implementer proceeds without findings

See `references/team-strategies.md` Strategy 3 for full details on explorer findings format, handoff protocol, self-verification approach, and edge case handling.

**Full strategy coordination flow:**

```
1. Launch explorer with task requirements + execution context snapshot
2. Wait for explorer to complete
3. Update team_activity: explorer -> completed
4. Update progress.md: Team: full (explorer: completed, implementer: active, reviewer: spawning)
5. Send explorer's research report to implementer via SendMessage
6. Launch implementer with task requirements + explorer's findings
7. Wait for implementer to complete
8. Update team_activity: implementer -> completed
9. Update progress.md: Team: full (explorer: completed, implementer: completed, reviewer: active)
10. Send both explorer's report and implementer's report to reviewer via SendMessage
11. Launch reviewer with task requirements + both reports
12. Wait for reviewer to complete
13. Update team_activity: reviewer -> completed
14. Collect reviewer's verification report
```

At each agent phase transition, update `team_activity_task-{id}.md`:
- Change the member's status from `active` to `completed` (or `failed`)
- Add an activity log entry with timestamp: `[{ISO 8601}] {role}: {activity description}`
- Update the file's `Updated:` timestamp and `Status:` field

**Agent timeouts**: Set reasonable timeouts per role:
- Explorer: 5 minutes (exploration should be fast, read-only)
- Implementer: 10 minutes (code changes take longer)
- Reviewer: 5 minutes (review is read-only analysis)

If an agent exceeds its timeout, treat it as a failure and trigger degradation.

**Communication failure**: If SendMessage fails when forwarding one agent's output to the next, log the error and attempt to continue with whatever context is available. If the implementer cannot receive explorer findings, proceed without them (effectively degrading Research/Full toward Review/Solo behavior).

##### 4. Collect and Translate Results

After the final agent in the workflow completes, translate the team's results into the standard pass/partial/fail status used by the rest of the orchestration loop.

**When a reviewer is present** (Review and Full strategies):

| Reviewer Verdict | Translated Status | Notes |
|-----------------|-------------------|-------|
| PASS | PASS | All functional criteria verified, tests pass |
| ISSUES_FOUND | PARTIAL | Functional criteria pass but edge/error/performance issues found |
| FAIL | FAIL | Functional criteria or tests failed |

**When no reviewer is present** (Research strategy):

Use the implementer's self-reported status directly:
- Implementer reports COMPLETED with passing tests -> PASS
- Implementer reports PARTIAL -> PARTIAL
- Implementer reports FAILED -> FAIL

**Mixed completion states**: If the team is still partially active when a failure triggers early termination (e.g., implementer fails so reviewer never runs), the orchestrator:
1. Records the failure status immediately
2. Sends `shutdown_request` to any still-active agents
3. Proceeds to cleanup

Update `team_activity_task-{id}.md` with the final status:
```markdown
Status: completed  (or: failed)
```

And a final activity log entry:
```
[{ISO 8601}] Team result: {PASS|PARTIAL|FAIL}
```

##### 5. Cleanup

After collecting results (or after a failure/degradation), clean up the team:

1. Send `shutdown_request` to all team agents that are still active
2. Call `TeamDelete` to remove the team
3. Update `team_activity_task-{id}.md`:
   - Set `Status:` to `completed` or `failed`
   - Add activity log entry: `[{ISO 8601}] Team deleted`
   - Set all member statuses to their final state

**Cleanup is mandatory on all exit paths**: success, failure, degradation, and timeout. No team should be left orphaned. The orchestrator must ensure TeamDelete is called even if intermediate steps fail.

#### Graceful Degradation

When a team agent fails, the orchestrator attempts simpler strategies before failing the task. This section defines the complete degradation system: chains, triggers, per-strategy partial failure rules, logging, result recording, and retry interaction.

##### Degradation Chains

Each non-solo strategy has a defined degradation chain that the orchestrator follows on failure:

| Starting Strategy | Chain | Terminal Fallback |
|-------------------|-------|-------------------|
| **Full** | Full -> Review -> Solo | Normal retry flow (Step 7e) |
| **Review** | Review -> Solo | Normal retry flow (Step 7e) |
| **Research** | Research -> Solo | Normal retry flow (Step 7e) |
| **Solo** | N/A | Normal retry flow (Step 7e) |

The orchestrator walks the chain one step at a time. Each step is a fresh attempt with a simpler strategy. If a degraded strategy also fails, the orchestrator continues down the chain until Solo is reached. If Solo fails, the task enters the normal retry flow.

##### Degradation Triggers

Degradation is triggered by any of the following conditions:

| Trigger | Description | Detection |
|---------|-------------|-----------|
| **Agent spawn failure** | TeamCreate succeeds but agent spawn fails, or TeamCreate itself fails | Task tool returns error; agent never starts executing |
| **Agent timeout** | Agent does not complete within its role timeout (Explorer: 5min, Implementer: 10min, Reviewer: 5min) | Orchestrator timeout exceeded; no response received |
| **Agent crash** | Agent sends an error response instead of a valid result | Task tool returns error status or malformed response |
| **Team coordination failure** | SendMessage fails when forwarding output between agents | SendMessage API returns error; message not delivered |

When any trigger fires, the orchestrator evaluates whether the failure is recoverable (partial team failure with an acceptable result) or requires degradation to a simpler strategy.

##### Partial Failure Rules by Strategy

Not all agent failures require full degradation. The action depends on which role failed and which strategy is active.

**Full strategy** (explorer + implementer + reviewer):

| Role Failed | Action | Rationale |
|------------|--------|-----------|
| Explorer fails | Degrade to **Review** -- implementer + reviewer proceed without exploration findings | Exploration is helpful but not essential; implementation can still succeed |
| Implementer fails | Degrade to **Solo** -- skip Review, start over with solo agent | Implementer is the critical role; without implementation, review is meaningless |
| Reviewer fails (implementer succeeded) | **Accept implementer's result as PARTIAL** -- log that review was skipped | Implementation is complete; lack of independent review reduces confidence but does not invalidate the work |
| Explorer + implementer fail | Degrade to **Solo** -- skip Review entirely since implementation already failed | No point attempting Review when the implementation role is the one that failed |
| All three fail | Degrade to **Solo** | Terminal degradation step |

**Review strategy** (implementer + reviewer):

| Role Failed | Action | Rationale |
|------------|--------|-----------|
| Implementer fails | Degrade to **Solo** -- fall back to single task-executor agent | Critical role; without implementation there is nothing to review |
| Reviewer fails (implementer succeeded) | **Accept implementer's result as PARTIAL** -- log that review was skipped | Implementation is complete; marking PARTIAL signals reduced verification confidence |
| Both fail | Degrade to **Solo** | Terminal degradation step |

**Research strategy** (explorer + implementer):

| Role Failed | Action | Rationale |
|------------|--------|-----------|
| Explorer fails | Degrade to **Solo** -- solo agent handles exploration internally as part of Phase 1 | Exploration is built into the solo workflow's Understand phase |
| Implementer fails (explorer succeeded) | Retry implementer once with explorer's findings still available; if retry fails, degrade to **Solo** | Explorer's research is valuable context; worth one retry before discarding it |
| Both fail | Degrade to **Solo** | Terminal degradation step |

##### Degradation Procedure

When a degradation trigger fires, the orchestrator executes the following steps:

1. **Log the failure** to `team_activity_task-{id}.md`:
   ```
   [{ISO 8601}] {role}: Failed -- {failure description}
   [{ISO 8601}] Degradation triggered
   Degraded: {original_strategy} -> {new_strategy}
   Reason: {failure description}
   Timestamp: {ISO 8601}
   ```

2. **Clean up the failed team** before attempting the simpler strategy:
   - Send `shutdown_request` to all agents that are still active in the current team
   - Wait briefly (up to 5 seconds) for agents to acknowledge shutdown
   - Call `TeamDelete` to remove the team
   - Verify the team is fully cleaned up -- no orphaned agents
   - If `TeamDelete` fails, log a warning and proceed -- the team will eventually time out on its own

3. **Log degradation** to `task_log.md`:
   ```markdown
   | {id} | {subject} | DEGRADED | {original_strategy} -> {new_strategy} | {reason} | {ISO 8601 timestamp} |
   ```

4. **Update the task's resolved strategy** to the degraded strategy. Append the degradation event to the task's degradation history (kept in memory by the orchestrator for the duration of the session).

5. **Re-execute the task** with the degraded strategy:
   - If degrading to another team strategy (e.g., Full -> Review): create a new team and run the team lifecycle from step 1 (Create Team)
   - If degrading to Solo: launch a standard task-executor agent as defined in the Solo strategy section

6. **If the degraded strategy also fails**: continue down the degradation chain (e.g., Full -> Review failed -> now try Solo). Repeat from step 1.

7. **If Solo is reached and fails**: the task exits the degradation system and enters the normal retry flow (Step 7e). Solo is used for all subsequent retry attempts -- the orchestrator does not re-attempt team strategies during retries.

##### Recording the Final Strategy

After a task completes (whether through the original strategy or a degraded one), the orchestrator records the final strategy used:

1. **In the task result metadata**: Store the strategy that ultimately produced the result:
   ```
   final_strategy: {solo|review|research|full}
   original_strategy: {solo|review|research|full}
   degradation_count: {number of degradation steps taken}
   ```

2. **In `task_log.md`**: The final PASS/PARTIAL/FAIL row includes the strategy:
   ```markdown
   | {id} | {subject} | {PASS/PARTIAL/FAIL} | {attempt}/{max} [{final_strategy}] | {duration} | {token_usage} |
   ```

3. **In the session summary** (Step 8): Degradation counts are aggregated in the `Team Strategies:` section:
   ```
   Degradations: {count} (e.g., Full -> Review: {n}, Review -> Solo: {n}, Research -> Solo: {n})
   ```

##### Degradation Logging

Degradation events are logged in two places to support both real-time monitoring and post-session debugging:

**`team_activity_task-{id}.md`** (real-time, per-team):
```
[{ISO 8601}] {role}: Failed -- {failure description}
[{ISO 8601}] Degradation triggered
Degraded: {original_strategy} -> {new_strategy}
Reason: {failure description}
Timestamp: {ISO 8601}
```

The `team_activity_task-{id}.md` file's `Status:` field is set to `degraded` when degradation occurs. If the task succeeds after degradation with a new team strategy, a new `team_activity_task-{id}.md` file is created for the degraded strategy's team. The original degraded file is preserved for debugging (renamed to `team_activity_task-{id}-degraded-{n}.md` where `{n}` is the degradation step number).

**`task_log.md`** (session-level):
Each degradation event gets its own row:
```markdown
| {id} | {subject} | DEGRADED | {original} -> {new} | {reason} | {timestamp} |
```

The final outcome also gets a row (PASS/PARTIAL/FAIL) showing the strategy that produced the result.

##### Degradation History

The orchestrator maintains a degradation history for each task in memory during the session. This history is:

1. **Included in retry context**: If a task exhausts all degradation options and enters the retry flow, the retry prompt includes the degradation history so the solo agent knows what was already attempted:
   ```
   DEGRADATION HISTORY:
   1. Strategy: full -- Explorer timed out after 300s
   2. Strategy: review -- Implementer crashed with error: {message}
   3. Strategy: solo -- (current retry attempt)
   ```

2. **Written to `context-task-{id}.md`**: After a task completes (success or failure), the degradation history is included in the per-task context file so it is preserved in the execution context for future reference.

3. **Included in the session summary**: The Step 8 summary includes aggregate degradation statistics in the `Team Strategies:` section.

##### Retry Interaction

Degradation and retries are separate systems with distinct counters:

- **Degradation** walks down the strategy chain (Full -> Review -> Solo). Each step is a fresh attempt with a simpler strategy. Degradation does **not** count against the task retry limit.
- **Retries** re-attempt the task with the same strategy (Solo) after all degradation options are exhausted. Retries decrement the retry counter.

**Interaction rules:**

1. A task starts with its resolved strategy and full retry budget (e.g., 3 retries)
2. If the strategy fails, degradation occurs (retry counter unchanged)
3. Degradation continues until Solo is reached or the task succeeds
4. If Solo fails after degradation, the task enters the normal retry flow with its full retry budget intact
5. All retries after degradation use Solo strategy -- team strategies are not re-attempted
6. If retries are also exhausted, the task remains `in_progress` for manual review

**Example flow** for a Full strategy task with 3 retries:
```
Full -> fails (explorer timeout)
  Degradation 1: Review -> fails (implementer crash)
    Degradation 2: Solo -> fails (test failures)
      Retry 1/3: Solo -> fails (different test failure)
        Retry 2/3: Solo -> PASS
```
Total degradations: 2, total retries used: 2/3, final strategy: solo.

##### Degradation Edge Cases

**All strategies fail for a task:**
When degradation reaches Solo and Solo also fails, the task enters the normal retry flow (Step 7e). All retries use Solo strategy. If retries are exhausted, the task remains `in_progress`. The degradation history is preserved in `context-task-{id}.md` and included in the session summary.

**Degradation during concurrent wave execution:**
Degradation happens within a single task's execution slot. Other tasks in the same wave are not affected by one task's degradation. Each task manages its own degradation chain independently. The wave completes when all tasks (including those undergoing degradation) have finished or exhausted their options.

**Cleanup guarantees:**
Each degradation step performs a full team cleanup (shutdown agents, TeamDelete) before attempting the next strategy. No team or agent is left orphaned. If TeamDelete fails during cleanup, the orchestrator logs a warning and proceeds -- the team will eventually time out on its own.

**Multiple degradations for the same task:**
A task can degrade multiple times (e.g., Full -> Review -> Solo). Each degradation creates its own log entries and cleanup cycle. The `team_activity_task-{id}.md` file from the original strategy is preserved; new team strategies create new team activity files with the same task ID but different team names (the timestamp component ensures uniqueness).

#### Concurrent Teams

Multiple tasks in the same wave may each spawn their own independent team. The orchestrator manages all teams concurrently:

- Each team has its own `team_activity_task-{id}.md` file -- no file write contention
- Each team has a unique team name: `task-team-{task-id}-{timestamp}`
- Teams do not interact with each other
- The orchestrator tracks each team's lifecycle independently
- A wave completes when ALL tasks (both solo and team) have finished

Example: A wave with 3 tasks might look like:
```
- [15] Fix typo in README -- Solo (task-executor agent)
- [42] Add user authentication -- Team: review (implementer + reviewer)
- [99] Implement payment flow -- Team: full (explorer + implementer + reviewer)
```

All three execute concurrently. Task 15 finishes first (simple solo task). Tasks 42 and 99 each run their team workflows independently.

**Important**: When `max_parallel` is 1, omit the `CONCURRENT EXECUTION MODE` section from the solo agent prompt. The agent will write directly to `execution_context.md` as in the original sequential behavior. Team tasks always use `team_activity_task-{id}.md` regardless of `max_parallel`.

#### Cross-Task Team Groups

When tasks share a `metadata.team_group` value (detected in Step 7a.1), they are assigned to a shared team rather than each getting their own team. This allows agents to maintain context (explored files, patterns, codebase understanding) across task boundaries.

##### Shared Team Lifecycle

The shared team lifecycle differs from per-task teams in several ways:

1. **Team creation**: ONE team is created for the entire group, not per task. The team is created when the first task in the group is launched:
   ```
   TeamCreate:
     name: group-team-{team_group}-{timestamp}
     description: "{Strategy} team for group '{team_group}' ({n} tasks)"
   ```

2. **Sequential execution within group**: Tasks in the same group execute sequentially on the shared team (not concurrently), even if they appear in the same wave. This maintains context continuity -- agents do not need to re-read the full codebase between tasks.

3. **Team activity file**: The group shares a single `team_activity_group-{team_group}.md` file instead of per-task files. The format follows the same conventions as per-task `team_activity_task-{id}.md` files (see `team-strategies.md` for the full format specification), with additional group-specific fields:
   ```markdown
   # Team Activity: Group {team_group}

   Team: group-team-{team_group}-{timestamp}
   Strategy: {resolved group strategy}
   Status: active
   Created: {ISO 8601 timestamp}
   Updated: {ISO 8601 timestamp}
   Group Tasks: [{id_1}], [{id_2}], [{id_3}]
   Current Task: [{id}] {subject}
   Completed Tasks: [{id}] PASS, [{id}] PASS

   ## Team Members

   - [{role}] {agent-name} — {status} — {current-phase}
   - [{role}] {agent-name} — {status} — {current-phase}

   ## Activity Log

   {ISO 8601 timestamp} | orchestrator | Team created for group: {team_group}
   {ISO 8601 timestamp} | orchestrator | Starting task [{id}]: {subject}
   {ISO 8601 timestamp} | {role} | {activity description}
   ...
   {ISO 8601 timestamp} | orchestrator | Task [{id}] completed: PASS
   {ISO 8601 timestamp} | orchestrator | Starting task [{id_2}]: {subject_2}
   ...
   ```

4. **Context persistence between tasks**: When one task in the group completes and the next begins, agents retain their codebase understanding. The orchestrator passes the previous task's results and learnings to the agents for the next task without re-spawning the team. If the strategy includes an explorer, the explorer runs only for the first task in the group -- subsequent tasks reuse the exploration findings.

5. **Team cleanup**: The team is cleaned up ONLY after ALL tasks in the group have completed (or after all remaining tasks have exhausted retries). The team is NOT cleaned up between tasks within the group.

##### Cross-Wave Group Persistence

If a group's tasks span multiple waves (because some tasks depend on tasks outside the group), the team persists across wave boundaries:

1. At the end of a wave, check each active group: if the group has remaining tasks in later waves, do NOT clean up the team
2. The group's `status` remains `active` in the group registry
3. When the next wave begins and includes tasks from the group (Step 7a.2), they are assigned to the existing team
4. The `team_activity_group-{team_group}.md` file continues accumulating entries across waves
5. `team_activity_group-{team_group}.md` files for active cross-wave groups are NOT deleted during the 7f context merge -- they persist until the group completes

**Wave boundary logging**: When a group spans a wave boundary, log:
```
[{ISO 8601}] Wave {n} ended -- team persists ({m} tasks remaining in group)
```

##### Group Task Failure Handling

When a task within a group fails:

1. **Team continues**: The failure affects only the current task, not the entire group. The team moves on to the next task in the group.
2. **Failed task enters retry**: The failed task is handled by the standard retry flow (Step 7e). On retry, it is re-assigned to the group's shared team (if the team is still active).
3. **Retry within team context**: When the failed task retries on the shared team, it benefits from the team's accumulated context -- the agents still have codebase knowledge from prior group tasks.
4. **All tasks fail**: If all tasks in the group fail and exhaust retries, the team is cleaned up and all tasks remain as `in_progress`.
5. **Logging**: Group task failures include group context in the log:
   ```
   [{ISO 8601}] Task [{id}] failed in group "{team_group}" -- {failure reason}
   [{ISO 8601}] Team continues with {n} remaining tasks in group
   ```

##### Wave Slot Accounting for Groups

Since grouped tasks execute sequentially on their shared team, they occupy a single concurrent slot in the wave (not one slot per task). This means:

- A group of 3 tasks counts as 1 slot against `max_parallel`
- Other solo tasks and independent teams can run concurrently alongside the group
- The group finishes its sequential execution independently of other wave tasks

##### progress.md Display for Groups

Active groups are displayed in `progress.md` with group context:

```markdown
## Active Tasks
- [Group: {team_group}] Team: {strategy} -- Task [{id}] {subject} (2/4 tasks complete)
- [15] Fix typo in README -- Solo
- [42] Add user authentication -- Team: review (implementer: active, reviewer: spawning)
```

### 7d: Process Results

As each task completes (whether via solo agent return or team lifecycle completion):

1. Calculate `duration = current_time - task_start_time`. Format: <60s = `{s}s`, <60m = `{m}m {s}s`, >=60m = `{h}h {m}m {s}s`
2. Capture token usage from the Task tool response if available, otherwise `N/A`
3. Append a row to `.claude/sessions/__live_session__/task_log.md`:
   ```markdown
   | {id} | {subject} | {PASS/PARTIAL/FAIL} | {attempt_number}/{max_retries} | {duration} | {token_usage or N/A} |
   ```
   For team tasks, duration includes the full team lifecycle (all agent phases). Token usage is the sum across all agents in the team if available.
4. Log a brief status line: `[{id}] {subject}: {PASS|PARTIAL|FAIL}`
   For team tasks, append the strategy: `[{id}] {subject}: {PASS|PARTIAL|FAIL} (strategy: {strategy})`
5. Update `progress.md` -- move the task from Active Tasks to Completed This Session:
   ```markdown
   ## Active Tasks
   - [{other_id}] {subject} -- Phase 2 -- Implementing
   ...

   ## Completed This Session
   - [{id}] {subject} -- PASS ({duration})
   - [{id}] {subject} -- Team: {strategy} -- PASS ({duration})
   {prior completed entries}
   ```
   Solo tasks show the standard format. Team tasks include the strategy name.

**Context append fallback**: If a solo agent's report contains a `LEARNINGS:` section (indicating the agent failed to write to its context file), manually write those learnings to `.claude/sessions/__live_session__/context-task-{id}.md`.

**Team context**: For team tasks, the orchestrator writes learnings to `context-task-{id}.md` on behalf of the team. This includes a summary of the team workflow, files modified by the implementer, and any findings from the explorer or reviewer.

### 7e: Within-Wave Retry

After processing a failed result:

1. Check retry count for the failed task
2. If retries remaining:
   - Re-launch the agent immediately with failure context included in the prompt
   - Update `progress.md` active task entry: `- [{id}] {subject} -- Retrying ({n}/{max})`
   - Do NOT wait for other wave agents to complete -- retry occupies an existing slot
3. If retries exhausted:
   - Leave task as `in_progress`
   - Log final failure
   - The slot is freed for any remaining retries

### 7f: Merge Context After Wave

After ALL tasks in the current wave have completed (including retries and team lifecycles):

1. Read all `context-task-{id}.md` files from `.claude/sessions/__live_session__/`
2. Append their contents to `.claude/sessions/__live_session__/execution_context.md` in task ID order
3. Delete the `context-task-{id}.md` files
4. For team tasks: include relevant team activity data in the context merge. Extract key learnings from `team_activity_task-{id}.md` files (exploration findings, implementation patterns, reviewer feedback) and append them alongside the per-task context

**Skip merge when `max_parallel` is 1** -- agents already wrote directly to `execution_context.md`.

**Team activity files are NOT deleted during merge** -- they persist in `__live_session__/` for the Task Manager to read and are archived with the session in Step 8.

**Cross-task group activity files**: `team_activity_group-{team_group}.md` files are also NOT deleted during merge. If the group is still active (has remaining tasks in later waves), the file persists and continues to accumulate entries. If the group completed during this wave, the file stays for archival.

### 7g: Rebuild Next Wave and Archive

1. Archive completed task files: for each PASS task in this wave, copy the task's JSON from `~/.claude/tasks/{CLAUDE_CODE_TASK_LIST_ID}/` to `.claude/sessions/__live_session__/tasks/`
2. **Clean up completed team groups**: For each team group that completed all its tasks during this wave (all tasks PASS or all retries exhausted), run team cleanup: send `shutdown_request` to remaining agents, call `TeamDelete`, update the group's `team_activity_group-{team_group}.md` with final status
3. Use `TaskList` to refresh the full task state
4. Check if any previously blocked tasks are now unblocked
5. If newly unblocked tasks found, form the next wave using priority sort from Step 3d
6. If no unblocked tasks remain, exit the loop
7. Loop back to 7a

## Step 8: Session Summary

Update `progress.md` with final status:
```
# Execution Progress
Status: Complete
Wave: {total_waves} of {total_waves}
Max Parallel: {max_parallel}
Updated: {ISO 8601 timestamp}

## Active Tasks

## Completed This Session
{all completed task entries}
```

After all tasks in the plan have been processed:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXECUTION SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tasks executed: {total attempted}
  Passed: {count}
  Failed: {count} (after {total retries} total retry attempts)

Waves completed: {wave_count}
Max parallel: {max_parallel}
Total execution time: {sum of all task durations}
Token Usage: {total tokens if tracked, otherwise "N/A"}

{If any team strategies were used:}
Team Strategies:
  Solo: {count} tasks
  Review: {count} tasks
  Research: {count} tasks
  Full: {count} tasks
  Degradations: {count} (e.g., Full -> Review: {n}, Review -> Solo: {n})

Remaining:
  Pending: {count}
  In Progress (failed): {count}
  Blocked: {count}

{If any tasks failed:}
FAILED TASKS:
  [{id}] {subject} [{strategy}] -- {brief failure reason}
  ...

{If newly unblocked tasks were discovered:}
NEWLY UNBLOCKED:
  [{id}] {subject} -- unblocked by completion of [{blocker_id}]
  ...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

The `Team Strategies:` section is only included when at least one task used a non-solo strategy. If all tasks used solo, this section is omitted to keep the summary concise.

After displaying the summary:
1. Save `session_summary.md` to `.claude/sessions/__live_session__/` with the full summary content
2. **Archive the session**: Create `.claude/sessions/{task_execution_id}/` and move all contents from `__live_session__/` to the archival folder. The `.lock` file is moved to the archive along with all other session files (including `team_activity_task-*.md` and `team_activity_group-*.md` files), releasing the concurrency guard. **Important**: Before archiving, ensure all cross-task team groups have been cleaned up. If any group teams are still active (this should not happen if the execute loop completed normally), force-cleanup them before archiving.
3. `__live_session__/` is left as an empty directory (not deleted)
4. `execution_pointer.md` stays pointing to `__live_session__/` (no update needed -- it will be empty until the next execution)

## Step 9: Update CLAUDE.md

Review `.claude/sessions/{task_execution_id}/execution_context.md` for project-wide changes that should be reflected in CLAUDE.md.

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
- Each task is handled by the `claude-alchemy-sdd:task-executor` agent in isolation (Solo strategy) or by a coordinated team of agents (Review, Research, Full strategies)
- The execution context file enables knowledge sharing across task boundaries
- Failed tasks remain as `in_progress` for manual review or re-execution
- Run the execute-tasks skill again to pick up where you left off -- it will execute any remaining unblocked tasks
- All file operations within `.claude/sessions/` (including `__live_session__/` and archival folders) and `execution_pointer.md` are auto-approved by the `auto-approve-session.sh` PreToolUse hook and should never prompt for user confirmation
