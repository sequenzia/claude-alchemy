# Recommendation Triggers

This document defines patterns that trigger proactive recommendations during PRD interviews. When these patterns are detected in user responses, the interview agent should offer relevant best practices and recommendations.

## Trigger Categories

### Authentication & Identity

**Trigger Keywords:**
- "login", "sign in", "sign up", "authentication", "auth"
- "user accounts", "registration", "password"
- "session", "token", "JWT"
- "SSO", "single sign-on", "OAuth"

**Recommendation Areas:**
| Scenario | Recommendation |
|----------|----------------|
| Public-facing web app | OAuth 2.0 with PKCE for secure token handling |
| Mobile app | OAuth 2.0 + secure token storage (Keychain/Keystore) |
| Multi-tenant SaaS | Tenant isolation, JWT with tenant claims |
| Enterprise/B2B | SAML 2.0 or OIDC for SSO integration |
| Sensitive data | MFA requirement, session timeout policies |

**Research Triggers:**
- "which auth provider", "Auth0 vs Cognito", "auth best practices"

---

### Scale & Performance

**Trigger Keywords:**
- "millions of users", "high traffic", "10k+", "100k+"
- "scale", "scalable", "scaling"
- "concurrent users", "requests per second"
- "performance", "fast", "latency"
- "real-time", "live updates"

**Recommendation Areas:**
| Scenario | Recommendation |
|----------|----------------|
| Read-heavy workload | Caching layer (Redis/Memcached), CDN for static assets |
| Write-heavy workload | Message queues, event sourcing, eventual consistency |
| Global users | Multi-region deployment, edge caching |
| Bursty traffic | Auto-scaling, rate limiting, circuit breakers |
| Low latency required | Connection pooling, query optimization, indexing |

**Research Triggers:**
- "how to handle traffic spikes", "caching strategies", "database scaling"

---

### Security & Compliance

**Trigger Keywords:**
- "sensitive data", "PII", "personal information"
- "HIPAA", "healthcare", "medical"
- "GDPR", "privacy", "data protection"
- "PCI", "payment", "credit card"
- "SOC 2", "compliance", "audit"
- "encryption", "secure"

**Recommendation Areas:**
| Scenario | Recommendation |
|----------|----------------|
| HIPAA (healthcare) | Encryption at rest/transit, audit logging, BAA requirements |
| GDPR (EU users) | Consent management, data retention policies, right to deletion |
| PCI DSS (payments) | Tokenization, no raw card storage, regular security scans |
| SOC 2 | Access controls, monitoring, incident response procedures |
| General sensitive data | Field-level encryption, data masking, access logging |

**Auto-Research Triggers (proactive):**
- Any mention of HIPAA, GDPR, PCI, SOC 2, WCAG
- "compliance requirements", "regulatory"

---

### Real-Time Features

**Trigger Keywords:**
- "real-time", "live", "instant"
- "notifications", "push notifications"
- "chat", "messaging", "collaboration"
- "streaming", "live updates"
- "presence", "online status"

**Recommendation Areas:**
| Scenario | Recommendation |
|----------|----------------|
| Bi-directional communication | WebSockets for persistent connections |
| Server-to-client updates only | Server-Sent Events (SSE) for simplicity |
| Mobile notifications | Firebase Cloud Messaging (FCM) / APNs |
| High-frequency updates | Consider rate limiting, batching updates |
| Offline support | Local queue with sync on reconnect |

**Research Triggers:**
- "WebSocket vs SSE", "real-time architecture", "notification service"

---

### File & Media Handling

**Trigger Keywords:**
- "file upload", "image upload", "document"
- "video", "audio", "media"
- "storage", "S3", "blob"
- "CDN", "content delivery"

**Recommendation Areas:**
| Scenario | Recommendation |
|----------|----------------|
| Large files (>10MB) | Presigned URLs, chunked/resumable uploads |
| User-generated images | Image processing pipeline, CDN, multiple resolutions |
| Documents | Virus scanning, format validation, preview generation |
| Video content | Transcoding pipeline, adaptive streaming (HLS/DASH) |
| High availability | Multi-region storage, replication |

**Research Triggers:**
- "file upload best practices", "video streaming architecture"

---

### API Design

**Trigger Keywords:**
- "API", "REST", "GraphQL"
- "endpoint", "integration"
- "third-party", "webhook"
- "versioning", "backwards compatible"
- "pagination", "rate limit"

**Recommendation Areas:**
| Scenario | Recommendation |
|----------|----------------|
| Public API | API versioning (URL or header), comprehensive documentation |
| High-volume clients | Rate limiting, pagination (cursor-based preferred) |
| Multiple clients | GraphQL for flexible queries, or REST with sparse fieldsets |
| Webhooks | Retry logic, signature verification, idempotency keys |
| Partner integrations | OAuth 2.0 client credentials, API key rotation |

**Research Triggers:**
- "API design best practices", "GraphQL vs REST", "webhook security"

---

### Search & Discovery

**Trigger Keywords:**
- "search", "find", "filter"
- "autocomplete", "typeahead"
- "full-text search", "fuzzy search"
- "recommendations", "suggested"

**Recommendation Areas:**
| Scenario | Recommendation |
|----------|----------------|
| Basic search | Database full-text search (PostgreSQL tsvector) |
| Advanced search | Elasticsearch/OpenSearch, Algolia, Meilisearch |
| Autocomplete | Debounced requests, prefix indexing |
| Personalization | User behavior tracking, collaborative filtering |
| Large datasets | Search indexing pipeline, denormalization |

**Research Triggers:**
- "search implementation", "Elasticsearch vs Algolia"

---

### Testing & Quality

**Trigger Keywords:**
- "testing", "test", "QA"
- "unit test", "integration test"
- "coverage", "automated testing"
- "CI/CD", "pipeline"

**Recommendation Areas:**
| Scenario | Recommendation |
|----------|----------------|
| Critical business logic | Unit tests with >80% coverage |
| API endpoints | Integration tests, contract testing |
| UI components | Component tests, visual regression |
| End-to-end flows | E2E tests for critical paths only |
| Continuous deployment | Automated pipeline with staged rollouts |

**Research Triggers:**
- "testing strategy", "CI/CD best practices"

---

### Accessibility

**Trigger Keywords:**
- "accessible", "accessibility", "a11y"
- "WCAG", "ADA", "screen reader"
- "keyboard navigation"

**Recommendation Areas:**
| Scenario | Recommendation |
|----------|----------------|
| Public website | WCAG 2.1 AA compliance minimum |
| Government/education | WCAG 2.1 AAA, Section 508 |
| Mobile app | Platform accessibility guidelines (iOS/Android) |
| Complex UI | ARIA attributes, focus management, skip links |

**Auto-Research Triggers (proactive):**
- "WCAG", "accessibility requirements", "ADA compliance"

---

## Detection Guidelines

### When to Offer Inline Insights

Offer brief insights during rounds when:
1. A trigger keyword is detected
2. The topic is relevant to the current question context
3. Maximum 2 inline insights per round to avoid overwhelm

### When to Save for Recommendations Round

Save for the dedicated recommendations round when:
1. Multiple related triggers are detected
2. The recommendation requires more context to present
3. Research might strengthen the recommendation
4. The topic needs user decision (e.g., choosing between approaches)

### When to Trigger Proactive Research

Automatically research (without explicit user request) when:
1. Compliance topics are mentioned (HIPAA, GDPR, PCI, WCAG)
2. User expresses uncertainty ("I'm not sure", "what do you recommend?")
3. Complex technical trade-offs need current information
4. Maximum 2 proactive research calls per interview

---

## Trigger Tracking

During the interview, track detected triggers:

```
Detected Triggers:
- [x] Authentication (Round 1) - OAuth 2.0 recommended
- [x] Scale (Round 2) - Caching strategy recommended
- [ ] Security (Round 2) - Pending recommendation
- [x] Real-time (Round 3) - WebSocket vs SSE presented

Proactive Research Used: 1/2
- GDPR compliance requirements (Round 2)
```

This tracking informs the Recommendations Round content.
