# GapLens Round 2 Synthesis: Validated Path Forward

After stress-testing the initial recommendations, a clearer picture emerges. The highest-impact features are still promising, but they come with significant risks and unknowns. The prudent path is **not to build features yet**, but to run a series of low-cost experiments that answer the critical open questions. This document synthesizes the findings from the stress-test and provides a concrete implementation checklist for the next phase.

---

## What the Stress-Test Revealed

1. **"Validate This Idea" flow**
   - *Risks:* Cannibalization of existing search, high multi-query costs, generic keyword extraction leading to poor results.
   - *Mitigation:* Start with a minimal wrapper (single combined search) before committing to full aggregation.

2. **Usage-based budgeting**
   - *Risks:* Premature optimization, development overhead.
   - *Mitigation:* First measure actual cost per search; only if it threatens margins should we build controls.

3. **"Next Steps" per cluster**
   - *Risks:* Added cognitive load, low perceived value.
   - *Mitigation:* A/B test an expandable section with a simple feedback mechanism.

4. **Product Hunt launch with "killed ideas" case study**
   - *Risks:* Noisy platform, message may not resonate.
   - *Mitigation:* Test the narrative on owned channels (Twitter, blog) before investing in a launch.

5. **"Watch this niche" alerts**
   - *Risks:* Low user retention, empty digests, ongoing infrastructure cost.
   - *Mitigation:* Gauge demand with a one-time email opt-in after a search.

The stress-test also provided concrete methods to answer the open questions about accuracy, cost, user behavior, and API demand.

---

## Updated Plan: Run Experiments First

Instead of building any of the recommended features now, we will run a series of lightweight experiments in a specific order. Each experiment has a clear decision gate that will determine whether we proceed, pivot, or drop the idea.

### Recommended Sequence

1. **Measure cost per search** (1–2 days) — Fastest, no product changes. If cost > $0.50/search, budgeting becomes urgent; if < $0.10, it can wait.

2. **Minimal "Validate This Idea" wrapper** (3–5 days) — Idea → AI extracts 3 keywords → single combined search (Option B: feed into existing pipeline). Compare engagement and cost against standard search.

3. **Instrument user behavior tracking** (2 days to implement, 2 weeks to collect data) — Funnel analysis: where do users drop off after seeing clusters?

4. **Measure F1 accuracy of complaint detection** (3 days, optional) — Only needed if we lack trust in the AI or want to use accuracy in marketing.

5. **Test "Next Steps" with an A/B test** (1 week) — Expandable section with feedback button.

6. **Test "Watch this niche" with a one-time email** (1 week) — Opt-in checkbox, send a single email after 7 days.

7. **Test "killed ideas" messaging** (1 week) — Blog post / Twitter thread with UTM tracking.

---

## Implementation Checklist

### Experiment 1: Cost per Search

| Step | Description | Owner | Done |
|------|-------------|-------|------|
| 1.1 | Add logging to every OpenAI API call: model, input tokens, output tokens, endpoint. | Backend | ☐ |
| 1.2 | For a sample of 50 real searches, aggregate token usage and calculate cost using current OpenAI pricing. | Data | ☐ |
| 1.3 | Break down cost by component: query expansion, complaint detection, relevance scoring, clustering, summary. | Data | ☐ |
| 1.4 | Compute average cost per search and per cluster. | Data | ☐ |
| 1.5 | **Decision:** If cost < $0.10/search → budgeting not urgent. If cost > $0.50/search → prioritize usage controls. | PM | ☐ |

### Experiment 2: Minimal "Validate This Idea" Wrapper (Option B)

| Step | Description | Owner | Done |
|------|-------------|-------|------|
| 2.1 | Create a new page `/validate` with a textarea for idea input and a submit button. | Frontend | ☐ |
| 2.2 | On submit, call a new backend endpoint `/api/validate-minimal`. | Backend | ☐ |
| 2.3 | Backend: Use an AI prompt to extract 3 keywords from the idea. | Backend | ☐ |
| 2.4 | Form combined query `"keyword1 OR keyword2 OR keyword3"` and feed into existing pipeline. | Backend | ☐ |
| 2.5 | Return the same cluster list as a standard search (no aggregation report yet). | Backend | ☐ |
| 2.6 | Track user engagement on this page: time on page, cluster clicks, etc. | Analytics | ☐ |
| 2.7 | Compare against a matched cohort of standard searches. | Data | ☐ |
| 2.8 | **Decision:** If cost > 2x standard search AND engagement not significantly higher, reconsider. | PM | ☐ |

### Experiments 3–7

See full synthesis for detailed checklists for user behavior tracking, F1 accuracy, Next Steps A/B test, Watch Niche email, and killed ideas messaging.

---

## Decision Gate for Full "Validate This Idea" Feature

Only proceed with building the full aggregated validation report if:

- [ ] Cost per search is within acceptable range (from Experiment 1).
- [ ] Minimal wrapper experiment shows engagement metrics at least comparable to standard search.
- [ ] Average cost per minimal validation is < $1.00.
- [ ] User behavior tracking indicates users are willing to click into clusters and explore.
- [ ] (Optional) F1 accuracy is above 0.75.
- [ ] The design accounts for the five failure modes: vague input, no matches, missed keywords, overwhelming results, misleading validation.

---

## Next Steps

1. Begin with **Experiment 1 (cost per search)** – it requires no product changes and provides immediate insight.
2. While Experiment 1 runs, implement the minimal "Validate This Idea" wrapper (Experiment 2).
3. After those two are complete, review results and decide whether to continue with the remaining experiments or adjust priorities.
