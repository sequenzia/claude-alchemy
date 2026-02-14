# Markdown File Templates

Use these templates when generating standalone markdown files in Basic Markdown mode (Phase 5). Each template provides a structural skeleton with placeholder fields to fill from codebase analysis findings.

---

## README.md Template

```markdown
# PROJECT_NAME

[![Build Status](BADGE_URL)](CI_URL) [![Version](BADGE_URL)](PACKAGE_URL) [![License](BADGE_URL)](LICENSE_URL)

PROJECT_DESCRIPTION

## Table of Contents

- [Getting Started](#getting-started)
- [Usage](#usage)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [License](#license)

## Getting Started

### Prerequisites

- PREREQUISITE_1 (version requirement)
- PREREQUISITE_2 (version requirement)

### Installation

INSTALLATION_STEPS

## Usage

BASIC_USAGE_DESCRIPTION

```LANGUAGE
USAGE_EXAMPLE
```  ←(close fence)

### Advanced Usage

ADVANCED_USAGE_DESCRIPTION (optional — include only if project has notable advanced features)

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `OPTION_NAME` | `TYPE` | `DEFAULT` | DESCRIPTION |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

LICENSE_TYPE — see [LICENSE](LICENSE) for details.
```

### Field Descriptions

| Field | How to Populate |
|-------|-----------------|
| `PROJECT_NAME` | From manifest (`name` in package.json, pyproject.toml, etc.) or directory name |
| `PROJECT_DESCRIPTION` | From manifest `description` field, or summarize from code analysis |
| `BADGE_URL`, `CI_URL`, etc. | Detect CI provider (GitHub Actions, etc.) and package registry; omit badges if not detectable |
| `PREREQUISITE_*` | From manifest engines/requires fields, or detected runtime (Node, Python, Rust, etc.) |
| `INSTALLATION_STEPS` | From detected package manager (npm, pip, cargo, etc.) and manifest |
| `USAGE_EXAMPLE` | From existing examples, tests, or main entry point analysis |
| `OPTION_NAME`, etc. | From configuration files, environment variables, or CLI flag analysis |
| `LICENSE_TYPE` | From LICENSE file or manifest `license` field |

---

## CONTRIBUTING.md Template

```markdown
# Contributing to PROJECT_NAME

Thank you for your interest in contributing! This guide covers the development workflow and conventions.

## Development Setup

### Prerequisites

- PREREQUISITE_1 (version requirement)
- PREREQUISITE_2 (version requirement)

### Getting Started

1. Fork and clone the repository
2. INSTALL_DEPENDENCIES_COMMAND
3. VERIFY_SETUP_COMMAND

## Code Style

CODE_STYLE_DESCRIPTION

LINTING_INSTRUCTIONS

## Testing

### Running Tests

```bash
TEST_COMMAND
```  ←(close fence)

### Writing Tests

TESTING_CONVENTIONS

## Pull Request Process

1. Create a feature branch from `DEFAULT_BRANCH`
2. BRANCH_NAMING_CONVENTION
3. Make your changes with clear, atomic commits
4. COMMIT_CONVENTION
5. Push and open a pull request
6. Ensure CI checks pass
7. Request review from maintainers

## Issue Guidelines

- Search existing issues before creating a new one
- Use descriptive titles
- Include reproduction steps for bugs
- ADDITIONAL_ISSUE_GUIDELINES
```

### Field Descriptions

| Field | How to Populate |
|-------|-----------------|
| `PROJECT_NAME` | Same as README |
| `PREREQUISITE_*` | Same as README — runtime and tool requirements |
| `INSTALL_DEPENDENCIES_COMMAND` | Detected from package manager (e.g., `pnpm install`, `pip install -e ".[dev]"`) |
| `VERIFY_SETUP_COMMAND` | Test command or build command to verify setup works |
| `CODE_STYLE_DESCRIPTION` | From linter configs (.eslintrc, .prettierrc, ruff.toml, etc.) or existing patterns |
| `LINTING_INSTRUCTIONS` | From detected linter/formatter commands |
| `TEST_COMMAND` | From manifest scripts, detected test framework (jest, pytest, cargo test, etc.) |
| `TESTING_CONVENTIONS` | Infer from existing test file patterns (location, naming, structure) |
| `DEFAULT_BRANCH` | From `git symbolic-ref refs/remotes/origin/HEAD` or default to `main` |
| `BRANCH_NAMING_CONVENTION` | From existing branch patterns or conventional (`feature/`, `fix/`, etc.) |
| `COMMIT_CONVENTION` | From existing commit history patterns (Conventional Commits, etc.) |

---

## ARCHITECTURE.md Template

```markdown
# Architecture

## System Overview

SYSTEM_OVERVIEW_DESCRIPTION

## Component Diagram

```mermaid
graph TD
    COMPONENT_A[Component A] --> COMPONENT_B[Component B]
    COMPONENT_A --> COMPONENT_C[Component C]
    COMPONENT_B --> COMPONENT_D[Component D]
```  ←(close fence)

## Directory Structure

```
PROJECT_ROOT/
├── DIRECTORY_1/          # DESCRIPTION_1
│   ├── SUBDIRECTORY/     # DESCRIPTION
│   └── FILE              # DESCRIPTION
├── DIRECTORY_2/          # DESCRIPTION_2
└── DIRECTORY_3/          # DESCRIPTION_3
```  ←(close fence)

## Data Flow

DATAFLOW_DESCRIPTION

```mermaid
sequenceDiagram
    participant ACTOR_1
    participant ACTOR_2
    participant ACTOR_3
    ACTOR_1->>ACTOR_2: ACTION_1
    ACTOR_2->>ACTOR_3: ACTION_2
    ACTOR_3-->>ACTOR_1: RESPONSE
```  ←(close fence)

## Design Decisions

### DECISION_1_TITLE

**Context:** CONTEXT_DESCRIPTION
**Decision:** DECISION_DESCRIPTION
**Rationale:** RATIONALE_DESCRIPTION

### DECISION_2_TITLE

**Context:** CONTEXT_DESCRIPTION
**Decision:** DECISION_DESCRIPTION
**Rationale:** RATIONALE_DESCRIPTION

## Key Dependencies

| Dependency | Purpose | Why Chosen |
|------------|---------|------------|
| `DEPENDENCY_NAME` | PURPOSE | RATIONALE |
```

### Field Descriptions

| Field | How to Populate |
|-------|-----------------|
| `SYSTEM_OVERVIEW_DESCRIPTION` | Synthesize from code analysis — what the system does, its main purpose |
| Component diagram | Map from discovered modules, services, and their import/call relationships |
| Directory structure | From actual directory listing with descriptions inferred from file contents |
| `DATAFLOW_DESCRIPTION` | Trace from entry points (HTTP handlers, CLI commands, main) through the system |
| Design decisions | Infer from architecture patterns (monorepo, plugin system, etc.) and README/comments |
| Dependencies | From manifest files with purposes inferred from usage in code |

---

## API Documentation Template

```markdown
# API Reference

## MODULE_NAME

MODULE_DESCRIPTION

### `FUNCTION_NAME`

FUNCTION_DESCRIPTION

```LANGUAGE
FUNCTION_SIGNATURE
```  ←(close fence)

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `PARAM_NAME` | `PARAM_TYPE` | Yes/No | PARAM_DESCRIPTION |

**Returns:** `RETURN_TYPE` — RETURN_DESCRIPTION

**Raises/Throws:** (if applicable)

| Error | Condition |
|-------|-----------|
| `ERROR_TYPE` | CONDITION_DESCRIPTION |

**Example:**

```LANGUAGE
USAGE_EXAMPLE
```  ←(close fence)

---

### `CLASS_NAME`

CLASS_DESCRIPTION

#### Constructor

```LANGUAGE
CONSTRUCTOR_SIGNATURE
```  ←(close fence)

| Parameter | Type | Description |
|-----------|------|-------------|
| `PARAM_NAME` | `PARAM_TYPE` | PARAM_DESCRIPTION |

#### Methods

##### `METHOD_NAME`

METHOD_DESCRIPTION

```LANGUAGE
METHOD_SIGNATURE
```  ←(close fence)

**Parameters:** (same table format as functions)

**Returns:** `RETURN_TYPE` — RETURN_DESCRIPTION
```

### Field Descriptions

| Field | How to Populate |
|-------|-----------------|
| `MODULE_NAME` | From file/module paths and export structure |
| `FUNCTION_NAME` | From exported/public function declarations |
| `FUNCTION_SIGNATURE` | From source code — include full typed signature |
| Parameter tables | From function parameters, docstrings, type annotations |
| `RETURN_TYPE` | From return type annotations or inferred from code |
| Error tables | From throw/raise statements or documented exceptions |
| Usage examples | From existing tests, docstring examples, or constructed from API shape |

---

## Usage Instructions

1. **Select the appropriate template** based on the file type being generated
2. **Fill placeholder fields** using findings from Phase 3 codebase analysis
3. **Remove inapplicable sections** — not every project needs every section (e.g., skip Configuration if none exists)
4. **Add project-specific sections** where the template doesn't cover a significant aspect
5. **Write in Basic Markdown mode** — use blockquotes for callouts, standard code blocks, no MkDocs extensions
