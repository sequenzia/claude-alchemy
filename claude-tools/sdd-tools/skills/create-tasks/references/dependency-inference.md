# Dependency Inference Rules

This reference provides rules for automatically inferring dependencies between tasks based on their type and relationships.

## Core Dependency Principles

1. **Data flows down**: Higher layers depend on lower layers
2. **Tests depend on implementation**: Can't test what doesn't exist
3. **Integration depends on components**: Can't integrate without parts
4. **Explicit spec dependencies override inferred**: If spec specifies, use that

## Layer-Based Dependencies

### Standard Layer Order

```
Layer 0: Infrastructure/Config
    ↓
Layer 1: Data Models
    ↓
Layer 2: API/Service
    ↓
Layer 3: Business Logic
    ↓
Layer 4: UI/Frontend
    ↓
Layer 5: Integration/E2E Tests
```

### Automatic Inference Rules

| Task Type | Depends On (blockedBy) | Blocks |
|-----------|------------------------|--------|
| Data Model | Infrastructure tasks | API tasks, Service tasks |
| Database Migration | Data Model for same entity | API tasks using that model |
| API Endpoint | Data Model it uses | UI tasks calling it |
| Service Layer | Data Models it uses | Controller/API tasks |
| UI Component | API endpoint it calls | E2E tests |
| Unit Test | Implementation it tests | Nothing |
| Integration Test | All components it tests | Nothing |
| E2E Test | Full feature implementation | Nothing |

## Pattern-Based Inference

### Authentication Chain

```
Create User model
    ↓
Create Session model
    ↓
Implement registration endpoint
    ↓
Implement login endpoint → Implement logout endpoint
    ↓
Create auth middleware
    ↓
Add route protection
    ↓
Build login UI → Build registration UI
    ↓
Add auth E2E tests
```

### CRUD Chain

```
Create {Resource} model
    ↓
Implement POST /{resources} (create)
    ↓
Implement GET /{resources} (list)
    ↓
Implement GET /{resources}/:id (read)
    ↓
Implement PUT /{resources}/:id (update)
    ↓
Implement DELETE /{resources}/:id (delete)
    ↓
Build {Resource} UI components
    ↓
Add {Resource} tests
```

### Integration Chain

```
Add {Integration} config
    ↓
Create {Integration} client
    ↓
Implement {Integration} methods
    ↓
Add {Integration} error handling
    ↓
Create data transformers
    ↓
Implement sync logic
    ↓
Add {Integration} tests
```

## Spec-Based Dependencies

### Section 9 (Implementation Plan) Mapping

When spec has implementation phases:

```
Phase 1 tasks ← Phase 2 tasks ← Phase 3 tasks
```

All tasks in Phase N are blocked by completion of Phase N-1.

### Section 10 (Dependencies) Mapping

Map explicit spec dependencies to task relationships:

| Spec Dependency Type | Task Relationship |
|---------------------|-------------------|
| "requires" | blockedBy |
| "blocks" | blocks |
| "depends on" | blockedBy |
| "prerequisite for" | blocks |

### User Story Dependencies

When user stories reference each other:
- "After completing US-001" → Task for US-002 blockedBy task for US-001
- "Builds on US-003" → blockedBy relationship

## Cross-Feature Dependencies

### Shared Data Models

If Feature A and Feature B both use User model:
```
Create User model
    ↓
Feature A tasks AND Feature B tasks (parallel)
```

### Shared Services

If multiple features use AuthService:
```
Implement AuthService
    ↓
Feature tasks using auth (parallel)
```

### Infrastructure Dependencies

All feature tasks implicitly depend on:
- Database setup (if using database)
- Authentication setup (if feature requires auth)
- Core configuration

## Dependency Detection Signals

### Keywords Indicating Dependencies

**In task description:**
- "using {Entity}" → depends on Entity model task
- "calls {endpoint}" → depends on endpoint task
- "extends {Component}" → depends on component task
- "after {Feature}" → depends on feature completion
- "requires {Setup}" → depends on setup task

**In spec requirements:**
- "Must have {X} before {Y}" → Y blockedBy X
- "{Feature} depends on {Other}" → Feature blockedBy Other
- "Prerequisite: {Task}" → blockedBy Task
- "Cannot start until {X}" → blockedBy X

## Dependency Validation Rules

### Circular Dependency Detection

Never create:
```
Task A → blockedBy → Task B → blockedBy → Task A
```

If circular dependency detected:
1. Log warning
2. Break cycle at weakest link
3. Flag for human review

### Excessive Dependency Warning

If a task has more than 5 direct dependencies:
1. Consider if task should be split
2. Flag for human review
3. Note in task description

### Orphan Task Warning

If a task has no dependencies and doesn't block anything:
1. Verify it's truly independent
2. May indicate missing relationship
3. Flag for human review if unexpected

## Dependency Representation

### In TaskCreate Metadata

```json
{
  "metadata": {
    "inferred_dependencies": ["task-uid-1", "task-uid-2"],
    "dependency_reason": "API endpoint depends on data model"
  }
}
```

### In TaskUpdate for blockedBy

After creating all tasks, use TaskUpdate to set dependencies:

```
TaskUpdate:
  taskId: "3"
  addBlockedBy: ["1", "2"]
```

## Manual Override Indicators

Allow human override of inferred dependencies when:
- Spec explicitly states different relationship
- User confirms tasks can be parallel
- Domain knowledge indicates independence

Mark overridden dependencies:
```json
{
  "metadata": {
    "dependency_override": true,
    "override_reason": "User confirmed parallel execution is safe"
  }
}
```
