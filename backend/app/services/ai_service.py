import json
import logging
import re
from openai import AsyncOpenAI
from ..core.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

# ---------------------------------------------------------------------------
# OpenAI client — max_retries enables built-in exponential backoff on 429/5xx;
# timeout covers the full request lifecycle. (H4, H6)
# ---------------------------------------------------------------------------
client = AsyncOpenAI(
    api_key=settings.openai_api_key,
    max_retries=3,
    timeout=60.0,
)
MODEL = settings.openai_model


# ---------------------------------------------------------------------------
# Input sanitization — prevents prompt injection (C2)
# ---------------------------------------------------------------------------
def sanitize_user_input(text: str, max_length: int = 500) -> str:
    """
    Sanitize user-supplied text before embedding it in an LLM prompt.

    Strips characters that could escape the prompt context (quotes, backticks)
    and removes control characters / newlines that could inject new instructions.
    """
    if not text:
        return ""
    text = text.replace('"', "'").replace("`", "'")
    text = re.sub(r"[\r\n\t]+", " ", text)
    text = re.sub(r"[^\x20-\x7E\u00A0-\uFFFF]", "", text)
    return text.strip()[:max_length]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _log_openai_usage(endpoint: str, resp) -> None:
    """Log OpenAI token usage for cost tracking."""
    if resp.usage:
        inp = getattr(resp.usage, "input_tokens", None) or getattr(resp.usage, "prompt_tokens", 0)
        out = getattr(resp.usage, "output_tokens", None) or getattr(resp.usage, "completion_tokens", 0)
        logger.info(
            "OPENAI_USAGE endpoint=%s model=%s input_tokens=%s output_tokens=%s",
            endpoint, resp.model, inp, out,
        )


def _strip_json_fences(content: str) -> str:
    content = content.strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[1] if "\n" in content else content[3:]
        if content.endswith("```"):
            content = content[:-3]
    return content.strip()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def extract_keywords_from_idea(idea: str) -> list[str]:
    """
    Extract exactly 3 search keywords from a product idea.
    Used for the minimal Validate flow.
    """
    safe_idea = sanitize_user_input(idea, max_length=500)

    prompt = (
        f"A user has this product idea: '{safe_idea}'\n\n"
        "Extract exactly 3 keywords or short phrases that would best surface real complaints,\n"
        "frustrations, and pain points when searching Reddit, Hacker News, Amazon, G2, or YouTube.\n\n"
        "Rules:\n"
        "- Each keyword should be 1-4 words\n"
        "- Choose terms people actually use when complaining\n"
        "- Avoid generic terms; be specific to the idea\n"
        "- Return ONLY a JSON array of exactly 3 strings. No markdown, no explanation."
    )

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
        logger.error("Keyword extraction error: %s", e)
        words = idea.split()[:3]
        return words if len(words) >= 3 else [idea] * 3


async def expand_query(query: str) -> dict:
    """
    Expand a user's niche query into subtopic search queries and related keywords.
    """
    safe_query = sanitize_user_input(query, max_length=300)

    prompt = (
        f"A user wants to discover pain points in the niche: '{safe_query}'\n\n"
        "Generate search queries and keywords to comprehensively cover this niche.\n\n"
        "Return a JSON object with:\n"
        "- \"subtopics\": array of 6-10 specific search queries that would surface complaints\n"
        f"  and frustrations in different areas of the '{safe_query}' niche. Each should target a\n"
        "  distinct problem area. Include the niche context in each query.\n"
        "  Example for 'email marketing software':\n"
        "  [\n"
        "    \"email marketing deliverability problems spam\",\n"
        "    \"email automation workflow frustrations\",\n"
        "    \"email marketing segmentation limitations\",\n"
        "    \"email campaign analytics reporting issues\",\n"
        "    \"email template builder complaints\",\n"
        "    \"email marketing pricing too expensive\",\n"
        "    \"email marketing integration problems CRM\",\n"
        "    \"email list management complaints\"\n"
        "  ]\n"
        "- \"keywords\": array of 10-15 single terms or short phrases central to the niche\n"
        f"- \"niche_description\": one sentence describing what '{safe_query}' refers to\n\n"
        "Return ONLY valid JSON. No markdown, no explanation."
    )

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
        logger.error("Query expansion error: %s", e)
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
    Combined pass: for each text, determine if it is a complaint AND whether
    it is relevant to the search query.
    """
    if not texts:
        return []

    safe_query = sanitize_user_input(query, max_length=300)

    keyword_context = ""
    if niche_keywords:
        safe_keywords = [sanitize_user_input(k, max_length=50) for k in niche_keywords[:15]]
        keyword_context = f"\nKey terms in this niche: {', '.join(safe_keywords)}"

    niche_context = ""
    if niche_description:
        niche_context = f"\nNiche context: {sanitize_user_input(niche_description, max_length=200)}"

    results = []
    batch_size = 15

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        numbered = "\n".join(
            f"[{j}] {item['text'][:600]}" for j, item in enumerate(batch)
        )

        prompt = (
            f"You are analyzing public posts for a user researching the niche: '{safe_query}'"
            f"{keyword_context}{niche_context}\n\n"
            "For EACH numbered text below, determine:\n"
            "1. Is it a complaint, frustration, pain point, or unmet need?\n"
            "2. Is it RELEVANT to the niche?\n"
            "3. What TYPE of content is this?\n"
            "4. How AUTHENTIC is the pain expressed?\n\n"
            f"A post is 'directly_relevant' ONLY if it discusses a problem specifically about\n"
            f"'{safe_query}' or closely related products/services/workflows in that space.\n\n"
            "A post is 'somewhat_relevant' if it touches on the niche tangentially.\n\n"
            f"A post is 'unrelated' if it has nothing to do with '{safe_query}'. Be STRICT.\n\n"
            "CRITICAL: Mark as 'unrelated' if the post is about a DIFFERENT product category,\n"
            "even when it uses similar words.\n\n"
            "Content types — classify each post as ONE of:\n"
            "- \"firsthand_complaint\": author personally experienced the problem\n"
            "- \"help_seeking\": author is asking for help with a specific problem they face\n"
            "- \"workaround_discussion\": author shares workarounds for a real problem\n"
            "- \"comparison_post\": comparing tools/products, may mention pain points secondhand\n"
            "- \"promotional_content\": affiliate links, product promotion, marketing disguised as advice\n"
            "- \"guide_article\": educational/how-to content, tips articles, polished blog-style posts\n\n"
            "Authenticity scoring (0.0-1.0) — BE STRICT, err on the side of scoring LOW:\n"
            "- 0.8-1.0 = raw firsthand pain, clearly personal experience, specific details\n"
            "- 0.6-0.8 = genuine help-seeking or workaround sharing with personal context\n"
            "- 0.3-0.5 = secondhand pain mentions, comparison posts discussing real trade-offs\n"
            "- 0.1-0.2 = polished guide content, promotional posts, SEO articles\n"
            "- 0.0 = pure marketing/spam with no real user pain\n\n"
            "CRITICAL — these patterns MUST receive authenticity 0.2 or below:\n"
            "- Posts with affiliate links or referral codes\n"
            "- 'Ultimate guide', 'complete guide', 'definitive guide' style titles\n"
            "- 'Best [tools] in [year]' or 'Top 10' listicle format\n"
            "- Polished marketing content with CTAs\n"
            "- Content that reads like a blog post rather than a forum post\n"
            "- SEO-optimized content\n\n"
            "For each text return a JSON object:\n"
            "- \"index\": the bracket number\n"
            "- \"is_complaint\": true/false\n"
            "- \"complaint_score\": 0.0-1.0\n"
            "- \"relevance\": \"directly_relevant\" | \"somewhat_relevant\" | \"unrelated\"\n"
            "- \"relevance_score\": 0.0-1.0\n"
            "- \"content_type\": one of the six types above\n"
            "- \"authenticity_score\": 0.0-1.0\n\n"
            f"Texts:\n{numbered}\n\n"
            "Return ONLY a valid JSON array. No markdown, no explanation."
        )

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
            logger.error("Detection+relevance error: %s", e)
            for j in range(len(batch)):
                results.append({
                    "index": i + j,
                    "is_complaint": False,
                    "complaint_score": 0.0,
                    "relevance": "unrelated",
                    "relevance_score": 0.0,
                    "content_type": "unknown",
                    "authenticity_score": 0.0,
                })

    return results


async def generate_search_summary(query: str, cluster_labels_and_summaries: list[dict]) -> str:
    """Generate a 2-3 sentence executive summary of key insights from a search."""
    if not cluster_labels_and_summaries:
        return ""

    safe_query = sanitize_user_input(query, max_length=300)
    items = "\n".join(
        f"- {c.get('label', 'Unknown')}: {c.get('summary', '')[:150]}"
        for c in cluster_labels_and_summaries[:8]
    )

    prompt = (
        f"A user researched the niche '{safe_query}' and found these pain point clusters:\n\n"
        f"{items}\n\n"
        "Write a 2-3 sentence executive summary that captures the key insights. "
        "Focus on the most actionable opportunities and recurring themes. "
        "Be concise and specific to the niche.\n"
        "Do NOT use bullet points or headers. Return ONLY the summary text."
    )

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
        logger.error("Search summary error: %s", e)
        return ""


async def cluster_complaints(query: str, complaints: list[dict]) -> list[dict]:
    """Group complaints into niche-specific thematic clusters."""
    if not complaints:
        return []

    safe_query = sanitize_user_input(query, max_length=300)
    complaint_texts = "\n".join(
        f"[{i}] {c['text'][:400]}" for i, c in enumerate(complaints[:80])
    )

    prompt = (
        f"You are a product opportunity analyst specializing in the niche: '{safe_query}'\n\n"
        "Below are complaints and frustrations from real users. "
        "Group them into 3-8 SPECIFIC pain point clusters.\n\n"
        "CRITICAL RULES:\n"
        f"- Cluster labels MUST be specific to the '{safe_query}' niche\n"
        "- Do NOT use generic labels like 'Software Issues', 'Poor Customer Support', 'Pricing Problems'\n"
        f"- DO use labels that someone in the {safe_query} space would immediately recognize\n"
        "- Example for 'email marketing software': 'Email Deliverability Failures',\n"
        "  'Poor Automation Workflow Design', 'Weak Segmentation Capabilities'\n"
        "- Each cluster should represent a concrete, buildable product opportunity\n\n"
        f"Complaints:\n{complaint_texts}\n\n"
        "For each cluster provide:\n"
        f"- \"label\": niche-specific name (max 10 words, specific to {safe_query})\n"
        f"- \"summary\": 2-3 sentences describing the specific problem within {safe_query}\n"
        "- \"member_indices\": array of complaint numbers belonging to this cluster\n"
        f"- \"who_has_problem\": who in the {safe_query} space faces this (be specific)\n"
        f"- \"why_it_matters\": business impact specific to {safe_query} users\n"
        "- \"suggested_solution\": a concrete product/feature idea for this niche\n"
        f"- \"product_angle\": how a startup could build a business around this in the {safe_query} space\n\n"
        "Return ONLY a valid JSON array. No markdown, no explanation."
    )

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
        logger.error("Clustering error: %s", e)
        return [{
            "label": f"General {query} complaints",
            "summary": f"Various complaints about {query}",
            "member_indices": list(range(len(complaints))),
        }]


async def score_cluster(
    query: str,
    cluster_label: str,
    complaints_text: list[str],
    avg_authenticity: float = 0.5,
) -> dict:
    """
    Score a cluster on frequency, emotion, urgency, niche relevance,
    and overall opportunity — all contextualized to the search query.
    """
    safe_query = sanitize_user_input(query, max_length=300)
    safe_label = sanitize_user_input(cluster_label, max_length=200)
    joined = "\n".join(f"- {t[:250]}" for t in complaints_text[:20])
    auth_label = "high" if avg_authenticity >= 0.7 else "moderate" if avg_authenticity >= 0.4 else "low"

    prompt = (
        f"Score this pain point cluster as a product opportunity in the '{safe_query}' niche.\n\n"
        f"Cluster: {safe_label}\n"
        f"Niche: {safe_query}\n"
        f"Evidence authenticity: {auth_label} ({avg_authenticity:.2f}/1.0)\n\n"
        f"Sample complaints:\n{joined}\n\n"
        "Score each dimension from 1.0 to 10.0:\n"
        f"- \"frequency_score\": how commonly this problem occurs among {safe_query} users\n"
        "- \"emotion_score\": how frustrated or angry users are about this specific issue\n"
        f"- \"urgency_score\": how urgently {safe_query} users need this solved\n"
        f"- \"relevance_score\": how specifically this cluster relates to {safe_query} (10 = core niche issue)\n"
        "- \"opportunity_score\": overall product opportunity considering all factors above\n\n"
        "The opportunity_score should heavily weight relevance_score.\n"
        "If authenticity is low, reduce opportunity_score by 1-2 points.\n\n"
        "Return ONLY a JSON object with these five numeric fields. No markdown, no explanation."
    )

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
        logger.error("Scoring error: %s", e)
        return {
            "frequency_score": 5.0, "emotion_score": 5.0, "urgency_score": 5.0,
            "relevance_score": 5.0, "opportunity_score": 5.0,
        }


async def generate_prd(
    query: str,
    cluster_label: str,
    summary: str,
    complaints: list[str],
    who: str,
    solution: str,
) -> dict:
    """Generate a niche-specific PRD from a pain point cluster."""
    safe_query = sanitize_user_input(query, max_length=300)
    safe_label = sanitize_user_input(cluster_label, max_length=200)
    safe_summary = sanitize_user_input(summary, max_length=500)
    safe_who = sanitize_user_input(who, max_length=300)
    safe_solution = sanitize_user_input(solution, max_length=400)
    complaints_text = "\n".join(f"- {c[:250]}" for c in complaints[:15])

    prompt = (
        f"Generate a focused PRD (Product Requirements Document) for a product\n"
        f"that solves a specific pain point in the '{safe_query}' niche.\n\n"
        f"IMPORTANT: Tightly scope the PRD to the '{safe_query}' space.\n"
        f"Propose a specific product that a {safe_query} user would immediately understand.\n\n"
        f"Pain Point: {safe_label}\n"
        f"Niche: {safe_query}\n"
        f"Summary: {safe_summary}\n"
        f"Who has this problem: {safe_who}\n"
        f"Suggested solution direction: {safe_solution}\n\n"
        f"Real complaints from {safe_query} users:\n{complaints_text}\n\n"
        "Generate a PRD with these sections:\n"
        f"1. Product Concept - a specific product for the {safe_query} space (2-3 sentences)\n"
        f"2. Target User - specific persona within {safe_query} (2-3 sentences)\n"
        f"3. Problem Statement - the concrete problem in {safe_query} (2-3 sentences)\n"
        "4. Core Features - 4-6 features specific to solving this problem (array of strings)\n"
        "5. MVP Suggestion - the MINIMUM first version that delivers value:\n"
        "   - Buildable by a small team in 4-6 weeks\n"
        "   - Focused on ONE core workflow\n"
        "   - 2-3 specific capabilities only\n\n"
        "Return as JSON with keys: product_concept, target_user, problem_statement,\n"
        "core_features (array), mvp_suggestion.\n"
        "Also include a \"full_text\" key with the complete PRD as formatted markdown.\n\n"
        "Return ONLY valid JSON. No markdown code fences, no explanation outside the JSON."
    )

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
        logger.error("PRD generation error: %s", e)
        return {
            "product_concept": f"A product solving {cluster_label} in the {query} space",
            "target_user": who or f"Professionals using {query}",
            "problem_statement": summary,
            "core_features": [f"Core feature addressing {cluster_label}"],
            "mvp_suggestion": f"Build a minimal {query} tool addressing {cluster_label}.",
            "full_text": (
                f"# PRD Draft: {cluster_label}\n\n"
                f"## Niche\n{query}\n\n"
                f"## Problem\n{summary}\n\n"
                f"## Solution\n{solution}"
            ),
        }
