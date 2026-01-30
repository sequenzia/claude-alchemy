# Testing Requirements Reference

This reference provides guidance for adding testing requirements to generated tasks based on task type and PRD content.

## Test Type Mapping by Task Layer

Map task types to appropriate test suggestions:

| Task Layer | Primary Tests | Secondary Tests | Notes |
|------------|---------------|-----------------|-------|
| Data Model | Unit tests | Integration tests | Schema validation, constraints |
| API/Endpoint | Integration tests | Unit tests, E2E | Request/response, auth, errors |
| Business Logic | Unit tests | Integration tests | Edge cases, validation rules |
| UI Component | Component tests | E2E tests | User interactions, states |
| Service Layer | Unit tests | Integration tests | Mock dependencies |
| Middleware | Unit tests | Integration tests | Request pipeline |
| Background Job | Unit tests | Integration tests | Async behavior, retries |
| Integration | Integration tests | E2E tests | External service mocking |

## Test Suggestions by Task Type

### Data Model Tasks

```
Testing Requirements:
• Unit: Schema validation, field constraints, default values
• Unit: Model methods and computed properties
• Integration: Database persistence and retrieval
• Integration: Relationship integrity (foreign keys, cascades)
```

### API Endpoint Tasks

```
Testing Requirements:
• Integration: Success responses (200, 201) with valid input
• Integration: Error responses (400, 401, 403, 404, 500)
• Integration: Input validation and sanitization
• Integration: Authentication/authorization requirements
• E2E: Full request flow with real database
```

### Business Logic Tasks

```
Testing Requirements:
• Unit: Core logic with mocked dependencies
• Unit: Edge cases and boundary conditions
• Unit: Error handling and exception paths
• Integration: Logic with real dependencies
```

### UI Component Tasks

```
Testing Requirements:
• Component: Render states (loading, empty, error, success)
• Component: User interactions (clicks, inputs, forms)
• Component: Accessibility (ARIA, keyboard navigation)
• E2E: User workflow through component
```

### Service Layer Tasks

```
Testing Requirements:
• Unit: Service methods with mocked repositories
• Unit: Error handling and retry logic
• Integration: Service with real database
• Integration: Transaction handling
```

### Authentication Tasks

```
Testing Requirements:
• Unit: Token generation and validation
• Unit: Password hashing and verification
• Integration: Login/logout flows
• Integration: Session management
• Security: Brute force protection, token expiry
```

### Integration/External Service Tasks

```
Testing Requirements:
• Unit: Client methods with mocked responses
• Unit: Error handling (timeouts, rate limits)
• Integration: Real API calls (sandbox/test environment)
• Contract: API response schema validation
```

### Background Job Tasks

```
Testing Requirements:
• Unit: Job logic with mocked dependencies
• Unit: Retry logic and failure handling
• Integration: Queue behavior
• Integration: Idempotency verification
```

## PRD Test Extraction Patterns

Extract test requirements from PRD sections:

### Section 6.x (Non-Functional Requirements)

Look for:
- Performance targets → Performance tests
- Security requirements → Security tests
- Reliability requirements → Chaos/resilience tests
- Scalability requirements → Load tests

**Example PRD text:**
```
6.2 Performance
- API response time < 200ms (P95)
- Support 1000 concurrent users
```

**Extract as:**
```
Testing Requirements:
• Performance: API response time < 200ms (P95)
• Load: Support 1000 concurrent users
```

### Section 7.4 (API Specifications)

Look for:
- Endpoint definitions → API integration tests
- Response schemas → Contract tests
- Error codes → Error handling tests

### Section 8.x (Testing Strategy)

Direct extraction of testing requirements:
- Test types specified
- Coverage targets
- Critical paths to test

**Example PRD text:**
```
8.1 Testing Strategy
- 80% unit test coverage
- E2E tests for checkout flow
- Load testing for payment processing
```

**Extract as:**
```
Testing Requirements:
• Coverage: 80% unit test coverage target
• E2E: Checkout flow critical path
• Load: Payment processing under load
```

### User Story Acceptance Criteria

Look for testable criteria in user stories:
- "User can..." → Functional test
- "System validates..." → Validation test
- "Error shown when..." → Error handling test

## Categorized Acceptance Criteria

Structure acceptance criteria into categories:

### Category: Functional

Core functionality that must work:
- [ ] Primary feature behavior
- [ ] Expected inputs produce expected outputs
- [ ] State changes correctly

### Category: Edge Cases

Boundary conditions and unusual scenarios:
- [ ] Empty/null input handling
- [ ] Maximum/minimum values
- [ ] Concurrent operations
- [ ] Rate limiting behavior

### Category: Error Handling

Failure scenarios and recovery:
- [ ] Invalid input rejection with clear messages
- [ ] Network failure handling
- [ ] Timeout handling
- [ ] Graceful degradation

### Category: Performance

Speed and resource requirements:
- [ ] Response time targets
- [ ] Memory/CPU constraints
- [ ] Throughput requirements

## Task Description Template

Use this enhanced template for task descriptions:

```markdown
{Brief description of what needs to be done}

{Technical details if applicable}

**Acceptance Criteria:**

_Functional:_
- [ ] {Primary behavior criterion}
- [ ] {Secondary behavior criterion}

_Edge Cases:_
- [ ] {Boundary condition criterion}
- [ ] {Unusual scenario criterion}

_Error Handling:_
- [ ] {Error scenario criterion}
- [ ] {Recovery criterion}

_Performance:_ (if applicable)
- [ ] {Performance target criterion}

**Testing Requirements:**
• {Test type}: {What to test}
• {Test type}: {What to test}
• {Test type}: {What to test}

Source: {prd_path} Section {number}
```

## Test Type Definitions

| Test Type | Description | When to Use |
|-----------|-------------|-------------|
| Unit | Test isolated functions/methods with mocked deps | Business logic, utilities, models |
| Integration | Test components working together | APIs, database operations, services |
| E2E | Test full user workflows | Critical user journeys |
| Component | Test UI components in isolation | React/Vue components |
| Contract | Verify API schemas match expectations | External API integrations |
| Performance | Measure response times, throughput | Performance-critical paths |
| Load | Test behavior under high traffic | Scalability requirements |
| Security | Test auth, injection, vulnerabilities | Auth, user input handling |

## Inference Rules

### Rule 1: Layer-Based Inference

Infer tests from task layer:
- Data Model → Unit + Integration
- API → Integration + E2E
- UI → Component + E2E

### Rule 2: Keyword-Based Inference

Infer from task subject keywords:
- "validation" → Unit tests for validation rules
- "authentication" → Security tests
- "integration" → Integration + Contract tests
- "migration" → Integration + Rollback tests
- "performance" → Performance tests

### Rule 3: PRD Extraction

If PRD has Section 8 (Testing):
- Extract explicit test requirements
- Add to task Testing Requirements section

### Rule 4: Priority-Based Inference

Higher priority tasks need more thorough testing:
- P0 (Critical) → Unit + Integration + E2E
- P1 (High) → Unit + Integration
- P2 (Medium) → Unit + Integration (key paths)
- P3 (Low) → Unit (basic coverage)

## Examples

### Example 1: Data Model Task

**Subject:** Create User data model

**Description:**
```markdown
Define the User data model based on PRD section 7.3.

Fields:
- id: UUID (primary key)
- email: string (unique, required)
- passwordHash: string (required)
- createdAt: timestamp
- updatedAt: timestamp

**Acceptance Criteria:**

_Functional:_
- [ ] All fields defined with correct types
- [ ] Email uniqueness constraint enforced
- [ ] Timestamps auto-populate on create/update

_Edge Cases:_
- [ ] Handle duplicate email gracefully
- [ ] Support maximum email length (254 chars)

_Error Handling:_
- [ ] Clear error message for constraint violations

**Testing Requirements:**
• Unit: Schema validation for all field types
• Unit: Email format validation
• Integration: Database persistence and retrieval
• Integration: Unique constraint enforcement

Source: specs/PRD-Auth.md Section 7.3
```

### Example 2: API Endpoint Task

**Subject:** Implement POST /auth/login endpoint

**Description:**
```markdown
Create login endpoint that authenticates users and returns JWT token.

Endpoint: POST /api/auth/login
Request body: { email, password }
Response: { token, expiresAt, user }

**Acceptance Criteria:**

_Functional:_
- [ ] Valid credentials return JWT token
- [ ] Token contains user ID and expiration
- [ ] Response includes user profile data

_Edge Cases:_
- [ ] Handle case-insensitive email matching
- [ ] Support special characters in password

_Error Handling:_
- [ ] 401 for invalid credentials (generic message)
- [ ] 400 for missing required fields
- [ ] 429 for rate limit exceeded

_Performance:_
- [ ] Response time < 200ms (P95)

**Testing Requirements:**
• Integration: Successful login returns valid token
• Integration: Invalid credentials return 401
• Integration: Missing fields return 400
• Security: Rate limiting prevents brute force
• Performance: Response time under load

Source: specs/PRD-Auth.md Section 7.4.1
```

### Example 3: UI Component Task

**Subject:** Build login form component

**Description:**
```markdown
Create React component for user login with email/password fields.

Component: LoginForm
Props: onSuccess, onError
State: email, password, loading, error

**Acceptance Criteria:**

_Functional:_
- [ ] Form submits on button click and Enter key
- [ ] Calls onSuccess with user data on success
- [ ] Shows loading state during submission

_Edge Cases:_
- [ ] Disabled submit when fields empty
- [ ] Trim whitespace from email input

_Error Handling:_
- [ ] Display error message on failed login
- [ ] Clear error on new submission attempt

**Testing Requirements:**
• Component: Renders all form elements
• Component: Submit button disabled when empty
• Component: Shows loading state during submission
• Component: Displays error message on failure
• E2E: Complete login flow with valid credentials

Source: specs/PRD-Auth.md Section 5.1
```
