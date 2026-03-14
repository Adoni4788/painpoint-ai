# Experiment 2: Validate Flow Analytics

PostHog analytics for comparing Validate vs standard Discover engagement.

## Setup

1. Sign up at [posthog.com](https://posthog.com) (free tier: 1M events/month).
2. Get your **Project API Key** from PostHog dashboard.
3. Add to `frontend/.env.local`:

```
NEXT_PUBLIC_POSTHOG_KEY=phc_your_project_api_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

4. Rebuild and deploy the frontend.

## Events Tracked

### Validate flow

| Event | When | Properties |
|-------|------|------------|
| `validate_page_view` | User lands on `/validate` | — |
| `validate_idea_submitted` | User submits an idea | `idea_length` |
| `validate_redirect_to_discover` | After successful API response, before redirect | `search_id` |
| `validate_results_viewed` | User lands on Discover with results from validate | `search_id`, `has_clusters` |
| `validate_report_opened` | User clicks a cluster (from validate flow) | `cluster_label` |
| `validate_prd_generated` | User generates PRD (from validate flow) | `cluster_label` |

### Standard Discover flow

| Event | When | Properties |
|-------|------|------------|
| `discover_page_view` | User lands on `/discover` without `search_id` | — |
| `standard_search_submitted` | User submits search from Discover bar | `query_length`, `sources` |
| `discover_results_viewed` | Results load | `source`, `search_id`, `cluster_count` |
| `discover_cluster_clicked` | User clicks a cluster | `cluster_label`, `opportunity_score`, `source` |
| `discover_report_opened` | User opens report (from standard flow) | `cluster_label` |
| `discover_prd_generated` | User generates PRD (from standard flow) | `cluster_label` |

### Page views

PostHog also captures `$pageview` for all route changes.

## PostHog Insights to Create

1. **Validate vs standard volume**: Compare `validate_idea_submitted` vs `standard_search_submitted`.
2. **Conversion**: `validate_redirect_to_discover` → `validate_results_viewed` (did they see results?).
3. **Engagement**: Cluster clicks per session for validate vs standard (`discover_cluster_clicked` with `source`).
4. **PRD usage**: `validate_prd_generated` vs `discover_prd_generated`.

## Decision Criteria

- If validate engagement (cluster clicks, time on page) is **lower** than standard → reconsider the feature.
- If validate engagement is **higher** → success.
- Cost per validate search is already known to be low (~$0.0007).
