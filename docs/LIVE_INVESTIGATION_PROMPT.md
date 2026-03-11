# PainPoint AI — Live Deployment Investigation Prompt

**Give this prompt to Claude (or another AI) to investigate the live deployment issues.**

---

## Context

PainPoint AI is a full-stack app deployed on Render.com. ECO and CLIP have asked us to investigate issues affecting the live production site.

**Live URLs:**
- Frontend: https://painpoint-ai-frontend.onrender.com
- Backend: https://painpoint-ai-backend.onrender.com
- Backend API docs: https://painpoint-ai-backend.onrender.com/docs

**Repository:** https://github.com/Adoni4788/painpoint-ai

---

## Issues to Investigate

1. **Recent searches not showing in the sidebar**
   - Users expect to see their previous searches in the sidebar under "Recent Searches"
   - On the live site, this list appears empty or does not load
   - The sidebar loads searches via `GET /api/searches` (listSearches)

2. **Reports page shows "Failed to load clusters"**
   - When users navigate to the Reports page, they see "Failed to load clusters"
   - The Reports page fetches data via `GET /api/clusters` (listAllClusters)
   - This suggests the API call is failing (timeout, 5xx, CORS, or network error)

3. **Possible root causes**
   - Render free-tier cold starts (backend sleeps after ~15 min; first request can take 30–60 seconds)
   - Frontend request timeouts before backend wakes up
   - `NEXT_PUBLIC_API_URL` misconfigured or not set at build time
   - CORS mismatch between frontend and backend
   - Database empty or not connected
   - Backend or database service down

---

## What We Need You to Do

1. **Investigate the live deployment**
   - Test the frontend and backend URLs
   - Check API responses (e.g. `/api/searches`, `/api/clusters`)
   - Identify why recent searches and clusters fail to load

2. **Use the Render CLI when helpful**
   - You may connect with the Render CLI to inspect services, logs, and environment variables
   - Use it to verify backend status, view logs, and confirm configuration

3. **Recommend fixes**
   - Suggest code changes (e.g. retries, longer timeouts) if needed
   - Suggest Render dashboard or env var changes
   - Document any configuration issues found

---

## Technical Reference

- **Frontend:** Next.js 15, uses rewrites to proxy `/api/*` to the backend
- **Backend:** FastAPI, Python 3.11
- **Database:** PostgreSQL (Render-managed)
- **Key env vars:**
  - Frontend: `NEXT_PUBLIC_API_URL` → backend URL (must be set at build time)
  - Backend: `CORS_ORIGINS` → frontend URL, `DATABASE_URL` → from Render DB

- **Relevant files:**
  - `frontend/next.config.ts` — API rewrites
  - `frontend/src/lib/api.ts` — API client
  - `render.yaml` — Render Blueprint
  - `backend/app/api/routes.py` — API routes

---

## Render CLI

If you have access to the Render CLI, you can use it to:
- List services: `render services list`
- View logs: `render logs -s painpoint-ai-backend`
- Inspect environment variables and service status

---

*End of investigation prompt*
