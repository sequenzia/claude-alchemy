# MkDocs Configuration Template

Use this template when scaffolding a new MkDocs project in Phase 2.

---

## Template

```yaml
site_name: PROJECT_NAME
site_description: PROJECT_DESCRIPTION
site_url: ""
repo_url: REPO_URL
repo_name: REPO_NAME

theme:
  name: material
  features:
    - navigation.tabs
    - navigation.sections
    - navigation.expand
    - navigation.top
    - search.suggest
    - search.highlight
    - content.code.copy
    - content.tabs.link
  palette:
    - scheme: default
      primary: indigo
      accent: indigo
      toggle:
        icon: material/brightness-7
        name: Switch to dark mode
    - scheme: slate
      primary: indigo
      accent: indigo
      toggle:
        icon: material/brightness-4
        name: Switch to light mode

markdown_extensions:
  - admonition
  - pymdownx.details
  - pymdownx.superfences:
      custom_fences:
        - name: mermaid
          class: mermaid
          format: !!python/name:pymdownx.superfences.fence_code_format
  - pymdownx.highlight:
      anchor_linenums: true
      line_spans: __span
      pygments_lang_guess: false
  - pymdownx.inlinehilite
  - pymdownx.tabbed:
      alternate_style: true
  - pymdownx.snippets
  - attr_list
  - md_in_html
  - toc:
      permalink: true

nav:
  - Home: index.md
  - Getting Started: getting-started.md
```

---

## Field Descriptions

| Field | Description | How to Set |
|-------|-------------|------------|
| `site_name` | Display name in header and browser tab | Use the project name from `package.json`, `pyproject.toml`, `Cargo.toml`, or directory name |
| `site_description` | Meta description for SEO | Use the project description from manifest file, or summarize from README |
| `repo_url` | Link to source repository | Detect from `git remote get-url origin` |
| `repo_name` | Display text for repo link | Extract `owner/repo` from the remote URL |
| `site_url` | Production URL for the docs site | Leave empty during scaffolding — user can set later |

---

## Git Remote Detection

Use this approach to populate `repo_url` and `repo_name`:

```bash
# Get the remote URL
REMOTE_URL=$(git remote get-url origin 2>/dev/null)

# Convert SSH to HTTPS if needed
# git@github.com:owner/repo.git → https://github.com/owner/repo
if [[ "$REMOTE_URL" == git@* ]]; then
  REMOTE_URL=$(echo "$REMOTE_URL" | sed 's|git@\(.*\):\(.*\)\.git|https://\1/\2|')
fi

# Extract owner/repo for repo_name
REPO_NAME=$(echo "$REMOTE_URL" | sed 's|.*/\([^/]*/[^/]*\)$|\1|' | sed 's|\.git$||')
```

If not a git repository or no remote is configured, omit `repo_url` and `repo_name` from the config.

---

## Starter Pages

### `docs/index.md`

```markdown
# PROJECT_NAME

PROJECT_DESCRIPTION

## Overview

Brief overview of what the project does and who it's for.

## Quick Start

Minimal steps to get started:

1. Install the project
2. Run a basic example
3. Explore further documentation

## Documentation

| Section | Description |
|---------|-------------|
| [Getting Started](getting-started.md) | Installation and first steps |
```

### `docs/getting-started.md`

```markdown
# Getting Started

## Prerequisites

List prerequisites here (language runtime, tools, etc.).

## Installation

Installation instructions for the project.

## Basic Usage

A minimal working example demonstrating core functionality.

## Next Steps

Links to further documentation sections.
```

---

## Usage Instructions

1. **Detect project metadata:**
   - Read `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, or similar manifest files
   - Run `git remote get-url origin` to detect the repository URL
   - Fall back to directory name if no manifest is found

2. **Fill in template fields:**
   - Replace `PROJECT_NAME`, `PROJECT_DESCRIPTION`, `REPO_URL`, `REPO_NAME` with detected values
   - Remove `repo_url` and `repo_name` if not in a git repository

3. **Write the files:**
   - Write `mkdocs.yml` to the project root
   - Create `docs/` directory
   - Write `docs/index.md` and `docs/getting-started.md` with project-specific content

4. **Customize the nav:**
   - The starter nav includes Home and Getting Started
   - Additional pages are added to nav as they are generated in later phases
