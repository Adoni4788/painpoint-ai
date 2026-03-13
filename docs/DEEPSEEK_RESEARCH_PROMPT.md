# DeepSeek In-Depth Research Prompt: GapLens

**Instructions:** Use this prompt with DeepSeek (or similar AI) to conduct comprehensive, below-the-surface research on GapLens. The goal is to identify gaps, opportunities, risks, and strategic insights that go beyond surface-level analysis.

---

## COPY EVERYTHING BELOW THIS LINE INTO DEEPSEEK

---

You are conducting in-depth research on **GapLens**, an opportunity discovery engine for founders and product teams. Your research must go below the surface—analyze market dynamics, competitive positioning, technical feasibility, user psychology, and strategic gaps. Do not stop at obvious observations; dig into secondary sources, edge cases, and non-obvious implications.

---

## 1. WHAT IS GAPLENS?

**Product name:** GapLens (formerly PainPoint AI)

**Tagline:** "Turn public complaints into product opportunities"

**Core value proposition:** GapLens helps founders and product managers discover real pain points people are complaining about online—before they build. Instead of building first and hoping for traction, users "find the pain first, then build the solution."

**Product category:** Product discovery / market research / opportunity validation tool for B2B SaaS and product teams.

---

## 2. HOW IT WORKS (END-TO-END)

1. **Search** — User enters a keyword, niche, competitor name, or product category (e.g., "product discovery tool", "fitness tracking app", "Notion alternatives").

2. **Query expansion** — AI expands the query into 6–10 subtopic search queries and niche keywords to cover the full breadth of the niche.

3. **Collection** — Public posts are fetched from five sources: **Reddit**, **Hacker News**, **Amazon** (review discussions), **G2**, and **YouTube**.

4. **Complaint detection & relevance** — AI classifies each post: Is it a complaint? Is it relevant to the niche? (directly_relevant | somewhat_relevant | unrelated). Relevance filtering reduces false positives (e.g., posts about Gemini or Titanium when searching "product discovery tool").

5. **Clustering** — Similar complaints are grouped into thematic pain point clusters using embeddings and clustering (e.g., "Ineffective Search and Research Capabilities").

6. **Scoring** — Each cluster is scored (1–10) on:
   - **Relevance** — How well it matches the niche
   - **Frequency** — How common the problem is
   - **Emotion** — How frustrated users are
   - **Urgency** — How pressing the need is
   - **Opportunity** — Overall product opportunity (weighted composite)
   - **Authenticity** — How genuine the complaints are (promotional content is down-weighted)

7. **Reports** — Full opportunity reports with: problem summary, who has the problem, why it matters, suggested solution, product angle, top complaint examples, source distribution.

8. **PRD generation** — AI can generate a product requirements document draft from any cluster.

---

## 3. TARGET USERS

- **Primary:** Founders, indie hackers, product managers validating ideas
- **Secondary:** Product teams, market researchers, startup accelerators
- **Use case:** Pre-build validation—"Don't build until you're sure"

---

## 4. TECHNICAL ARCHITECTURE

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS, React 19
- **Backend:** FastAPI, Python 3.11+
- **Database:** PostgreSQL
- **AI:** OpenAI (gpt-4o-mini default) for expansion, complaint detection, relevance, clustering, scoring, summary, PRD
- **Deployment:** Render (backend, frontend, PostgreSQL)
- **Data sources:** Reddit (public JSON API), Hacker News (Algolia API), Amazon (scraping/reviews), G2, YouTube

**Key models:**
- **Workspace** — Groups searches by product/project (multi-product orgs)
- **Search** — Query, status, sources, summary (executive summary), workspace_id
- **PainCluster** — Label, summary, scores, complaint_count, who_has_problem, suggested_solution, product_angle
- **RawPost** — Individual posts with complaint_score, relevance, authenticity_score

---

## 5. CURRENT FEATURES (AS OF IMPLEMENTATION)

- Landing page with hero video, fixed header with scroll-based transparency
- **Discover** — Search, select sources (Reddit, HN, Amazon, G2, YouTube), run pipeline, view clusters
- **Reports** — Cross-search view of all clusters, filter by niche/score/date, compare two clusters, export markdown
- **Workspaces** — Create/rename/delete workspaces, associate searches, filter by workspace
- **Key insights** — Collapsible executive summary per search
- **Cluster list** — Top 5 by default, "Show all" to expand
- **Brand styling** — GapLens logo (Gap #4d7c7a, Lens #d97706), carved text effect, brand icons for data sources

---

## 6. KNOWN COMPETITOR

**ProblemFirst.io**
- **Input:** Subreddit URL only (e.g., reddit.com/r/startups)
- **Sources:** Reddit only
- **Model:** Subreddit-first (paste subreddit → get pain points)
- **Pricing:** Free tier (2 projects), Pro $29/mo
- **Positioning:** "Mine Reddit for painful problems"
- **GapLens differentiator:** Multi-source (Reddit + HN + Amazon + G2 + YouTube), topic/keyword-based search (not subreddit-bound), workspaces, PRD drafts, executive summary

---

## 7. OUT OF SCOPE (V2)

- **Support tickets** (Zendesk, Intercom) — Requires OAuth, new collectors, private data
- **Meeting transcripts** (Gong, etc.) — Same; separate "private data" pipeline
- These would need: new collector architecture, OAuth flows, per-user integrations, different schemas

---

## 8. KNOWN PAIN POINTS ADDRESSED (FROM USER RESEARCH)

1. **Relevance / false positives** — Addressed via stricter LLM prompts, niche_description, explicit "unrelated" rules
2. **Information overload** — Addressed via executive summary, top 5 clusters, collapsible UI
3. **Workspace management** — Addressed via Workspaces feature
4. **Idea validation** — Core use case; users want to validate before building

---

## 9. RESEARCH TASKS (GO DEEP)

Conduct research and provide analysis on the following. Do not give surface-level answers. Cite sources where possible. Identify non-obvious insights.

### A. Market & Positioning
- Who else is in the "pain point discovery" / "idea validation" / "product discovery" space? (Beyond ProblemFirst.io)
- What are the real alternatives founders use today? (Manual Reddit reading, surveys, customer interviews, etc.)
- Is there a clear category name for this? How do buyers search for it?
- What is the typical budget and buying process for tools like this?

### B. Competitive Gaps
- What can ProblemFirst.io do that GapLens cannot? What could GapLens learn?
- What can GapLens do that ProblemFirst cannot? How defensible is that?
- Are there other tools (e.g., SparkToro, Brandwatch, social listening) that overlap? Where are the boundaries?

### C. User & Behavioral
- What do founders actually do when validating ideas? (Step-by-step workflows)
- Where does GapLens fit in that workflow? What comes before and after?
- What would make someone pay for this vs. doing it manually?
- What are the failure modes? (e.g., users get overwhelmed, don't trust the data, can't act on it)

### D. Technical & Data
- What are the limitations of Reddit, HN, Amazon, G2, YouTube as data sources? (Rate limits, coverage gaps, bias)
- What other public data sources could add value? (Twitter/X, LinkedIn, Discord, forums, review sites)
- How accurate is AI-based complaint detection in practice? What are known failure modes?
- What about non-English markets?

### E. Product Gaps
- What features are users likely to ask for next? (Prioritize by impact and feasibility)
- What is the "validate this idea" flow? (User pastes an idea → GapLens checks if similar pains exist) — is this built? Should it be?
- What about subreddit-based search (like ProblemFirst) as an optional input?
- What about alerts / monitoring when new pain points emerge in a saved niche?

### F. Go-to-Market & Monetization
- What pricing models work for tools like this? (Freemium, usage-based, seat-based)
- Who is the ideal first customer? (Indie hacker vs. PM at 50-person company vs. enterprise)
- What channels would reach them? (Product Hunt, Twitter, HN, communities)
- What would a compelling case study look like?

### G. Risks & Edge Cases
- Legal: scraping ToS, data usage, trademark in "GapLens"
- Ethical: using public complaints for commercial gain
- Technical: OpenAI dependency, cost at scale, cold starts on free-tier hosting
- Product: what if a search returns nothing? What if it returns too much noise?

### H. Strategic Ambiguities
- Is GapLens a "research tool" or a "validation tool" or something else?
- Should it integrate with other tools (Notion, Jira, ProductBoard) or stay standalone?
- What is the one metric that matters for product-market fit?

---

## 10. OUTPUT FORMAT

Structure your research as:

1. **Executive summary** (2–3 paragraphs)
2. **Detailed findings** (by section A–H above)
3. **Prioritized recommendations** (top 5–10 actions, with rationale)
4. **Open questions** (what we still don't know and how to find out)
5. **Sources & references** (where you found information)

---

## 11. CONSTRAINTS

- Assume GapLens is a small team or solo founder; recommendations should be feasible
- Assume current tech stack (Next.js, FastAPI, PostgreSQL, OpenAI) unless there is a strong reason to change
- Be specific; avoid generic advice like "improve UX" without concrete direction
- If you cannot find information, say so explicitly rather than guessing

---

End of prompt. Conduct the research and provide your analysis.
