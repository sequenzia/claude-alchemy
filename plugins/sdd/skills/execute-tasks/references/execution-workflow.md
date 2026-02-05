# Execution Workflow Reference

This reference provides the detailed 4-phase workflow for executing a single Claude Code Task. Each phase has specific procedures depending on whether the task is spec-generated or a general task.

## Phase 1: Understand

Load context and understand the task scope before writing any code.

### Step 1: Load Knowledge

Read the execute-tasks skill and its references:
```
Read: skills/execute-tasks/SKILL.md
Read: skills/execute-tasks/references/execution-workflow.md
Read: skills/execute-tasks/references/verification-patterns.md
```

### Step 2: Read Execution Context

Check for shared execution context from prior tasks in this session:
```
Read: .claude/sessions/__live_session__/execution_context.md
```

If the file exists, review:
- **Project Patterns** - Coding conventions, tech stack details discovered by earlier tasks
- **Key Decisions** - Architecture choices already made
- **Known Issues** - Problems to avoid, workarounds in place
- **File Map** - Important files and their purposes
- **Task History** - What earlier tasks accomplished and any issues encountered

Use this context to inform your approach. If the file does not exist, proceed without it.

#### Context Size Management

If `execution_context.md` has grown large:

- **200+ lines (~8KB)**: Keep the last 5 Task History entries in full. Summarize older Task History entries into a brief paragraph. Keep Project Patterns, Key Decisions, Known Issues, and File Map sections in full.
- **500+ lines (~20KB)**: Read selectively — always read the top sections (Project Patterns, Key Decisions, Known Issues, File Map) and the last 5 Task History entries. Skip older Task History entries entirely.

#### Retry Context Check

If this is a retry attempt:

1. Read the previous attempt's learnings from `execution_context.md`
2. Assess the current codebase state: run linter and tests to understand what the previous attempt left behind
3. Decide approach: build on the previous attempt's partial work, or revert and try a different strategy

### Step 3: Load Task Details

Use `TaskGet` to retrieve the full task details including:
- Subject and description
- Metadata (priority, complexity, source_section, spec_path, feature_name)
- Dependencies (blockedBy, blocks)

### Step 4: Classify Task

Determine whether this is a spec-generated task or a general task:

1. Check for `**Acceptance Criteria:**` in the description
2. Check for `metadata.spec_path` field
3. Check for `Source:` reference in the description

If any of the above are present, classify as **spec-generated**. Otherwise, classify as **general**.

### Step 5: Parse Requirements

**For spec-generated tasks:**
- Extract each acceptance criterion by category (Functional, Edge Cases, Error Handling, Performance)
- Extract Testing Requirements section
- Note the source spec section for context
- Read the source spec section if referenced for additional context

**For general tasks:**
- Parse the subject line for intent: "Fix X" = bug fix, "Add X" = new feature, "Refactor X" = restructuring, "Update X" = modification
- Extract any "should..." or "when..." statements from description
- Infer completion criteria from the description

### Step 6: Explore Codebase

Understand the affected code before making changes:

1. Read `CLAUDE.md` for project conventions, tech stack, and coding standards
2. Use `Glob` to find files matching the task scope (e.g., `**/*user*.ts` for a user-related task)
3. Use `Grep` to search for related symbols, functions, or patterns
4. Read the key files that will be modified
5. Identify test file locations and patterns

### Step 7: Summarize Scope

Before proceeding to implementation, have a clear understanding of:
- What files need to be created or modified
- What the expected behavior change is
- What tests need to be written or updated
- What project conventions to follow

---

## Phase 2: Implement

If `progress.md` exists in `.claude/sessions/__live_session__/`, update the Phase line to `Phase: Phase 2 — Implementing`.

Execute the implementation following project patterns and best practices.

### Pre-Implementation Reads

Always read target files before modifying them:
- Read every file you plan to edit (never edit blind)
- Read related test files to understand test patterns
- Read adjacent files for consistency (same directory, same module)

### Implementation Order

Follow a dependency-aware implementation order:

```
1. Data layer (models, schemas, types)
2. Service layer (business logic, utilities)
3. API/Interface layer (endpoints, handlers, UI)
4. Test layer (unit tests, integration tests)
5. Configuration (env vars, config files)
```

### Coding Standards

Apply these standards during implementation:

- **Follow existing patterns**: Match the coding style, naming conventions, and patterns already in the codebase
- **Read CLAUDE.md conventions**: Apply any project-specific rules
- **Minimal changes**: Only modify what the task requires; do not refactor surrounding code
- **Self-documenting code**: Use clear naming; add comments only when the "why" isn't obvious
- **Error handling**: Handle errors at appropriate boundaries, not everywhere
- **Type safety**: Follow the project's type conventions (TypeScript strict mode, Python type hints, etc.)

### Mid-Implementation Checks

After completing the core implementation (before tests):
1. Run any existing linter (`npm run lint`, `ruff check`, etc.) to catch style issues early
2. Run existing tests to make sure nothing is broken (`npm test`, `pytest`, etc.)
3. Fix any issues before proceeding to write new tests

### Test Writing

If the task specifies testing requirements or the project has test patterns:

1. Follow the existing test framework and patterns
2. Write tests for the behavior specified in acceptance criteria
3. Test edge cases listed in the acceptance criteria
4. Ensure tests are independent and can run in any order
5. Use descriptive test names that explain the expected behavior

---

## Phase 3: Verify

If `progress.md` exists in `.claude/sessions/__live_session__/`, update the Phase line to `Phase: Phase 3 — Verifying`.

Verify the implementation against task requirements. The verification approach is adaptive based on task classification.

### Spec-Generated Task Verification

Walk through each acceptance criteria category systematically:

**Functional Criteria:**
- For each criterion, verify the implementation satisfies it
- Run relevant tests to confirm behavior
- Check that the code path exists and is reachable

**Edge Cases:**
- Verify boundary conditions are handled
- Check that edge case scenarios produce correct results
- Run edge case tests if written

**Error Handling:**
- Verify error scenarios are handled gracefully
- Check that error messages are clear and actionable
- Confirm error recovery behavior works

**Performance:** (if applicable)
- Run performance-related tests if specified
- Verify resource usage is within bounds

**Testing Requirements:**
- Run all tests: `npm test`, `pytest`, or project-specific command
- Verify test count matches expectations
- Check for test failures

### General Task Verification

For tasks without structured acceptance criteria:

1. **Infer "done" from description**: What does success look like based on the task subject and description?
2. **Run existing tests**: Ensure no regressions
3. **Run linter**: Check code quality
4. **Verify core change**: Confirm the primary change works as intended
5. **Spot check**: Read through the changes and verify they make sense

### Pass Threshold Rules

See `verification-patterns.md` for detailed pass/fail criteria.

---

## Phase 4: Complete

Report results and update task status.

### Determine Status

Based on verification results:

| Result | Status | Action |
|--------|--------|--------|
| All Functional criteria pass, tests pass | **PASS** | Mark task as `completed` |
| Some Edge/Error/Performance criteria fail but Functional passes | **PARTIAL** | Leave as `in_progress`, report what failed |
| Any Functional criteria fail, or tests fail | **FAIL** | Leave as `in_progress`, report failures |

### Update Task Status

**If PASS:**
```
TaskUpdate: taskId={id}, status=completed
```

**If PARTIAL or FAIL:**
Leave task as `in_progress`. Do NOT mark as completed. The orchestrating skill will decide whether to retry.

### Append to Execution Context

Always append learnings to `.claude/sessions/__live_session__/execution_context.md`, regardless of PASS/PARTIAL/FAIL:

```markdown
### Task [{id}]: {subject} - {PASS/PARTIAL/FAIL}
- Files modified: {list of files created or changed}
- Key learnings: {patterns discovered, conventions noted, useful file locations}
- Issues encountered: {problems hit, workarounds applied, things that didn't work}
```

Also update the relevant sections if new information was discovered:
- **Project Patterns**: New coding patterns or conventions found
- **Key Decisions**: Architecture or approach decisions made
- **Known Issues**: New problems or gotchas discovered
- **File Map**: Important files discovered and their purposes

#### Error Resilience

If the append to `execution_context.md` fails (file locked, write error, etc.):

1. **Do not crash** — continue the workflow normally
2. Log a `WARNING: Failed to append learnings to execution_context.md` line in the verification report
3. Include a `LEARNINGS:` fallback section in the report with the same data that would have been appended
4. Return the report normally — the orchestrator will pick up the fallback learnings

### Report Structure

Return a structured report to the orchestrating skill:

```
TASK RESULT: {PASS|PARTIAL|FAIL}
Task: [{id}] {subject}

VERIFICATION:
  Functional: {n}/{total} passed
  Edge Cases: {n}/{total} passed
  Error Handling: {n}/{total} passed
  Performance: {n}/{total} passed (or N/A)
  Tests: {passed}/{total} ({failed} failures)

{If PARTIAL or FAIL:}
ISSUES:
  - {criterion that failed}: {what went wrong}
  - {criterion that failed}: {what went wrong}

RECOMMENDATIONS:
  - {suggestion for fixing or completing}

FILES MODIFIED:
  - {file path}: {brief description of change}
```
