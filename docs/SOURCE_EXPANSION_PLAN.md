# GapLens Source Expansion Plan

## 1. Current Source Ingestion Architecture

### Shared Interface

All collectors implement `BaseCollector` from `backend/app/services/collectors/base.py`:

```python
@dataclass
class CollectedPost:
    source: str
    title: Optional[str]
    text: str
    author: Optional[str] = None
    url: Optional[str] = None
    timestamp: Optional[datetime] = None

class BaseCollector(ABC):
    @abstractmethod
    async def collect(self, query: str, limit: int = 100) -> list[CollectedPost]:
        pass
```

**Key points:**
- Every collector returns `CollectedPost` objects with the same 6 fields.
- The pipeline normalizes all content into this shape before complaint detection.
- No source-specific logic exists downstream; the pipeline is source-agnostic.

### Current Collectors

| Source       | File                    | Approach                    | Notes                                                                 |
|-------------|-------------------------|-----------------------------|-----------------------------------------------------------------------|
| **Reddit**  | `collectors/reddit.py`  | Public JSON API (`/search.json`) | OAuth optional; uses User-Agent. Fetches posts + top comments.        |
| **Hacker News** | `collectors/hackernews.py` | Algolia API (public)       | Stories + comments. No auth. Clean text, strips HTML.                |
| **Amazon**  | `collectors/amazon.py`  | Proxy via Reddit search    | Amazon blocks direct scraping. Uses Reddit as proxy for review discussions. |

### Where Source-Specific Logic Lives

- **Ingestion:** Each collector maps its API/scrape response → `CollectedPost`.
- **Parsing/normalization:** Done inside each collector (e.g., HN strips HTML, Reddit combines title+selftext).
- **Downstream:** Pipeline uses `post.source` only for `source_breakdown` in clusters. No source-specific scoring.
- **Authenticity:** LLM-based; no explicit source weighting. `AUTHENTICITY_CAPS` by content type only.

### Integration Points

- `pipeline.py`: `COLLECTOR_MAP` maps source IDs to collector classes.
- `_collect_from_sources_expanded()`: Dispatches to collectors via `COLLECTOR_MAP`.
- `routes.py`: `valid_sources` whitelist.
- Frontend: `SearchBar.tsx` `SOURCE_OPTIONS` array.

---

## 2. Phased Rollout Plan

### Six Source Categories (Target State)

| # | Category | Signal Type |
|---|----------|-------------|
| 1 | Reddit | Community discussions, threads |
| 2 | Hacker News | Tech/startup discussions |
| 3 | Amazon Reviews | Consumer product reviews |
| 4 | Quora | Q&A, alternative-seeking, comparisons |
| 5 | G2/Capterra | B2B software reviews |
| 6 | App Store/Google Play Reviews | App feedback, short reviews |

### Recommended Order: **G2 → Quora → App Store/Google Play → Capterra**

*Rationale: Prioritize source diversity over similarity. G2 and Capterra are both B2B review platforms—adding them back-to-back would not broaden the insight pool. Quora delivers a distinctly different signal (Q&A, alternative-seeking) and accelerates diversity.*

### A. G2 (First)

| Factor | Assessment |
|--------|------------|
| **Why first** | Official G2 API exists; structured B2B reviews; high signal-to-noise. |
| **Value** | Strong B2B pain points, pros/cons, verified reviews. Complements Reddit/HN consumer focus. |
| **Difficulty** | Medium. G2 API requires registration. |
| **Noise** | Low. Reviews are structured; pros/cons are complaint-rich. |
| **Approach** | G2 API. |

### B. Quora (Second)

| Factor | Assessment |
|--------|------------|
| **Why second** | Different signal type—Q&A, alternative-seeking. Broadens insight pool faster than adding another review platform. |
| **Value** | Long-form answers, comparison discussions, “best alternative to X” threads. |
| **Difficulty** | Medium–High. No public API; scraping or third-party (e.g., Apify) needed. |
| **Noise** | Medium. SEO/affiliate answers; some promotional content. |
| **Approach** | Scraping or Apify. Quora blocks aggressive scraping. |

### C. App Store / Google Play (Third)

| Factor | Assessment |
|--------|------------|
| **Why third** | Another distinct signal—short app feedback. Useful for app/SaaS niches. |
| **Value** | Direct user feedback on apps; complements B2B and community sources. |
| **Difficulty** | High. Rate limits, IP blocking, need for proxies. |
| **Noise** | High. “Great app!”, “Fix this bug”, one-liners. |
| **Approach** | Apify, SerpApi, or `google-play-scraper` + proxy rotation. |

### D. Capterra (Fourth, or Part of G2/Capterra Category)

| Factor | Assessment |
|--------|------------|
| **Why later** | Same B2B review category as G2. Adding G2 first establishes the pattern; Capterra extends it. |
| **Value** | Additional B2B review volume; similar structure to G2 (pros/cons). |
| **Difficulty** | Medium. No official API; Apify/scraper. |
| **Noise** | Low. Same structured format as G2. |
| **Approach** | Apify actor or similar. Can be a separate collector or an extension to a unified `g2_capterra` collector. |

---

## 3. Source-Specific Ingestion Strategy

### G2 / Capterra

**Data to collect:**
- `title`: Product name or “Review of [Product]”
- `text`: Pros + cons + full review body (concatenated)
- `author`: Reviewer name (often anonymized)
- `url`: Review permalink
- `timestamp`: Review date
- **Extra metadata (optional):** star rating, pros/cons split, verified badge

**Differences from Reddit/HN:**
- Structured pros/cons; complaints often in “cons”.
- B2B context; more formal language.
- Shorter than Reddit threads; longer than app store reviews.

**Normalization:**
- Combine pros + cons + body into `text`.
- Preserve structure with simple separators, e.g. `[PROS] ... [CONS] ... [REVIEW] ...`.
- Truncate to 2000 chars to match existing collectors.

**Source-specific rules:**
- Treat “cons” section as high-complaint signal.
- Verified reviews: slight authenticity boost (e.g. +0.1 cap).

### Quora

**Data to collect:**
- `title`: Question text
- `text`: Answer body (or question + top answer)
- `author`: Answer author
- `url`: Answer permalink
- `timestamp`: Answer date

**Differences:**
- Q&A format; complaints in answers.
- Long-form; often comparison/alternative-seeking.
- Mix of genuine answers and SEO/affiliate content.

**Normalization:**
- Prefer answer body; prepend question if short.
- Strip Quora UI elements (e.g. “Related questions”).
- Truncate to 2000 chars.

**Source-specific rules:**
- Question-only posts: low complaint signal.
- Answers with “affiliate”, “sponsored”, “best X” lists: lower authenticity.
- “What’s wrong with X” / “alternatives to X” questions: high relevance.

### App Store / Google Play

**Data to collect:**
- `title`: App name
- `text`: Review body
- `author`: Reviewer (often “A Google user”)
- `url`: Review link (if available)
- `timestamp`: Review date
- **Extra:** star rating, app version

**Differences:**
- Very short (often &lt;100 chars).
- Repetitive (“Great app”, “Needs fix”).
- Many one-liners with little context.

**Normalization:**
- Use review body as `text`.
- Prepend app name as `title` for context.
- Minimum length: consider lowering from 20 to 15 chars for this source only.

**Source-specific rules:**
- Low star (1–2): boost complaint score.
- Very short (&lt;50 chars): lower authenticity.
- Repetitive phrases: deduplicate more aggressively.

---

## 4. Source-Specific Weighting Adjustments

### Authenticity Scoring

| Source | Adjustment | Rationale |
|--------|------------|-----------|
| **G2/Capterra** | +0.05 to +0.1 baseline | Structured B2B reviews; verified badge. |
| **Quora** | −0.05 for “best X” / list-style answers | Higher SEO/affiliate risk. |
| **App Store/Play** | −0.1 to −0.15 baseline | Short, generic, low-context. |

**Implementation:** Add `SOURCE_AUTHENTICITY_BIAS` in `pipeline.py`; apply after LLM score, before caps.

### Complaint Scoring

| Source | Adjustment | Rationale |
|--------|------------|-----------|
| **G2/Capterra** | Cons section = strong complaint signal | Explicit “cons” field. |
| **Quora** | “What’s wrong”, “alternatives” questions = relevance boost | Question intent. |
| **App Store/Play** | 1–2 star = +0.2 complaint score | Rating as complaint signal. |

**Implementation:** Pass `source` and optional metadata (e.g. `rating`, `has_cons`) to `detect_complaints_and_relevance`; adjust thresholds in prompt or post-processing.

### Relevance Scoring

- No major source-specific changes. Niche keywords and query expansion already drive relevance.
- Quora: Emphasize “alternative-seeking” and “comparison” in prompt for this source.

### Cluster Weighting

- **Source diversity bonus:** Clusters with 2+ sources get a small opportunity boost (e.g. +0.2).
- **G2/Capterra:** B2B clusters may get a slight boost for B2B product queries.
- Keep logic simple; avoid over-weighting by source.

---

## 5. Technical and Product Risks

### Scraping / API Restrictions

| Source | Risk | Mitigation |
|--------|------|------------|
| **Quora** | Blocks scraping; ToS against scraping | Use Apify or similar; respect rate limits; consider Quora Partner Program if available. |
| **G2** | API rate limit (100 req/s) | Throttle; batch requests. |
| **Capterra** | No official API | Apify/scraper; proxy rotation. |
| **App Store/Play** | Anti-bot, IP blocking | Apify, SerpApi, or proxy; 1–3s delays. |

### Rate Limits

- Add per-source rate limiting (e.g. `asyncio.Semaphore` per source).
- G2: 100 req/s is generous; HN/Reddit are more restrictive.
- App stores: Treat as most restrictive.

### Duplicate Content

- Quora answers can be syndicated to other sites.
- App store reviews often repeat (“Great app”).
- **Mitigation:** Improve `_deduplicate_posts` (e.g. fuzzy match, min edit distance); source-specific dedup for app stores.

### Noise and Low Quality

- **App Store/Play:** Highest noise; short, generic reviews.
- **Quora:** SEO/affiliate answers.
- **Mitigation:** Stricter min length for app stores; authenticity caps for Quora list-style content.

### Filtering Logic Changes

- Add optional `source` filter in relevance/authenticity logic.
- Consider excluding app store posts &lt;30 chars from clustering.

### Authenticity Pipeline Changes

- Add `SOURCE_AUTHENTICITY_BIAS` dict.
- Optionally pass `source` to LLM in `detect_complaints_and_relevance` for context.

---

## 6. Implementation Plan

### Phase 1: Infrastructure (Before Any New Source)

1. **Extend `CollectedPost` (optional)**  
   - Add optional `metadata: dict` for source-specific fields (rating, pros/cons, etc.).  
   - File: `collectors/base.py`

2. **Add source weighting config**  
   - File: `pipeline.py`  
   - Add `SOURCE_AUTHENTICITY_BIAS: dict[str, float]`  
   - Apply in pipeline after LLM authenticity score

3. **Improve deduplication**  
   - File: `pipeline.py`  
   - Add optional fuzzy dedup for app store (e.g. skip if Levenshtein &lt; 0.8 to existing)

### Phase 2: G2 Collector

1. **Create `collectors/g2.py`**  
   - Implement `G2Collector(BaseCollector)`  
   - Use G2 API (or Apify if API access is delayed)  
   - Map to `CollectedPost`; combine pros+cons+body

2. **Register in pipeline**  
   - `COLLECTOR_MAP["g2"] = G2Collector`  
   - `routes.py`: add `"g2"` to `valid_sources`  
   - Frontend: add G2 to `SOURCE_OPTIONS` (or "G2/Capterra" as category label)

3. **Config**  
   - `config.py`: `g2_api_key` (if using API)  
   - `.env.example`: document new var

4. **Test**  
   - Unit test: mock G2 response → `CollectedPost`  
   - Integration: run pipeline with `sources=["g2"]` for a known product

### Phase 3: Quora Collector

1. **Create `collectors/quora.py`**  
   - Use Apify Quora scraper or custom (with care)  
   - Extract question + top answers  
   - Normalize to `CollectedPost`

2. **Register**  
   - `COLLECTOR_MAP["quora"] = QuoraCollector`  
   - Update routes + frontend

3. **Authenticity**  
   - Add `quora: -0.05` to `SOURCE_AUTHENTICITY_BIAS` for list-style content (or handle in prompt)

4. **Test**  
   - Run pipeline with `sources=["quora"]`

### Phase 4: App Store / Google Play Collector

1. **Create `collectors/app_reviews.py`**  
   - Single collector supporting both stores  
   - Use Apify `app-store-reviews` + `google-play-scraper` or SerpApi  
   - Input: query → resolve to app IDs → fetch reviews  
   - Or: search by keyword → get app list → fetch reviews for top N apps

2. **Normalization**  
   - Short reviews; lower min length to 15 for this source  
   - Pass `rating` in metadata if available

3. **Register**  
   - `COLLECTOR_MAP["app_reviews"] = AppReviewsCollector`  
   - Frontend: single “App Store / Google Play” option

4. **Scoring**  
   - Add `SOURCE_AUTHENTICITY_BIAS["app_reviews"] = -0.1`  
   - In complaint detection, boost complaint score for 1–2 star (if metadata available)

5. **Dedup**  
   - Stronger dedup for app reviews (e.g. exact match on first 100 chars)

6. **Test**  
   - Run for a well-known app (e.g. “Slack”)

### Phase 5: Capterra Collector (or G2/Capterra Extension)

1. **Create `collectors/capterra.py`**  
   - Use Apify actor or similar  
   - Same normalization as G2 (pros+cons+body)  
   - Alternative: extend G2 collector into unified `g2_capterra` that queries both

2. **Register**  
   - `COLLECTOR_MAP["capterra"] = CapterraCollector`  
   - Update routes + frontend  
   - Frontend: can show as "G2/Capterra" category with both sub-sources, or single "G2/Capterra" option that runs both

3. **Test**  
   - Same pattern as G2

### Files to Change (Summary)

| File | Changes |
|------|---------|
| `collectors/base.py` | Optional `metadata` on `CollectedPost` |
| `collectors/__init__.py` | Export new collectors |
| `collectors/g2.py` | New |
| `collectors/capterra.py` | New |
| `collectors/quora.py` | New |
| `collectors/app_reviews.py` | New |
| `pipeline.py` | `COLLECTOR_MAP`, `SOURCE_AUTHENTICITY_BIAS`, dedup tweaks |
| `api/routes.py` | `valid_sources` |
| `schemas/search.py` | Default sources (optional) |
| `core/config.py` | New API keys if needed |
| `frontend/.../SearchBar.tsx` | `SOURCE_OPTIONS` |

### Verification After Each Source

1. Run pipeline with only the new source enabled.  
2. Check `total_posts_fetched` &gt; 0.  
3. Check clusters have entries in `source_breakdown` for the new source.  
4. Manually inspect a few `RawPost` rows for correctness.  
5. Compare opportunity scores with/without the new source for the same query.

---

## 7. Summary

### A. Recommended Source Rollout Order

1. **G2** (API available; structured B2B)  
2. **Quora** (different signal—Q&A, alternative-seeking; broadens diversity)  
3. **App Store / Google Play** (distinct app feedback signal)  
4. **Capterra** (extends B2B category; same pattern as G2)

### B. Six Source Categories (Final State)

- Reddit  
- Hacker News  
- Amazon Reviews  
- Quora  
- G2/Capterra  
- App Store/Google Play Reviews  

### C. Implementation Plan

- Phase 1: Infrastructure (weighting, dedup).  
- Phase 2: G2 collector.  
- Phase 3: Quora collector.  
- Phase 4: App Store/Google Play collector.  
- Phase 5: Capterra collector (or G2/Capterra extension).  

Each phase: new collector → register → config → test → verify.

### D. Risks to Watch

- Quora: ToS, blocking.  
- App stores: Rate limits, IP blocking, high noise.  
- G2/Capterra: API key management, rate limits.  
- All: Dedup and authenticity for new content styles.

### E. Best Next Source to Add First

**G2** — Official API, structured B2B reviews, low noise, and clear path to production. It extends coverage into B2B without changing the core pipeline. G2 and Capterra share the same B2B review category; Capterra can be added later as an extension.
