# Task Decomposition Patterns

This reference provides patterns for decomposing different types of features into implementation tasks.

## Standard Feature Pattern

For most features, follow this layered decomposition:

```
1. Data Model Tasks
   └─ Create {Entity} data model
   └─ Create {Entity} database migration

2. API/Service Tasks
   └─ Implement {action} endpoint
   └─ Add input validation for {endpoint}
   └─ Add error handling for {endpoint}

3. Business Logic Tasks
   └─ Implement {feature} business logic
   └─ Add {feature} validation rules

4. UI/Frontend Tasks
   └─ Build {feature} UI component
   └─ Add {feature} form handling
   └─ Implement {feature} state management

5. Integration Tasks
   └─ Integrate {feature} with {system}
   └─ Configure {feature} in environment

6. Test Tasks
   └─ Add unit tests for {entity} model
   └─ Add integration tests for {endpoint}
   └─ Add E2E tests for {feature} workflow
```

## Authentication Feature Pattern

```
1. Data Models
   └─ Create User data model
   └─ Create Session/Token data model

2. Security Infrastructure
   └─ Configure password hashing
   └─ Set up JWT/session management
   └─ Configure secure cookie handling

3. Auth Endpoints
   └─ Implement registration endpoint
   └─ Implement login endpoint
   └─ Implement logout endpoint
   └─ Implement password reset flow

4. Middleware
   └─ Create authentication middleware
   └─ Create authorization middleware
   └─ Add route protection

5. Frontend Auth
   └─ Build login form component
   └─ Build registration form component
   └─ Add auth state management
   └─ Implement protected route wrapper

6. Tests
   └─ Add auth endpoint tests
   └─ Add auth middleware tests
   └─ Add auth flow E2E tests
```

## CRUD Feature Pattern

```
1. Data Model
   └─ Create {Resource} data model
   └─ Add database migration

2. API Endpoints
   └─ Implement GET /{resources} (list)
   └─ Implement GET /{resources}/:id (read)
   └─ Implement POST /{resources} (create)
   └─ Implement PUT /{resources}/:id (update)
   └─ Implement DELETE /{resources}/:id (delete)

3. Validation
   └─ Add {Resource} input validation
   └─ Add {Resource} business rules

4. UI Components
   └─ Build {Resource} list view
   └─ Build {Resource} detail view
   └─ Build {Resource} form (create/edit)
   └─ Add {Resource} delete confirmation

5. Tests
   └─ Add {Resource} model tests
   └─ Add {Resource} API tests
   └─ Add {Resource} UI tests
```

## Integration Feature Pattern

```
1. Configuration
   └─ Add {Integration} configuration schema
   └─ Set up {Integration} credentials management

2. Client/SDK
   └─ Create {Integration} client wrapper
   └─ Implement {Integration} API methods
   └─ Add retry/error handling

3. Data Mapping
   └─ Create {Integration} data transformers
   └─ Map external data to internal models

4. Sync/Webhook Handling
   └─ Implement {Integration} sync logic
   └─ Add webhook endpoint for {Integration}
   └─ Handle {Integration} events

5. Monitoring
   └─ Add {Integration} health checks
   └─ Implement {Integration} logging
   └─ Add {Integration} metrics

6. Tests
   └─ Add {Integration} client tests (mocked)
   └─ Add {Integration} integration tests
```

## Background Job Pattern

```
1. Job Infrastructure
   └─ Set up job queue system
   └─ Configure job workers

2. Job Implementation
   └─ Create {Job} job class
   └─ Implement {Job} processing logic
   └─ Add {Job} retry logic

3. Scheduling
   └─ Configure {Job} schedule
   └─ Add {Job} trigger endpoints

4. Monitoring
   └─ Add {Job} status tracking
   └─ Implement {Job} failure alerts
   └─ Add {Job} metrics/logging

5. Tests
   └─ Add {Job} unit tests
   └─ Add {Job} integration tests
```

## Migration/Refactoring Pattern

```
1. Analysis
   └─ Audit current {system} implementation
   └─ Document migration requirements

2. Preparation
   └─ Create {new} implementation alongside {old}
   └─ Add feature flag for {migration}

3. Migration
   └─ Implement {new} functionality
   └─ Add data migration scripts
   └─ Create rollback procedures

4. Transition
   └─ Enable {new} for subset of users
   └─ Monitor {new} performance
   └─ Fix issues discovered in {new}

5. Cleanup
   └─ Remove {old} implementation
   └─ Remove feature flag
   └─ Update documentation
```

## Task Subject Guidelines

Use imperative mood for task subjects:

| Good | Bad |
|------|-----|
| Create User data model | User data model |
| Implement login endpoint | Login endpoint implementation |
| Add input validation | Input validation added |
| Build dashboard component | Dashboard component |

## Task Description Template

```markdown
{Brief description of what needs to be done}

{If applicable: Fields, endpoints, or components to create}

**Acceptance Criteria:**

_Functional:_
- [ ] {Primary behavior criterion}
- [ ] {Secondary behavior criterion}

_Edge Cases:_
- [ ] {Boundary condition criterion}

_Error Handling:_
- [ ] {Error scenario criterion}

_Performance:_ (if applicable)
- [ ] {Performance target criterion}

**Testing Requirements:**
• {Test type}: {What to test}
• {Test type}: {What to test}

Source: {PRD path} Section {number}
```

## Testing Suggestions by Pattern

### Standard Feature Testing

| Task Type | Suggested Tests |
|-----------|-----------------|
| Data Model | Unit: schema validation, field constraints; Integration: persistence |
| API/Service | Integration: success/error responses; E2E: full flow |
| Business Logic | Unit: core logic, edge cases; Integration: with real deps |
| UI/Frontend | Component: states, interactions; E2E: user workflows |
| Integration | Unit: mocked client; Integration: real API (sandbox) |
| Test Tasks | N/A (these ARE the tests) |

### Authentication Testing

```
Security-focused testing requirements:
• Unit: Token generation, password hashing
• Integration: Login/logout flows, session management
• Security: Brute force protection, token expiry, CSRF
• E2E: Complete auth workflow
```

### CRUD Testing

```
Standard CRUD testing requirements:
• Integration: Each endpoint (GET, POST, PUT, DELETE)
• Integration: Validation errors (400 responses)
• Integration: Not found errors (404 responses)
• Integration: Authorization (401/403 responses)
• E2E: Create → Read → Update → Delete workflow
```

### Integration Feature Testing

```
External service testing requirements:
• Unit: Client methods with mocked responses
• Unit: Error handling (timeouts, rate limits, retries)
• Contract: API schema validation
• Integration: Real API calls (sandbox environment)
```

### Background Job Testing

```
Async task testing requirements:
• Unit: Job logic with mocked dependencies
• Unit: Retry logic and failure handling
• Integration: Queue behavior, job scheduling
• Integration: Idempotency verification
```

### Migration/Refactoring Testing

```
Migration testing requirements:
• Integration: Data migration correctness
• Integration: Rollback procedures
• E2E: Feature flag toggling
• Performance: Migration execution time
```

## Complexity Indicators

Use these indicators to estimate complexity:

**XS Indicators:**
- Single function or constant
- Copy/adapt existing pattern
- Configuration change only

**S Indicators:**
- Single file change
- Straightforward logic
- Well-defined inputs/outputs

**M Indicators:**
- 2-5 files affected
- Moderate business logic
- Some edge cases to handle

**L Indicators:**
- Multiple components
- Complex business logic
- Significant testing required
- Cross-cutting concerns

**XL Indicators:**
- System-wide changes
- Complex integrations
- Major architectural decisions
- Extensive testing/migration
