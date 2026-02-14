# HTML Review Generation Guide

Instructions for generating the interactive `.analysis.html` review file from analysis findings.

## Overview

After saving the `.analysis.md` report, generate a companion `.analysis.html` file that provides an interactive browser-based review experience. The HTML file is self-contained with all CSS and JS inlined — no external dependencies.

## Template Location

The HTML template is at: `skills/analyze-spec/templates/review-template.html`

## Data Schemas

### SPEC_CONTENT Object

```javascript
const SPEC_CONTENT = {
  path: "specs/SPEC-User-Auth.md",       // Original spec file path
  name: "User Authentication",            // Human-readable spec name
  depthLevel: "Detailed",                 // "High-Level" | "Detailed" | "Full-Tech"
  analyzedAt: "2026-02-05 14:30",         // Timestamp of analysis
  content: "# Full markdown content..."   // Complete spec markdown content
};
```

### FINDINGS_DATA Array

```javascript
const FINDINGS_DATA = [
  {
    id: "FIND-001",                          // Sequential ID, zero-padded to 3 digits
    title: "Feature Name Mismatch",          // Short descriptive title
    category: "Inconsistencies",             // One of 4 categories (see below)
    severity: "warning",                     // "critical" | "warning" | "suggestion"
    location: "Section 5.1 (line 89)",       // Human-readable location string
    lineNumber: 89,                          // Line number in spec (1-based), or null
    currentText: "actual text from spec",    // Quoted text from spec, or null
    issue: "explanation of the problem",     // Clear description of what's wrong
    impact: "why this matters",              // Impact statement, or null
    proposedText: "suggested replacement",   // Suggested fix text, or null
    status: "pending"                        // Always "pending" on generation
  }
];
```

### Categories (exactly 4)

1. `"Inconsistencies"` — Internal contradictions or mismatches
2. `"Missing Information"` — Expected content that's absent
3. `"Ambiguities"` — Unclear or vague statements
4. `"Structure Issues"` — Formatting, organization, missing sections

### Severity Levels (exactly 3)

1. `"critical"` — Would cause implementation to fail
2. `"warning"` — Could cause confusion or problems
3. `"suggestion"` — Non-blocking improvements

## Template Substitution Process

### Step 1: Read the Template

Read the HTML template file at `skills/analyze-spec/templates/review-template.html`.

### Step 2: Prepare JSON Data

Build the SPEC_CONTENT object:
- `path`: The spec file path as provided in context
- `name`: Extract from spec heading or use the filename
- `depthLevel`: The detected depth level
- `analyzedAt`: Current timestamp in `YYYY-MM-DD HH:mm` format
- `content`: The full raw markdown content of the spec

Build the FINDINGS_DATA array:
- Map each analysis finding to the schema above
- Assign sequential IDs: `FIND-001`, `FIND-002`, etc.
- Set all statuses to `"pending"`
- For structural findings without specific text, set `currentText` and `proposedText` to `null`

### Step 3: JSON Escaping Rules

**Critical**: The JSON is injected inside JavaScript, so proper escaping is essential.

1. Escape backslashes first: `\` → `\\`
2. Escape double quotes: `"` → `\"`
3. Escape newlines in string values: actual newline → `\n`
4. Escape carriage returns: `\r` → `\\r`
5. Escape tabs: tab character → `\\t`
6. Escape template literals and HTML-significant chars in content:
   - `</script>` → `<\/script>` (prevent premature script tag closing)

The safest approach: use proper JSON serialization. When writing the file with the Write tool, construct valid JSON strings for each field value.

### Step 4: Replace Markers

Replace the two injection markers in the template:

1. Find `/*__SPEC_CONTENT__*/ {}` and replace with the SPEC_CONTENT JSON object
2. Find `/*__FINDINGS_DATA__*/ []` and replace with the FINDINGS_DATA JSON array

**Important**: Replace the entire marker including the default value. The result should be valid JavaScript:
```javascript
const SPEC_CONTENT = { "path": "...", ... };
const FINDINGS_DATA = [{ "id": "FIND-001", ... }];
```

### Step 5: Write the File

Write the completed HTML to the HTML review path (same directory as the spec, with `.analysis.html` suffix).

## Field Mapping from Analysis

Map your analysis findings to the JSON schema:

| Analysis Field | JSON Field | Notes |
|---|---|---|
| Finding number | `id` | Format as `FIND-001` |
| Finding title | `title` | Short descriptive title |
| Category | `category` | Must be one of the 4 exact strings |
| Severity | `severity` | Lowercase: critical, warning, suggestion |
| Section + line | `location` | Human-readable, e.g., "Section 3.2 (line 45)" |
| Line number | `lineNumber` | Integer or null if not applicable |
| Quoted spec text | `currentText` | Exact text from spec or null |
| Problem description | `issue` | Clear explanation |
| Impact statement | `impact` | Why it matters or null |
| Recommended fix | `proposedText` | Suggested replacement or null |

## Edge Cases

### Zero Findings

If the analysis produces no findings:
- Set `FINDINGS_DATA` to an empty array `[]`
- The HTML will show an empty state message automatically

### Structural Findings Without Specific Text

Some findings (like "Missing section X") don't have `currentText`:
- Set `currentText` to `null`
- Set `proposedText` to null or to a template of what should be added
- Set `lineNumber` to null or to a reasonable insertion point

### Large Specs (500+ Lines)

- The template handles large content via scrolling panels
- No truncation needed — include the full spec content
- Line numbers must still be accurate

### Special Characters in Spec Content

- Backticks, quotes, and backslashes in the spec content MUST be properly escaped in the JSON
- HTML in spec content is escaped by the template's `esc()` function at render time
- The `content` field should contain raw markdown, not HTML
