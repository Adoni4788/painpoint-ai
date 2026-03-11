# Deploying PainPoint AI to Render

This guide walks through deploying the backend (FastAPI), frontend (Next.js), and PostgreSQL database on [Render](https://render.com).

## Architecture on Render

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Web Service    │     │  Web Service    │     │   PostgreSQL    │
│  (Frontend)     │────▶│  (Backend)      │────▶│   (Database)    │
│  Next.js       │     │  FastAPI        │     │   Managed       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Prerequisites

- [Render](https://render.com) account
- GitHub repository with your PainPoint AI code
- OpenAI API key
- (Optional) Reddit API credentials, G2 API key for additional sources

---

## Step 1: Create PostgreSQL Database

1. In Render Dashboard → **New** → **PostgreSQL**
2. Name: `painpoint-db`
3. Region: Choose closest to your users
4. Plan: Free (or paid for production)
5. Click **Create Database**
6. After creation, copy the **Internal Database URL** (use this for backend; it stays within Render’s network)

---

## Step 2: Deploy Backend (FastAPI)

1. **New** → **Web Service**
2. Connect your GitHub repo
3. Configure:
   - **Name:** `painpoint-ai-backend`
   - **Region:** Same as database
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

4. **Environment Variables** (Add in Render dashboard):

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | `postgresql+asyncpg://user:pass@host/db` (from Step 1; use **Internal** URL) |
   | `OPENAI_API_KEY` | Your OpenAI API key |
   | `OPENAI_MODEL` | `gpt-4o-mini` (optional) |
   | `CORS_ORIGINS` | `https://your-frontend.onrender.com` (update after Step 3) |
   | `REDDIT_CLIENT_ID` | (optional) |
   | `REDDIT_CLIENT_SECRET` | (optional) |
   | `G2_API_KEY` | (optional) |

5. **Important:** Render’s PostgreSQL uses `postgresql://` (sync). For asyncpg, use `postgresql+asyncpg://` in the URL.

6. Deploy. Note the backend URL (e.g. `https://painpoint-ai-backend.onrender.com`).

---

## Step 3: Deploy Frontend (Next.js)

1. **New** → **Web Service**
2. Connect the same GitHub repo
3. Configure:
   - **Name:** `painpoint-ai-frontend`
   - **Region:** Same as backend
   - **Branch:** `main`
   - **Root Directory:** `frontend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`

4. **Environment Variables**:

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_API_URL` | `https://painpoint-ai-backend.onrender.com` (your backend URL from Step 2) |

5. Deploy. Note the frontend URL (e.g. `https://painpoint-ai-frontend.onrender.com`).

---

## Step 4: Update CORS and Redeploy

1. In the **Backend** service, update `CORS_ORIGINS` to include your frontend URL:
   ```
   https://painpoint-ai-frontend.onrender.com
   ```
2. Trigger a redeploy of the backend.

---

## Step 5: Database Tables

The backend creates tables automatically on startup via SQLAlchemy `create_all`. No manual migrations are required.

---

## Environment Variable Reference

### Backend

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | `postgresql+asyncpg://...` from Render PostgreSQL |
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `OPENAI_MODEL` | No | Default: `gpt-4o-mini` |
| `CORS_ORIGINS` | Yes (prod) | Comma-separated frontend URLs |
| `REDDIT_CLIENT_ID` | No | For Reddit API |
| `REDDIT_CLIENT_SECRET` | No | For Reddit API |
| `G2_API_KEY` | No | For G2 reviews |

### Frontend

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes (prod) | Backend base URL, e.g. `https://painpoint-ai-backend.onrender.com` |

---

## Free Tier Notes

- **PostgreSQL:** Free tier spins down after 90 days of inactivity; data may be removed.
- **Web Services:** Free tier spins down after 15 min of inactivity; first request can take 30–60 seconds.
- For production, use paid plans for always-on services and persistent database.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS errors | Ensure `CORS_ORIGINS` includes the exact frontend URL (no trailing slash) |
| Database connection failed | Use **Internal** database URL; ensure `postgresql+asyncpg://` |
| Frontend 404 on /api/* | Verify `NEXT_PUBLIC_API_URL` is set at build time |
| Tables missing | Backend creates tables on startup; ensure `init_db` runs (it does by default) |
