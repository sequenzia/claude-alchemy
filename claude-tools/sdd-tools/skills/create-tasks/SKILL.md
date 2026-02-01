---
name: create-tasks
description: Generate Claude Code native Tasks from an existing spec. Use when user says "create tasks", "generate tasks from spec", "spec to tasks", "task generation", or wants to decompose a spec into implementation tasks.
argument-hint: "[spec-path]"
user-invocable: true
disable-model-invocation: false
allowed-tools: AskUserQuestion, Task, Read, Glob, TaskList
arguments:
  - name: spec-path
    description: Path to the spec file to analyze for task generation
    required: true
---

# Spec to Tasks - Create Tasks Skill

You are initiating the task generation workflow. This process reads an existing spec and creates Claude Code native Tasks with dependencies, priorities, and metadata.

## Workflow

### Step 1: Validate Spec File

Verify the spec file exists at the provided path.

If the file is not found:
1. Check `.claude/sdd-tools.local.md` for a default spec directory or output path, and try resolving the spec path against it
2. Check if user provided a relative path
3. Try common spec locations:
   - `specs/SPEC-{name}.md`
   - `docs/SPEC-{name}.md`
   - `{name}.md` in current directory
3. Use Glob to search for similar filenames:
   - `**/SPEC*.md`
   - `**/*spec*.md`
   - `**/*requirements*.md`
4. If multiple matches found, use AskUserQuestion to let user select
5. If no matches found, inform user and ask for correct path

### Step 2: Read Spec Content

Read the entire spec file using the Read tool.

Store the full content for passing to the agent.

### Step 3: Detect Depth Level

Analyze the spec content to detect its depth level:

**Full-Tech Indicators** (check first):
- Contains `API Specifications` section OR `### 7.4 API` or similar
- Contains API endpoint definitions (`POST /api/`, `GET /api/`, etc.)
- Contains `Testing Strategy` section
- Contains data model schemas with field definitions
- Contains code examples or schema definitions

**Detailed Indicators**:
- Uses numbered sections (`## 1.`, `### 2.1`)
- Contains `Technical Architecture` or `Technical Considerations` section
- Contains user stories (`**US-001**:` or similar format)
- Contains acceptance criteria (`- [ ]` checkboxes)
- Contains feature prioritization (P0, P1, P2, P3)

**High-Level Indicators**:
- Contains feature table with Priority column
- Executive summary focus (brief problem/solution)
- No user stories or acceptance criteria
- Shorter document (~50-100 lines)
- Minimal technical details

**Detection Priority**:
1. If spec contains `**Spec Depth**:` metadata field, use that value directly
2. Else if Full-Tech indicators found → Full-Tech
3. Else if Detailed indicators found → Detailed
4. Else if High-Level indicators found → High-Level
5. Default → Detailed

### Step 4: Check for Existing Tasks

Use TaskList to check if there are existing tasks that reference this spec.

Look for tasks with `metadata.spec_path` matching the spec path.

If existing tasks found:
- Count them by status (pending, in_progress, completed)
- Note their task_uids for merge mode
- Inform user about merge behavior

Report to user:
```
Found {n} existing tasks for this spec:
• {pending} pending
• {in_progress} in progress
• {completed} completed

New tasks will be merged. Completed tasks will be preserved.
```

### Step 5: Check Settings

Check for optional settings at `.claude/sdd-tools.local.md`:
- Author name (for attribution)
- Any custom preferences

This is optional - proceed without settings if not found.

### Step 6: Launch Task Generator Agent

Launch the task-generator agent using the Task tool with subagent_type `sdd-tools:task-generator`.

Provide this context in the prompt:

```
Generate implementation tasks from the following spec.

Spec Path: {spec_path}
Detected Depth Level: {depth_level}

{If existing tasks found:}
Existing Tasks for Merge:
- {n} pending tasks
- {n} in_progress tasks (preserve status)
- {n} completed tasks (never modify)

Existing task UIDs: {list of task_uids}

Task Group: {spec-name}

Spec Content:
---
{full_spec_content}
---

Instructions:
1. Load the task-generation skill and reference files
2. Analyze the spec structure and extract requirements
3. Decompose features into atomic tasks following layer patterns
4. Infer dependencies between tasks
5. Present preview summary for user confirmation
6. Create tasks using TaskCreate with proper metadata
7. Include `task_group` in each task's metadata, derived from the spec title
8. Set dependencies using TaskUpdate
9. {If merge mode:} Merge with existing tasks, preserving completed status
10. Report completion with recommended first tasks
```

### Step 7: Handoff Complete

Once you have launched the task-generator agent, your role is complete. The agent will handle:
- Loading task generation knowledge
- Analyzing spec content
- Decomposing into tasks
- Inferring dependencies
- Getting user confirmation
- Creating native Tasks
- Merging with existing tasks (if re-run)

## Example Usage

### Basic Usage
```
/sdd-tools:create-tasks specs/SPEC-User-Authentication.md
```

### With Relative Path
```
/sdd-tools:create-tasks SPEC-Payments.md
```

### Re-running (Merge Mode)
```
/sdd-tools:create-tasks specs/SPEC-User-Authentication.md
```
If tasks already exist for this spec, they will be intelligently merged.

## Expected Output

The workflow will:
1. Read and validate the spec
2. Detect depth level (Full-Tech/Detailed/High-Level)
3. Show preview with task counts and priorities
4. Ask for confirmation before creating
5. Create Claude Code native Tasks
6. Set up dependency relationships
7. Report recommended first tasks to start

After completion, use `TaskList` to view all created tasks.

## Notes

- Tasks are created using Claude Code's native task system (TaskCreate/TaskUpdate)
- Each task includes metadata linking back to the source spec
- Dependencies are automatically inferred from layer relationships and spec phases
- Re-running on the same spec merges intelligently (preserves completed tasks)
- Task UIDs enable tracking across spec updates

## Reference Files

- `references/decomposition-patterns.md` - Feature decomposition patterns by type
- `references/dependency-inference.md` - Automatic dependency inference rules
- `references/testing-requirements.md` - Test type mappings and acceptance criteria patterns
