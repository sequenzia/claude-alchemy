# Spec Analysis Report Template

Use this template when generating analysis reports.

---

```markdown
# Spec Analysis Report: {Spec Name}

**Analyzed**: {YYYY-MM-DD HH:MM}
**Spec Path**: {path/to/spec.md}
**Detected Depth Level**: {High-Level | Detailed | Full-Tech}
**Status**: {Initial | Updated after review}

---

## Summary

| Category | Critical | Warning | Suggestion | Total |
|----------|----------|---------|------------|-------|
| Inconsistencies | 0 | 0 | 0 | 0 |
| Missing Information | 0 | 0 | 0 | 0 |
| Ambiguities | 0 | 0 | 0 | 0 |
| Structure Issues | 0 | 0 | 0 | 0 |
| **Total** | **0** | **0** | **0** | **0** |

### Overall Assessment

{1-2 sentence summary of spec quality and main areas for improvement}

---

## Findings

### Critical

{If no critical findings, write: "No critical findings."}

#### FIND-001: {Finding Title}

- **Category**: {Inconsistencies | Missing Information | Ambiguities | Structure Issues}
- **Location**: Section {X.Y} "{Section Name}" (line {N})
- **Issue**: {Clear description of what's wrong}
- **Impact**: {Why this matters}
- **Recommendation**: {Specific action to resolve}
- **Status**: {Pending | Resolved | Skipped}
- **Skip Reason**: {Only if skipped - reason provided by user}

---

### Warnings

{If no warnings, write: "No warnings."}

#### FIND-002: {Finding Title}

- **Category**: {Category}
- **Location**: Section {X.Y} (line {N})
- **Issue**: {Description}
- **Recommendation**: {Action}
- **Status**: {Pending | Resolved | Skipped}

---

### Suggestions

{If no suggestions, write: "No suggestions."}

#### FIND-003: {Finding Title}

- **Category**: {Category}
- **Location**: Section {X.Y} (line {N})
- **Issue**: {Description}
- **Recommendation**: {Action}
- **Status**: {Pending | Resolved | Skipped}

---

## Resolution Summary

*(This section is added/updated after interactive review)*

**Review Session**: {YYYY-MM-DD HH:MM}

| Metric | Count |
|--------|-------|
| Total Findings | {N} |
| Resolved | {N} |
| Skipped | {N} |
| Remaining | {N} |

### Resolved Findings

{List of finding IDs and brief resolution notes}

### Skipped Findings

{List of finding IDs with skip reasons}

### Recommendations for Future

{Any patterns or areas to focus on for future specs}

---

## Analysis Methodology

This analysis was performed using depth-aware criteria for {Depth Level} specs:

- **Sections Checked**: {List main sections analyzed}
- **Criteria Applied**: {Brief description of what was evaluated}
- **Out of Scope**: {What was intentionally not checked due to depth level}
```

---

## Template Usage Notes

### Finding ID Format

Use sequential IDs: `FIND-001`, `FIND-002`, etc.

### Location Format

Specify location as precisely as possible:
- For numbered sections: `Section 3.2 "User Stories" (line 145)`
- For unnumbered: `"Success Metrics" section (line 67)`
- For specific content: `Feature "Search" in Key Features table (line 34)`

### Status Values

- **Pending**: Not yet addressed
- **Resolved**: User approved fix and it was applied
- **Skipped**: User chose to skip (include reason if provided)

### Impact Guidelines

Describe impact in terms of:
- What problems it could cause if not fixed
- Who would be affected (developers, stakeholders, users)
- How it might lead to implementation issues
