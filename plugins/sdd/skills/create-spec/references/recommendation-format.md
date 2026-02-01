# Recommendation Format Templates

This document provides templates for presenting recommendations during spec interviews using the AskUserQuestion tool.

## Inline Insight Template

Use this during interview rounds when a trigger is detected. Keep it brief and non-intrusive.

```yaml
AskUserQuestion:
  questions:
    - header: "Quick Insight"
      question: "{Brief recommendation in 1-2 sentences}. Would you like to include this in the spec?"
      options:
        - label: "Include this"
          description: "Add to spec requirements"
        - label: "Tell me more"
          description: "Get more details before deciding"
        - label: "Skip"
          description: "Continue without this recommendation"
      multiSelect: false
```

### Example: Authentication Insight

```yaml
AskUserQuestion:
  questions:
    - header: "Quick Insight"
      question: "For public-facing apps with user accounts, OAuth 2.0 with PKCE is the recommended approach - it provides secure token refresh without exposing client secrets. Would you like to include this in the spec?"
      options:
        - label: "Include this"
          description: "Add OAuth 2.0 with PKCE as auth requirement"
        - label: "Tell me more"
          description: "Explain the security benefits"
        - label: "Skip"
          description: "I'll decide on auth approach later"
      multiSelect: false
```

---

## Recommendations Round Template

Use this for the dedicated recommendations round, presenting 3-7 accumulated recommendations.

### Round Introduction

Before presenting recommendations, briefly introduce the round:

```
Based on what you've shared, I have a few recommendations based on industry best practices
that could strengthen your spec. I'll present each one for your review.
```

### Single Recommendation Template

```yaml
AskUserQuestion:
  questions:
    - header: "Recommendation {N} of {Total}: {Category}"
      question: "{Detailed recommendation with rationale}\n\n**Why this matters:**\n{1-2 sentence explanation of benefits}"
      options:
        - label: "Accept"
          description: "Include in spec"
        - label: "Modify"
          description: "I want to adjust this"
        - label: "Skip"
          description: "Don't include"
      multiSelect: false
```

### Example: Scale Recommendation

```yaml
AskUserQuestion:
  questions:
    - header: "Recommendation 2 of 5: Performance"
      question: "For your expected traffic of 10k+ concurrent users, I recommend implementing a caching layer (Redis) for frequently accessed data and rate limiting for API endpoints.\n\n**Why this matters:**\nThis prevents database overload during traffic spikes and ensures fair usage across clients."
      options:
        - label: "Accept"
          description: "Include caching and rate limiting requirements"
        - label: "Modify"
          description: "Adjust the approach"
        - label: "Skip"
          description: "Handle this during implementation"
      multiSelect: false
```

---

## Modification Flow Template

When user selects "Modify", gather their adjustment:

```yaml
AskUserQuestion:
  questions:
    - header: "Modify Recommendation"
      question: "How would you like to adjust this recommendation?"
      options:
        - label: "Different approach"
          description: "Use a different technical approach"
        - label: "Reduce scope"
          description: "Simplify the requirement"
        - label: "Add constraints"
          description: "Include specific limitations or conditions"
        - label: "Custom"
          description: "Explain your preferred approach"
      multiSelect: false
```

After receiving modification input, confirm the adjusted recommendation:

```yaml
AskUserQuestion:
  questions:
    - header: "Confirm Modification"
      question: "Updated recommendation: {modified version}. Is this accurate?"
      options:
        - label: "Yes, include this"
          description: "Add the modified recommendation"
        - label: "Adjust further"
          description: "Make more changes"
      multiSelect: false
```

---

## Research-Backed Recommendation Template

When proactive research informed the recommendation:

```yaml
AskUserQuestion:
  questions:
    - header: "Recommendation {N} of {Total}: {Category}"
      question: "{Recommendation}\n\n**Based on current standards:**\n{Research finding summary}\n\n**Source:** {Brief source attribution}"
      options:
        - label: "Accept"
          description: "Include in spec"
        - label: "Modify"
          description: "Adjust this"
        - label: "Skip"
          description: "Don't include"
      multiSelect: false
```

### Example: Compliance Research Recommendation

```yaml
AskUserQuestion:
  questions:
    - header: "Recommendation 3 of 5: Compliance"
      question: "Since you're handling EU user data, GDPR compliance should be explicitly addressed. I recommend including: consent management, data retention policy (max 3 years), and right-to-deletion implementation.\n\n**Based on current standards:**\nGDPR Article 17 requires the ability to delete user data within 30 days of request. Standard practice is implementing a soft-delete with scheduled purge.\n\n**Source:** EU GDPR Guidelines, ICO Best Practices"
      options:
        - label: "Accept"
          description: "Include GDPR requirements"
        - label: "Modify"
          description: "Adjust compliance scope"
        - label: "Skip"
          description: "Address compliance separately"
      multiSelect: false
```

---

## "Tell Me More" Response Template

When user wants more details on an inline insight:

```yaml
AskUserQuestion:
  questions:
    - header: "{Category} Details"
      question: "**{Topic} Explanation:**\n\n{Detailed explanation with pros/cons}\n\n**Alternatives:**\n- {Alternative 1}: {brief description}\n- {Alternative 2}: {brief description}\n\nWould you like to include this recommendation?"
      options:
        - label: "Yes, include it"
          description: "Add to spec"
        - label: "Use alternative"
          description: "Choose a different approach"
        - label: "Skip"
          description: "Don't include any recommendation"
      multiSelect: false
```

---

## Summary Section Template

For the pre-compilation summary, add this section after "Implementation":

```markdown
### Agent Recommendations (Accepted)

*The following recommendations were suggested based on industry best practices and accepted during the interview:*

1. **{Category}**: {Recommendation title}
   - Rationale: {Why this was recommended}
   - Applies to: {Which section/feature}

2. **{Category}**: {Recommendation title}
   - Rationale: {Why this was recommended}
   - Applies to: {Which section/feature}

{Continue for all accepted recommendations}
```

### Example Summary Section

```markdown
### Agent Recommendations (Accepted)

*The following recommendations were suggested based on industry best practices and accepted during the interview:*

1. **Authentication**: OAuth 2.0 with PKCE
   - Rationale: Secure token handling for public clients without exposing secrets
   - Applies to: User authentication feature

2. **Performance**: Redis caching layer
   - Rationale: Handle 10k+ concurrent users without database overload
   - Applies to: API endpoints, user session data

3. **Compliance**: GDPR data handling
   - Rationale: EU user data requires consent management and deletion rights
   - Applies to: User data storage, account management
```

---

## Tracking Accepted Recommendations

Maintain internal tracking during the interview:

```
Accepted Recommendations:
1. [Auth] OAuth 2.0 with PKCE - Include in Technical Specs > Authentication
2. [Performance] Redis caching - Include in Technical Specs > Performance
3. [Compliance] GDPR requirements - Include in Non-Functional Requirements

Skipped Recommendations:
- [Testing] E2E test coverage - User prefers to decide during implementation

Modified Recommendations:
- [Scale] Rate limiting - Modified: 100 req/min instead of 60 req/min
```

This tracking ensures recommendations flow correctly into the final spec.

---

## Presentation Guidelines

1. **Be concise**: Recommendations should be clear and actionable, not lengthy explanations
2. **Provide rationale**: Always explain *why* this is recommended
3. **Offer alternatives**: When relevant, acknowledge other valid approaches
4. **Respect user decisions**: Accept skips gracefully, don't repeatedly push rejected recommendations
5. **Group related items**: If multiple recommendations are related, consider presenting together
6. **Match depth level**: Fewer, higher-level recommendations for high-level specs; more detailed for full-tech
