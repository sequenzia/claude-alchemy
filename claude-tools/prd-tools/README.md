# PRD Tools Plugin

A Claude Code plugin for generating and analyzing Product Requirements Documents (PRDs) through interactive workflows.

## Features

- **Interactive Interview Process**: Gathers requirements through adaptive questioning
- **PRD Analysis**: Analyze existing PRDs for quality issues with interactive resolution
- **Depth-Aware**: Three detail levels for both creation and analysis
- **Codebase Integration**: Can explore existing code for "new feature" PRDs
- **On-Demand Research**: Research technical docs, best practices, and domain knowledge during interviews
- **AI-Optimized Output**: PRDs structured for optimal AI assistant consumption
- **Task Execution**: Execute generated tasks autonomously in dependency order with adaptive verification

## Installation

1. Copy the `prd-tools` folder to your Claude Code plugins directory
2. Restart Claude Code or reload plugins

## Usage

### Creating a PRD

Run the create command to start generating a PRD:

```
/prd-tools:create-prd
```

This will:
1. Ask for initial information (name, type, depth, description)
2. Launch an adaptive interview to gather detailed requirements
3. Present a summary for your review
4. Generate the PRD and save it to your configured location

### Analyzing a PRD

Run the analyze command to review an existing PRD for quality issues:

```
/prd-tools:analyze-prd <path-to-prd>
```

Example:
```
/prd-tools:analyze-prd specs/PRD-User-Authentication.md
```

This will:
1. Read and analyze the PRD for issues
2. Detect the depth level automatically
3. Generate an analysis report with findings
4. Offer interactive mode to resolve issues

#### Finding Categories

The analyzer checks for four types of issues:

| Category | Description | Examples |
|----------|-------------|----------|
| **Inconsistencies** | Internal contradictions | Feature named differently across sections, priority mismatches |
| **Missing Information** | Expected content absent | Undefined terms, missing acceptance criteria, unlisted dependencies |
| **Ambiguities** | Unclear statements | Vague metrics ("fast"), open-ended lists ("etc."), undefined scope |
| **Structure Issues** | Organization problems | Missing sections, misplaced content, inconsistent formatting |

#### Severity Levels

| Severity | When Assigned | Action |
|----------|---------------|--------|
| **Critical** | Would cause implementation to fail | Must fix |
| **Warning** | Could cause confusion | Should fix |
| **Suggestion** | Quality improvement | Nice to fix |

#### Interactive Resolution

When you choose update mode, the analyzer walks through each finding:

```
FINDING 3/12 (2 resolved, 1 skipped)

Category: Missing Information
Severity: Warning
Location: Section 5.1 "User Stories" (line 89)

CURRENT:
"Users should search products quickly."

ISSUE:
"Quickly" is not measurable.

PROPOSED:
"Users should search products with results appearing within 500ms."

[Apply] [Modify] [Skip]
```

- **Apply**: Use the proposed fix
- **Modify**: Provide your own fix text
- **Skip**: Don't change (optionally note why)

#### Analysis Report

Reports are saved alongside the PRD with `.analysis.md` suffix:
- PRD: `specs/PRD-Feature.md`
- Report: `specs/PRD-Feature.analysis.md`

### Depth Levels

| Level | Description | Best For |
|-------|-------------|----------|
| **High-level overview** | Executive summary with key features and goals | Initial alignment, stakeholder communication |
| **Detailed specifications** | Standard PRD with acceptance criteria and phases | Development planning, sprint planning |
| **Full technical documentation** | Comprehensive specs including APIs and data models | Complex features, API-first development |

### Product Types

- **New product**: For completely new products being built from scratch
- **New feature**: For features in existing products (can explore your codebase for context)

## Configuration

### Settings File

Create a settings file at `.claude/prd-tools.local.md` to customize the plugin:

```yaml
---
output_path: specs/PRD-{name}.md
author: Your Name
---

# PRD Generator Settings

Custom settings for the PRD Generator plugin.
```

#### Available Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `output_path` | `specs/PRD-{name}.md` | Where to save generated PRDs. `{name}` is replaced with the PRD name. |
| `author` | Not specified | Default author name for generated PRDs |

### Output Location

By default, PRDs are saved to `specs/PRD-{name}.md` where `{name}` is the name you provide.

Examples:
- Name: "User Authentication" → `specs/PRD-User-Authentication.md`
- Name: "API Gateway" → `specs/PRD-API-Gateway.md`

## Interview Categories

The interview covers four main categories:

### 1. Problem & Goals
- Problem statement and impact
- Success metrics and baselines
- User personas
- Business value

### 2. Functional Requirements
- Must-have features
- User stories and acceptance criteria
- Workflows and edge cases
- Error handling

### 3. Technical Specifications
- Architecture and tech stack
- Data models and APIs
- Performance requirements
- Security and compliance

### 4. Implementation Planning
- Phases and milestones
- Dependencies and risks
- Out of scope items
- Checkpoint gates

## On-Demand Research

During the interview, you can request research on any topic to inform your PRD. Simply ask the agent to research something, and it will gather current information from documentation and the web.

### Research Types

| Type | Example Request | What You Get |
|------|-----------------|--------------|
| **Technical Documentation** | "Research the Stripe subscriptions API" | API endpoints, auth methods, rate limits, SDKs |
| **Best Practices** | "Research best practices for checkout flows" | UX patterns, industry standards, design guidelines |
| **Competitive Analysis** | "How do competitors handle user onboarding?" | Competitor approaches, notable features, market patterns |
| **Compliance/Regulatory** | "What GDPR requirements apply to user data?" | Compliance requirements, implementation guidelines |
| **Domain Knowledge** | "Help me understand inventory management challenges" | Industry terminology, common workflows, problem space context |

### How to Use

During any point in the interview, you can say:
- "Research the {library} documentation for {feature}"
- "Look up best practices for {topic}"
- "Research how competitors handle {feature}"
- "What {compliance} requirements apply to {feature}?"

Research findings are automatically formatted for PRD incorporation and include source citations.

## Generated PRD Structure

### High-Level Template Includes:
- Executive Summary
- Problem Statement
- Key Features
- Success Metrics
- Implementation Phases
- Risks & Dependencies

### Detailed Template Adds:
- User Personas & Journey Maps
- Detailed User Stories
- Acceptance Criteria
- Non-Functional Requirements
- Technical Constraints

### Full Tech Template Adds:
- System Architecture Diagrams
- Data Model Specifications
- API Endpoint Definitions
- Performance SLAs
- Testing Strategy
- Deployment Plan

### Executing Tasks

Run the execute-tasks skill to execute pending tasks in dependency order:

```
/prd-tools:execute-tasks
```

This will:
1. Load all pending tasks and build an execution plan
2. Sort tasks by priority and dependency order
3. Launch an autonomous agent for each task
4. Verify each task against its acceptance criteria
5. Retry failed tasks (up to 3 attempts by default)
6. Report a session summary with pass/fail breakdown

#### Execute a Specific Task

```
/prd-tools:execute-tasks 5
```

#### Custom Retry Limit

```
/prd-tools:execute-tasks --retries 1
```

#### Execution Context

Tasks share learnings through `.claude/execution-context.md`. Later tasks benefit from patterns, decisions, and issues discovered by earlier tasks. This file persists across sessions so you can resume execution where you left off.

#### Task Verification

Tasks are verified adaptively based on their type:

| Task Type | Verification Method |
|-----------|-------------------|
| PRD-generated (has acceptance criteria) | Criterion-by-criterion evaluation |
| General (no acceptance criteria) | Inferred checklist from description |

## Tips for Best Results

1. **Be specific in the initial description**: The more context you provide upfront, the more targeted the interview questions will be.

2. **Choose the right depth level**: Start with "High-level overview" if you're still exploring the idea. Use "Full technical documentation" only when you need API specs.

3. **Review the summary carefully**: The pre-compilation summary is your chance to add or correct information before the PRD is generated.

4. **For new features**: Allow the agent to explore your codebase - it helps identify existing patterns and integration points.

## File Structure

```
prd-tools/
├── .claude-plugin/
│   └── plugin.json           # Plugin manifest
├── agents/
│   ├── interview-agent.md    # Adaptive interview agent
│   ├── research-agent.md     # On-demand research agent
│   ├── prd-analyzer.md       # PRD quality analysis agent
│   ├── task-generator.md     # PRD to tasks decomposition agent
│   └── task-executor.md      # Single task execution agent
├── skills/
│   ├── create-prd/
│   │   ├── SKILL.md          # PRD creation workflow and knowledge
│   │   └── references/
│   │       ├── templates/
│   │       │   ├── high-level.md
│   │       │   ├── detailed.md
│   │       │   └── full-tech.md
│   │       ├── interview-questions.md
│   │       ├── recommendation-triggers.md
│   │       └── recommendation-format.md
│   ├── analyze-prd/
│   │   ├── SKILL.md          # PRD analysis workflow and knowledge
│   │   └── references/
│   │       ├── analysis-criteria.md   # Depth-specific checklists
│   │       ├── report-template.md     # Analysis report format
│   │       └── common-issues.md       # Issue pattern library
│   ├── create-tasks/
│   │   ├── SKILL.md          # Task creation workflow and knowledge
│   │   └── references/
│   │       ├── decomposition-patterns.md  # Feature decomposition patterns
│   │       ├── dependency-inference.md    # Dependency inference rules
│   │       └── testing-requirements.md    # Test type mappings
│   └── execute-tasks/
│       ├── SKILL.md          # Task execution orchestration and knowledge
│       └── references/
│           ├── orchestration.md       # 8-step orchestration loop
│           ├── execution-workflow.md   # 4-phase workflow details
│           └── verification-patterns.md # Adaptive verification approaches
└── README.md                 # This file
```

## Troubleshooting

### PRD not saving to expected location
Check your `.claude/prd-tools.local.md` settings file for the correct `output_path` format.

### Interview seems too short/long
The interview depth is based on the level you select. Choose "Full technical documentation" for the most comprehensive interview.

### Want to skip certain questions
If a question isn't relevant, you can indicate "no preference" or "not applicable" and the agent will adapt accordingly.

## Contributing

This plugin is part of the claude-plugins repository. Feel free to submit issues or pull requests for improvements.

## License

MIT
