# Full App Audit Prompt for Claude

**Use this prompt to request a comprehensive pre-production audit of the GapLens (PainPoint AI) codebase, with emphasis on security.**

---

## Prompt (copy and paste)

```
I need you to perform a full audit of the GapLens (PainPoint AI) codebase. We are preparing to go to production and must ensure the app is secure—we do not want hackers to break the app or compromise user data. Security is the top priority, but we also want a holistic view of production readiness.

## Project Context

**GapLens** is an opportunity discovery engine that turns public complaints into product opportunities. Users validate ideas or run standard searches; the app mines Reddit, Hacker News, Amazon, G2, YouTube, and Facebook for real pain points.

**Stack:** Next.js 15 frontend, FastAPI backend, PostgreSQL, PostHog analytics, Sentry error tracking, deployed on Render.

**Key docs to read first:**
- `docs/HANDOFF_OVERVIEW.md` — deployment, recent work, key file paths
- `docs/ARCHITECTURE.md` — data flow, Validate/Discover flows
- `docs/AUDIT_REPORT.md` — previous audit (March 2026) and what was done/deferred
- `README.md` — setup, env vars, API endpoints

## Audit Scope

Please conduct a thorough audit across these areas. For each, identify issues, risks, and actionable recommendations (prioritized: critical / high / medium / low). **Security must be the most detailed section.**

### 1. Security (Primary Focus — Production Hardening)

We must ensure no attacker can compromise the app. Audit for:

- **Authentication & Authorization**
  - Is there any auth? If not, what are the risks for a public app?
  - Workspace isolation: can one user access another's data?
  - API endpoints: are any protected? Should they be?

- **Secrets & API Keys**
  - Where are API keys stored? (OpenAI, Reddit, G2, YouTube, etc.)
  - Are they ever logged, exposed in responses, or committed?
  - Frontend: are any secrets in client-side code or env vars?
  - Backend: env loading, validation, failure modes

- **Input Validation & Injection**
  - SQL injection (raw queries, ORM usage)
  - XSS (user-generated content, HTML rendering)
  - Command injection (subprocess, shell)
  - NoSQL or other injection vectors
  - Query/idea length limits, sanitization

- **CORS & Origin Validation**
  - Allowed origins in production vs development
  - Credential handling, preflight behavior

- **Rate Limiting & Abuse**
  - Can attackers spam expensive endpoints (e.g., search, validate)?
  - Cost implications (OpenAI calls per request)
  - DDoS or brute-force resistance

- **Sensitive Data Exposure**
  - Error messages: do they leak stack traces, paths, or internal details?
  - Logs: are PII, API keys, or tokens ever logged?
  - Response bodies: do they expose internal IDs, debug info?

- **OWASP Top 10**
  - Brief pass over Broken Access Control, Cryptographic Failures, Injection, Insecure Design, Security Misconfiguration, Vulnerable Components (dependencies)

- **Dependencies**
  - Known CVEs in Python/Node packages
  - Outdated or unmaintained packages

### 2. Code Quality & Architecture
- Component structure, duplication, and reuse
- State management (contexts, local state)
- API layer design and error handling
- Backend service organization and separation of concerns
- TypeScript usage (strictness, any types, missing types)
- Consistency of patterns across pages

### 3. Performance
- Frontend: bundle size, lazy loading, image optimization
- Backend: N+1 queries, connection pooling, async usage
- API response times and caching opportunities
- PostHog/Sentry overhead

### 4. Accessibility (a11y)
- Keyboard navigation and focus management
- ARIA usage, roles, labels
- Color contrast and responsive behavior
- Screen reader compatibility

### 5. Error Handling & Resilience
- User-facing error messages (no sensitive data leakage)
- Backend exception handling and logging
- Network failures, timeouts, retries
- Sentry integration and error boundaries

### 6. Testing
- Current test coverage (frontend and backend)
- Critical paths that need tests (especially auth, validation, API)
- E2E vs unit vs integration recommendations

### 7. Documentation & Maintainability
- README and setup accuracy
- Code comments and inline docs
- Architecture docs currency
- Onboarding clarity for new developers

### 8. Tech Debt & Deferred Items
- Items deferred from prior audit (rate limiting, test expansion)
- Inconsistencies (naming, styling, patterns)
- Dead code, unused dependencies
- Settings page (placeholder — implement or remove?)

### 9. UX & UI Consistency
- Design system adherence
- Responsive behavior
- Loading and empty states
- Dark/light mode parity

### 10. Deployment & DevOps
- Environment variable handling (secrets, defaults)
- Build and deploy configuration
- Health checks and monitoring
- Production vs development configuration

## Deliverables

Please produce:

1. **Executive Summary** — Top 5–10 findings (security first), overall health assessment, and go/no-go for production
2. **Security Deep Dive** — Dedicated section with every security finding, file references, and remediation steps
3. **Detailed Report** — Section-by-section findings with file references and line numbers where relevant
4. **Prioritized Remediation List** — Ordered by impact and effort (critical security issues first, then quick wins)
5. **Recommended Next Steps** — What must be fixed before production, and what can wait

Output the report as a markdown document suitable for `docs/AUDIT_REPORT_2026.md` (or similar). Be specific and actionable — avoid vague advice. For security findings, include: vulnerability type, affected file/line, exploit scenario (if applicable), and concrete fix.
```

---

## How to Use

1. Open a new chat with Claude (or your preferred AI assistant)
2. Copy the entire prompt from the code block above
3. Optionally attach or reference: `docs/HANDOFF_OVERVIEW.md`, `docs/ARCHITECTURE.md`, `docs/AUDIT_REPORT.md`
4. Paste and send
5. Claude will explore the codebase and produce the audit report
6. Save the output to `docs/AUDIT_REPORT_2026.md` (or your preferred filename)

---

## Tips

- **Scope:** If the audit is too large, ask Claude to focus on security first, then expand to other areas
- **Depth:** For a security-only pass, add: "Focus exclusively on the Security section; skip or briefly summarize other areas"
- **Format:** You can ask for the report in a different format (e.g., spreadsheet-friendly, Notion-ready)
- **Follow-up:** After receiving the report, you can ask: "Implement the critical security fixes from the audit report"
