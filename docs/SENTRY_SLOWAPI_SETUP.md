# Sentry & SlowAPI Setup

## Sentry (Error Monitoring)

### Frontend (`@sentry/nextjs`)

1. Install: `npm install @sentry/nextjs`
2. Add to `.env.local` and Render:
   ```
   NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
   ```
3. Optional: Create a Sentry project at [sentry.io](https://sentry.io), then add `SENTRY_ORG` and `SENTRY_PROJECT` for source map uploads.

### Backend (`sentry-sdk`)

1. Add to `backend/.env` and Render:
   ```
   SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
   ```
2. When empty, Sentry is disabled (no-op).

---

## SlowAPI (Rate Limiting)

### Backend

- Rate limit: 10 requests/minute per IP (configurable via `RATE_LIMIT` env).
- Protected endpoints: `POST /api/validate-minimal`, `POST /api/searches`, `POST /api/clusters/{id}/prd`.
- When exceeded: returns `429 Too Many Requests`.
- Uses `X-Forwarded-For` when behind a proxy (Render).

### Env

```
RATE_LIMIT=10/minute
```

---

## Testing

1. **Sentry Frontend**: Trigger an error (e.g. throw in a component) and check Sentry dashboard.
2. **Sentry Backend**: Trigger an unhandled exception (e.g. typo in route) and check Sentry.
3. **Rate Limiting**: Hit `/api/validate-minimal` or `/api/searches` 11+ times in a minute from the same IP; expect 429.
