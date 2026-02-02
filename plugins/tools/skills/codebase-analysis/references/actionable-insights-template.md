# Actionable Insights Template

Use this template when presenting and processing actionable items in Phase 4's "Address Actionable Insights" action.

---

## Item List Format

Present extracted items grouped by severity, highest first:

```markdown
### High Severity

1. **{Title}** — _{Source: Challenges & Risks}_
   {Brief description of the issue and its impact}

2. **{Title}** — _{Source: Recommendations}_
   {Brief description and rationale}

### Medium Severity

3. **{Title}** — _{Source: Recommendations}_
   {Brief description and rationale}

### Low Severity

4. **{Title}** — _{Source: Other Findings}_
   {Brief description}
```

---

## Severity Assignment Guidelines

### From Challenges & Risks Table
- Use the **Severity** column value directly (High, Medium, or Low)
- Title comes from the **Challenge** column
- Description comes from the **Impact** column

### From Recommendations Section
- If the recommendation references or links to a **High** severity challenge, assign **High**
- If the recommendation references a **Medium** challenge, assign **Medium**
- If no challenge link is apparent, default to **Medium**

### From Other Findings
- Default to **Low** unless the finding explicitly describes a critical issue
- Only include findings that have a concrete, implementable fix

---

## Complexity Assessment Criteria

### Simple (No agent needed)
- Single file change
- Clear, localized fix (rename, add validation, fix import, update config)
- No architectural impact
- Change is self-contained — no cascading modifications needed

### Complex — Architectural (Use `dev-tools:code-architect` with Opus)
- Requires refactoring across multiple files
- Introduces or changes a pattern (new abstraction, restructured module boundaries)
- Affects system architecture (data flow, component relationships, API contracts)
- Requires design decisions about approach

### Complex — Investigation Needed (Use `dev-tools:code-explorer` with Sonnet)
- Root cause is unclear or needs tracing through the codebase
- Multiple potential locations for the fix
- Requires understanding current behavior before proposing changes
- Dependencies or side effects need mapping

---

## Change Proposal Format

Present each proposed fix using this structure:

```markdown
#### {Item Title} ({Severity})

**Complexity:** Simple / Complex (architectural) / Complex (investigation)

**Files to modify:**
| File | Change Type |
|------|-------------|
| `path/to/file` | Edit / Create / Delete |

**Proposed changes:**
{Description of what will change and why. For simple fixes, show the specific code changes. For complex fixes, describe the approach.}

**Rationale:**
{Why this approach was chosen. Reference the original finding.}
```

---

## Summary Format

After processing all selected items, present:

```markdown
## Actionable Insights Summary

### Items Addressed
| # | Item | Severity | Files Modified |
|---|------|----------|----------------|
| 1 | {Title} | High | `file1.ts`, `file2.ts` |
| 2 | {Title} | Medium | `file3.ts` |

### Items Skipped
| # | Item | Severity | Reason |
|---|------|----------|--------|
| 3 | {Title} | Low | User skipped |

### Files Modified
| File | Changes |
|------|---------|
| `path/to/file` | {Brief description of change} |

**Total:** {N} items addressed, {M} items skipped, {P} files modified
```

---

## Section Guidelines

### Item Extraction
- Only extract items with concrete, actionable fixes — skip vague observations
- Deduplicate items that appear in both Challenges and Recommendations
- When deduplicating, keep the higher severity and merge descriptions

### User Selection
- Present items in severity order so the user sees the most impactful items first
- Keep descriptions concise in the selection list — details come in the proposal

### Processing Order
- Process items in the order the user selected them, but within that, prioritize by severity
- If a fix for one item would conflict with another selected item, flag this before proceeding

### Revision Cycles
- Maximum 3 revision cycles per item when user selects "Modify"
- After 3 cycles, present final proposal with Apply or Skip only
- Track what the user changed in each cycle to converge on the right fix
