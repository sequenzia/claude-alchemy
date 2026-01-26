# Claude Code Tasks Cheatsheet

A quick reference for working with Claude Code's native task management system.

## What Are Claude Code Tasks?

Claude Code Tasks are persistent, structured work items that Claude can create, track, and manage. Unlike conversation context which may be summarized, tasks:

- **Persist across sessions** - Resume work where you left off
- **Survive context compactions** - Tasks remain even when conversation history is summarized
- **Support dependencies** - Define which tasks block others
- **Enable visualization** - View tasks in a Kanban board with task-manager

---

## CLAUDE_CODE_TASK_LIST_ID (Critical Configuration)

**This is the most important setting for task persistence.** Without it, tasks default to using the directory name, which may not persist correctly across sessions.

### Why Set This?

- Associates all tasks with your specific project
- Enables multiple Claude sessions to share the same task list
- Ensures tasks persist when you restart Claude Code
- Required for task-manager visualization

### How to Configure

**Option 1: Project settings (Recommended)**

Add to `.claude/settings.json` in your project:

```json
{
  "env": {
    "CLAUDE_CODE_TASK_LIST_ID": "my-project-name"
  }
}
```

**Option 2: Environment variable**

```bash
export CLAUDE_CODE_TASK_LIST_ID="my-project-name"
claude
```

**Option 3: Shell profile (persistent)**

Add to `~/.bashrc`, `~/.zshrc`, or equivalent:

```bash
export CLAUDE_CODE_TASK_LIST_ID="my-project-name"
```

### Example (This Repository)

```json
{
  "env": {
    "CLAUDE_CODE_TASK_LIST_ID": "claude-alchemy"
  }
}
```

---

## Task Storage

Tasks are stored as JSON files in:

```
~/.claude/tasks/{TASK_LIST_ID}/
├── 1.json
├── 2.json
├── 3.json
└── ...
```

Each task file contains the full task data including subject, description, status, dependencies, and metadata.

---

## Task Tools

| Tool | Purpose |
|------|---------|
| `TaskCreate` | Create a new task with subject, description, and metadata |
| `TaskUpdate` | Update status, add dependencies, or modify task details |
| `TaskList` | View all tasks with status summary |
| `TaskGet` | Retrieve full details for a specific task by ID |

---

## Task Schema

```json
{
  "subject": "Implement user authentication",
  "description": "Add login/logout functionality...\n\nAcceptance Criteria:\n- [ ] Login form\n- [ ] Session management",
  "activeForm": "Implementing user authentication",
  "metadata": {
    "priority": "high",
    "complexity": "M",
    "source_section": "3.1 Auth Requirements"
  }
}
```

### Field Guidelines

| Field | Format | Example |
|-------|--------|---------|
| `subject` | Imperative mood (command) | "Add user login form" |
| `activeForm` | Present continuous | "Adding user login form" |
| `description` | Detailed with acceptance criteria | Markdown supported |

---

## Task Statuses

```
pending  →  in_progress  →  completed
   │             │              │
   │             │              └─ Work finished
   │             └─ Currently being worked on
   └─ Ready to start (not blocked)
```

### Lifecycle

1. Created as `pending`
2. Set to `in_progress` when work begins
3. Set to `completed` when done
4. Completed tasks remain for history/audit

---

## Dependencies

Tasks can block each other using `blockedBy` and `blocks` relationships.

### Setting Dependencies

```
TaskUpdate:
  taskId: "3"
  addBlockedBy: ["1", "2"]
```

This means: "Task 3 cannot start until Tasks 1 and 2 are completed"

### Common Dependency Pattern

```
Data Model  →  API Endpoint  →  UI Component  →  Tests
    │               │                │            │
   T1              T2               T3           T4
```

Task 4 `blockedBy: ["3"]`, Task 3 `blockedBy: ["2"]`, etc.

---

## Commands & Shortcuts

| Action | Command/Shortcut |
|--------|------------------|
| List all tasks | `/tasks` |
| Toggle task view | `Ctrl+T` |
| Clear all tasks | Ask Claude: "clear all tasks" |
| Show task details | Ask Claude: "show task 3" |

---

## Best Practices

### Atomic Decomposition

Break work into single-outcome tasks:

- Bad: "Build the authentication system"
- Good: "Create User model with password hashing"

### Complexity Estimation (T-Shirt Sizing)

| Size | Lines of Code | Description |
|------|---------------|-------------|
| XS | <20 | Config change, simple fix |
| S | 20-100 | Single file, straightforward |
| M | 100-300 | Multiple files, moderate logic |
| L | 300-800 | Multiple components |
| XL | >800 | System-wide changes |

### Priority Mapping

| PRD Priority | Task Priority |
|--------------|---------------|
| P0 (Critical) | `critical` |
| P1 (High) | `high` |
| P2 (Medium) | `medium` |
| P3 (Low) | `low` |

### Task UID Pattern

For traceability across PRD updates:

```
{prd_path}:{feature_slug}:{task_type}:{sequence}

Example: specs/PRD-Auth.md:user-login:api:001
```

---

## Integration with claude-alchemy

### Generate Tasks from PRD

```
/prd-tools:create-tasks path/to/PRD.md
```

### Visualize Tasks

Start the task-manager app:

```bash
pnpm dev:task-manager
# Open http://localhost:3030
```

### Workflow

```
1. Create PRD ────────→ /prd-tools:create
                              │
2. Generate Tasks ────────────┤
                              ↓
3. Visualize ─────────→ task-manager (port 3030)
                              │
4. Execute Tasks ─────────────┤
                              ↓
5. Track Progress ────→ Kanban board updates in real-time
```

---

## Merge Mode

When re-running `/prd-tools:create-tasks` after PRD updates:

| Task Status | Behavior |
|-------------|----------|
| `pending` | Updated with new description |
| `in_progress` | Preserved (no changes) |
| `completed` | Never modified |
| New in PRD | Created as new task |
| Removed from PRD | Flagged for user decision |

---

## Troubleshooting

### Tasks not persisting?

1. Check `CLAUDE_CODE_TASK_LIST_ID` is set
2. Verify `~/.claude/tasks/{ID}/` exists
3. Confirm settings.json is in `.claude/` directory

### Tasks not showing in task-manager?

1. Ensure task-manager is running (`pnpm dev:task-manager`)
2. Verify `CLAUDE_CODE_TASK_LIST_ID` matches
3. Check browser console for SSE connection status

### Multi-session conflicts?

Each session claims tasks via the `owner` field. If a session crashes, tasks may remain claimed. Ask Claude to "release task 3" or update the task owner manually.
