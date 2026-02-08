<!-- docs/architecture/data-flow.md -->
# Data Flow

Claude Alchemy operates through three distinct data flow paths that converge on a shared filesystem-as-message-bus integration pattern. Each subsystem -- the SDD plugin pipeline, the Tools plugin agent orchestration, and the Task Manager real-time UI -- reads and writes to `~/.claude/tasks/` as its primary communication channel. No shared runtime code, no database, and no IPC connects these systems; the filesystem is the sole integration boundary.

This page documents every major data flow path, the components involved, and the precise mechanism by which data moves from producer to consumer.

For the underlying integration pattern details, see [Filesystem Message Bus](filesystem-message-bus.md).

---

## Overview

```mermaid
graph TB
    subgraph "SDD Plugin"
        CS[create-spec] --> AS[analyze-spec]
        CS --> CT[create-tasks]
        CT --> ET[execute-tasks]
    end

    subgraph "Tools Plugin"
        FD[feature-dev] --> DA[deep-analysis]
        DA --> CA[code-architect]
        CA --> CR[code-reviewer]
    end

    subgraph "Filesystem"
        SPECS["specs/SPEC-*.md"]
        TASKS["~/.claude/tasks/*.json"]
        SESSION[".claude/sessions/__live_session__/"]
        POINTER["execution_pointer.md"]
    end

    subgraph "Task Manager"
        FW[FileWatcher] --> SSE[SSE Route]
        SSE --> HOOK[useSSE Hook]
        HOOK --> TQ[TanStack Query]
        TQ --> UI[Kanban Board]
    end

    CS --> SPECS
    CT --> TASKS
    ET --> SESSION
    ET --> POINTER
    TASKS --> FW
    SESSION --> FW
    POINTER --> FW
```

---

## Real-Time Data Flow (Task Manager)

The Task Manager is a Next.js application that renders a Kanban board reflecting the live state of `~/.claude/tasks/`. It uses a Server Component + Client Component hydration pattern where the server reads files for the initial render, then the client subscribes to a Server-Sent Events stream for real-time updates.

### Full Pipeline

```
~/.claude/tasks/*.json
    → Chokidar FileWatcher (polling 300ms)
    → EventEmitter (taskEvent / executionEvent)
    → SSE Route Handler (/api/events)
    → EventSource in browser (useSSE hook)
    → Dual invalidation: TanStack Query cache + router.refresh()
    → UI re-render
```

### Sequence Diagram

```mermaid
sequenceDiagram
    participant FS as Filesystem<br/>~/.claude/tasks/
    participant CK as Chokidar<br/>FileWatcher
    participant EE as EventEmitter
    participant SSE as SSE Route<br/>/api/events
    participant ES as EventSource<br/>(Browser)
    participant TQ as TanStack Query
    participant SC as Server Components
    participant UI as Kanban Board

    Note over FS,UI: Initial Page Load
    SC->>FS: readdir + readFile (taskService.ts)
    SC->>UI: Pass initialTasks + initialExecutionContext as props

    Note over FS,UI: Real-Time Update Path
    FS->>CK: File change detected (add/change/unlink)
    CK->>EE: emit('taskEvent', {type, taskListId, taskId, task})
    EE->>SSE: Handler receives event
    SSE->>ES: Stream: event: task:updated\ndata: {...}
    ES->>TQ: invalidateQueries({queryKey: taskKeys.list(listId)})
    ES->>SC: router.refresh() — refetch Server Component data
    TQ->>UI: Re-render with fresh data
```

### Component Breakdown

=== "FileWatcher (Server)"

    The `FileWatcher` class in `src/lib/fileWatcher.ts` is a Chokidar-based singleton that watches the `~/.claude/tasks/` directory tree. It survives Next.js Hot Module Replacement by attaching to `globalThis`.

    ```typescript title="apps/task-manager/src/lib/fileWatcher.ts"
    // Singleton pattern for HMR survival
    const globalForWatcher = globalThis as unknown as {
      fileWatcher: FileWatcher | undefined
    }

    export const fileWatcher = globalForWatcher.fileWatcher ?? new FileWatcher()

    if (process.env.NODE_ENV !== 'production') {
      globalForWatcher.fileWatcher = fileWatcher
    }
    ```

    **Configuration:**

    | Setting | Value | Purpose |
    |---------|-------|---------|
    | `usePolling` | `true` | Required for cross-platform reliability |
    | `interval` | `300` ms | Balance between responsiveness and CPU usage |
    | `depth` | `2` | Watch `tasks/{listId}/*.json` without excessive recursion |
    | `ignoreInitial` | `true` | Skip events for files that exist at startup |

    **Event Types Emitted:**

    | Event | Trigger | Payload |
    |-------|---------|---------|
    | `taskEvent` | `.json` file added, changed, or deleted | `{ type: SSEEventType, taskListId, taskId, task? }` |
    | `executionEvent` | `.md` or `.txt` file changed in a watched execution directory | `{ type: 'execution:updated', taskListId }` |

    The `watchExecutionDir()` method dynamically adds execution session directories to the watcher when an SSE client connects with a `taskListId` that has an `execution_pointer.md`.

=== "SSE Route Handler (Server)"

    The `/api/events` route in `src/app/api/events/route.ts` creates a `ReadableStream` and subscribes to `FileWatcher` events. It filters events by the `taskListId` query parameter.

    ```typescript title="apps/task-manager/src/app/api/events/route.ts"
    export async function GET(request: Request) {
      const { searchParams } = new URL(request.url)
      const taskListId = searchParams.get('taskListId')

      // Ensure file watcher is started
      if (!fileWatcher.isStarted()) {
        await fileWatcher.start()
      }

      // Watch execution directory for this task list
      if (taskListId) {
        const execDir = await getExecutionDir(taskListId)
        if (execDir) {
          fileWatcher.watchExecutionDir(taskListId, execDir)
        }
      }

      // ... ReadableStream with event handlers
    }
    ```

    **SSE Event Format:**

    ```
    event: task:updated
    data: {"type":"task:updated","taskListId":"claude-alchemy","taskId":"5","task":{...}}

    event: execution:updated
    data: {"type":"execution:updated","taskListId":"claude-alchemy"}
    ```

    A heartbeat comment (`:heartbeat`) is sent every 30 seconds to keep the connection alive. Cleanup removes event listeners on client abort.

=== "useSSE Hook (Client)"

    The `useSSE` hook in `src/hooks/useSSE.ts` opens an `EventSource` connection to `/api/events` and triggers dual invalidation on every event.

    ```typescript title="apps/task-manager/src/hooks/useSSE.ts"
    const handleTaskEvent = () => {
      // Invalidate client-side cache
      queryClient.invalidateQueries({ queryKey: taskKeys.list(taskListId) })
      queryClient.invalidateQueries({ queryKey: taskListKeys.all })
      // Refresh Server Component data
      router.refresh()
    }

    const handleExecutionEvent = () => {
      queryClient.invalidateQueries({
        queryKey: executionContextKeys.list(taskListId),
      })
      router.refresh()
    }
    ```

    **Listened Events:** `task:created`, `task:updated`, `task:deleted`, `execution:updated`

    **Reconnection:** On error, the EventSource closes and a new connection is attempted after a 3-second delay via a `reconnectKey` state increment.

=== "Task Service (Server)"

    The `taskService.ts` module provides the read layer for Server Components. It reads JSON files from `~/.claude/tasks/` and parses them with defensive normalization.

    ```typescript title="apps/task-manager/src/lib/taskService.ts"
    // Defensive parsing: normalize IDs, default status, coerce arrays
    function parseTask(content: string, filename: string): Task | null {
      const data = JSON.parse(content)
      data.id = String(data.id ?? basename(filename, '.json'))
      if (!isValidTaskStatus(data.status)) data.status = 'pending'
      data.blocks = Array.isArray(data.blocks) ? data.blocks.map(String) : []
      data.blockedBy = Array.isArray(data.blockedBy) ? data.blockedBy.map(String) : []
      return data as Task
    }
    ```

    **Security:** `resolveExecutionDir()` guards against path traversal by ensuring the resolved execution pointer path stays under `$HOME` using `path.relative()`.

### Dual Invalidation Strategy

The Task Manager uses two complementary invalidation mechanisms to ensure both Server Component and Client Component data stay synchronized:

| Mechanism | Target | Purpose |
|-----------|--------|---------|
| `queryClient.invalidateQueries()` | TanStack Query cache | Forces client-side data refetch on next access |
| `router.refresh()` | Next.js Server Components | Re-runs server-side data fetching functions |

This dual approach is necessary because:

1. **Server Components** fetch initial data from the filesystem in `page.tsx` and pass it as props
2. **Client Components** use TanStack Query with `initialData` for hydration, then manage their own cache
3. Without `router.refresh()`, Server Component data would go stale after the initial render
4. Without query invalidation, the TanStack Query cache would serve stale data between refetches

---

## SDD Pipeline Flow

The Spec-Driven Development plugin implements a linear pipeline that transforms a user's idea into executed, verified code changes. Each stage produces filesystem artifacts consumed by the next stage.

### Full Pipeline

```
User request
    → create-spec (interview → SPEC file)
    → analyze-spec (optional QA → analysis report)
    → create-tasks (decompose → ~/.claude/tasks/*.json)
    → execute-tasks (10-step orchestrator)
        → spawns task-executor agents (4-phase workflow)
        → shared execution_context.md
        → execution_pointer.md
    → Task Manager (real-time visibility)
```

### Pipeline Sequence

```mermaid
sequenceDiagram
    participant U as User
    participant CS as create-spec
    participant AS as analyze-spec
    participant CT as create-tasks
    participant ET as execute-tasks
    participant TE as task-executor<br/>(per task)
    participant FS as Filesystem
    participant TM as Task Manager

    Note over U,TM: Stage 1: Specification
    U->>CS: /sdd:create-spec
    CS->>U: Adaptive interview (2-5 rounds)
    CS->>FS: Write specs/SPEC-{name}.md

    Note over U,TM: Stage 2: Quality Analysis (Optional)
    U->>AS: /sdd:analyze-spec specs/SPEC-{name}.md
    AS->>FS: Read spec, generate analysis report
    AS->>FS: Write specs/SPEC-{name}.analysis.md
    AS->>U: Interactive issue resolution

    Note over U,TM: Stage 3: Task Generation
    U->>CT: /sdd:create-tasks specs/SPEC-{name}.md
    CT->>FS: Read spec, decompose features
    CT->>FS: TaskCreate → ~/.claude/tasks/{listId}/*.json
    FS-->>TM: FileWatcher detects new .json files

    Note over U,TM: Stage 4: Execution
    U->>ET: /sdd:execute-tasks
    ET->>FS: Build execution plan, init session
    ET->>FS: Write .claude/sessions/__live_session__/*
    ET->>FS: Write execution_pointer.md
    FS-->>TM: FileWatcher detects pointer + session files

    loop For each wave
        ET->>TE: Launch parallel task-executor agents
        TE->>FS: Read execution_context.md (snapshot)
        TE->>FS: Implement, verify, update task status
        TE->>FS: Write context-task-{id}.md (learnings)
        FS-->>TM: FileWatcher → SSE → UI updates
        TE->>ET: Return verification report
        ET->>FS: Merge per-task contexts → execution_context.md
        ET->>FS: Update progress.md, task_log.md
    end

    ET->>FS: Archive session, write summary
    ET->>U: Display execution summary
```

### Stage Details

=== "create-spec"

    **Input:** User's feature idea (via interactive interview)
    **Output:** `specs/SPEC-{name}.md`

    The skill conducts a 2-5 round adaptive interview, adjusting depth based on the user's chosen level (high-level, detailed, or full-tech). It detects recommendation triggers in user responses and offers proactive suggestions. An optional research agent can be dispatched for external information.

    **Key artifacts produced:**

    | Artifact | Path | Purpose |
    |----------|------|---------|
    | Specification | `specs/SPEC-{name}.md` | Requirements with acceptance criteria, phases, dependencies |

=== "analyze-spec"

    **Input:** Path to a spec file
    **Output:** Analysis report + optional spec updates

    The skill launches a `spec-analyzer` agent that evaluates the spec across four categories: inconsistencies, missing information, ambiguities, and structure issues. Severity levels (Critical, Warning, Suggestion) help prioritize fixes.

    **Key artifacts produced:**

    | Artifact | Path | Purpose |
    |----------|------|---------|
    | Analysis report | `specs/SPEC-{name}.analysis.md` | Findings with severity and recommendations |
    | HTML review | `specs/SPEC-{name}.analysis.html` | Interactive browser-based review |

=== "create-tasks"

    **Input:** Path to a spec file
    **Output:** Claude Code native Tasks (JSON files)

    The skill reads the spec, decomposes features into atomic tasks using a layered pattern (Data Model, API/Service, Business Logic, UI, Tests), infers dependency chains via topological analysis, and creates tasks with structured acceptance criteria.

    **Key data transformations:**

    ```
    Spec Section 5.x (Functional Requirements)
        → Features with priorities (P0-P3)
        → Atomic tasks with categorized acceptance criteria
            - Functional, Edge Cases, Error Handling, Performance
        → Dependency graph (blockedBy/blocks relationships)
        → TaskCreate API → ~/.claude/tasks/{listId}/{taskId}.json
    ```

    **Task JSON structure written to disk:**

    ```json
    {
      "id": "1",
      "subject": "Create User data model",
      "description": "...\n\n**Acceptance Criteria:**\n\n_Functional:_\n- [ ] ...",
      "status": "pending",
      "blocks": ["2", "3"],
      "blockedBy": [],
      "activeForm": "Creating User data model",
      "metadata": {
        "priority": "critical",
        "complexity": "S",
        "source_section": "7.3 Data Models",
        "spec_path": "specs/SPEC-Auth.md",
        "feature_name": "User Authentication",
        "task_uid": "specs/SPEC-Auth.md:user-auth:model:001",
        "task_group": "user-authentication"
      }
    }
    ```

=== "execute-tasks"

    **Input:** Task list (all pending/unblocked tasks)
    **Output:** Completed tasks, session artifacts, CLAUDE.md updates

    The 10-step orchestrator builds a dependency-aware execution plan, sorts tasks into waves, and launches up to `max_parallel` (default: 5) task-executor agents simultaneously per wave.

    **Session directory layout (`.claude/sessions/__live_session__/`):**

    | File | Purpose | Updated by |
    |------|---------|------------|
    | `execution_plan.md` | Dependency-sorted plan with wave assignments | Orchestrator (once) |
    | `execution_context.md` | Shared learnings across tasks | Orchestrator (merged after each wave) |
    | `task_log.md` | Table of results: Task ID, Subject, Status, Attempts, Duration, Token Usage | Orchestrator (after each agent returns) |
    | `progress.md` | Real-time status: current wave, active tasks, completed tasks | Orchestrator (between agent launches) |
    | `context-task-{id}.md` | Per-task learnings during concurrent execution | Individual task-executor agents |
    | `.lock` | Concurrency guard (prevents parallel sessions) | Orchestrator (create on start, archive on end) |
    | `tasks/` | Archive of completed task JSONs | Orchestrator (after each wave) |
    | `session_summary.md` | Final execution results | Orchestrator (at session end) |

    **Execution pointer bridge:**

    ```
    ~/.claude/tasks/{listId}/execution_pointer.md
        → Contains: absolute path to .claude/sessions/__live_session__/
        → Read by: Task Manager's taskService.ts → getExecutionDir()
        → Enables: Task Manager to display execution artifacts
    ```

### Task-Executor 4-Phase Workflow

Each task-executor agent follows a strict 4-phase workflow:

```mermaid
flowchart LR
    P1["Phase 1<br/>Understand"] --> P2["Phase 2<br/>Implement"]
    P2 --> P3["Phase 3<br/>Verify"]
    P3 --> P4["Phase 4<br/>Complete"]

    P1 --- U1["Read execution_context.md<br/>Load task via TaskGet<br/>Classify task type<br/>Parse requirements<br/>Explore codebase"]
    P2 --- U2["Read target files<br/>Follow layer order<br/>Match conventions<br/>Run mid-implementation checks"]
    P3 --- U3["Walk acceptance criteria<br/>Run tests + linter<br/>Determine PASS/PARTIAL/FAIL"]
    P4 --- U4["Update task status<br/>Write learnings to<br/>context-task-{id}.md<br/>Return structured report"]
```

**Verification results determine task status:**

| Result | Condition | Task Status |
|--------|-----------|-------------|
| PASS | All Functional criteria pass, tests pass | `completed` |
| PARTIAL | Functional passes but Edge/Error/Performance issues | `in_progress` (orchestrator retries) |
| FAIL | Any Functional criterion fails or tests fail | `in_progress` (orchestrator retries) |

### Wave-Based Concurrency Model

The orchestrator executes tasks in dependency-ordered waves with configurable parallelism:

```mermaid
flowchart TB
    subgraph "Wave 1 (no dependencies)"
        T1["Task 1<br/>Data Model"] & T2["Task 2<br/>Config Setup"] & T3["Task 3<br/>Auth Types"]
    end

    subgraph "Wave 2 (depends on Wave 1)"
        T4["Task 4<br/>API Endpoints"] & T5["Task 5<br/>Service Layer"]
    end

    subgraph "Wave 3 (depends on Wave 2)"
        T6["Task 6<br/>UI Components"] & T7["Task 7<br/>Integration Tests"]
    end

    T1 & T2 --> T4
    T1 & T3 --> T5
    T4 & T5 --> T6
    T4 & T5 --> T7
```

**Concurrency rules:**

- Tasks within a wave run in parallel (up to `max_parallel` concurrent agents)
- All wave tasks must complete before the next wave starts
- Failed tasks with retries remaining are re-launched immediately within the wave
- After each wave, per-task context files are merged into `execution_context.md`
- Dynamic unblocking: newly unblocked tasks are added to the next wave

### Context Sharing Pattern

During concurrent execution, write contention on `execution_context.md` is avoided through a snapshot-and-merge pattern:

```mermaid
sequenceDiagram
    participant O as Orchestrator
    participant EC as execution_context.md
    participant A1 as Agent 1
    participant A2 as Agent 2
    participant CT1 as context-task-1.md
    participant CT2 as context-task-2.md

    O->>EC: Snapshot before wave
    O->>A1: Launch with snapshot reference
    O->>A2: Launch with snapshot reference
    A1->>EC: Read (shared snapshot)
    A2->>EC: Read (shared snapshot)
    A1->>CT1: Write learnings
    A2->>CT2: Write learnings
    A1->>O: Return verification report
    A2->>O: Return verification report
    O->>CT1: Read per-task context
    O->>CT2: Read per-task context
    O->>EC: Merge all per-task contexts
    O->>CT1: Delete
    O->>CT2: Delete
```

!!! info "Sequential Mode"
    When `max_parallel` is set to 1, agents write directly to `execution_context.md` instead of per-task files. The snapshot-and-merge pattern is skipped.

---

## Tools Plugin Agent Orchestration

The Tools plugin provides two variants of its deep analysis workflow: a standard Task-based approach and a team-based collaborative approach using Agent Teams.

### Standard Deep Analysis Flow

The `feature-dev` skill orchestrates a 7-phase workflow. Phase 2 (Codebase Exploration) delegates to the `deep-analysis` skill, which uses the standard Task tool for agent coordination.

```mermaid
sequenceDiagram
    participant U as User
    participant FD as feature-dev
    participant DA as deep-analysis
    participant E1 as code-explorer 1<br/>(Sonnet)
    participant E2 as code-explorer 2<br/>(Sonnet)
    participant E3 as code-explorer 3<br/>(Sonnet)
    participant SY as codebase-synthesizer<br/>(Opus)
    participant CA as code-architect<br/>(Opus)
    participant CR as code-reviewer<br/>(Opus)

    Note over U,CR: Phase 1: Discovery
    U->>FD: /tools:feature-dev "add OAuth login"
    FD->>U: Confirm understanding

    Note over U,CR: Phase 2: Codebase Exploration (deep-analysis)
    FD->>DA: Load deep-analysis skill
    par Parallel Exploration
        DA->>E1: Focus: entry points + user-facing code
        DA->>E2: Focus: data models + storage
        DA->>E3: Focus: utilities + shared infrastructure
    end
    E1-->>DA: Findings report
    E2-->>DA: Findings report
    E3-->>DA: Findings report
    DA->>SY: Synthesize all findings
    SY-->>DA: Unified analysis
    DA-->>FD: Synthesis complete

    Note over U,CR: Phase 3: Clarifying Questions
    FD->>U: Resolve ambiguities

    Note over U,CR: Phase 4: Architecture Design
    par Parallel Architecture Design
        FD->>CA: Approach 1 — minimal/simple
        FD->>CA: Approach 2 — flexible/extensible
        FD->>CA: Approach 3 — match existing patterns
    end
    CA-->>FD: Implementation blueprints
    FD->>U: Compare approaches, select one

    Note over U,CR: Phase 5: Implementation
    FD->>FD: Build the feature

    Note over U,CR: Phase 6: Quality Review
    par Parallel Code Review
        FD->>CR: Focus: correctness + edge cases
        FD->>CR: Focus: security + error handling
        FD->>CR: Focus: maintainability + code quality
    end
    CR-->>FD: Aggregated findings
    FD->>U: Present issues, user decides on fixes

    Note over U,CR: Phase 7: Summary
    FD->>U: Document accomplishments, update CHANGELOG
```

**Agent model tiers:**

| Agent | Model | Role |
|-------|-------|------|
| `code-explorer` | Sonnet (default) | Fast, parallel codebase exploration |
| `codebase-synthesizer` | Opus | Deep analysis and pattern recognition |
| `code-architect` | Opus | Architecture design with trade-off analysis |
| `code-reviewer` | Opus | Thorough code review with confidence scores |

### Team-Based Deep Analysis Flow

When invoked with the `--teams` flag, `feature-dev` uses `teams-deep-analysis` instead of `deep-analysis`. This variant uses Claude's Agent Teams API (`TeamCreate`, `SendMessage`) for real-time inter-agent collaboration.

```mermaid
sequenceDiagram
    participant L as Lead<br/>(Orchestrator)
    participant E1 as explorer-1<br/>(Sonnet)
    participant E2 as explorer-2<br/>(Sonnet)
    participant E3 as explorer-3<br/>(Sonnet)
    participant SY as deep-synthesizer<br/>(Opus)

    Note over L,SY: Phase 1: Planning
    L->>L: Rapid codebase reconnaissance (Glob/Grep/Read)
    L->>L: Generate dynamic focus areas
    L->>L: TeamCreate("deep-analysis-{timestamp}")
    par Spawn 4 teammates
        L->>E1: Task(team-code-explorer)
        L->>E2: Task(team-code-explorer)
        L->>E3: Task(team-code-explorer)
        L->>SY: Task(team-deep-synthesizer)
    end
    L->>L: TaskCreate exploration + synthesis tasks
    L->>L: TaskUpdate assign owners

    Note over L,SY: Phase 2: Focused Exploration
    par Workers explore independently (no cross-worker messaging)
        E1->>E1: Explore assigned focus area
        E2->>E2: Explore assigned focus area
        E3->>E3: Explore assigned focus area
    end
    E1-->>L: Task complete
    E2-->>L: Task complete
    E3-->>L: Task complete

    Note over L,SY: Phase 3: Evaluation and Synthesis
    L->>SY: Assign synthesis task + recon findings
    SY->>E1: SendMessage("Clarify: how does auth chain work?")
    E1->>SY: SendMessage("Auth uses middleware → JWT → role check")
    SY->>SY: Bash: git log --oneline -- src/auth/
    SY->>SY: Evaluate completeness
    SY-->>L: Unified analysis complete

    Note over L,SY: Phase 4: Cleanup
    L->>L: Collect synthesis output
    par Shutdown all teammates
        L->>E1: SendMessage(type: shutdown_request)
        L->>E2: SendMessage(type: shutdown_request)
        L->>E3: SendMessage(type: shutdown_request)
        L->>SY: SendMessage(type: shutdown_request)
    end
    L->>L: TeamDelete
```

**Key difference from standard analysis:** The team-based variant adds these capabilities:

| Capability | Standard | Team-Based |
|------------|----------|------------|
| Focus area planning | Static templates | Dynamic, based on codebase reconnaissance |
| Synthesizer follow-ups | Cannot ask explorers questions | Can message explorers directly |
| Deep investigation | Not available | Deep synthesizer has Bash (git history, deps, static analysis) |
| Completeness evaluation | None | Deep synthesizer evaluates coverage before finalizing |
| Team composition | 3 explorers + 1 synthesizer | 3 workers + 1 deep synthesizer |
| Coordination topology | Isolated Task calls | Hub-and-spoke (no cross-worker messaging) |

---

## Cross-System Integration Points

The three subsystems connect through well-defined filesystem interfaces. These are the critical integration points where data crosses system boundaries.

### Execution Pointer Bridge

The `execution_pointer.md` file is the primary bridge between the SDD execution pipeline and the Task Manager:

```mermaid
flowchart LR
    ET["execute-tasks<br/>(SDD Plugin)"] -->|"Writes absolute path"| EP["~/.claude/tasks/{listId}/<br/>execution_pointer.md"]
    EP -->|"Read by"| TS["taskService.ts<br/>(Task Manager)"]
    TS -->|"resolveExecutionDir()"| SD[".claude/sessions/<br/>__live_session__/"]
    SD -->|"Artifacts served to"| UI["Execution Dialog<br/>(Browser UI)"]
```

**Security:** The `resolveExecutionDir()` function validates that the pointer's target path stays under `$HOME`:

```typescript title="apps/task-manager/src/lib/taskService.ts"
function resolveExecutionDir(pointerContent: string): string | null {
  const resolved = raw.startsWith('/') ? resolve(raw) : resolve(home, raw)
  const rel = relative(home, resolved)
  if (rel.startsWith('..') || resolve(home, rel) !== resolved) {
    console.warn(`Execution pointer path escapes home directory: ${raw}`)
    return null
  }
  return resolved
}
```

### Task JSON as Contract

The JSON files in `~/.claude/tasks/{listId}/` serve as the shared data contract between producers (SDD plugin skills) and consumers (Task Manager). Both sides agree on this schema:

| Field | Type | Producer | Consumer |
|-------|------|----------|----------|
| `id` | `string` | `create-tasks` via `TaskCreate` | `taskService.ts` → `parseTask()` |
| `subject` | `string` | `create-tasks` | Kanban card title |
| `description` | `string` | `create-tasks` (with acceptance criteria) | Task detail dialog |
| `status` | `'pending' \| 'in_progress' \| 'completed'` | `execute-tasks` via `TaskUpdate` | Kanban column assignment |
| `blocks` | `string[]` | `create-tasks` via `TaskUpdate` | Dependency visualization |
| `blockedBy` | `string[]` | `create-tasks` via `TaskUpdate` | Dependency visualization |
| `activeForm` | `string?` | `create-tasks` | In-progress display text |
| `metadata` | `object?` | `create-tasks` | Priority badge, complexity tag |

### Progress.md Real-Time Bridge

The `progress.md` file provides real-time execution visibility to the Task Manager:

```
execute-tasks orchestrator
    → Updates progress.md (wave status, active tasks, completed tasks)
    → Chokidar detects .md change in watched execution directory
    → executionEvent emitted
    → SSE streams execution:updated event
    → useSSE invalidates executionContextKeys
    → useExecutionContext refetches
    → parseProgressMd() extracts structured progress
    → ExecutionProgressBar + ExecutionDialog re-render
```

**Parsed progress structure:**

```typescript title="apps/task-manager/src/types/execution.ts"
interface ExecutionProgress {
  status: string           // "Executing", "Complete", etc.
  wave: number             // Current wave number
  totalWaves: number       // Total planned waves
  maxParallel?: number     // Concurrent agent limit
  updated: string          // ISO 8601 timestamp
  activeTasks: ActiveTask[]      // Currently executing
  completedTasks: CompletedTask[] // Finished this session
}
```

---

## Data Flow Summary Table

| Flow | Producer | Artifact | Consumer | Mechanism |
|------|----------|----------|----------|-----------|
| Spec creation | `create-spec` | `specs/SPEC-*.md` | `analyze-spec`, `create-tasks` | File read |
| Spec analysis | `analyze-spec` | `.analysis.md`, `.analysis.html` | User (browser) | File read |
| Task generation | `create-tasks` | `~/.claude/tasks/{listId}/*.json` | `execute-tasks`, Task Manager | TaskCreate API, Chokidar |
| Task status updates | `execute-tasks` | Task JSON `status` field | Task Manager | TaskUpdate API, Chokidar |
| Execution session | `execute-tasks` | `.claude/sessions/__live_session__/*` | Task Manager, task-executor agents | File write, Chokidar |
| Execution pointer | `execute-tasks` | `execution_pointer.md` | Task Manager (`getExecutionDir`) | File write, file read |
| Shared context | task-executor agents | `context-task-{id}.md` | Orchestrator (merge) | File write, file read |
| Real-time progress | `execute-tasks` | `progress.md` | Task Manager (`parseProgressMd`) | File write, Chokidar, SSE |
| Exploration findings | code-explorer agents | Task tool response | codebase-synthesizer | In-memory (Task tool) |
| Team collaboration | team-code-explorer | `SendMessage` | Other team members | Agent Teams API |
