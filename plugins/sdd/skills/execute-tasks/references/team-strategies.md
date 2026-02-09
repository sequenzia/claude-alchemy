# Team Strategies Reference

This reference defines the 4 team strategies available for task execution in the execute-tasks workflow. Each strategy determines how many agents collaborate on a task, what roles they play, and how they coordinate. The orchestrator reads the appropriate strategy section based on the resolved configuration.

## Strategy Overview

| Strategy | Agents | Roles | Coordination | Use Case |
|----------|--------|-------|-------------|----------|
| **Solo** | 1 | task-executor | N/A (existing behavior) | Simple tasks, default |
| **Review** | 2 | implementer + reviewer | Sequential: implement then review | Quality-critical tasks |
| **Research** | 2 | explorer + implementer | Sequential: explore then implement | Complex/unfamiliar codebases |
| **Full** | 3 | explorer + implementer + reviewer | Sequential: explore then implement then review | High-complexity, high-stakes tasks |

### Default Strategy

Solo is the default strategy when no configuration is specified. This preserves backwards compatibility with the existing single-agent execution behavior.

### Strategy Resolution

The orchestrator resolves the effective strategy for each task using this precedence (highest to lowest):

1. Per-task: `metadata.team_strategy` on the individual task
2. Session: `--team-strategy <name>` CLI argument
3. Settings: `team_strategy` in `.claude/claude-alchemy.local.md`
4. Default: `solo`

If an invalid strategy name is provided at any level, warn and fall back to `solo`.

---

## Agent Role Matrix

Each role has a defined set of tools, a recommended model tier, and a specific responsibility within the team.

| Role | Tools | Model | Responsibility |
|------|-------|-------|---------------|
| **task-executor** | Read, Glob, Grep, Bash, Edit, Write, TaskGet, TaskUpdate, TaskList | sonnet | Full task execution (Solo strategy only) |
| **explorer** | Read, Glob, Grep, Bash, SendMessage, TaskGet, TaskUpdate | sonnet | Codebase investigation, requirement analysis, file mapping |
| **implementer** | Read, Glob, Grep, Bash, Edit, Write, SendMessage, TaskGet, TaskUpdate | sonnet | Code implementation, test writing, mid-implementation checks |
| **reviewer** | Read, Glob, Grep, Bash, SendMessage, TaskGet, TaskUpdate | opus | Independent code review, acceptance criteria verification, test execution |

### Model Tier Rationale

- **Explorer**: Sonnet — exploration is breadth-focused; speed matters more than depth
- **Implementer**: Sonnet — code generation is the primary workload; Sonnet handles this well
- **Reviewer**: Opus — independent verification benefits from stronger reasoning; catches subtle issues

---

## Team Naming Convention

Teams are named using the pattern:

```
task-team-{task-id}-{timestamp}
```

Where:
- `{task-id}` is the Claude Code Task ID (e.g., `42`)
- `{timestamp}` is a Unix epoch timestamp (e.g., `1707300000`)

Example: `task-team-42-1707300000`

This convention ensures unique team names even when the same task is retried (different timestamp).

---

## Strategy 1: Solo

### Overview

Solo is the existing single-agent behavior. No team is created. A single `task-executor` agent handles the entire task through the standard 4-phase workflow (Understand, Implement, Verify, Complete).

**No team created. Existing behavior preserved exactly.**

### Agent Roles

| Role | Agent Type | Count |
|------|-----------|-------|
| task-executor | `claude-alchemy-sdd:task-executor` | 1 |

### Spawn Configuration

Standard Task tool invocation as defined in `orchestration.md` Step 7c. No `TeamCreate`, no `team_name` parameter.

### Coordination Flow

N/A — single agent handles all phases sequentially.

### Lifecycle

1. Orchestrator launches `task-executor` agent via Task tool (existing behavior)
2. Agent executes 4-phase workflow: Understand, Implement, Verify, Complete
3. Agent returns verification report
4. Orchestrator processes result

### Session File Format

No `team_activity_task-{id}.md` file is created. Standard `progress.md` entries only.

### Degradation Target

N/A — Solo is the terminal fallback. If Solo fails, the task enters the normal retry flow.

### Failure Handling

Standard retry behavior as defined in `orchestration.md` Step 7e. Failed tasks are retried up to the configured retry limit with failure context included.

---

## Strategy 2: Review

### Overview

Review adds an independent code reviewer after implementation. Two agents work sequentially: the implementer writes the code, then the reviewer independently verifies correctness and quality.

### Agent Roles

| Role | Agent Type | Count |
|------|-----------|-------|
| implementer | `claude-alchemy-sdd:team-implementer` | 1 |
| reviewer | `claude-alchemy-sdd:team-reviewer` | 1 |

### Spawn Configuration

```
TeamCreate:
  name: task-team-{task-id}-{timestamp}
  description: "Review team for task [{task-id}]: {subject}"

Task (implementer):
  subagent_type: claude-alchemy-sdd:team-implementer
  model: sonnet
  team_name: task-team-{task-id}-{timestamp}
  prompt: |
    You are the implementer for task [{task-id}]: {subject}.
    Your job is to implement the task requirements and write tests.
    A reviewer will independently verify your work after you finish.
    {task description and context}

Task (reviewer):
  subagent_type: claude-alchemy-sdd:team-reviewer
  model: opus
  team_name: task-team-{task-id}-{timestamp}
  prompt: |
    You are the reviewer for task [{task-id}]: {subject}.
    Wait for the implementer to complete, then independently verify
    the implementation against acceptance criteria.
    {task description and context}
```

### Coordination Flow

```
1. Create team
2. Spawn implementer and reviewer agents
3. Assign implementation task to implementer
4. Wait for implementer to complete
5. Send implementer's report to reviewer via SendMessage
6. Assign review task to reviewer
7. Wait for reviewer to complete
8. Collect reviewer's verification report
9. Translate to pass/partial/fail status
10. Cleanup team
```

### Detailed Coordination Flow

The Review strategy uses a two-agent sequential pipeline. The orchestrator acts as team lead, driving all coordination -- agents never communicate directly.

#### Step-by-Step Flow

```
1. Orchestrator creates team: task-team-{task-id}-{timestamp}
2. Orchestrator spawns implementer (Sonnet) into the team
3. Implementer receives:
   - Task requirements (subject, description, acceptance criteria)
   - Execution context snapshot (learnings from prior tasks)
   - Instruction: implement the task, write tests, and report results
4. Implementer reads task requirements and explores the codebase
5. Implementer writes code changes and tests
6. Implementer runs mid-implementation checks (linter, existing tests)
7. Implementer sends implementation summary to team lead via SendMessage:
   - Files created or modified (full paths)
   - Approach taken and key decisions
   - Tests written and their results
   - Known limitations or trade-offs
8. Orchestrator receives implementation summary
9. Orchestrator updates team_activity: implementer -> completed
10. Orchestrator updates progress.md: Team: review (implementer: completed, reviewer: active)
11. Orchestrator spawns reviewer (Opus) into the team with handoff context
12. Reviewer receives handoff context (see Reviewer Handoff Context below)
13. Reviewer independently reads all changed files from the filesystem
14. Reviewer verifies implementation against each acceptance criterion
15. Reviewer runs the full test suite
16. Reviewer runs the project linter
17. Reviewer checks for regressions, security issues, and convention violations
18. Reviewer sends structured review report to team lead via SendMessage
19. Orchestrator receives review report
20. Orchestrator updates team_activity: reviewer -> completed
21. Orchestrator translates reviewer verdict to pass/partial/fail (see Result Translation)
22. Orchestrator cleans up team (shutdown_request to both agents, TeamDelete)
```

#### Reviewer Handoff Context

When the orchestrator launches the reviewer, it provides the following context in the reviewer's prompt. This is the critical coordination point in the Review strategy.

| Context Item | Source | Purpose |
|-------------|--------|---------|
| Task description | Original task from TaskGet | Full requirements and scope |
| Acceptance criteria | Extracted from task description | Criterion-by-criterion verification targets |
| List of changed files | Implementer's SendMessage summary | Tells the reviewer exactly which files to read |
| Implementation summary | Implementer's SendMessage report | Explains the approach, decisions, and known issues |
| Execution context snapshot | `.claude/sessions/__live_session__/execution_context.md` | Project patterns and learnings from earlier tasks |

**How the reviewer accesses code changes**: The reviewer reads files directly from the filesystem using the Read, Glob, and Grep tools. It does not receive file diffs or patches -- it reads the full files as they exist after the implementer's changes. This ensures the reviewer sees the actual state of the code, not a filtered view.

**Reviewer does NOT receive**: Write or Edit tools. The reviewer is strictly read-only to enforce independent verification without the temptation to fix issues directly.

#### Review Report Format

The reviewer sends a structured report to the team lead via SendMessage. The report uses a consistent format that the orchestrator can parse to determine the task outcome.

**Verdict values:**

| Verdict | Meaning |
|---------|---------|
| **PASS** | All Functional criteria verified, all tests pass, no blocking issues |
| **ISSUES_FOUND** | All Functional criteria pass and tests pass, but Edge Case / Error Handling / Performance issues detected |
| **FAIL** | Any Functional criterion fails, or any test fails, or implementation is missing/incomplete |

**Report structure:**

```markdown
## Review Report: Task [{id}] {subject}

### Verdict: {PASS | ISSUES_FOUND | FAIL}

### Criteria Results

_Functional:_ ({passed}/{total})
- [PASS] {criterion description}
- [FAIL] {criterion description}
  -> {what is wrong, where in the code, what was expected}

_Edge Cases:_ ({passed}/{total})
- [PASS] {criterion description}
- [FAIL] {criterion description}
  -> {what is missing or incorrect}

_Error Handling:_ ({passed}/{total})
- [PASS] {criterion description}
- [FAIL] {criterion description}
  -> {what error path is unhandled}

_Performance:_ ({passed}/{total} or N/A)
- [PASS] {criterion description}
- [ISSUE] {criterion description}
  -> {what performance concern was found}

### Test Results
- Ran: {total} tests
- Passed: {passed}
- Failed: {failed}
- New tests added: {count}
{If failures:}
- Failures:
  - {test_name}: {error message}

### Lint Results
- New violations: {count}
{If violations:}
- Violations:
  - {file}:{line}: {violation}

### Additional Findings
- {Finding category}: {description with file path and line reference}

### Summary
{1-2 sentence summary of overall quality and any blocking issues}
```

#### Result Translation

The orchestrator translates the reviewer's verdict into the standard pass/partial/fail status used by the rest of the execution loop.

| Reviewer Verdict | Translated Status | Orchestrator Action |
|-----------------|-------------------|---------------------|
| **PASS** | **PASS** | Mark task as `completed`; log success |
| **ISSUES_FOUND** | **PARTIAL** | Leave task as `in_progress`; log non-blocking issues; task may enter retry flow |
| **FAIL** | **FAIL** | Leave task as `in_progress`; include reviewer's issue list in retry context; task enters retry flow |

**Verdict determination rules** (used by the reviewer):

| Condition | Verdict |
|-----------|---------|
| All Functional criteria pass + Tests pass + No other issues | **PASS** |
| All Functional criteria pass + Tests pass + Edge/Error/Perf issues found | **ISSUES_FOUND** |
| Any Functional criterion fails | **FAIL** |
| Any test failure | **FAIL** |
| Implementation is missing or incomplete | **FAIL** |

#### Edge Case Handling

**Reviewer finds no issues (fast PASS path)**:
When the reviewer verifies all criteria pass and all tests pass with no additional findings, it sends a PASS verdict immediately. The orchestrator translates this to PASS and marks the task as completed. No retry is needed. The review report still includes the full criteria results for the record, but the Summary section can be brief (e.g., "All criteria verified, tests pass, implementation is clean.").

**Implementer produces no code changes**:
If the implementer reports completion but lists no files modified (e.g., the task was a no-op, or the implementer determined no changes were needed), the orchestrator still launches the reviewer. The reviewer reads the implementer's summary, verifies that no changes were indeed the correct outcome for the task, and sends an early report. If the task genuinely required no code changes, the reviewer reports PASS. If the task required changes but none were made, the reviewer reports FAIL with a clear explanation that the implementation is missing.

### Lifecycle

1. **Create**: `TeamCreate` with team name `task-team-{task-id}-{timestamp}`
2. **Spawn**: Launch implementer (Sonnet) and reviewer (Opus) into the team
3. **Coordinate**:
   - Implementer executes: Understand, Implement phases
   - Implementer reports completion with files modified and changes summary
   - Orchestrator sends implementation report to reviewer with full handoff context
   - Reviewer executes: independent Verify phase (reads code, runs tests, checks criteria)
   - Reviewer reports verification results via structured review report
4. **Collect**: Translate reviewer's verdict into pass/partial/fail using the result translation table
5. **Cleanup**: Send `shutdown_request` to both agents, `TeamDelete`

### Session File Format

See [team_activity.md Format Specification](#team_activitymd-format-specification) below.

### Degradation Target

Review fails -> **Solo**

### Failure Handling

| Failure Scenario | Action |
|-----------------|--------|
| Implementer fails | Degrade to Solo strategy (retry the entire task with a solo agent) |
| Reviewer fails but implementer succeeded | Accept implementer's result as-is; log that review was skipped; mark as PARTIAL if reviewer was needed for verification |
| Both fail | Degrade to Solo strategy |
| Reviewer reports FAIL | Include reviewer's detailed issue list in the retry context; task enters retry flow with full diagnostic information |

---

## Strategy 3: Research

### Overview

Research adds an exploration phase before implementation. Two agents work sequentially: the explorer investigates the codebase and requirements, then the implementer uses those findings to write code.

### Agent Roles

| Role | Agent Type | Count |
|------|-----------|-------|
| explorer | `claude-alchemy-sdd:team-explorer` | 1 |
| implementer | `claude-alchemy-sdd:team-implementer` | 1 |

### Spawn Configuration

```
TeamCreate:
  name: task-team-{task-id}-{timestamp}
  description: "Research team for task [{task-id}]: {subject}"

Task (explorer):
  subagent_type: claude-alchemy-sdd:team-explorer
  model: sonnet
  team_name: task-team-{task-id}-{timestamp}
  prompt: |
    You are the explorer for task [{task-id}]: {subject}.
    Your job is to investigate the codebase, map relevant files,
    identify patterns, and produce a research report that the
    implementer will use to write the code.
    {task description and context}

Task (implementer):
  subagent_type: claude-alchemy-sdd:team-implementer
  model: sonnet
  team_name: task-team-{task-id}-{timestamp}
  prompt: |
    You are the implementer for task [{task-id}]: {subject}.
    Wait for the explorer's research report, then use it to
    implement the task requirements and write tests.
    {task description and context}
```

### Coordination Flow

```
1. Create team
2. Spawn explorer and implementer agents
3. Assign exploration task to explorer
4. Wait for explorer to complete
5. Send explorer's research report to implementer via SendMessage
6. Assign implementation task to implementer
7. Wait for implementer to complete
8. Collect implementer's verification report
9. Translate to pass/partial/fail status
10. Cleanup team
```

### Lifecycle

1. **Create**: `TeamCreate` with team name `task-team-{task-id}-{timestamp}`
2. **Spawn**: Launch explorer (Sonnet) and implementer (Sonnet) into the team
3. **Coordinate**:
   - Explorer executes: codebase investigation, file mapping, pattern identification
   - Explorer reports findings with key files, patterns, integration points, recommendations
   - Orchestrator sends exploration report to implementer
   - Implementer executes: Understand (using research), Implement, Verify, Complete phases
   - Implementer reports verification results
4. **Collect**: Translate implementer's verification into pass/partial/fail
5. **Cleanup**: Send `shutdown_request` to both agents, `TeamDelete`

### Session File Format

See [team_activity.md Format Specification](#team_activitymd-format-specification) below.

### Degradation Target

Research fails -> **Solo**

### Detailed Coordination Flow

The Research strategy uses a two-agent sequential pipeline. The orchestrator acts as team lead, driving all coordination -- agents never communicate directly.

#### Step-by-Step Flow

```
1. Orchestrator creates team: task-team-{task-id}-{timestamp}
2. Orchestrator spawns explorer (Sonnet) into the team
3. Explorer receives:
   - Task requirements (subject, description, acceptance criteria)
   - Execution context snapshot (learnings from prior tasks)
4. Explorer investigates the codebase:
   - Reads CLAUDE.md for project conventions
   - Uses Glob to map relevant files by name patterns
   - Uses Grep to locate symbols, functions, and patterns
   - Reads key files to understand structure and dependencies
   - Identifies existing patterns the implementer should follow
   - Notes potential challenges, conflicts, or pitfalls
5. Explorer sends structured findings report to team lead via SendMessage
6. Orchestrator updates team_activity: explorer -> completed
7. Orchestrator updates progress.md: Team: research (explorer: completed, implementer: active)
8. Orchestrator forwards explorer findings to implementer via SendMessage
9. Orchestrator spawns implementer (Sonnet) into the team
10. Implementer receives:
    - Task requirements (subject, description, acceptance criteria)
    - Execution context snapshot (learnings from prior tasks)
    - Explorer's structured findings report (as additional context)
11. Implementer executes implementation using explorer's insights:
    - Understand phase: uses explorer's file map and patterns instead of re-exploring
    - Implement phase: follows explorer's recommended approach and identified patterns
    - Verify phase: self-verifies against acceptance criteria (runs tests, checks criteria)
    - Complete phase: determines PASS/PARTIAL/FAIL status
12. Implementer sends completion report to team lead via SendMessage
13. Orchestrator updates team_activity: implementer -> completed
14. Orchestrator collects implementer's verification report
15. Orchestrator translates result to pass/partial/fail (see Result Translation)
16. Orchestrator cleans up team (shutdown agents, TeamDelete)
```

#### Explorer Findings Format

The explorer produces a structured findings report with these sections. The format is designed to be directly actionable by the implementer.

```markdown
## Explorer Findings Report

### Relevant Files
- `path/to/file.ts` — Purpose: {what this file does and why it matters for the task}
- `path/to/related.ts` — Purpose: {relevance to the task}
- `path/to/test.ts` — Purpose: {existing test patterns to follow}

### Existing Patterns to Follow
- {Pattern name}: {description of the pattern and where it's used}
- {Convention}: {coding convention observed in the codebase}
- {Naming}: {naming conventions relevant to the task}

### Dependencies and Integration Points
- {Dependency}: {what depends on what, import chains, shared modules}
- {Integration}: {how this task connects to existing functionality}
- {API surface}: {public interfaces that will be affected or consumed}

### Potential Challenges or Conflicts
- {Challenge}: {description and why it could be problematic}
- {Conflict}: {existing code that may conflict with the planned changes}
- {Risk}: {areas where careful implementation is needed}

### Recommended Implementation Approach
- {Step 1}: {suggested first action with reasoning}
- {Step 2}: {suggested next action}
- {Overall strategy}: {high-level recommendation for how to approach the task}
```

Not all sections need content -- if the explorer finds nothing for a section (e.g., no challenges), it should note "None identified" rather than omitting the section. This ensures the implementer knows the section was investigated, not overlooked.

#### Explorer-to-Implementer Handoff

The handoff is the critical coordination point in the Research strategy. The orchestrator mediates all communication.

**What gets passed to the implementer:**
1. The original task requirements (subject, description, acceptance criteria) -- always included, independent of explorer
2. The execution context snapshot -- same baseline all agents in the wave receive
3. The explorer's structured findings report -- forwarded verbatim via SendMessage

**How the implementer uses findings:**
- **File map** replaces the implementer's own Glob/Grep exploration (Phase 1 is accelerated)
- **Existing patterns** inform coding style, naming, and structure decisions
- **Dependencies** guide the implementation order (data -> service -> interface -> tests)
- **Challenges** flag areas requiring extra care or alternative approaches
- **Recommended approach** provides a starting strategy the implementer can adopt or adapt

**If explorer findings are empty or minimal:**
The implementer proceeds with its own exploration as a fallback. Explorer findings are additive context, not a hard dependency. The implementer always has the full task requirements and execution context available.

#### Self-Verification (No Reviewer)

In the Research strategy, there is no independent reviewer agent. The implementer performs self-verification, similar to the Solo strategy's task-executor.

**Implementer self-verification process:**
1. Walk through each acceptance criterion (Functional, Edge Cases, Error Handling, Performance)
2. Run the project's test suite to check for regressions
3. Run the linter to catch style issues
4. Verify that the core change works as intended
5. Determine status: PASS, PARTIAL, or FAIL based on standard verification rules

**Comparison to Solo:**
- Solo: task-executor does exploration + implementation + verification (all 4 phases)
- Research: explorer handles exploration, implementer handles implementation + verification (3 phases)
- The verification logic is identical -- the difference is that the implementer has better context from the explorer's findings, potentially leading to fewer verification failures

**Limitation:** Without an independent reviewer, subtle issues that the implementer introduced may not be caught. The Research strategy trades review quality for exploration quality -- it is best suited for complex/unfamiliar codebases where understanding the code is the primary challenge, not verifying correctness.

#### Result Translation

Since there is no reviewer, the implementer's self-reported status maps directly to the task result:

| Implementer Status | Task Result | Notes |
|-------------------|-------------|-------|
| PASS (all functional criteria pass, tests pass) | PASS | Task marked completed |
| PARTIAL (functional pass but edge/error/perf issues) | PARTIAL | Task left in_progress |
| FAIL (any functional criteria fail or tests fail) | FAIL | Task left in_progress |

#### Edge Case Handling

**Explorer finds nothing relevant:**
The explorer reports a findings report with "None identified" in most sections. The implementer proceeds normally using its own exploration capabilities. The orchestrator logs this in `team_activity_task-{id}.md`:
```
[{ISO 8601}] explorer: Completed -- minimal findings (no relevant files/patterns identified)
```
The task continues without degradation -- the explorer completing with minimal findings is not a failure.

**Explorer times out (exceeds 5-minute timeout):**
Treat as an explorer failure and degrade to Solo strategy:
1. Log to `team_activity_task-{id}.md`: `[{ISO 8601}] explorer: Failed -- agent timeout`
2. Record degradation: `Degraded: research -> solo`
3. Clean up the Research team (TeamDelete)
4. Re-execute the task with Solo strategy (task-executor handles everything)
5. Degradation does not count against the retry limit

**SendMessage fails when forwarding findings:**
Log the error and proceed without explorer findings. The implementer will fall back to its own exploration:
```
[{ISO 8601}] WARNING: SendMessage failed -- implementer proceeding without explorer findings
```
This effectively degrades the Research strategy to Solo-like behavior without formally degrading (the team structure remains).

### Failure Handling

| Failure Scenario | Action |
|-----------------|--------|
| Explorer fails | Degrade to Solo strategy (solo agent handles exploration internally as part of Phase 1) |
| Explorer times out | Degrade to Solo strategy (see Edge Case Handling above) |
| Explorer finds nothing | Not a failure -- implementer proceeds with own exploration |
| Implementer fails but explorer succeeded | Retry implementer with explorer's findings still available; if retry fails, degrade to Solo |
| Both fail | Degrade to Solo strategy |
| SendMessage fails (findings handoff) | Log warning; implementer proceeds without findings; no formal degradation |

---

## Strategy 4: Full

### Overview

Full is the complete three-agent pipeline: explore, implement, then review. An explorer investigates the codebase, an implementer uses those findings to write code, and a reviewer independently verifies the result.

### Agent Roles

| Role | Agent Type | Count |
|------|-----------|-------|
| explorer | `claude-alchemy-sdd:team-explorer` | 1 |
| implementer | `claude-alchemy-sdd:team-implementer` | 1 |
| reviewer | `claude-alchemy-sdd:team-reviewer` | 1 |

### Spawn Configuration

```
TeamCreate:
  name: task-team-{task-id}-{timestamp}
  description: "Full team for task [{task-id}]: {subject}"

Task (explorer):
  subagent_type: claude-alchemy-sdd:team-explorer
  model: sonnet
  team_name: task-team-{task-id}-{timestamp}
  prompt: |
    You are the explorer for task [{task-id}]: {subject}.
    Your job is to investigate the codebase, map relevant files,
    identify patterns, and produce a research report that the
    implementer will use to write the code.
    {task description and context}

Task (implementer):
  subagent_type: claude-alchemy-sdd:team-implementer
  model: sonnet
  team_name: task-team-{task-id}-{timestamp}
  prompt: |
    You are the implementer for task [{task-id}]: {subject}.
    Wait for the explorer's research report, then use it to
    implement the task requirements and write tests.
    A reviewer will independently verify your work after you finish.
    {task description and context}

Task (reviewer):
  subagent_type: claude-alchemy-sdd:team-reviewer
  model: opus
  team_name: task-team-{task-id}-{timestamp}
  prompt: |
    You are the reviewer for task [{task-id}]: {subject}.
    Wait for the implementer to complete, then independently verify
    the implementation against acceptance criteria. You will also
    have access to the explorer's research report for context.
    {task description and context}
```

### Coordination Flow

```
1. Create team
2. Spawn explorer, implementer, and reviewer agents
3. Assign exploration task to explorer
4. Wait for explorer to complete
5. Send explorer's research report to implementer via SendMessage
6. Assign implementation task to implementer
7. Wait for implementer to complete
8. Send implementer's report and explorer's report to reviewer via SendMessage
9. Assign review task to reviewer
10. Wait for reviewer to complete
11. Collect reviewer's verification report
12. Translate to pass/partial/fail status
13. Cleanup team
```

### Lifecycle

1. **Create**: `TeamCreate` with team name `task-team-{task-id}-{timestamp}`
2. **Spawn**: Launch explorer (Sonnet), implementer (Sonnet), and reviewer (Opus) into the team
3. **Coordinate**:
   - Explorer executes: codebase investigation, file mapping, pattern identification
   - Explorer reports findings with key files, patterns, integration points, recommendations
   - Orchestrator sends exploration report to implementer
   - Implementer executes: Understand (using research), Implement phases
   - Implementer reports completion with files modified and changes summary
   - Orchestrator sends both exploration report and implementation report to reviewer
   - Reviewer executes: independent Verify phase (reads code, runs tests, checks criteria)
   - Reviewer reports verification results
4. **Collect**: Translate reviewer's verification into pass/partial/fail
5. **Cleanup**: Send `shutdown_request` to all agents, `TeamDelete`

### Session File Format

See [team_activity.md Format Specification](#team_activitymd-format-specification) below.

### Degradation Target

Full fails -> **Review** -> **Solo**

The degradation chain is:
1. If the Full team fails, attempt the Review strategy (skip exploration, go straight to implement + review)
2. If Review also fails, attempt Solo strategy
3. If Solo fails, the task enters the normal retry flow

### Failure Handling

| Failure Scenario | Action |
|-----------------|--------|
| Explorer fails | Degrade to Review strategy (implementer and reviewer proceed without research) |
| Implementer fails but explorer succeeded | Retry implementer with explorer's findings; if retry fails, degrade to Review then Solo |
| Reviewer fails but implementer succeeded | Accept implementer's result; log that review was skipped; mark as PARTIAL |
| Explorer + implementer fail | Degrade to Solo strategy (skip Review since implementation already failed) |
| All three fail | Degrade to Solo strategy |
| Reviewer finds issues | Report reviewer findings as FAIL with detailed issue list; task enters retry flow |

---

## Degradation Summary

Strategy degradation does not count against the task retry limit. The orchestrator tracks degradation separately.

| Starting Strategy | Degradation Chain | Terminal Fallback |
|-------------------|-------------------|-------------------|
| Solo | N/A | Normal retry flow |
| Review | Review -> Solo | Normal retry flow |
| Research | Research -> Solo | Normal retry flow |
| Full | Full -> Review -> Solo | Normal retry flow |

### Degradation Logging

When degradation occurs, log to `task_log.md`:

```markdown
| {id} | {subject} | DEGRADED | {attempt}/{max} | {duration} | N/A |
```

And update `team_activity_task-{id}.md` with:

```
Degraded: {original_strategy} -> {new_strategy}
Reason: {failure description}
Timestamp: {ISO 8601}
```

---

## team_activity.md Format Specification

Each active team writes a `team_activity_task-{id}.md` file in `.claude/sessions/__live_session__/`. The orchestrator is the sole writer -- agents report via task completion and SendMessage, never through direct file writes. This single-writer constraint prevents concurrent write contention and ensures format consistency.

### File Location

```
.claude/sessions/__live_session__/team_activity_task-{task-id}.md
```

### File Naming

```
team_activity_task-{task-id}.md
```

Where `{task-id}` is the Claude Code Task ID (numeric). This naming convention ensures no collisions when multiple teams are active simultaneously in the same wave -- each task has a unique ID, so each team gets a unique file.

Example: `team_activity_task-42.md`

### Format

```markdown
# Team Activity: Task {task-id}

Team: {team-name}
Strategy: {review|research|full}
Status: {active|completed|failed|degraded}
Created: {ISO 8601 timestamp}
Updated: {ISO 8601 timestamp}

## Team Members

- [{role}] {agent-name} — {status} — {current-phase}
- [{role}] {agent-name} — {status} — {current-phase}
- [{role}] {agent-name} — {status} — {current-phase}

## Activity Log

{ISO 8601 timestamp} | {role} | {event description}
{ISO 8601 timestamp} | {role} | {event description}
{ISO 8601 timestamp} | {role} | {event description}
```

Note: Solo strategy does not create a `team_activity_task-{id}.md` file. Only `review`, `research`, and `full` strategies produce this file.

### Field Definitions

**Header Fields:**

| Field | Format | Values | Description |
|-------|--------|--------|-------------|
| Team | String | `task-team-{task-id}-{timestamp}` | Unique team identifier (timestamp is Unix epoch seconds) |
| Strategy | String | `review`, `research`, `full` | The resolved strategy for this team |
| Status | String | `active`, `completed`, `failed`, `degraded` | Current team-level status |
| Created | ISO 8601 | `2026-02-08T14:30:22Z` | When the team was created |
| Updated | ISO 8601 | `2026-02-08T14:30:22Z` | Updated on every write to this file |

**Team Status Values:**

| Status | Meaning |
|--------|---------|
| `active` | Team is currently executing; at least one agent is working |
| `completed` | All agents finished successfully; team result is PASS or PARTIAL |
| `failed` | Team execution failed; task enters retry or degradation flow |
| `degraded` | Team strategy was downgraded due to agent failure (see Degradation Logging) |

**Team Member Fields:**

| Field | Format | Values | Description |
|-------|--------|--------|-------------|
| role | String in brackets | `explorer`, `implementer`, `reviewer` | The agent's role in the team |
| agent-name | String | `explorer-1`, `impl-1`, `reviewer-1` | Short identifier for the agent instance |
| status | String | `waiting`, `spawning`, `active`, `completed`, `failed` | Current agent status |
| current-phase | String | Free text | Current activity or phase description |

**Member Status Values:**

| Status | Meaning |
|--------|---------|
| `waiting` | Agent is defined in the team but not yet needed (e.g., reviewer waits for implementer) |
| `spawning` | Agent is being launched into the team |
| `active` | Agent is currently executing its assigned work |
| `completed` | Agent finished successfully |
| `failed` | Agent encountered an error, timed out, or was terminated |

**Activity Log Fields:**

| Field | Format | Description |
|-------|--------|-------------|
| timestamp | ISO 8601 | When the event occurred (e.g., `2026-02-08T14:30:22Z`) |
| role | String | Which agent role generated the event (`explorer`, `implementer`, `reviewer`) |
| event | Free text | Human-readable description of what happened |

The activity log uses pipe-delimited columns (`timestamp | role | event`) for consistent parsing. Degradation events use a special multi-line format (see Degradation Entries below).

### Regex Patterns for Parsing

The format is designed to be parseable with simple regex patterns, consistent with the `parseProgressMd()` patterns in `taskService.ts`:

```javascript
// Header fields (single-line key:value, same pattern as progress.md)
const teamName     = /^Team:\s+(.+)$/m
const strategy     = /^Strategy:\s+(review|research|full)$/m
const status       = /^Status:\s+(active|completed|failed|degraded)$/m
const created      = /^Created:\s+(.+)$/m
const updated      = /^Updated:\s+(.+)$/m

// Team members: - [role] agent-name — status — current-phase
const members      = /^-\s+\[(\w+)\]\s+(\S+)\s+\u2014\s+(\w+)\s+\u2014\s+(.+)$/gm
// Captures: [1]=role, [2]=agent-name, [3]=status, [4]=current-phase

// Activity log entries: timestamp | role | event
const activityEntry = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\s+\|\s+(\w+)\s+\|\s+(.+)$/gm
// Captures: [1]=timestamp, [2]=role, [3]=event

// Degradation block (multi-line, within Activity Log section)
const degradation  = /^Degraded:\s+(\w+)\s+->\s+(\w+)$/m
// Captures: [1]=original_strategy, [2]=new_strategy
const degradeReason = /^Reason:\s+(.+)$/m
const degradeTime  = /^Timestamp:\s+(.+)$/m
```

**Parsing notes:**
- Use the `m` (multiline) flag so `^` and `$` match line boundaries
- Use the `g` (global) flag on `members` and `activityEntry` to capture all matches
- The em-dash character (U+2014) is used as the delimiter in member lines for visual clarity. Parsers should match this specific character, not a regular hyphen.
- Activity log uses ASCII pipe (`|`) as a delimiter for simpler parsing than the member lines

### Example: Review Strategy

```markdown
# Team Activity: Task 42

Team: task-team-42-1707300000
Strategy: review
Status: active
Created: 2026-02-08T14:30:00Z
Updated: 2026-02-08T14:35:12Z

## Team Members

- [implementer] impl-1 — active — Phase 2: Implementing changes
- [reviewer] reviewer-1 — waiting — Pending implementation

## Activity Log

2026-02-08T14:30:00Z | implementer | Spawned into team
2026-02-08T14:30:05Z | implementer | Reading task requirements
2026-02-08T14:31:20Z | implementer | Exploring codebase — 12 relevant files found
2026-02-08T14:33:45Z | implementer | Implementing changes — 3 files modified
2026-02-08T14:35:00Z | implementer | Writing tests — 5 test cases
2026-02-08T14:35:10Z | implementer | Completed — all tests passing
2026-02-08T14:35:12Z | reviewer | Spawned into team
```

### Example: Full Strategy

```markdown
# Team Activity: Task 99

Team: task-team-99-1707300500
Strategy: full
Status: completed
Created: 2026-02-08T14:38:20Z
Updated: 2026-02-08T14:52:03Z

## Team Members

- [explorer] explorer-1 — completed — Exploration complete
- [implementer] impl-1 — completed — Implementation complete
- [reviewer] reviewer-1 — completed — Review complete — PASS

## Activity Log

2026-02-08T14:38:20Z | explorer | Spawned into team
2026-02-08T14:38:25Z | explorer | Investigating codebase structure
2026-02-08T14:40:10Z | explorer | Mapped 18 relevant files across 4 directories
2026-02-08T14:41:30Z | explorer | Completed — research report ready
2026-02-08T14:41:35Z | implementer | Received exploration report
2026-02-08T14:42:00Z | implementer | Implementing changes using research findings
2026-02-08T14:46:20Z | implementer | 5 files modified, 8 test cases written
2026-02-08T14:46:25Z | implementer | Completed — all tests passing
2026-02-08T14:46:30Z | reviewer | Received implementation and exploration reports
2026-02-08T14:47:00Z | reviewer | Verifying against acceptance criteria
2026-02-08T14:50:15Z | reviewer | Running full test suite
2026-02-08T14:51:40Z | reviewer | 6/6 functional criteria passed
2026-02-08T14:52:03Z | reviewer | Completed — PASS
```

### Example: Degradation

```markdown
# Team Activity: Task 77

Team: task-team-77-1707301000
Strategy: full
Status: degraded
Created: 2026-02-08T15:00:00Z
Updated: 2026-02-08T15:08:30Z

## Team Members

- [explorer] explorer-1 — failed — Agent timeout after 150s
- [implementer] impl-1 — completed — Implementation complete (review strategy)
- [reviewer] reviewer-1 — completed — Review complete — PASS

## Activity Log

2026-02-08T15:00:00Z | explorer | Spawned into team
2026-02-08T15:00:05Z | explorer | Investigating codebase structure
2026-02-08T15:02:30Z | explorer | Failed — agent timeout
Degraded: full -> review
Reason: Explorer agent timed out after 150s
Timestamp: 2026-02-08T15:02:35Z
2026-02-08T15:02:40Z | implementer | Spawned into team (review strategy)
2026-02-08T15:03:00Z | implementer | Implementing without research findings
2026-02-08T15:06:45Z | implementer | Completed — 3 files modified
2026-02-08T15:06:50Z | reviewer | Received implementation report
2026-02-08T15:07:00Z | reviewer | Verifying against acceptance criteria
2026-02-08T15:08:30Z | reviewer | Completed — PASS
```

### Example: Research Strategy

```markdown
# Team Activity: Task 55

Team: task-team-55-1707301200
Strategy: research
Status: active
Created: 2026-02-08T15:10:00Z
Updated: 2026-02-08T15:16:30Z

## Team Members

- [explorer] explorer-1 — completed — Exploration complete
- [implementer] impl-1 — active — Phase 2: Implementing with research findings

## Activity Log

2026-02-08T15:10:00Z | explorer | Spawned into team
2026-02-08T15:10:05Z | explorer | Investigating codebase structure and patterns
2026-02-08T15:12:30Z | explorer | Mapped 22 relevant files, identified 3 key patterns
2026-02-08T15:13:00Z | explorer | Completed — research report ready
2026-02-08T15:13:05Z | implementer | Received exploration report
2026-02-08T15:13:10Z | implementer | Started implementation using research findings
2026-02-08T15:16:30Z | implementer | Implementing changes — 4 files modified so far
```

### Degradation Entries

When strategy degradation occurs, a special multi-line block is inserted into the Activity Log:

```
Degraded: {original_strategy} -> {new_strategy}
Reason: {failure description}
Timestamp: {ISO 8601}
```

This block appears between normal activity log entries and is parseable with the degradation regex patterns shown above. Multiple degradation events can appear in sequence if the team degrades through multiple levels (e.g., Full -> Review -> Solo).

### File Lifecycle

1. **Creation**: Written by the orchestrator immediately after `TeamCreate` in Step 7c
2. **Updates**: Updated at each agent phase transition (spawn, active, completed, failed) and on activity log events
3. **Finalization**: Status set to `completed`, `failed`, or `degraded` when team lifecycle ends
4. **Archival**: Moved to `.claude/sessions/{task_execution_id}/` along with all other session files in Step 8
5. **Deletion during session**: NOT deleted -- persists in `__live_session__/` for the Task Manager to read throughout the session

### File Creation Failure Handling

If the orchestrator fails to create or write `team_activity_task-{id}.md`:

1. **Log a warning**: `WARNING: Failed to write team_activity_task-{id}.md -- {error message}`
2. **Do not block execution**: Team execution continues without the activity file. The orchestrator tracks team state internally and still coordinates agents correctly.
3. **Fallback visibility**: `progress.md` still receives team summary updates (it is written separately). Users monitoring the Task Manager see team status via `progress.md` even if the detailed activity file is unavailable.
4. **Retry on next update**: On the next team state change, the orchestrator attempts to write the file again. If the file system issue was transient, subsequent writes may succeed and the file will contain the current state (activity log entries from before the failure are lost, but the current member statuses will be accurate).

### Concurrent Write Prevention

The orchestrator is the sole writer to `team_activity_task-{id}.md`. This is enforced by design:

- **Agents do not write to this file**. Agents report their status via task completion (return value) and `SendMessage` to the orchestrator. The orchestrator translates these events into file updates.
- **One orchestrator per session**. The `.lock` file in `__live_session__/` prevents concurrent orchestrator instances, so there is never more than one writer.
- **One file per task**. Even when multiple teams run concurrently in a wave, each team writes to a different file (`team_activity_task-{id}.md` where `{id}` is unique per task). There is no shared activity file across teams.

---

## progress.md Team Summary Extension

When teams are active, the orchestrator adds a team summary section to `progress.md`:

```markdown
## Active Tasks
- [42] Add user authentication — Team: review (implementer: active, reviewer: spawning)
- [99] Implement payment flow — Team: full (explorer: active, implementer: spawning, reviewer: spawning)
- [15] Fix typo in README — Solo

## Completed This Session
- [10] Create database schema — Team: review — PASS (2m 15s)
- [8] Add config file — Solo — PASS (45s)
```

The team summary in `progress.md` is intentionally brief. Detailed team activity is in the per-team `team_activity_task-{id}.md` files.

---

## Notes

- Strategy degradation is transparent to the user watching the Task Manager — the `team_activity.md` file records the degradation event and the UI reflects it
- Solo strategy creates no team infrastructure and has zero overhead compared to existing behavior
- All team agents within a single task execute sequentially (not in parallel) — parallelism happens across tasks, not within a team
- The orchestrator is the sole writer to `team_activity_task-{id}.md` — agents communicate results through task completion and SendMessage
- Team activity files are archived along with all other session files when the session completes
- Multiple teams can be active simultaneously (one per concurrent task in a wave), each with its own `team_activity_task-{id}.md` file
