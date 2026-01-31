# Plan: Update sdd-tools Plugin

## Summary

Update three sdd-tools skills (`create-spec`, `create-tasks`, `execute-tasks`) and their associated agents/references across 12 existing markdown files. No new files. No code compilation.

**Key decisions:**
- Clean break — no backward compatibility with `prd_path` or old `# Spec:` title format
- Token tracking uses placeholder format (`N/A` or estimated) with documentation note
- Task files archived (copied) but not deleted from `~/.claude/tasks/{project}/`

---

## Phase 1: Create-Spec Updates (5 files)

### 1.1 Templates (3 files)

All three templates get the same header change:

**Files:**
- `claude-tools/sdd-tools/skills/create-spec/references/templates/high-level.md`
- `claude-tools/sdd-tools/skills/create-spec/references/templates/detailed.md`
- `claude-tools/sdd-tools/skills/create-spec/references/templates/full-tech.md`

**Changes (identical across all 3):**
- Line 1: `# Spec: {Product Name}` → `# {Spec Name} PRD`
- Add 3 metadata fields after `**Status**: Draft`:
  ```
  **Spec Type**: {Spec Type}
  **Spec Depth**: {Spec Depth}
  **Description**: {Description}
  ```

### 1.2 Interview Agent

**File:** `claude-tools/sdd-tools/agents/interview-agent.md`

**Changes:**
- Context section (~line 54): Add `**Spec Metadata**` bullet listing Spec Type, Spec Depth, Description
- Compilation Handoff section (~line 446): Add step 3.5 instructing the agent to:
  - Use title format `# {spec-name} PRD` instead of `# Spec: {Product Name}`
  - Include Spec Type, Spec Depth, Description in metadata block

### 1.3 Create-Spec Skill

**File:** `claude-tools/sdd-tools/skills/create-spec/SKILL.md`

**Changes:**
- Step 3 (~line 59): Add to the context passed to the interview agent:
  - Title format instruction: `# {spec-name} PRD`
  - Three metadata fields: Spec Type, Spec Depth, Description

---

## Phase 2: Create-Tasks Updates (2 files)

### 2.1 Create-Tasks Skill

**File:** `claude-tools/sdd-tools/skills/create-tasks/SKILL.md`

**Changes:**
- **Step 1** (Validate Spec File): Add first-priority check: read `.claude/sdd-tools.local.md` for default spec directory/output_path and try resolving spec path against it before fallback searches
- **Step 3** (Detect Depth Level): Add first-priority check: if spec contains `**Spec Depth**:` metadata, use that value directly. Renumber detection priority list (metadata → Full-Tech → Detailed → High-Level → Default)
- **Step 4** (~line 78): Change `metadata.prd_path` → `metadata.spec_path`
- **Step 6** (~line 112): Change `prd_path` → `spec_path` in agent launch context. Add `Task Group: {spec-name}` to context. Add instruction to include `task_group` in each task's metadata

### 2.2 Task Generator Agent

**File:** `claude-tools/sdd-tools/agents/task-generator.md`

**Changes:**
- Context section: Add `**Task Group**` bullet
- Phase 2 (Spec Analysis): Add "Extract Spec Name" subsection — parse `# {name} PRD` title to get spec-name for `task_group`
- Task Structure example (~line 179): `Source: {prd_path}` → `Source: {spec_path}`
- Task metadata example (~line 185): `prd_path` → `spec_path`, add `task_group: "{spec-name}"`
- Task UID format (~line 244): `{prd_path}` → `{spec_path}` in format string
- Phase 6 Create Tasks example (~line 391): `prd_path` → `spec_path`, add `task_group`

---

## Phase 3: Execute-Tasks Updates (5 files)

### 3.1 Execute-Tasks Skill (main file)

**File:** `claude-tools/sdd-tools/skills/execute-tasks/SKILL.md`

**Changes:**
- **Frontmatter**: Add `task-group` argument, add `Write` and `Bash` to allowed-tools
- **Description**: Mention task group filtering support
- **argument-hint**: Update to `"[task-id] [--task-group <group>] [--retries <n>]"`
- **Orchestration Workflow section**:
  - Step 1: Add task-group filtering after loading tasks
  - Step 3: Add group filter to execution plan building
  - New Step 5.5: Create task_execution_id and `.claude/{task_execution_id}/` directory structure
  - Step 6: Update execution context path to `.claude/{task_execution_id}/execution-context.md`
  - Step 7: Add token tracking (placeholder) and task logging per task
  - Step 8: Save session summary to file, archive task files, create pointer file
- **Task Classification** (~line 97): `metadata.prd_path` → `metadata.spec_path`
- **Shared Execution Context** (~line 159): Update path references
- **Key Behaviors** (~line 177): Update path reference
- **Example Usage**: Add `--task-group` examples

### 3.2 Orchestration Reference (largest single file change)

**File:** `claude-tools/sdd-tools/skills/execute-tasks/references/orchestration.md`

**Changes:**
- **Step 1**: Add task-group filtering logic
- **Step 3**: Add group filter to plan building
- **New Step 5.5**: Full specification of task_execution_id determination and directory creation:
  - `execution_plan.md` — saved execution plan
  - `execution-context.md` — initialized with standard template
  - `task_log.md` — initialized with table headers
  - `tasks/` — subdirectory for archival
- **Step 6**: All `.claude/execution-context.md` → `.claude/{task_execution_id}/execution-context.md`
- **Step 7c** (agent launch): `prd_path` → `spec_path`, update execution context path, add token reporting instruction
- **Step 7d**: Add task logging to `task_log.md` after each result
- **New Step 7f**: Archive completed task files to `.claude/{task_execution_id}/tasks/`
- **Step 8**: Add token usage summary, save `session_summary.md`, create `execution_pointer.txt` at `~/.claude/tasks/{project}/`

### 3.3 Execution Workflow Reference

**File:** `claude-tools/sdd-tools/skills/execute-tasks/references/execution-workflow.md`

**Changes:**
- Line 22: `.claude/execution-context.md` → `.claude/{task_execution_id}/execution-context.md`
- Line 46: `metadata.prd_path` → `metadata.spec_path`
- Line 211: Update execution context path

### 3.4 Verification Patterns Reference

**File:** `claude-tools/sdd-tools/skills/execute-tasks/references/verification-patterns.md`

**Changes:**
- Line 25: `metadata.prd_path` → `metadata.spec_path`
- Line 254: `.claude/execution-context.md` → `.claude/{task_execution_id}/execution-context.md`

### 3.5 Task Executor Agent

**File:** `claude-tools/sdd-tools/agents/task-executor.md`

**Changes:**
- Context section (~line 31): Update execution context path, add Task Execution ID
- Phase 1, Step 2 (~line 58): Update execution context read path
- Phase 1, Step 3 (~line 71): `prd_path` → `spec_path`, add `task_group`
- Phase 1, Step 4 (~line 79): `metadata.prd_path` → `metadata.spec_path`
- Phase 4 (~line 219): Update execution context append path
- Retry Behavior (~line 273): Update execution context path

---

## Phase 4: Verification

After all edits, run these grep checks:
1. `grep -r "prd_path" claude-tools/sdd-tools/` → should return 0 results
2. `grep -r "\.claude/execution-context\.md" claude-tools/sdd-tools/` → should return 0 results (all should be `{task_execution_id}` prefixed)
3. `grep -r "# Spec: {" claude-tools/sdd-tools/` → should return 0 results in templates

---

## File Summary

| File | Changes |
|------|---------|
| `skills/create-spec/references/templates/high-level.md` | Title format + metadata fields |
| `skills/create-spec/references/templates/detailed.md` | Title format + metadata fields |
| `skills/create-spec/references/templates/full-tech.md` | Title format + metadata fields |
| `agents/interview-agent.md` | Metadata awareness + title format instruction |
| `skills/create-spec/SKILL.md` | Pass metadata context to agent |
| `skills/create-tasks/SKILL.md` | Settings lookup, depth detection, prd_path→spec_path, task_group |
| `agents/task-generator.md` | prd_path→spec_path, task_group, spec-name extraction |
| `skills/execute-tasks/SKILL.md` | task-group arg, execution ID, directory, token tracking, archival |
| `skills/execute-tasks/references/orchestration.md` | New execution steps, token logging, archival, pointer file |
| `skills/execute-tasks/references/execution-workflow.md` | Path updates, prd_path→spec_path |
| `skills/execute-tasks/references/verification-patterns.md` | prd_path→spec_path, path updates |
| `agents/task-executor.md` | Path updates, prd_path→spec_path, task_group |

All paths relative to `claude-tools/sdd-tools/`.
