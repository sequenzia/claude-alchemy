# Codebase Analysis Report Template

Use this template when presenting analysis findings in Phase 3.

---

## Template

```markdown
# Codebase Analysis Report

**Analysis Context**: {What was analyzed and why}
**Codebase Path**: {Path analyzed}
**Date**: {YYYY-MM-DD}

---

## Executive Summary

{Lead with the most important finding. 2-3 sentences covering: what was analyzed, the key architectural insight, and the primary recommendation or risk.}

---

## Architecture Overview

{2-3 paragraphs describing:}
- How the codebase is structured (layers, modules, boundaries)
- The design philosophy and architectural style
- Key technologies and frameworks in use

---

## Critical Files

{Limit to 5-10 most important files}

| File | Purpose | Relevance |
|------|---------|-----------|
| `path/to/file` | Brief description | High/Medium |

### File Details

#### `path/to/critical-file`
- **Key exports**: What this file provides to others
- **Core logic**: What it does
- **Connections**: What depends on it and what it depends on

---

## Patterns & Conventions

### Code Patterns
- **Pattern**: Description and where it's used

### Naming Conventions
- **Convention**: Description and examples

### Project Structure
- **Organization**: How files and directories are organized

---

## Relationship Map

{Describe how components connect}

- `Component A` → calls → `Component B`
- Data flows from `X` through `Y` to `Z`
- `Module` depends on `Service` for configuration

---

## Challenges & Risks

| Challenge | Severity | Impact |
|-----------|----------|--------|
| {Description} | High/Medium/Low | {What could go wrong} |

---

## Recommendations

1. **{Recommendation}**: {Brief rationale}
2. **{Recommendation}**: {Brief rationale}

---

## Analysis Methodology

- **Exploration agents**: {Number} agents with focus areas: {list}
- **Synthesis**: Findings merged and critical files read in depth
- **Scope**: {What was included and what was intentionally excluded}
```

---

## Section Guidelines

### Executive Summary
- Lead with the most important finding, not a generic overview
- Keep to 2-3 sentences maximum
- Include at least one actionable insight

### Critical Files
- Limit to 5-10 files — these should be the files someone must understand
- Include both the "what" (purpose) and "why" (relevance to analysis context)
- File Details should cover exports, logic, and connections

### Patterns & Conventions
- Only include patterns that are consistently applied (not one-off occurrences)
- Note deviations from patterns — these are often more interesting than the patterns themselves

### Relationship Map
- Focus on the most important connections, not an exhaustive dependency graph
- Use directional language (calls, depends on, triggers, reads from)
- Highlight any circular dependencies or unexpected couplings

### Challenges & Risks
- Rate severity based on likelihood and impact combined
- Include specific details, not vague warnings
- Focus on challenges relevant to the analysis context

### Recommendations
- Make recommendations actionable — "consider" is weaker than "use X for Y"
- Connect each recommendation to a specific finding
- Limit to 3-5 recommendations to maintain focus

---

## Adapting the Template

### For Feature-Focused Analysis
- Emphasize integration points and files that would need modification
- Include a "Feature Implementation Context" section before Recommendations
- Focus Challenges on implementation risks

### For General Codebase Understanding
- Broader Architecture Overview with layer descriptions
- More extensive Patterns & Conventions section
- Focus Recommendations on areas for improvement or further investigation

### For Debugging/Investigation
- Emphasize the execution path and data flow
- Include a "Relevant Execution Paths" section
- Focus Critical Files on the suspected problem area
