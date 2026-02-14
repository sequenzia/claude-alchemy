# Spec Interview Question Bank

This document contains questions organized by category and depth level for gathering spec requirements.

## Category 1: Problem & Goals

### High-Level Questions (All Depths)

1. **What problem are you trying to solve?**
   - Follow-up: Who experiences this problem most acutely?

2. **What does success look like for this product/feature?**
   - Follow-up: How will you measure success?

3. **Who are the primary users of this product/feature?**
   - Follow-up: What are their main goals and pain points?

4. **Why is this important to build now?**
   - Follow-up: What's the cost of not solving this problem?

### Detailed Questions (Detailed & Full Tech)

5. **What specific metrics will indicate success?**
   - Follow-up: What are the current baselines for these metrics?
   - Follow-up: What are your target values?

6. **Are there secondary user personas we should consider?**
   - Follow-up: How do their needs differ from primary users?

7. **What business value does this deliver?**
   - Follow-up: How does this align with company/team strategy?

8. **What's the current user journey, and how will this change it?**

### Deep-Dive Questions (Full Tech Only)

9. **What quantitative data supports this problem statement?**
   - Follow-up: Any user research, analytics, or support tickets?

10. **What competitive solutions exist, and how will yours differ?**

11. **What are the leading indicators vs lagging indicators for success?**

---

## Category 2: Functional Requirements

### High-Level Questions (All Depths)

1. **What are the must-have features for the initial release?**
   - Follow-up: Which of these is the single most important?

2. **Can you describe the main user workflow or interaction?**

3. **What should users be able to do that they can't do today?**

4. **Are there any features that are explicitly out of scope?**

### Detailed Questions (Detailed & Full Tech)

5. **For each key feature, what does "done" look like?**
   - Follow-up: What are the acceptance criteria?

6. **What edge cases should we handle?**
   - Follow-up: What happens when things go wrong?

7. **Are there different user roles with different permissions?**
   - Follow-up: What can each role do?

8. **What notifications or feedback should users receive?**

9. **How should errors be presented to users?**

10. **Are there any workflows that require multiple steps or confirmations?**

### Deep-Dive Questions (Full Tech Only)

11. **Can you walk through each feature step-by-step?**
    - Follow-up: What's the happy path?
    - Follow-up: What are all the error states?

12. **What validation rules apply to user inputs?**

13. **Are there any real-time or time-sensitive requirements?**

14. **What offline or degraded mode behaviors are needed?**

15. **Are there any batch processing or background job requirements?**

---

## Category 3: Technical Specifications

### High-Level Questions (All Depths)

1. **Do you have any technology preferences or constraints?**

2. **Are there existing systems this needs to integrate with?**

3. **Are there any known performance requirements?**

### Detailed Questions (Detailed & Full Tech)

4. **What's the expected scale (users, data volume, requests)?**
   - Follow-up: How might this grow over time?

5. **Are there any security or compliance requirements?**
   - Follow-up: Data privacy considerations? (GDPR, HIPAA, etc.)

6. **What existing infrastructure or services should we leverage?**

7. **Are there any third-party APIs or services involved?**
   - Follow-up: What are their limitations or costs?

8. **What authentication/authorization approach should be used?**

### Deep-Dive Questions (Full Tech Only)

9. **What data entities are needed?**
   - Follow-up: What are the relationships between them?
   - Follow-up: What fields does each entity need?

10. **What API endpoints will be required?**
    - Follow-up: What are the request/response formats?
    - Follow-up: What are the error responses?

11. **What are the performance SLAs?**
    - Follow-up: Response time requirements (P50, P99)?
    - Follow-up: Throughput requirements?
    - Follow-up: Availability requirements?

12. **How should the system handle failures?**
    - Follow-up: Retry strategies?
    - Follow-up: Circuit breaker patterns?
    - Follow-up: Fallback behaviors?

13. **What caching strategy should be used?**

14. **What monitoring and alerting is needed?**
    - Follow-up: Key metrics to track?
    - Follow-up: Alert thresholds?

15. **Are there any data migration requirements?**

16. **What's the deployment strategy?**
    - Follow-up: Feature flags needed?
    - Follow-up: Rollback plan?

---

## Category 4: Implementation Planning

### High-Level Questions (All Depths)

1. **What are the major milestones or phases?**

2. **Are there any hard dependencies or blockers?**

3. **What are the biggest risks to this project?**

### Detailed Questions (Detailed & Full Tech)

4. **What needs to be completed before work can begin?**
   - Follow-up: Any approvals needed?
   - Follow-up: Any prerequisite work?

5. **Are there other teams we need to coordinate with?**
   - Follow-up: What do we need from them?

6. **What could go wrong, and how would we mitigate it?**

7. **Are there any decisions that need to be made before implementation?**

8. **What checkpoint reviews are needed during implementation?**
   - Follow-up: Who needs to be involved in reviews?

### Deep-Dive Questions (Full Tech Only)

9. **What's the logical order of implementation?**
   - Follow-up: What can be parallelized?

10. **What technical spikes or research are needed first?**

11. **Are there any proof-of-concept validations needed?**

12. **What documentation needs to be created?**
    - Follow-up: API documentation?
    - Follow-up: Architecture diagrams?
    - Follow-up: Runbooks?

13. **What testing strategy is appropriate?**
    - Follow-up: Unit test coverage targets?
    - Follow-up: Integration test scope?
    - Follow-up: Performance test requirements?

14. **How will we handle backwards compatibility?**

15. **What training or communication is needed for launch?**

---

## Adaptive Question Strategies

### When User Says "No Preference"
- Skip related technical detail questions
- Focus on functional requirements instead
- Note that technical decisions will be made during implementation

### When User Indicates Area is Important
- Probe deeper with follow-up questions
- Ask for specific examples
- Request quantitative requirements where applicable

### When User is Unsure
- Offer common options/patterns as examples
- Suggest industry best practices via the recommendation system
- Consider proactive research for compliance or complex topics
- Mark as open question to resolve later if user defers decision

**Connecting to Recommendations:**

When a user expresses uncertainty, this is an opportunity to offer proactive recommendations:

1. **Trigger phrases**: "I'm not sure", "what do you recommend?", "what's standard?", "what do others do?"
2. **Response approach**:
   - Offer a brief best-practice recommendation as an inline insight
   - If the topic is complex (compliance, architecture), consider proactive research
   - Present options using `AskUserQuestion` with clear trade-offs
3. **Example flow**:
   ```
   User: "I'm not sure what authentication approach to use"

   Agent: [Detects auth trigger + uncertainty]
   Agent: [Offers inline insight via AskUserQuestion]
   "For public-facing apps, OAuth 2.0 with PKCE is the recommended approach.
    Would you like to include this in the spec?"
   Options: Include this | Tell me more | Skip
   ```

**See also:** `recommendation-triggers.md` for trigger patterns and `recommendation-format.md` for presentation templates.

### When Building Feature for Existing Product
- Codebase exploration is offered before Round 1 (see "Codebase Exploration" in main SKILL.md)
- If deep team analysis was performed, use the synthesized findings to:
  - Reference specific patterns and conventions found (with file paths)
  - Confirm integration points identified during exploration rather than asking open-ended questions
  - Skip tech stack and architecture questions already answered by exploration
  - Ask about trade-offs for challenges identified (e.g., coupling, performance concerns)
- If quick exploration was performed, use findings for targeted follow-ups
- If exploration was skipped, ask about existing patterns, integration points, and codebase conventions directly

---

## Round Structure by Depth

### High-Level Overview (2-3 rounds)
- **Round 1**: Problem, goals, key users, must-have features
- **Round 2**: Success metrics, scope boundaries, major risks
- **Round 3** (if needed): Clarifications and open questions

### Detailed Specifications (3-4 rounds)
- **Round 1**: Problem deep-dive, user personas, success metrics
- **Round 2**: Feature breakdown, acceptance criteria, user workflows
- **Round 3**: Technical constraints, integrations, dependencies
- **Round 4**: Implementation phases, risks, open questions

### Full Technical Documentation (4-5 rounds)
- **Round 1**: Problem analysis, business value, user research
- **Round 2**: Detailed features, edge cases, error handling
- **Round 3**: Architecture, data models, API specifications
- **Round 4**: Performance, security, scalability requirements
- **Round 5**: Implementation plan, testing strategy, deployment

---

## Summary Checklist

Before compiling spec, ensure you have gathered:

### All Depths
- [ ] Clear problem statement
- [ ] Success metrics defined
- [ ] Primary user persona identified
- [ ] Must-have features listed
- [ ] Scope boundaries (in/out) defined
- [ ] Major risks identified

### Detailed & Full Tech
- [ ] All features have acceptance criteria
- [ ] User workflows documented
- [ ] Technical constraints captured
- [ ] Dependencies identified
- [ ] Implementation phases defined

### Full Tech Only
- [ ] Data models specified
- [ ] API endpoints defined
- [ ] Performance requirements quantified
- [ ] Security requirements documented
- [ ] Testing strategy outlined
- [ ] Deployment plan created
