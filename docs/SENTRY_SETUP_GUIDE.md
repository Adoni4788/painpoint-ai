# Sentry Setup Guide – Step by Step

You’ve created your Sentry account. Follow these steps to set up error monitoring for GapLens.

---

## Step 1: Create Your First Project (Frontend)

1. Log in at **[sentry.io](https://sentry.io)**.
2. If you see a welcome screen, click **Create Project** or **Get Started**.
3. Choose a platform:
   - Select **Next.js** (under JavaScript).
4. Name the project:
   - Example: `gaplens-frontend` or `painpoint-frontend`.
5. Choose your **Alert frequency** (e.g. “On every new issue”).
6. Click **Create Project**.

---

## Step 2: Get the Frontend DSN

1. After the project is created, you’ll see a **Configure** page.
2. Find the **DSN** (Data Source Name). It looks like:
   ```
   https://abc123@o123456.ingest.sentry.io/7890123
   ```
3. Copy this DSN.
4. Add it to your environment:
   - **Render (frontend):** Environment → `NEXT_PUBLIC_SENTRY_DSN` = paste the DSN.
   - **Local:** Add to `frontend/.env.local`:
     ```
     NEXT_PUBLIC_SENTRY_DSN=https://your-dsn-here@o123456.ingest.sentry.io/7890123
     ```

---

## Step 3: Create the Second Project (Backend)

1. In Sentry, click the **Sentry** logo (top left) to go to the dashboard.
2. Click **Projects** in the left sidebar.
3. Click **Create Project** (top right).
4. Choose **Python**.
5. Choose **FastAPI**.
6. Name the project:
   - Example: `gaplens-backend` or `painpoint-backend`.
7. Click **Create Project**.

---

## Step 4: Get the Backend DSN

1. On the new project’s **Configure** page, find the **DSN**.
2. Copy it.
3. Add it to your environment:
   - **Render (backend):** Environment → `SENTRY_DSN` = paste the DSN.
   - **Local:** Add to `backend/.env`:
     ```
     SENTRY_DSN=https://your-backend-dsn@o123456.ingest.sentry.io/7890124
     ```

---

## Step 5: Optional – Source Map Upload (Frontend)

To see readable stack traces instead of minified code:

1. In Sentry, go to **Settings** (gear icon) → **Projects** → select your frontend project.
2. Go to **Client Keys (DSN)** and confirm your DSN is there.
3. For source maps, you need an **Auth Token**:
   - Go to **Settings** → **Account** → **API** → **Auth Tokens**.
   - Click **Create New Token**.
   - Name it (e.g. `gaplens-sourcemaps`).
   - Enable **project:releases** and **org:read**.
   - Create the token and copy it.
4. Add to Render (frontend service):
   - `SENTRY_AUTH_TOKEN` = your token
   - `SENTRY_ORG` = your org slug (e.g. from the URL: `sentry.io/organizations/your-org/`)
   - `SENTRY_PROJECT` = your frontend project slug (e.g. `gaplens-frontend`)

You can skip this for now and add it later if you want better stack traces.

---

## Step 6: Redeploy

1. **Render:** Trigger a new deploy for both frontend and backend (or push a commit).
2. Wait for the deploys to finish.

---

## Step 7: Test That It Works

### Frontend

1. Open your live site.
2. Open DevTools → Console.
3. Run: `throw new Error("Sentry frontend test")`
4. Within a few seconds, the error should appear in Sentry under your frontend project.

### Backend

1. Temporarily add a failing route (e.g. `raise Exception("Sentry backend test")`) and hit it.
2. Or wait for a real error to occur.
3. Check your backend project in Sentry for the new issue.

---

## Step 8: Configure Alerts (Optional)

1. In Sentry, open your project.
2. Go to **Alerts** → **Create Alert**.
3. Choose **Issues** → **When a new issue is created**.
4. Add your email (or Slack) as the destination.
5. Save.

---

## Quick Reference

| Where        | Variable                  | Value                          |
|-------------|---------------------------|--------------------------------|
| Render (FE) | `NEXT_PUBLIC_SENTRY_DSN`  | Frontend project DSN           |
| Render (BE) | `SENTRY_DSN`             | Backend project DSN            |
| Local FE    | `frontend/.env.local`    | `NEXT_PUBLIC_SENTRY_DSN=...`   |
| Local BE    | `backend/.env`          | `SENTRY_DSN=...`               |

---

## Troubleshooting

- **No events in Sentry:** Confirm the DSN is correct and the app has been redeployed after adding it.
- **Frontend not sending:** Ensure the variable starts with `NEXT_PUBLIC_` so it’s available in the browser.
- **Backend not sending:** Ensure `SENTRY_DSN` is set in the backend environment (Render or `.env`).
