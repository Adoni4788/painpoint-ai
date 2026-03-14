# Sentry Not Receiving Events – Debug Checklist

If the "Sentry test" error doesn't appear in Sentry, work through this list.

---

## 0. Quick check: Is the DSN in the build?

Visit **https://your-frontend-url.onrender.com/debug-sentry** (e.g. `https://painpoint-ai-frontend.onrender.com/debug-sentry`).

- `sentryConfigured: true` → DSN is set; if events still don't appear, try Incognito (ad blocker) or check Network for `ingest.sentry.io`.
- `sentryConfigured: false` → DSN is missing; add `NEXT_PUBLIC_SENTRY_DSN` to Render frontend env and redeploy.

---

## 1. Confirm the env var is on the FRONTEND service

On Render, you have two services: **frontend** and **backend**.

- `NEXT_PUBLIC_SENTRY_DSN` must be set on the **frontend** service.
- `SENTRY_DSN` is for the **backend** service.

If `NEXT_PUBLIC_SENTRY_DSN` is only on the backend, the frontend will never send events.

---

## 2. Redeploy after adding the env var

`NEXT_PUBLIC_*` variables are inlined at **build time**. If you added the variable after the last deploy:

1. Go to Render → your **frontend** service.
2. Click **Manual Deploy** → **Deploy latest commit** (or push a new commit).
3. Wait for the build to finish.

---

## 3. Check for ad blockers

Ad blockers often block requests to `ingest.sentry.io`.

- Open your site in an **Incognito/Private** window (extensions are usually disabled).
- Or disable your ad blocker for the site.
- Run `throw new Error("Sentry test")` again in the Console.

---

## 4. Check the Network tab

1. Open DevTools → **Network** tab.
2. Clear the list (trash icon).
3. Run `throw new Error("Sentry test")` in the Console.
4. In the Network filter, type `sentry` or `ingest`.

**If you see a request to `ingest.sentry.io` or `ingest.us.sentry.io`:**
- Status 200 → Sentry received it; check the Issues list again (can take 30–60 seconds).
- Status 4xx/5xx → DSN or project config may be wrong.

**If you see no request:**
- Sentry is not sending (DSN missing, disabled, or blocked).
- Or the DSN was not available at build time → redeploy.

---

## 5. Verify the DSN

1. In Sentry, open your **gaplens-frontend** project.
2. Go to **Settings** → **Client Keys (DSN)**.
3. Copy the DSN.
4. In Render → frontend service → **Environment**, confirm `NEXT_PUBLIC_SENTRY_DSN` matches exactly (no extra spaces or quotes).

---

## 6. Quick local test

If you run the app locally:

1. Ensure `NEXT_PUBLIC_SENTRY_DSN` is in `frontend/.env.local`.
2. Run `npm run dev` and open the app.
3. Open the Console and run `throw new Error("Sentry test")`.
4. Check Sentry again.

If it works locally but not on Render, the issue is likely on Render (env var or redeploy).
