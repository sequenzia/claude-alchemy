# ADR Template

Use this template when generating Architecture Decision Records in Phase 4.

---

## Template

```markdown
# ADR-NNNN: [Title]

**Date:** YYYY-MM-DD
**Status:** Accepted
**Feature:** [Feature name/description]

## Context

[Describe the situation that led to this decision. Include:]
- What problem are we solving?
- What constraints do we have?
- What are the driving forces?

## Decision

[State the decision clearly and concisely. Include:]
- What approach are we taking?
- Key architectural choices made
- Technologies/patterns selected

## Consequences

### Positive
- [Benefit 1]
- [Benefit 2]
- [Benefit 3]

### Negative
- [Tradeoff 1]
- [Tradeoff 2]

### Risks
- [Risk 1 and mitigation]
- [Risk 2 and mitigation]

## Alternatives Considered

### Alternative 1: [Name]
[Brief description]
- **Pros:** [List]
- **Cons:** [List]
- **Why rejected:** [Reason]

### Alternative 2: [Name]
[Brief description]
- **Pros:** [List]
- **Cons:** [List]
- **Why rejected:** [Reason]

## Implementation Notes

[Any specific implementation guidance:]
- Key files to create/modify
- Important patterns to follow
- Integration points

## References

- [Link to related docs]
- [Link to similar implementations]
```

---

## Usage Instructions

1. **Determine ADR number:**
   - Check existing files in `internal/docs/adr/`
   - Use the next sequential number (e.g., 0001, 0002)
   - If no ADRs exist, start with 0001

2. **Create filename:**
   - Format: `NNNN-feature-slug.md`
   - Use kebab-case for the slug
   - Example: `0003-user-authentication.md`

3. **Fill in the template:**
   - Be specific about the context
   - State the decision clearly
   - List real consequences (not just benefits)
   - Document alternatives that were considered

4. **Save location:**
   - Create `internal/docs/adr/` directory if it doesn't exist
   - Save the ADR to that directory

---

## Example ADR

```markdown
# ADR-0003: User Authentication with JWT

**Date:** 2024-01-15
**Status:** Accepted
**Feature:** User login and session management

## Context

The application needs user authentication. Users should be able to log in and maintain sessions across page refreshes. The API is stateless and serves both web and mobile clients.

Key constraints:
- Must work with stateless API
- Must support multiple clients
- Session should persist across browser refreshes
- Need to handle token refresh gracefully

## Decision

We will use JWT (JSON Web Tokens) for authentication with the following approach:
- Access tokens with 15-minute expiry
- Refresh tokens with 7-day expiry stored in httpOnly cookies
- Token refresh handled automatically by API client interceptor

## Consequences

### Positive
- Stateless authentication scales horizontally
- Works seamlessly with mobile clients
- Standard approach with good library support

### Negative
- Cannot immediately invalidate tokens (must wait for expiry)
- More complex than session-based auth
- Requires careful handling of token storage

### Risks
- Token theft: Mitigated by short access token expiry and httpOnly cookies
- XSS attacks: Mitigated by not storing tokens in localStorage

## Alternatives Considered

### Alternative 1: Session-based authentication
Using server-side sessions with cookies.
- **Pros:** Simple, immediate revocation
- **Cons:** Requires session storage, harder to scale
- **Why rejected:** Doesn't fit our stateless API architecture

### Alternative 2: OAuth 2.0 with external provider
Using Google/GitHub for authentication.
- **Pros:** No password management, trusted providers
- **Cons:** Dependency on external services, some users prefer local accounts
- **Why rejected:** Users need local account option

## Implementation Notes

- Create `src/auth/` module for authentication logic
- Use `jsonwebtoken` library for JWT operations
- Add middleware to verify tokens on protected routes
- Store refresh token in `users.refresh_token` column

## References

- JWT Best Practices: https://tools.ietf.org/html/rfc8725
- OWASP Auth Cheatsheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
```
