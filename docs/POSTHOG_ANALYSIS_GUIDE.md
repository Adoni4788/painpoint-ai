# PostHog Analysis Guide for GapLens

Use this guide to analyze your PostHog data and inform product decisions.

---

## Events You're Tracking

| Event | When | Key Properties |
|-------|------|----------------|
| `validate_page_view` | User lands on Validate page | — |
| `validate_idea_submitted` | User submits an idea | `idea_length` |
| `pricing_feedback` | User answers pricing modal | `response` (yes/no/maybe/skipped), `search_id`, `idea_length` |
| `validate_redirect_to_discover` | User clicks Yes/No/Maybe and goes to Discover | `search_id` |
| `validate_results_viewed` | User arrives at Discover with a search_id (from Validate) | `search_id` |
| `discover_page_view` | User lands on Discover page | — |
| `discover_results_viewed` | Search completes, clusters shown | `search_id`, `cluster_count`, `source` (validate/standard) |
| `discover_cluster_clicked` | User clicks a cluster | `cluster_id`, `cluster_label`, `source` |
| `validate_report_opened` / `discover_report_opened` | User opens full report panel | `cluster_label` |
| `validate_prd_generated` / `discover_prd_generated` | User generates PRD | `cluster_label` |
| `standard_search_submitted` | User runs a search from Discover | `query_length`, `sources_count` |

---

## Step 1: Pricing Feedback

**Goal:** Should we build pricing?

1. In PostHog, go to **Insights** → **Trends**.
2. Create a trend for event `pricing_feedback`.
3. Add a **Breakdown** by property `response` (yes, no, maybe, skipped).
4. Look at the distribution:
   - **Yes + Maybe %** – If &gt;20–30%, consider building pricing.
   - **Skipped %** – High skip rate might mean the modal is friction; consider moving it or making it optional.
   - **No %** – Understand why; may need a different price point or value prop.

**Quick filter:** `$event.properties.response = 'yes'` to count only Yes responses.

---

## Step 2: Validate vs Discover Engagement

**Goal:** Is Validate worth keeping? Do Validate users engage more?

1. **Validate funnel:**
   - `validate_page_view` → `validate_idea_submitted` → `validate_redirect_to_discover` → `validate_results_viewed` → `discover_cluster_clicked`
   - Create a **Funnel** in PostHog with these steps.
   - Check drop-off at each step. Biggest drop-off = biggest opportunity.

2. **Compare engagement by source:**
   - For `discover_cluster_clicked`, add filter: `$event.properties.source = 'validate'` vs `source = 'standard'`.
   - Compare counts: Do Validate users click more clusters than standard Discover users?
   - Same for `validate_report_opened` vs `discover_report_opened` – which source opens more reports?

3. **Idea length vs engagement:**
   - For `validate_idea_submitted`, group by `idea_length` (e.g. &lt;50, 50–100, 100+ chars).
   - Do longer ideas lead to more `discover_cluster_clicked` or `validate_report_opened`?

---

## Step 3: Drop-off Points

**Goal:** Where do users leave?

1. **Validate flow:**
   - Funnel: `validate_page_view` → `validate_idea_submitted` → `validate_redirect_to_discover`
   - If many leave at `validate_idea_submitted` → `validate_redirect_to_discover`, they may be closing the modal without answering.
   - If many leave at `validate_page_view` → `validate_idea_submitted`, the form or value prop may need work.

2. **Discover flow:**
   - Funnel: `discover_page_view` → `discover_results_viewed` → `discover_cluster_clicked`
   - If `discover_results_viewed` is high but `discover_cluster_clicked` is low, clusters may not be compelling or the UI may be unclear.

3. **Session duration:**
   - Use **Session recordings** (if enabled) to see where users hesitate or leave.
   - Or use **Paths** to see common navigation flows after Validate vs Discover.

---

## Step 4: Decisions the Data Can Inform

| Finding | Possible Action |
|---------|-----------------|
| Yes + Maybe &gt;25% on pricing | Build pricing flow |
| High Skip rate on pricing modal | Move or soften the prompt; A/B test timing |
| Validate users click more clusters | Double down on Validate; improve onboarding |
| Validate users engage less | Revisit Validate value prop or flow |
| Big drop-off at idea submission | Simplify form; add examples or templates |
| Big drop-off at pricing modal | Consider removing or delaying the question |
| Low cluster clicks after results | Improve cluster cards; add previews or better CTAs |

---

## Quick Start in PostHog

1. Log in at [app.posthog.com](https://app.posthog.com).
2. Select your GapLens project.
3. **Insights** → **New insight** → **Trends** or **Funnels**.
4. Use the event names and properties above.

---

## Optional: Export for Deeper Analysis

If you need SQL or spreadsheet analysis:

- PostHog **Data Management** → **Export** (if available on your plan).
- Or use PostHog's **SQL** or **HogQL** in Insights for custom queries.

---

*This guide references events defined in `frontend/src/lib/analytics.ts` and used across Validate, Discover, and ReportPanel.*
