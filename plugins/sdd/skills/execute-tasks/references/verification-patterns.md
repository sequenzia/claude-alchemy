# Verification Patterns Reference

This reference provides detailed verification approaches for both spec-generated and general tasks, including task classification detection, criterion evaluation, and pass/fail determination.

## Task Classification Detection

Use this 3-step algorithm to classify a task:

### Step 1: Check Description Format

Search the task description for the `**Acceptance Criteria:**` header followed by categorized criteria:

```
_Functional:_
- [ ] ...

_Edge Cases:_
- [ ] ...
```

If found -> **spec-generated task**

### Step 2: Check Metadata

Check for `metadata.spec_path` field. If present -> **spec-generated task**

### Step 3: Check Source Reference

Check for `Source: {path} Section {number}` at the end of the description. If present -> **spec-generated task**

### Default

If none of the above are found -> **General task**

---

## Spec-Generated Task Verification

### Parsing Acceptance Criteria

Extract criteria from the task description by category:

```
**Acceptance Criteria:**

_Functional:_
- [ ] Schema defined with all required fields       -> criterion 1
- [ ] Indexes created for email lookup               -> criterion 2

_Edge Cases:_
- [ ] Handle duplicate email constraint violation    -> criterion 3

_Error Handling:_
- [ ] Clear error messages for constraint violations -> criterion 4

_Performance:_
- [ ] Query response under 100ms for indexed fields  -> criterion 5
```

Each line starting with `- [ ]` under a category header is one criterion.

### Evidence Types by Category

Verify each criterion using appropriate evidence:

| Category | How to Verify | Evidence Types |
|----------|--------------|----------------|
| **Functional** | Code inspection + test execution | File exists, function works, test passes |
| **Edge Cases** | Code inspection + targeted tests | Boundary handled, test covers scenario |
| **Error Handling** | Code inspection + error tests | Try/catch exists, error message returned, test confirms |
| **Performance** | Benchmark or inspection | Code uses efficient approach, no obvious bottlenecks |

### Functional Criteria Verification

For each Functional criterion:
1. **Locate implementation**: Find the code that satisfies this criterion
2. **Verify correctness**: Read the code and confirm it does what the criterion requires
3. **Run tests**: Execute relevant tests that exercise this behavior
4. **Record result**: PASS if code exists and tests pass; FAIL if missing or tests fail

### Edge Case Criteria Verification

For each Edge Cases criterion:
1. **Check guard clauses**: Look for boundary checks, null guards, validation
2. **Check test coverage**: Find tests that exercise the edge case
3. **Verify behavior**: Confirm the edge case produces the correct result
4. **Record result**: PASS if handled; FAIL if unhandled; SKIP if not applicable to implementation

### Error Handling Criteria Verification

For each Error Handling criterion:
1. **Check error paths**: Find try/catch, error returns, validation errors
2. **Verify messages**: Check that error messages are clear and informative
3. **Check recovery**: Verify the system recovers gracefully from the error
4. **Record result**: PASS if handled; FAIL if unhandled

### Performance Criteria Verification

For each Performance criterion:
1. **Inspect approach**: Check that the implementation uses an efficient algorithm
2. **Check for obvious issues**: N+1 queries, unbounded loops, missing indexes
3. **Run benchmarks**: If test infrastructure supports it, measure performance
4. **Record result**: PASS if efficient approach used; FAIL if obvious performance issue

### Testing Requirements Verification

After verifying acceptance criteria, check testing requirements:

1. **Parse Testing Requirements** section from description:
   ```
   **Testing Requirements:**
   - Unit: Schema validation for all field types
   - Integration: Database persistence and retrieval
   ```

2. **For each test requirement**:
   - Find or create the corresponding test
   - Run the test
   - Confirm it passes

3. **Run full test suite**: Execute the project's test command to check for regressions

---

## General Task Verification

For tasks without structured acceptance criteria, use inferred verification.

### Subject Line Parsing

Infer verification approach from the task subject:

| Subject Pattern | Verification Approach |
|----------------|----------------------|
| "Fix {X}" | Verify the bug no longer reproduces; check regression tests pass |
| "Add {X}" | Verify X exists and works; check it integrates with existing code |
| "Create {X}" | Verify X is created with correct structure; check it can be used |
| "Implement {X}" | Verify X works end-to-end; check tests cover core behavior |
| "Update {X}" | Verify X reflects the changes; check nothing else broke |
| "Remove {X}" | Verify X is fully removed; check no dead references remain |
| "Refactor {X}" | Verify behavior is unchanged; check tests still pass |
| "Configure {X}" | Verify configuration works; check it applies correctly |

### Description Parsing

Extract implicit criteria from description text:

- **"should..."** statements -> functional requirements to verify
- **"when..."** statements -> scenarios to test
- **"must..."** statements -> hard requirements to verify
- **"can..."** statements -> capabilities to confirm
- **"handle..."** statements -> error scenarios to check

### Basic Quality Checklist

For all general tasks, verify:

1. **Tests pass**: Run the project's test suite; no regressions
2. **Linter passes**: Run the project's linter; no new violations
3. **Core change works**: The primary change described in the task is implemented and functional
4. **No dead code**: Removed features don't leave dead references
5. **Files are saved**: All changes are written to disk

---

## Pass Threshold Rules

### Spec-Generated Tasks

| Category | Pass Requirement | Failure Impact |
|----------|-----------------|----------------|
| **Functional** | ALL must pass | Any failure -> FAIL |
| **Edge Cases** | Failures flagged, don't block | Report as PARTIAL if other categories pass |
| **Error Handling** | Failures flagged, don't block | Report as PARTIAL if other categories pass |
| **Performance** | Failures flagged, don't block | Report as PARTIAL if other categories pass |
| **Tests** | ALL must pass | Any test failure -> FAIL |

**Decision matrix:**

```
All Functional PASS + Tests PASS -> PASS (even if Edge/Error/Perf have issues)
All Functional PASS + Tests PASS + Edge/Error/Perf issues -> PARTIAL
Any Functional FAIL -> FAIL
Any Test FAIL -> FAIL
```

### General Tasks

| Check | Pass Requirement | Failure Impact |
|-------|-----------------|----------------|
| **Core change** | Must be implemented | Missing -> FAIL |
| **Tests pass** | Existing tests must pass | Test failure -> FAIL |
| **Linter** | No new violations | New violations -> PARTIAL |
| **No regressions** | Nothing else broken | Regression -> FAIL |

---

## Failure Escalation Format

When verification results in PARTIAL or FAIL, structure the report:

```
VERIFICATION REPORT: {PASS|PARTIAL|FAIL}

CRITERIA RESULTS:
  _Functional:_ ({passed}/{total})
  ✓ Schema defined with all required fields
  ✗ Indexes created for email lookup
    -> Index creation code exists but migration not run

  _Edge Cases:_ ({passed}/{total})
  ✓ Handle duplicate email constraint violation
  ○ Support maximum email length - SKIPPED (not applicable)

  _Error Handling:_ ({passed}/{total})
  ✓ Clear error messages for constraint violations

  _Performance:_ ({passed}/{total} or N/A)
  N/A - No performance criteria specified

TEST RESULTS:
  Ran: {total} tests
  Passed: {passed}
  Failed: {failed}
  {If failures:}
  Failures:
    - test_name: {error message}

RECOMMENDATIONS:
  - {Specific action to fix the failure}
  - {Alternative approach if primary fix is complex}
```

### Status Symbols

Use consistent symbols in verification reports:

| Symbol | Meaning |
|--------|---------|
| `✓` | Criterion passed |
| `✗` | Criterion failed |
| `○` | Criterion skipped (not applicable) |

---

## Retry Context

When a task is being retried after a previous failure, the orchestrating skill will provide failure context from the previous attempt. Use this information to:

1. **Understand what failed**: Review the previous verification report
2. **Avoid repeating mistakes**: Check if the same approach was already tried
3. **Try a different approach**: If the previous fix didn't work, consider alternatives
4. **Focus on failures**: Only address the specific criteria that failed; don't redo passing work unless regressions occurred
5. **Check execution context**: Read `.claude/{task_execution_id}/execution-context.md` for any learnings from the previous attempt
