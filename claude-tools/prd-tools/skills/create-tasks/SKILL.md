---
name: create-tasks
description: Generate Claude Code native Tasks from an existing PRD. Use when user says "create tasks", "generate tasks from PRD", "PRD to tasks", "task generation", or wants to decompose a PRD into implementation tasks.
argument-hint: "[prd-path]"
user-invocable: true
disable-model-invocation: false
allowed-tools: AskUserQuestion, Task, Read, Glob, TaskList
arguments:
  - name: prd-path
    description: Path to the PRD file to analyze for task generation
    required: true
---

# PRD to Tasks - Create Tasks Skill

You are initiating the task generation workflow. This process reads an existing PRD and creates Claude Code native Tasks with dependencies, priorities, and metadata.

## Workflow

### Step 1: Validate PRD File

Verify the PRD file exists at the provided path.

If the file is not found:
1. Check if user provided a relative path
2. Try common PRD locations:
   - `specs/PRD-{name}.md`
   - `docs/PRD-{name}.md`
   - `{name}.md` in current directory
3. Use Glob to search for similar filenames:
   - `**/PRD*.md`
   - `**/*prd*.md`
   - `**/*requirements*.md`
4. If multiple matches found, use AskUserQuestion to let user select
5. If no matches found, inform user and ask for correct path

### Step 2: Read PRD Content

Read the entire PRD file using the Read tool.

Store the full content for passing to the agent.

### Step 3: Detect Depth Level

Analyze the PRD content to detect its depth level:

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
1. If Full-Tech indicators found → Full-Tech
2. Else if Detailed indicators found → Detailed
3. Else if High-Level indicators found → High-Level
4. Default → Detailed

### Step 4: Check for Existing Tasks

Use TaskList to check if there are existing tasks that reference this PRD.

Look for tasks with `metadata.prd_path` matching the PRD path.

If existing tasks found:
- Count them by status (pending, in_progress, completed)
- Note their task_uids for merge mode
- Inform user about merge behavior

Report to user:
```
Found {n} existing tasks for this PRD:
• {pending} pending
• {in_progress} in progress
• {completed} completed

New tasks will be merged. Completed tasks will be preserved.
```

### Step 5: Check Settings

Check for optional settings at `.claude/prd-tools.local.md`:
- Author name (for attribution)
- Any custom preferences

This is optional - proceed without settings if not found.

### Step 6: Launch Task Generator Agent

Launch the task-generator agent using the Task tool with subagent_type `prd-tools:task-generator`.

Provide this context in the prompt:

```
Generate implementation tasks from the following PRD.

PRD Path: {prd_path}
Detected Depth Level: {depth_level}

{If existing tasks found:}
Existing Tasks for Merge:
- {n} pending tasks
- {n} in_progress tasks (preserve status)
- {n} completed tasks (never modify)

Existing task UIDs: {list of task_uids}

PRD Content:
---
{full_prd_content}
---

Instructions:
1. Load the task-generation skill and reference files
2. Analyze the PRD structure and extract requirements
3. Decompose features into atomic tasks following layer patterns
4. Infer dependencies between tasks
5. Present preview summary for user confirmation
6. Create tasks using TaskCreate with proper metadata
7. Set dependencies using TaskUpdate
8. {If merge mode:} Merge with existing tasks, preserving completed status
9. Report completion with recommended first tasks
```

### Step 7: Handoff Complete

Once you have launched the task-generator agent, your role is complete. The agent will handle:
- Loading task generation knowledge
- Analyzing PRD content
- Decomposing into tasks
- Inferring dependencies
- Getting user confirmation
- Creating native Tasks
- Merging with existing tasks (if re-run)

## Example Usage

### Basic Usage
```
/prd-tools:create-tasks specs/PRD-User-Authentication.md
```

### With Relative Path
```
/prd-tools:create-tasks PRD-Payments.md
```

### Re-running (Merge Mode)
```
/prd-tools:create-tasks specs/PRD-User-Authentication.md
```
If tasks already exist for this PRD, they will be intelligently merged.

## Expected Output

The workflow will:
1. Read and validate the PRD
2. Detect depth level (Full-Tech/Detailed/High-Level)
3. Show preview with task counts and priorities
4. Ask for confirmation before creating
5. Create Claude Code native Tasks
6. Set up dependency relationships
7. Report recommended first tasks to start

After completion, use `TaskList` to view all created tasks.

## Notes

- Tasks are created using Claude Code's native task system (TaskCreate/TaskUpdate)
- Each task includes metadata linking back to the source PRD
- Dependencies are automatically inferred from layer relationships and PRD phases
- Re-running on the same PRD merges intelligently (preserves completed tasks)
- Task UIDs enable tracking across PRD updates

## Reference Files

- `references/decomposition-patterns.md` - Feature decomposition patterns by type
- `references/dependency-inference.md` - Automatic dependency inference rules
- `references/testing-requirements.md` - Test type mappings and acceptance criteria patterns
