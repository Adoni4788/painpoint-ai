import json
import logging
from openai import AsyncOpenAI
from ..core.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()
client = AsyncOpenAI(api_key=settings.openai_api_key)
MODEL = settings.openai_model


def _log_openai_usage(endpoint: str, resp) -> None:
    """Log OpenAI token usage for Experiment 1 (cost per search)."""
    if resp.usage:
        inp = getattr(resp.usage, "input_tokens", None) or getattr(resp.usage, "prompt_tokens", 0)
        out = getattr(resp.usage, "output_tokens", None) or getattr(resp.usage, "completion_tokens", 0)
        logger.info(
            "OPENAI_USAGE endpoint=%s model=%s input_tokens=%s output_tokens=%s",
            endpoint, resp.model, inp, out,
        )


async def extract_keywords_from_idea(idea: str) -> list[str]:
    """
    Extract exactly 3 search keywords from a product idea.
    Used for Experiment 2 (minimal Validate flow).
    Returns keywords suitable for OR-query search.
    """
    prompt = f"""A user has this product idea: "{idea}"

Extract exactly 3 keywords or short phrases that would best surface real complaints,
frustrations, and pain points when searching Reddit, Hacker News, Amazon, G2, or YouTube.

Rules:
- Each keyword should be 1-4 words
- Choose terms people actually use when complaining (e.g. "email deliverability", "spam folder", "open rate")
- Avoid generic terms; be specific to the idea
- Return ONLY a JSON array of exactly 3 strings. No markdown, no explanation."""

    try:
        resp = await client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=200,
        )
        _log_openai_usage("extract_keywords_from_idea", resp)
        data = json.loads(_strip_json_fences(resp.choices[0].message.content))
        if isinstance(data, list) and len(data) >= 3:
            return [str(k).strip() for k in data[:3]]
        if isinstance(data, list):
            keywords = [str(k).strip() for k in data if k]
            fallback = idea.split() or [idea]
            while len(keywords) < 3:
                keywords.append(fallback[len(keywords) % len(fallback)])
            return keywords[:3]
        return [idea] * 3
    except Exception as e:
        logger.error(f"Keyword extraction error: {e}")
        words = idea.split()[:3]
        return words if len(words) >= 3 else [idea] * 3


def _strip_json_fences(content: str) -> str:
    content = content.strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[1] if "\n" in content else content[3:]
        if content.endswith("```"):
            content = content[:-3]
    return content.strip()


async def expand_query(query: str) -> dict:
    """
    Expand a user's niche query into subtopic search queries and a list of
    related keywords. This ensures data collection covers the full breadth
    of the niche rather than just the literal search string.

    Returns: {
        "subtopics": ["email deliverability problems", "email automation workflow issues", ...],
        "keywords": ["deliverability", "open rate", "spam", "segmentation", ...],
        "niche_description": "one-line description of the niche"
    }
    """
    prompt = f"""A user wants to discover pain points in the niche: "{query}"

Generate search queries and keywords to comprehensively cover this niche.

Return a JSON object with:
- "subtopics": array of 6-10 specific search queries that would surface complaints
  and frustrations in different areas of the "{query}" niche. Each should target a
  distinct problem area. Include the niche context in each query so they work as
  standalone search strings.
  Example for "email marketing software":
  [
    "email marketing deliverability problems spam",
    "email automation workflow frustrations",
    "email marketing segmentation limitations",
    "email campaign analytics reporting issues",
    "email template builder complaints",
    "email marketing pricing too expensive",
    "email marketing integration problems CRM",
    "email list management complaints"
  ]
- "keywords": array of 10-15 single terms or short phrases central to the niche,
  used later for relevance scoring
- "niche_description": one sentence describing what "{query}" refers to

Return ONLY valid JSON. No markdown, no explanation."""

    try:
        resp = await client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1500,
        )
        _log_openai_usage("expand_query", resp)
        data = json.loads(_strip_json_fences(resp.choices[0].message.content))
        if "subtopics" not in data or not data["subtopics"]:
            data["subtopics"] = [query]
        if "keywords" not in data:
            data["keywords"] = []
        if "niche_description" not in data:
            data["niche_description"] = query
        return data
    except Exception as e:
        logger.error(f"Query expansion error: {e}")
        return {
            "subtopics": [query],
            "keywords": query.split(),
            "niche_description": query,
        }


async def detect_complaints_and_relevance(
    query: str,
    texts: list[dict],
    niche_keywords: list[str] | None = None,
    niche_description: str | None = None,
) -> list[dict]:
    """
    Combined pass: for each text, determine if it's a complaint AND whether
    it's relevant to the search query. Uses expanded niche keywords and
    niche_description for more accurate relevance classification.

    Returns list of dicts with: index, is_complaint, complaint_score,
    relevance (directly_relevant | somewhat_relevant | unrelated), relevance_score
    """
    if not texts:
        return []

    keyword_context = ""
    if niche_keywords:
        keyword_context = f"\nKey terms in this niche: {', '.join(niche_keywords[:15])}"

    niche_context = ""
    if niche_description:
        niche_context = f"\nNiche context: {niche_description}"

    results = []
    batch_size = 15

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        numbered = "\n".join(
            f"[{j}] {item['text'][:600]}" for j, item in enumerate(batch)
        )

        prompt = f"""You are analyzing public posts for a user researching the niche: "{query}"{keyword_context}{niche_context}

For EACH numbered text below, determine:
1. Is it a complaint, frustration, pain point, or unmet need?
2. Is it RELEVANT to the niche "{query}"?
3. What TYPE of content is this?
4. How AUTHENTIC is the pain expressed?

A post is "directly_relevant" ONLY if it discusses a problem, frustration, or unmet need
that is specifically about {query} or closely related products/services/workflows in that space.
The complaint must be about something a {query} user would recognize as part of their domain.

A post is "somewhat_relevant" if it touches on the niche tangentially but the core
complaint is about something adjacent (e.g., a general marketing complaint when the niche
is specifically about email marketing software).

A post is "unrelated" if the complaint has nothing to do with {query} — even if it is
a genuine complaint about something else entirely. Be STRICT here.

CRITICAL — Mark as "unrelated" if the post is about a DIFFERENT product category, even when
it uses similar words (e.g., "search", "discovery"). Examples:
- For niche "product discovery tool": A complaint about Gemini's web search is UNRELATED
  (AI assistant, not product discovery software for PMs). A complaint about Titanium
  mobile framework is UNRELATED (different product category entirely).
- For niche "email marketing software": A complaint about Gmail search is UNRELATED
  (email client, not marketing tool).
- The post must be about the SAME category of product/service as "{query}". If it's
  about AI assistants, mobile frameworks, unrelated SaaS, etc., mark it unrelated.

Content types — classify each post as ONE of:
- "firsthand_complaint": the author personally experienced the problem and is expressing frustration
- "help_seeking": the author is asking for help solving a specific problem they face
- "workaround_discussion": the author shares workarounds or solutions they found for a real problem
- "comparison_post": the author is comparing tools/products, may mention pain points secondhand
- "promotional_content": affiliate links, product promotion, SEO content, or marketing disguised as advice
- "guide_article": educational/how-to content, tips articles, or polished blog-style posts

Authenticity scoring (0.0-1.0) — BE STRICT, err on the side of scoring LOW:
- 0.8-1.0 = raw firsthand pain, clearly personal experience, specific details about THEIR situation
  Example: "I spent 3 hours trying to get my emails out of spam, Mailchimp support was useless"
- 0.6-0.8 = genuine help-seeking or workaround sharing with personal context
  Example: "Has anyone found a way to improve open rates? Mine dropped to 8% after the last update"
- 0.3-0.5 = secondhand pain mentions, comparison posts discussing real trade-offs
  Example: "I switched from X to Y because X had poor automation, but Y's pricing is steep"
- 0.1-0.2 = polished guide content, promotional posts, SEO articles, affiliate content, "best tools" lists
  Example: "Ultimate Guide to Email Deliverability: 10 Tips to Boost Your Open Rate"
- 0.0 = pure marketing/spam with no real user pain

CRITICAL — these patterns MUST receive authenticity 0.2 or below:
- Posts with affiliate links or referral codes
- "Ultimate guide", "complete guide", "definitive guide" style titles
- "Best [tools/software/platforms] in [year]" or "Top 10" listicle format
- Polished, well-structured marketing content with CTAs ("Sign up", "Try free", "Use code")
- Content that reads like a blog post rather than a forum/social media post
- SEO-optimized content with keyword stuffing or unnatural keyword placement

COMMON MISTAKE: Do NOT give a post authenticity 0.5+ just because it mentions a real problem.
A promotional post about email deliverability tips still gets 0.1-0.2 even if deliverability IS
a real problem — what matters is whether THIS SPECIFIC AUTHOR is expressing genuine personal pain.

For each text return a JSON object:
- "index": the bracket number
- "is_complaint": true/false
- "complaint_score": 0.0-1.0 (how strongly this is a complaint)
- "relevance": "directly_relevant" | "somewhat_relevant" | "unrelated"
- "relevance_score": 0.0-1.0 (how related this is to "{query}")
- "content_type": one of the six types above
- "authenticity_score": 0.0-1.0 (how genuine the pain expression is)

Texts:
{numbered}

Return ONLY a valid JSON array. No markdown, no explanation."""

        try:
            resp = await client.chat.completions.create(
                model=MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=3000,
            )
            _log_openai_usage("detect_complaints_and_relevance", resp)
            batch_results = json.loads(_strip_json_fences(resp.choices[0].message.content))
            for item in batch_results:
                item["index"] = item["index"] + i
            results.extend(batch_results)
        except Exception as e:
            logger.error(f"Detection+relevance error: {e}")
            for j in range(len(batch)):
                results.append({
                    "index": i + j,
                    "is_complaint": False,
                    "complaint_score": 0.0,
                    "relevance": "unrelated",
                    "relevance_score": 0.0,
                })

    return results


async def generate_search_summary(query: str, cluster_labels_and_summaries: list[dict]) -> str:
    """
    Generate a 2-3 sentence executive summary of the key insights from a search.
    """
    if not cluster_labels_and_summaries:
        return ""

    items = "\n".join(
        f"- {c.get('label', 'Unknown')}: {c.get('summary', '')[:150]}"
        for c in cluster_labels_and_summaries[:8]
    )

    prompt = f"""A user researched the niche "{query}" and found these pain point clusters:

{items}

Write a 2-3 sentence executive summary that captures the key insights. Focus on the most
actionable opportunities and recurring themes. Be concise and specific to the niche.
Do NOT use bullet points or headers. Return ONLY the summary text."""

    try:
        resp = await client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=300,
        )
        _log_openai_usage("generate_search_summary", resp)
        return resp.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Search summary error: {e}")
        return ""


async def cluster_complaints(query: str, complaints: list[dict]) -> list[dict]:
    """
    Group complaints into niche-specific thematic clusters.
    The query is injected so the LLM produces cluster labels that
    are meaningful within the searched niche, not generic categories.
    """
    if not complaints:
        return []

    complaint_texts = "\n".join(
        f"[{i}] {c['text'][:400]}" for i, c in enumerate(complaints[:80])
    )

    prompt = f"""You are a product opportunity analyst specializing in the niche: "{query}"

Below are complaints and frustrations from real users, all related to "{query}".
Group them into 3-8 SPECIFIC pain point clusters.

CRITICAL RULES:
- Cluster labels MUST be specific to the "{query}" niche
- Do NOT use generic labels like "Software Issues", "Poor Customer Support", "Pricing Problems"
- DO use labels that someone in the {query} space would immediately recognize
- Example: for "email marketing software", good labels would be:
  "Email Deliverability Failures", "Poor Automation Workflow Design",
  "Weak Segmentation Capabilities", "Template Editor Limitations"
- Each cluster should represent a concrete, buildable product opportunity

Complaints:
{complaint_texts}

For each cluster provide:
- "label": niche-specific name (max 10 words, specific to {query})
- "summary": 2-3 sentences describing the specific problem within {query}
- "member_indices": array of complaint numbers belonging to this cluster
- "who_has_problem": who in the {query} space faces this (be specific)
- "why_it_matters": business impact specific to {query} users
- "suggested_solution": a concrete product/feature idea for this niche
- "product_angle": how a startup could build a business around this in the {query} space

Return ONLY a valid JSON array. No markdown, no explanation."""

    try:
        resp = await client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=4000,
        )
        _log_openai_usage("cluster_complaints", resp)
        return json.loads(_strip_json_fences(resp.choices[0].message.content))
    except Exception as e:
        logger.error(f"Clustering error: {e}")
        return [{
            "label": f"General {query} complaints",
            "summary": f"Various complaints about {query}",
            "member_indices": list(range(len(complaints))),
        }]


async def score_cluster(query: str, cluster_label: str, complaints_text: list[str], avg_authenticity: float = 0.5) -> dict:
    """
    Score a cluster on frequency, emotion, urgency, niche relevance,
    and overall opportunity — all contextualized to the search query.
    Authenticity context is provided so the LLM can factor in evidence quality.
    """
    joined = "\n".join(f"- {t[:250]}" for t in complaints_text[:20])

    auth_label = "high" if avg_authenticity >= 0.7 else "moderate" if avg_authenticity >= 0.4 else "low"

    prompt = f"""Score this pain point cluster as a product opportunity in the "{query}" niche.

Cluster: {cluster_label}
Niche: {query}
Evidence authenticity: {auth_label} ({avg_authenticity:.2f}/1.0) — this reflects whether the complaints
come from firsthand user experiences vs promotional/guide content. Low authenticity means the
evidence is weaker and the scores should be more conservative.

Sample complaints:
{joined}

Score each dimension from 1.0 to 10.0:
- "frequency_score": how commonly this problem occurs among {query} users
- "emotion_score": how frustrated or angry users are about this specific issue
- "urgency_score": how urgently {query} users need this solved
- "relevance_score": how specifically this cluster relates to {query} (10 = core niche issue, 1 = barely related)
- "opportunity_score": overall product opportunity considering all factors above

The opportunity_score should heavily weight relevance_score — a highly relevant
moderate-severity problem is better than a barely-relevant severe problem.

Additionally, clusters backed by high-authenticity evidence (firsthand complaints, help-seeking
posts) should score higher than clusters backed mainly by promotional or guide content.
If authenticity is low, reduce the opportunity_score by 1-2 points as the evidence is less trustworthy.

Return ONLY a JSON object with these five numeric fields. No markdown, no explanation."""

    try:
        resp = await client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=500,
        )
        scores = json.loads(_strip_json_fences(resp.choices[0].message.content))
        for key in ["frequency_score", "emotion_score", "urgency_score", "relevance_score", "opportunity_score"]:
            scores[key] = max(1.0, min(10.0, float(scores.get(key, 5.0))))
        return scores
    except Exception as e:
        logger.error(f"Scoring error: {e}")
        return {
            "frequency_score": 5.0, "emotion_score": 5.0, "urgency_score": 5.0,
            "relevance_score": 5.0, "opportunity_score": 5.0,
        }


async def generate_prd(query: str, cluster_label: str, summary: str, complaints: list[str], who: str, solution: str) -> dict:
    """Generate a niche-specific PRD from a pain point cluster."""

    complaints_text = "\n".join(f"- {c[:250]}" for c in complaints[:15])

    prompt = f"""Generate a focused PRD (Product Requirements Document) for a product
that solves a specific pain point in the "{query}" niche.

IMPORTANT: The PRD must be tightly scoped to the "{query}" space.
Do NOT propose a generic platform. Propose a specific product that a {query} user
would immediately understand and want.

Pain Point: {cluster_label}
Niche: {query}
Summary: {summary}
Who has this problem: {who}
Suggested solution direction: {solution}

Real complaints from {query} users:
{complaints_text}

Generate a PRD with these sections:
1. Product Concept - a specific product for the {query} space (2-3 sentences)
2. Target User - specific persona within {query} (2-3 sentences)
3. Problem Statement - the concrete problem in {query} (2-3 sentences)
4. Core Features - 4-6 features specific to solving this {query} problem (array of strings)
5. MVP Suggestion - the MINIMUM first version that delivers value. This must be:
   - Buildable by a small team in 4-6 weeks
   - Focused on ONE core workflow, not a full platform
   - 2-3 specific capabilities only (not a feature list)
   - Something a user could test in under 5 minutes
   - Example: for email deliverability, an MVP is "paste your email, get a spam-risk
     score and 3 actionable fixes" — NOT "comprehensive analytics dashboard with
     A/B testing and integrations"

Return as JSON with keys: product_concept, target_user, problem_statement,
core_features (array), mvp_suggestion.
Also include a "full_text" key with the complete PRD as formatted markdown text.

Return ONLY valid JSON. No markdown code fences, no explanation outside the JSON."""

    try:
        resp = await client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=3000,
        )
        _log_openai_usage("generate_prd", resp)
        return json.loads(_strip_json_fences(resp.choices[0].message.content))
    except Exception as e:
        logger.error(f"PRD generation error: {e}")
        return {
            "product_concept": f"A product solving {cluster_label} in the {query} space",
            "target_user": who or f"Professionals using {query}",
            "problem_statement": summary,
            "core_features": [f"Core feature addressing {cluster_label}"],
            "mvp_suggestion": f"Build a minimal {query} tool addressing {cluster_label}.",
            "full_text": f"# PRD Draft: {cluster_label}\n\n## Niche\n{query}\n\n## Problem\n{summary}\n\n## Solution\n{solution}",
        }
