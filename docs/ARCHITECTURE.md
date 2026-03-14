# GapLens Architecture

## Overview

GapLens is a full-stack opportunity discovery engine. The frontend (Next.js) talks to the backend (FastAPI) via API rewrites; the backend orchestrates data collection, AI analysis, and persistence.

## High-Level Data Flow

```mermaid
flowchart TB
    subgraph User
        Validate[Validate Page]
        Discover[Discover Page]
        Reports[Reports Page]
    end

    subgraph Frontend["Frontend (Next.js 15)"]
        AppShell[AppShell]
        API_Rewrites[API Rewrites /api → backend]
    end

    subgraph Backend["Backend (FastAPI)"]
        Routes[API Routes]
        Pipeline[Search Pipeline]
        AI[AI Service]
        DB[(PostgreSQL)]
    end

    subgraph Collectors["Data Collectors"]
        Reddit[Reddit]
        HN[Hacker News]
        Amazon[Amazon]
        G2[G2]
        YT[YouTube]
    end

    Validate --> API_Rewrites
    Discover --> API_Rewrites
    Reports --> API_Rewrites
    API_Rewrites --> Routes

    Routes --> Pipeline
    Routes --> DB
    Pipeline --> AI
    Pipeline --> Reddit
    Pipeline --> HN
    Pipeline --> Amazon
    Pipeline --> G2
    Pipeline --> YT
    Pipeline --> DB
```

## Validate Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant AI
    participant Pipeline

    User->>Frontend: Enter idea
    Frontend->>Backend: POST /api/validate-minimal
    Backend->>AI: Extract 3 keywords
    AI-->>Backend: keywords
    Backend->>Backend: Create Search, start pipeline
    Backend-->>Frontend: SearchResponse (id, status=pending)
    Frontend->>User: Show modal, redirect to Discover
    Frontend->>Backend: GET /api/searches/{id} (poll)
    Backend->>Pipeline: Run pipeline (collect, cluster, score)
    Pipeline-->>Backend: completed
    Backend-->>Frontend: status=completed
    Frontend->>User: Show clusters
```

## Discover Flow

1. User enters query (or arrives from Validate with `search_id`).
2. Frontend calls `POST /api/searches` or uses existing search.
3. Backend creates `Search` record, starts pipeline in background.
4. Frontend polls `GET /api/searches/{id}` until `status=completed` or `failed`.
5. On completion, frontend fetches `GET /api/searches/{id}/clusters`.
6. User selects cluster → `GET /api/clusters/{id}/report`.
7. Optional: `POST /api/clusters/{id}/prd` for PRD draft.

## Key Directories

| Path | Purpose |
|------|---------|
| `frontend/src/app/` | Next.js app router pages |
| `frontend/src/components/` | Shared UI components |
| `frontend/src/lib/` | API client, utils, analytics |
| `frontend/src/contexts/` | Workspace, theme, refresh state |
| `backend/app/api/` | FastAPI routes |
| `backend/app/core/` | Config, database |
| `backend/app/services/` | Pipeline, AI, collectors |
| `backend/app/models/` | SQLAlchemy models |

## Shared Utilities (Post-Audit)

- `frontend/src/lib/scoreUtils.ts` — Score/authenticity color helpers
- `frontend/src/lib/sources.ts` — Unified source config (SearchBar, landing)
- `frontend/src/components/RotatingTips.tsx` — Rotating tips (Validate, Reports)
- `frontend/src/components/AuthenticityBadge.tsx` — Authenticity display
- `frontend/src/components/FocusTrap.tsx` — Modal focus trap

## Storage Keys

All localStorage keys use `gaplens-*` prefix:

- `gaplens-theme` — Light/dark theme
- `gaplens-active-workspace-id` — Active workspace
