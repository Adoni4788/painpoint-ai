# Deploy PainPoint AI to Render — Paste This Into Claude Browser

Copy everything below the line and paste it into Claude at claude.ai.

---

## PASTE THIS:

I have a full-stack app called PainPoint AI that I need deployed to Render.com. The repo is already on GitHub at https://github.com/Adoni4788/painpoint-ai.git and it has a `render.yaml` Blueprint file at the root that defines all three services (PostgreSQL database, FastAPI backend, Next.js frontend).

Here's what I need you to do:

1. Go to https://dashboard.render.com and create a new **Blueprint** deployment from my GitHub repo `Adoni4788/painpoint-ai` on the `main` branch. The `render.yaml` file will auto-configure everything — the database, backend, and frontend services with all the correct settings, environment variables, and cross-service references.

2. The only value I need to manually provide during Blueprint setup is my **OpenAI API key** (marked as `sync: false` in the YAML, meaning Render will prompt me to enter it). My key is: [PASTE YOUR OPENAI KEY HERE]

3. After the Blueprint deploys all three services, verify:
   - The PostgreSQL database `painpoint-db` is created and shows **Available**
   - The backend `painpoint-ai-backend` is deployed — test by hitting the `/docs` endpoint
   - The frontend `painpoint-ai-frontend` is deployed and loads in the browser
   - The `CORS_ORIGINS` on the backend matches the frontend URL exactly (no trailing slash)
   - The `NEXT_PUBLIC_API_URL` on the frontend matches the backend URL exactly

4. If any service fails to deploy, check the build logs and fix the issue. Common problems:
   - Database URL: must use `postgresql+asyncpg://` (the app auto-converts this)
   - CORS: frontend URL must match exactly, no trailing slash, must be https
   - OpenAI key: must be valid and have credits
   - Python version: needs 3.11+

5. Once everything is live, do a full test: open the frontend URL, run a search for "password manager", and confirm that results come back with clustered pain points.

Give me the three live URLs when everything is deployed:
- Database internal URL
- Backend URL (https://painpoint-ai-backend.onrender.com or similar)
- Frontend URL (https://painpoint-ai-frontend.onrender.com or similar)
