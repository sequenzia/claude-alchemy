---
name: create-spec
description: Create a new specification through an interactive interview process. Use when user says "create spec", "new spec", "generate spec", or wants to start a specification document.
user-invocable: true
disable-model-invocation: false
allowed-tools: AskUserQuestion, Task, Read, Glob
---

# Spec Creation Skill

You are initiating the spec creation workflow. This process will gather requirements through an interactive interview and generate a comprehensive specification.

## Plan Mode Behavior

**CRITICAL**: This skill generates a spec document, NOT an implementation plan. When invoked during Claude Code's plan mode:

- **DO NOT** create an implementation plan for how to build the spec's described features
- **DO NOT** defer spec generation to an "execution phase"
- **DO** proceed with the full interview and spec generation workflow immediately
- **DO** write the spec file to the output path as normal

The spec is a planning artifact itself - generating it IS the planning activity. The skill's purpose is to create a specification document, not to plan code implementation.

## Workflow

### Step 1: Check for Settings

First, check if there is a settings file at `.claude/sdd-tools.local.md` to get any custom configuration like output path or author name.

### Step 2: Gather Initial Information

Use `AskUserQuestion` to gather the essential starting information with these four questions:

**Question 1 - Spec Name:**
- Header: "Spec Name"
- Question: "What would you like to name this spec?"
- Options: Allow text input for a descriptive name

**Question 2 - Type:**
- Header: "Type"
- Question: "What type of product/feature is this?"
- Options:
  - "New product" - A completely new product being built from scratch
  - "New feature" - A new feature for an existing product

**Question 3 - Depth:**
- Header: "Depth"
- Question: "How detailed should the spec be?"
- Options:
  - "High-level overview (Recommended)" - Executive summary with key features and goals
  - "Detailed specifications" - Standard spec with acceptance criteria and phases
  - "Full technical documentation" - Comprehensive specs with API definitions and data models

**Question 4 - Description:**
- Header: "Description"
- Question: "Briefly describe the product/feature and its key requirements"
- Options: Allow text input describing the problem, main features, and constraints

### Step 3: Launch Interview Agent

After receiving the initial responses, immediately launch the Interview Agent using the `Task` tool. Provide this context:

- Spec Name: The name provided by the user
- Product Type: "New product" or "New feature" based on selection
- Depth Level: The selected depth option
- Initial Description: The description provided
- Output Path: From settings or default `specs/SPEC-{name}.md`
- Author: From settings or "Not specified"
- Title Format: `# {spec-name} PRD` (use spec name in title, not product name)
- Spec Type: The product type for the metadata block
- Spec Depth: The depth level for the metadata block
- Description: The initial description for the metadata block

The Interview Agent will:
1. Conduct an adaptive interview based on the depth level
2. Cover all four categories: Problem & Goals, Functional Requirements, Technical Specs, Implementation
3. Present a summary for user confirmation before generating the spec
4. Generate the spec using the appropriate template
5. Write the spec to the configured output path

### Step 4: Handoff Complete

Once you have launched the Interview Agent, your role is complete. The agent will handle:
- Conducting the interview rounds
- Gathering detailed requirements
- Presenting the summary for confirmation
- Generating and saving the final spec

## Notes

- Always check for settings file first to respect user configuration
- Pass all gathered information to the Interview Agent
- The Interview Agent handles all subsequent interaction

---

## Core Principles

### 1. Phase-Based Milestones (Not Timelines)

Specs should define clear phases with completion criteria rather than time estimates:

- **Phase 1: Foundation** - Core infrastructure and data models
- **Phase 2: Core Features** - Primary user-facing functionality
- **Phase 3: Enhancement** - Secondary features and optimizations
- **Phase 4: Polish** - UX refinement, edge cases, documentation

### 2. Testable Requirements

Every requirement should include:
- **Clear acceptance criteria** - Specific, measurable conditions for completion
- **Test scenarios** - How to verify the requirement is met
- **Edge cases** - Known boundary conditions to handle

### 3. Human Checkpoint Gates

Define explicit points where human review is required:
- Architecture decisions before implementation begins
- API contract review before integration work
- Security review before authentication/authorization features
- UX review before user-facing changes ship

### 4. Context for AI Consumption

Structure specs for optimal AI assistant consumption:
- Use consistent heading hierarchy
- Include code examples where applicable
- Reference existing patterns in the codebase
- Provide clear file location guidance

## Template Selection

Choose the appropriate template based on depth level:

| Depth Level | Template | Use Case |
|-------------|----------|----------|
| High-level overview | `templates/high-level.md` | Executive summaries, stakeholder alignment, initial scoping |
| Detailed specifications | `templates/detailed.md` | Standard development specs with clear requirements |
| Full technical documentation | `templates/full-tech.md` | Complex features requiring API specs, data models, architecture |

## Spec Compilation Process

When compiling a spec from gathered requirements:

1. **Select template** based on requested depth level
2. **Organize information** into template sections
3. **Fill gaps** by inferring logical requirements (flag assumptions clearly)
4. **Add acceptance criteria** for each functional requirement
5. **Define phases** with clear completion criteria
6. **Insert checkpoint gates** at critical decision points
7. **Review for completeness** before presenting to user

## Writing Guidelines

### Requirement Formatting

```markdown
### REQ-001: [Requirement Name]

**Priority**: P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low)

**Description**: Clear, concise statement of what is needed.

**Acceptance Criteria**:
- [ ] Criterion 1
- [ ] Criterion 2

**Notes**: Any additional context or constraints.
```

### User Story Format

```markdown
**As a** [user type]
**I want** [capability]
**So that** [benefit/value]
```

### API Specification Format (Full Tech Only)

```markdown
#### Endpoint: `METHOD /path`

**Purpose**: Brief description

**Request**:
- Headers: `Content-Type: application/json`
- Body:
  ```json
  {
    "field": "type - description"
  }
  ```

**Response**:
- `200 OK`: Success response schema
- `400 Bad Request`: Validation errors
- `401 Unauthorized`: Authentication required
```

## Reference Files

- `references/templates/high-level.md` - Streamlined executive overview template
- `references/templates/detailed.md` - Standard spec template with all sections
- `references/templates/full-tech.md` - Extended template with technical specifications
- `references/interview-questions.md` - Question bank for requirement gathering
- `references/recommendation-triggers.md` - Trigger patterns for proactive recommendations
- `references/recommendation-format.md` - Templates for presenting recommendations
