# Spec Analysis Criteria

This reference provides depth-aware checklists for analyzing specs at each detail level.

## Depth Level Detection

Detect the spec depth level from its content using these indicators:

| Indicator | High-Level | Detailed | Full-Tech |
|-----------|------------|----------|-----------|
| Numbered sections (`## 1.`, `### 2.1`) | No | Yes | Yes |
| `## 7. Technical Architecture` or similar | No | Yes | Yes |
| `### 7.4 API Specifications` or similar | No | No | Yes |
| `## 10. Testing Strategy` section | No | No | Yes |
| API endpoint definitions (`POST /api/`, `GET /api/`) | No | Maybe | Yes |
| Feature table with Priority column | Yes | No | No |
| User stories (`**US-001**:` or similar) | No | Yes | Yes |
| Data model schemas | No | Maybe | Yes |
| Performance SLAs with specific numbers | No | Maybe | Yes |

### Detection Algorithm

1. Search for `API Specifications` section OR detailed endpoint definitions (`POST /api/`, `GET /api/` patterns) → **FULL-TECH**
2. Search for numbered sections AND `Technical Architecture` section → **DETAILED**
3. Search for Feature/Priority table OR executive summary focus → **HIGH-LEVEL**
4. Default: **DETAILED**

---

## High-Level Overview Checklist

For specs using the high-level template, verify these sections:

### Executive Summary
- [ ] Clear one-paragraph overview exists
- [ ] Problem being solved is stated
- [ ] Target audience is identified
- [ ] Success metrics are mentioned (even if high-level)

### Problem Statement
- [ ] Problem is clearly articulated
- [ ] Impact of the problem is described
- [ ] Current state/pain points are explained

### Key Features
- [ ] Features are listed with priorities
- [ ] Each feature has a brief description
- [ ] Priority levels are consistent (P0-P3 or similar)
- [ ] At least one P0/Critical feature exists

### Success Metrics
- [ ] 2-4 measurable metrics are defined
- [ ] Metrics relate to stated problem
- [ ] Baseline values mentioned (or acknowledged as TBD)

### Implementation Phases
- [ ] At least 2 phases are defined
- [ ] Each phase has clear deliverables
- [ ] Phase 1 focuses on core/critical features

### Risks & Dependencies
- [ ] At least 2-3 risks identified
- [ ] External dependencies listed
- [ ] Mitigation strategies suggested

### Quality Standards (What NOT to Flag)
- Do NOT flag missing user stories (not expected at this level)
- Do NOT flag missing API specs
- Do NOT flag missing data models
- Do NOT flag missing acceptance criteria on individual features

---

## Detailed Specifications Checklist

For specs using the detailed template, verify all high-level items plus:

### User Personas
- [ ] At least one primary persona defined
- [ ] Persona includes goals and pain points
- [ ] Persona is specific, not generic

### User Stories
- [ ] Stories follow "As a... I want... So that..." format
- [ ] Each story has unique identifier (US-001, etc.)
- [ ] Stories cover main feature areas
- [ ] Stories have acceptance criteria

### Acceptance Criteria
- [ ] Each major feature has acceptance criteria
- [ ] Criteria are testable (not vague)
- [ ] Include success and failure scenarios

### Technical Constraints
- [ ] Tech stack requirements mentioned
- [ ] Integration points identified
- [ ] Performance expectations stated

### Non-Functional Requirements
- [ ] Security requirements outlined
- [ ] Performance requirements stated
- [ ] Scalability considerations mentioned

### Quality Standards (What NOT to Flag)
- Do NOT flag missing API endpoint details
- Do NOT flag missing database schemas
- Do NOT flag missing deployment architecture
- Do NOT flag vague technical specs (expected at this level)

---

## Full Technical Documentation Checklist

For specs using the full-tech template, verify all detailed items plus:

### System Architecture
- [ ] Architecture diagram or clear description exists
- [ ] Component interactions defined
- [ ] Data flow explained

### API Specifications
- [ ] Endpoints defined with HTTP methods
- [ ] Request/response schemas included
- [ ] Error codes and handling specified
- [ ] Authentication requirements stated

### Data Models
- [ ] Key entities defined
- [ ] Relationships documented
- [ ] Required fields identified
- [ ] Data types specified

### Performance SLAs
- [ ] Response time targets specified
- [ ] Throughput requirements stated
- [ ] Availability targets defined (e.g., 99.9%)

### Testing Strategy
- [ ] Unit testing approach defined
- [ ] Integration testing requirements
- [ ] Performance testing criteria

### Deployment Plan
- [ ] Deployment strategy outlined
- [ ] Rollback procedures mentioned
- [ ] Environment requirements specified

---

## Cross-Depth Quality Checks

These apply regardless of depth level:

### Internal Consistency
- [ ] Feature names used consistently throughout
- [ ] Priority levels consistent across sections
- [ ] Phase assignments match feature priorities
- [ ] Metrics align with stated goals

### Completeness Indicators
- [ ] No "TBD" items in critical sections
- [ ] References to external docs are accessible
- [ ] Out-of-scope items clearly defined

### Measurability
- [ ] Success metrics are quantifiable
- [ ] Acceptance criteria are verifiable
- [ ] Performance targets are specific

### Clarity
- [ ] No ambiguous terms without definitions
- [ ] No contradicting statements
- [ ] Dependencies are clearly stated

---

## Completeness Thresholds

Minimum requirements for spec quality:

| Depth Level | Min Sections | Min Features | Min User Stories | Min Metrics |
|-------------|--------------|--------------|------------------|-------------|
| High-Level | 5 | 3 | 0 | 2 |
| Detailed | 8 | 5 | 5 | 3 |
| Full-Tech | 12 | 5 | 8 | 4 |

If a spec falls below these thresholds, flag as Critical finding.
