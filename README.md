# GapLens (PainPoint AI)

**Opportunity Discovery Engine** — Turn public complaints into product opportunities.

GapLens (product name; codebase alias PainPoint AI) collects public discussions from Reddit, Hacker News, Amazon, G2, and YouTube, detects complaints and frustrations using AI, groups them into pain point clusters, scores each cluster by opportunity value, and generates actionable reports and PRD drafts.

See [docs/HANDOFF_OVERVIEW.md](docs/HANDOFF_OVERVIEW.md) for deployment context and recent work.

## Architecture

```
frontend/          → Next.js 15 + TypeScript + Tailwind CSS
backend/           → FastAPI + SQLAlchemy + PostgreSQL
  app/
    api/           → REST endpoints
    core/          → Config, database
    models/        → SQLAlchemy models
    schemas/       → Pydantic schemas
    services/
      collectors/  → Reddit, HN, Amazon data collectors
      ai_service   → OpenAI-powered complaint detection, clustering, scoring, PRD generation
      pipeline     → Orchestrates the full analysis pipeline
```

## Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 15+ (or use Docker)
- OpenAI API key

## Setup

### 1. Database

```bash
# Option A: Local PostgreSQL
createdb painpoint

# Option B: Docker
docker run -d --name painpoint-db -e POSTGRES_DB=painpoint -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
```

### 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

pip install -r requirements.txt

# Copy and edit environment variables
copy .env.example .env       # Windows
# cp .env.example .env       # Mac/Linux

# Edit .env with your OpenAI API key and database URL

# Start the server
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (e.g. `postgresql+asyncpg://...`) | Yes |
| `OPENAI_API_KEY` | OpenAI API key for AI analysis | Yes (validated at startup) |
| `OPENAI_MODEL` | Model to use (default: gpt-4o-mini) | No |
| `REDDIT_CLIENT_ID` | Reddit API client ID | No (uses public JSON API) |
| `REDDIT_CLIENT_SECRET` | Reddit API client secret | No |
| `CORS_ORIGINS` | Comma-separated allowed origins. Production: include `https://painpoint-ai-frontend.onrender.com` | No (default: http://localhost:3000) |

### Frontend (`frontend/.env.local`)

| Variable | Description | Required |
|---|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog project API key | No |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog host (default: https://app.posthog.com) | No |
| `NEXT_PUBLIC_API_URL` | Backend URL (for production; dev uses rewrites) | No |

## How It Works

1. **Search** — Enter a keyword, niche, competitor, or product category
2. **Collect** — Public posts are fetched from Reddit, Hacker News, and Amazon review discussions
3. **Detect** — AI classifies each post as a complaint or not, with a confidence score
4. **Cluster** — Similar complaints are grouped into thematic pain point clusters
5. **Score** — Each cluster is scored on frequency, emotional intensity, urgency, and overall opportunity
6. **Report** — View full opportunity reports with source distribution, example complaints, and solution suggestions
7. **PRD** — Generate a product requirements document draft from any pain point cluster

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/validate-minimal` | Validate an idea (idea → keywords → pipeline) |
| POST | `/api/searches` | Start a new search |
| GET | `/api/searches` | List all searches |
| GET | `/api/searches/{id}` | Get search status |
| GET | `/api/searches/{id}/clusters` | Get clusters for a search |
| GET | `/api/clusters` | List all clusters (optionally by workspace) |
| GET | `/api/clusters/{id}` | Get single cluster |
| GET | `/api/clusters/{id}/report` | Get full opportunity report |
| POST | `/api/clusters/{id}/prd` | Generate PRD draft |
| DELETE | `/api/searches/{id}` | Delete a search |

## Adding New Data Sources

Create a new collector in `backend/app/services/collectors/`:

```python
from .base import BaseCollector, CollectedPost

class NewSourceCollector(BaseCollector):
    async def collect(self, query: str, limit: int = 100) -> list[CollectedPost]:
        # Fetch and return posts
        pass
```

Register it in `backend/app/services/pipeline.py` in the `COLLECTOR_MAP`.

## Experiment Scripts

See [scripts/README.md](scripts/README.md) for running cost-per-search experiments (50 test searches, log parsing).

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for deploying to Render (backend, frontend, PostgreSQL).

For recent UI and workflow context, also review [docs/HANDOFF_OVERVIEW.md](docs/HANDOFF_OVERVIEW.md).
