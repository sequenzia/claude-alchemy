# Common PRD Issues Pattern Library

This reference catalogs frequently occurring issues in PRDs with detection patterns and examples.

---

## Inconsistencies

### INC-01: Feature Name Mismatch

**Pattern**: Same feature referred to by different names in different sections.

**Detection**:
- Build list of feature names from Key Features section
- Search for variations (plural/singular, abbreviations, synonyms)
- Flag when same concept has multiple names

**Example**:
- Key Features: "User Authentication"
- User Stories: "Login System"
- Technical Specs: "Auth Module"

**Fix**: Standardize on one name throughout the document.

---

### INC-02: Priority Inconsistency

**Pattern**: Feature priority differs between sections.

**Detection**:
- Extract priorities from feature list
- Compare with priorities in user stories
- Compare with phase assignments (P0 should be Phase 1)

**Example**:
- Feature "Export" marked P2 in features table
- Same feature in "Phase 1" deliverables

**Fix**: Align priority across all mentions, or clarify phase assignment rationale.

---

### INC-03: Metric-Goal Mismatch

**Pattern**: Success metrics don't measure stated goals.

**Detection**:
- Extract goals from Problem Statement
- Extract metrics from Success Metrics section
- Verify each goal has at least one related metric

**Example**:
- Goal: "Reduce customer support tickets"
- Metrics: "Page load time", "User signups"
- Missing: Metric for support ticket reduction

**Fix**: Add metrics that directly measure each stated goal.

---

### INC-04: Contradictory Requirements

**Pattern**: Two requirements that cannot both be true.

**Detection**:
- Look for conflicting constraints
- Check performance vs. feature requirements
- Verify security vs. usability trade-offs are addressed

**Example**:
- "All data must be encrypted at rest"
- "System must support full-text search on encrypted fields"
- (Contradiction: full-text search typically requires unencrypted indexes)

**Fix**: Clarify constraints or acknowledge trade-off with solution.

---

## Missing Information

### MISS-01: Undefined Terms

**Pattern**: Domain-specific terms used without definition.

**Detection**:
- Identify technical or business jargon
- Check for glossary or inline definitions
- Flag terms that non-domain experts wouldn't understand

**Example**:
- "The system will use CQRS pattern" (What is CQRS?)
- "Support for SSO via SAML" (Acronyms unexplained)

**Fix**: Add glossary section or inline definitions.

---

### MISS-02: Missing Acceptance Criteria

**Pattern**: Features or user stories lack testable criteria.

**Detection**:
- Check each feature/story for acceptance criteria
- Verify criteria are specific and testable
- Flag vague criteria ("works correctly", "is fast")

**Example**:
- User Story: "As a user, I want to search products"
- Missing: What constitutes a successful search? Filters? Sort options?

**Fix**: Add specific, testable acceptance criteria.

---

### MISS-03: Unspecified Error Handling

**Pattern**: Happy path defined but error scenarios missing.

**Detection**:
- Look for error handling requirements
- Check API specs for error responses
- Verify edge cases are addressed

**Example**:
- "User can upload profile photo"
- Missing: What if file too large? Wrong format? Upload fails?

**Fix**: Add error scenarios and expected behavior.

---

### MISS-04: Missing Dependencies

**Pattern**: External systems referenced but dependencies not listed.

**Detection**:
- Scan for mentions of external systems/APIs
- Compare with Dependencies section
- Flag missing external dependencies

**Example**:
- "Integrate with Stripe for payments"
- Dependencies section: No mention of Stripe

**Fix**: Add all external dependencies with version requirements.

---

### MISS-05: Incomplete User Personas

**Pattern**: Personas mentioned but not fully defined.

**Detection**:
- Check if personas have: name, role, goals, pain points
- Verify personas are referenced in user stories
- Flag "placeholder" personas

**Example**:
- "Admin users" mentioned in features
- No Admin persona defined with specific needs

**Fix**: Define complete personas for each user type.

---

## Ambiguities

### AMB-01: Vague Quantifiers

**Pattern**: Non-specific terms used where numbers are needed.

**Detection**: Look for these words without specific values:
- "fast", "quickly", "responsive"
- "many", "few", "several"
- "large", "small", "scalable"
- "easy", "simple", "intuitive"

**Example**:
- "The system should load quickly" (How quickly?)
- "Support many concurrent users" (How many?)

**Fix**: Replace with specific, measurable values.

---

### AMB-02: Undefined "Should" vs "Must"

**Pattern**: Unclear requirement priority in language.

**Detection**:
- Check for consistent use of RFC 2119 language
- Flag mixed usage without definition
- Identify requirements using "should" for critical features

**Example**:
- "The system should encrypt all passwords" (Is this optional?)
- "Users must be able to login" (Required)

**Fix**: Use consistent RFC 2119 language (MUST, SHOULD, MAY) with definitions.

---

### AMB-03: Ambiguous Pronouns

**Pattern**: Unclear referents for "it", "this", "that", "they".

**Detection**:
- Find pronouns that could refer to multiple antecedents
- Flag long sentences with unclear references

**Example**:
- "When the user submits the form and the system processes it, it should notify them."
- (Which "it"? Form or system? Who are "them"?)

**Fix**: Replace pronouns with specific nouns.

---

### AMB-04: Open-Ended Lists

**Pattern**: Lists with "etc.", "and more", "such as" without bounds.

**Detection**:
- Find incomplete lists
- Flag unbounded requirements

**Example**:
- "Support file types: PDF, DOC, images, etc."
- (What specific image formats? What else is included in "etc."?)

**Fix**: Provide exhaustive list or explicit bounds.

---

### AMB-05: Undefined Scope Boundaries

**Pattern**: Features described without clear limits.

**Detection**:
- Look for features without "out of scope" clarification
- Flag features that could expand indefinitely

**Example**:
- "Support search with filters"
- (Which filters? All possible filters? User-defined filters?)

**Fix**: Define explicit scope with "in scope" and "out of scope" lists.

---

## Structure Issues

### STRUCT-01: Missing Required Section

**Pattern**: Expected section for depth level is absent.

**Detection**:
- Compare document structure to template
- Flag missing required sections for depth level

**Example**:
- Full-Tech PRD missing "API Specifications" section
- Detailed PRD missing "User Stories" section

**Fix**: Add missing section with appropriate content.

---

### STRUCT-02: Section Misplacement

**Pattern**: Content in wrong section.

**Detection**:
- Identify content that belongs in different section
- Flag technical details in business sections
- Flag user stories in technical sections

**Example**:
- API endpoints listed in "Problem Statement"
- Business metrics in "Technical Architecture"

**Fix**: Move content to appropriate section.

---

### STRUCT-03: Inconsistent Formatting

**Pattern**: Similar items formatted differently.

**Detection**:
- Check user story format consistency
- Check requirement ID format
- Check heading hierarchy

**Example**:
- Some user stories: "As a user, I want..."
- Other stories: "User should be able to..."

**Fix**: Standardize formatting across all similar items.

---

### STRUCT-04: Orphaned References

**Pattern**: References to non-existent sections or documents.

**Detection**:
- Find internal references (see Section X, refer to Y)
- Verify referenced sections/documents exist

**Example**:
- "See Security Requirements in Section 8"
- Section 8 doesn't exist or covers different topic

**Fix**: Update references or add missing sections.

---

### STRUCT-05: Circular Dependencies

**Pattern**: Tasks or features depend on each other.

**Detection**:
- Map feature dependencies
- Identify circular references in phases

**Example**:
- Feature A requires Feature B to be complete
- Feature B requires Feature A to be complete

**Fix**: Identify minimum viable version of one to break cycle.

---

## Severity Assignment Guidelines

### Critical (Must Fix)

Assign Critical when the issue:
- Would cause implementation to fail or go significantly wrong
- Represents a fundamental contradiction
- Leaves a core requirement completely undefined
- Missing required section for the depth level

### Warning (Should Fix)

Assign Warning when the issue:
- Could cause confusion during implementation
- Represents incomplete but not missing information
- Uses ambiguous language for important features
- Minor inconsistency that could compound

### Suggestion (Nice to Fix)

Assign Suggestion when the issue:
- Is a style or clarity improvement
- Affects non-critical sections
- Would improve PRD quality but isn't blocking
- Represents best practice not currently followed
