"""
Main analysis pipeline: query expansion → data collection → complaint detection
→ relevance filtering → clustering → scoring → summary.
"""
import asyncio
import json
import logging
import re
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from ..core.config import get_settings
from ..core.utils import utcnow
from ..models.search import Search, RawPost, PainCluster, PRDDraft
from .collectors import (
    RedditCollector,
    HackerNewsCollector,
    AmazonCollector,
    G2Collector,
    YouTubeCollector,
    FacebookCollector,
    StackOverflowCollector,
    GitHubIssuesCollector,
)
from .collectors.base import CollectedPost
from . import ai_service

logger = logging.getLogger(__name__)

settings = get_settings()

COLLECTOR_MAP = {
    "reddit": RedditCollector,
    "hackernews": HackerNewsCollector,
    "amazon": AmazonCollector,
    "g2": G2Collector,
    "youtube": YouTubeCollector,
    "facebook": FacebookCollector,
    "stackoverflow": StackOverflowCollector,
    "github": GitHubIssuesCollector,
}

MAX_SUBTOPICS_PER_SEARCH = 8
MAX_COLLECTION_TASKS = 32
MAX_COLLECTION_QUERY_CHARS = 160

# Rule-based authenticity caps by content type.
# Even if the LLM overscores a promotional post, these caps enforce hard limits.
AUTHENTICITY_CAPS = {
    "promotional_content": 0.15,
    "guide_article": 0.25,
    "comparison_post": 0.45,
}

# Statuses that indicate a pipeline is still running — used by delete_search guard.
IN_PROGRESS_STATUSES = frozenset(
    {"pending", "expanding", "collecting", "analyzing", "detecting", "clustering", "scoring"}
)

# Minimum number of supporting posts required for a cluster to be persisted.
# Single-post clusters are statistical noise — they let the LLM rationalize a
# confident-looking opportunity card from anecdotal evidence. Better to surface
# fewer high-signal clusters than to ship hallucinated ones.
MIN_CLUSTER_SIZE = 3

# Membership confidence threshold for LLM-as-judge cluster validation.
# Posts whose second-pass score is below this are dropped from the cluster
# before scoring + persistence, so a tangential post can't drag down the
# cluster's evidence quality.
CLUSTER_MEMBERSHIP_THRESHOLD = 0.6


def _normalize_collection_queries(original_query: str, subtopics: list[str]) -> list[str]:
    """Normalize, dedupe, and cap LLM-expanded collection queries."""
    candidates = [original_query, *subtopics]
    normalized: list[str] = []
    seen: set[str] = set()

    for candidate in candidates:
        if not isinstance(candidate, str):
            continue
        query = re.sub(r"\s+", " ", candidate).strip()
        if not query:
            continue
        query = query[:MAX_COLLECTION_QUERY_CHARS]
        key = query.casefold()
        if key in seen:
            continue
        seen.add(key)
        normalized.append(query)
        if len(normalized) >= MAX_SUBTOPICS_PER_SEARCH + 1:
            break

    return normalized or [original_query[:MAX_COLLECTION_QUERY_CHARS]]


def _apply_authenticity_cap(content_type: str, authenticity_score: float) -> float:
    """Cap authenticity score based on content_type classification."""
    cap = AUTHENTICITY_CAPS.get(content_type)
    if cap is not None and authenticity_score > cap:
        logger.debug(
            "Authenticity capped: %s scored %.2f, capped to %.2f",
            content_type, authenticity_score, cap,
        )
        return cap
    return authenticity_score


# Cosine-similarity floor below which a post is treated as "obviously off-topic"
# regardless of corpus size. Calibrated against text-embedding-3-small; keep
# conservative so we don't over-prune small corpora.
PREFILTER_SIM_FLOOR = 0.15
# Even when the floor would prune most posts, never drop below this many
# kept posts (if available) — guards against a too-aggressive filter on
# small/exotic niches.
PREFILTER_MIN_KEEP = 25


async def _prefilter_by_similarity(
    posts: list,
    query: str,
    niche_description: str | None,
    hypothetical_complaints: list[str],
    keep_n: int,
) -> list:
    """
    Rank `posts` by cosine similarity to a HyDE-style anchor centroid
    (query + niche description + hypothetical complaint posts) and return
    the top `keep_n` whose similarity is at or above PREFILTER_SIM_FLOOR.

    Fails open: on embedding errors or empty inputs, returns posts truncated
    to keep_n in their original order — i.e. the legacy flat-cap behavior.
    """
    if not posts:
        return posts

    anchor_texts: list[str] = [query]
    if niche_description:
        anchor_texts.append(niche_description)
    anchor_texts.extend(hypothetical_complaints or [])

    post_texts = [
        f"{(p.title or '').strip()}\n{(p.text or '').strip()}"[:1200]
        for p in posts
    ]

    embed_inputs = anchor_texts + post_texts
    embeddings = await ai_service.embed_texts(embed_inputs, purpose="prefilter")

    if not embeddings or len(embeddings) != len(embed_inputs):
        if len(posts) > keep_n:
            logger.info(
                "Pre-filter unavailable; flat-capping %d -> %d posts",
                len(posts), keep_n,
            )
            return posts[:keep_n]
        return posts

    n_anchors = len(anchor_texts)
    centroid = ai_service.average_vectors(embeddings[:n_anchors])
    if not centroid:
        return posts[:keep_n] if len(posts) > keep_n else posts

    post_embeds = embeddings[n_anchors:]
    similarities = [ai_service.cosine_similarity(pe, centroid) for pe in post_embeds]

    ranked = sorted(range(len(posts)), key=lambda i: similarities[i], reverse=True)

    above_floor = [i for i in ranked if similarities[i] >= PREFILTER_SIM_FLOOR]
    floor_target = max(PREFILTER_MIN_KEEP, len(above_floor))
    target = min(keep_n, floor_target, len(posts))
    keep_indices_sorted = sorted(ranked[:target])

    kept = [posts[i] for i in keep_indices_sorted]
    logger.info(
        "HyDE pre-filter: %d -> %d posts (anchors=%d floor=%.2f median_sim=%.3f)",
        len(posts), len(kept), n_anchors, PREFILTER_SIM_FLOOR,
        (sorted(similarities)[len(similarities) // 2] if similarities else 0.0),
    )
    return kept


async def run_search_pipeline(search_id: uuid.UUID, query: str, sources: list[str], db: AsyncSession):
    """
    Full pipeline:
    1. Expand query into subtopics
    2. Collect from sources using expanded queries
    3. Detect complaints + classify relevance
    4. Filter to only niche-relevant complaints
    5. Cluster into niche-specific groups
    6. Score each cluster
    7. Save results
    """
    search = await db.get(Search, search_id)
    if not search:
        logger.error("Search %s not found", search_id)
        return

    try:
        # --- EXPAND QUERY ---
        search.status = "expanding"
        await db.commit()

        expansion = await ai_service.expand_query(query)
        subtopics = expansion.get("subtopics", [query])
        niche_keywords = expansion.get("keywords", [])
        niche_description = expansion.get("niche_description")
        hypothetical_complaints = expansion.get("hypothetical_complaints", []) or []

        logger.info(
            "Expanded '%s' into %d subtopics + %d HyDE anchors",
            query, len(subtopics), len(hypothetical_complaints),
        )

        # --- COLLECT ---
        search.status = "collecting"
        await db.commit()

        all_posts = await _collect_from_sources_expanded(query, subtopics, sources)
        all_posts = _deduplicate_posts(all_posts)
        logger.info("Collected %d unique posts for query '%s'", len(all_posts), query)

        if not all_posts:
            search.status = "completed"
            search.completed_at = utcnow()
            await db.commit()
            return

        # --- HyDE EMBEDDING PRE-FILTER ---
        # Rank posts by semantic similarity to a centroid of (niche query +
        # niche description + hypothetical complaint posts), then keep the top
        # max_posts_per_pipeline. This both reduces LLM cost and improves
        # cluster quality vs. the flat top-N truncation we used to do.
        # Falls open: if embeddings fail, we revert to flat truncation.
        max_posts = settings.max_posts_per_pipeline
        all_posts = await _prefilter_by_similarity(
            all_posts,
            query=query,
            niche_description=niche_description,
            hypothetical_complaints=hypothetical_complaints,
            keep_n=max_posts,
        )

        # --- SAVE RAW POSTS ---
        search.status = "analyzing"
        await db.commit()

        raw_post_records = []
        for post in all_posts:
            ts = post.timestamp
            if ts and ts.tzinfo is not None:
                ts = ts.replace(tzinfo=None)
            raw = RawPost(
                search_id=search_id,
                source=post.source,
                title=post.title,
                text=post.text,
                author=post.author,
                url=post.url,
                timestamp=ts,
            )
            db.add(raw)
            raw_post_records.append(raw)
        await db.flush()
        search.total_posts_fetched = len(raw_post_records)

        # --- DETECT COMPLAINTS + RELEVANCE ---
        search.status = "detecting"
        await db.commit()

        texts_for_analysis = [
            {
                "text": p.text,
                "source": p.source,
                "title": p.title or "",
                "url": p.url or "",
            }
            for p in all_posts
        ]
        analysis_results = await ai_service.detect_complaints_and_relevance(
            query,
            texts_for_analysis,
            niche_keywords=niche_keywords,
            niche_description=niche_description,
        )

        all_complaint_posts = []
        for result in analysis_results:
            idx = result.get("index", 0)
            if idx >= len(raw_post_records):
                continue

            is_complaint = result.get("is_complaint", False)
            complaint_score = float(result.get("complaint_score", 0.0))
            relevance = result.get("relevance", "unrelated")
            relevance_score = float(result.get("relevance_score", 0.0))
            content_type = result.get("content_type", "unknown")
            authenticity_score = float(result.get("authenticity_score", 0.5))

            # YouTube comments tend to be noisier; apply multiplicative downweight
            if raw_post_records[idx].source == "youtube":
                authenticity_score *= 0.85
            authenticity_score = _apply_authenticity_cap(content_type, authenticity_score)

            raw_post_records[idx].is_complaint = is_complaint
            raw_post_records[idx].complaint_score = complaint_score
            raw_post_records[idx].relevance = relevance
            raw_post_records[idx].relevance_score = relevance_score
            raw_post_records[idx].content_type = content_type
            raw_post_records[idx].authenticity_score = authenticity_score

            if is_complaint and complaint_score >= 0.4:
                all_complaint_posts.append({
                    "index": idx,
                    "text": raw_post_records[idx].text,
                    "source": raw_post_records[idx].source,
                    "record": raw_post_records[idx],
                    "complaint_score": complaint_score,
                    "relevance": relevance,
                    "relevance_score": relevance_score,
                    "content_type": content_type,
                    "authenticity_score": authenticity_score,
                })

        search.total_complaints_found = len(all_complaint_posts)

        # --- RELEVANCE FILTER ---
        relevant_complaints = []
        for c in all_complaint_posts:
            if c["relevance"] != "directly_relevant" or c["relevance_score"] < 0.6:
                continue
            if c["authenticity_score"] < 0.4:
                continue
            relevant_complaints.append(c)

        # Fall back to somewhat_relevant if we don't have enough directly_relevant
        if len(relevant_complaints) < 5:
            somewhat = [
                c for c in all_complaint_posts
                if c["relevance"] == "somewhat_relevant"
                and c["relevance_score"] >= 0.4
                and c["authenticity_score"] >= 0.4
            ]
            relevant_complaints.extend(somewhat)

        # Sort so firsthand/high-authenticity posts come first (best evidence to clustering)
        relevant_complaints.sort(key=lambda c: c["authenticity_score"], reverse=True)

        search.total_relevant_complaints = len(relevant_complaints)
        await db.commit()

        blocked_by_auth = sum(
            1 for c in all_complaint_posts
            if c["relevance"] == "directly_relevant"
            and c["relevance_score"] >= 0.6
            and c["authenticity_score"] < 0.4
        )
        logger.info(
            "Relevance filter: %d complaints -> %d relevant for '%s' (%d blocked by authenticity)",
            len(all_complaint_posts), len(relevant_complaints), query, blocked_by_auth,
        )

        if not relevant_complaints:
            search.status = "completed"
            search.completed_at = utcnow()
            await db.commit()
            return

        # --- CLUSTER ---
        search.status = "clustering"
        await db.commit()

        cluster_data = await ai_service.cluster_complaints(
            query,
            [
                {
                    "text": c["text"],
                    "source": c["source"],
                }
                for c in relevant_complaints
            ],
        )

        # --- SCORE + SAVE ---
        search.status = "scoring"
        await db.commit()

        # Cluster floor + LLM-as-judge validation:
        # 1. Dedupe + bounds-check raw member_indices (LLM can emit dupes / OOB).
        # 2. Pre-filter clusters that are already too small to bother validating.
        # 3. Run a second-pass LLM that scores each member's membership
        #    confidence; drop members below CLUSTER_MEMBERSHIP_THRESHOLD.
        # 4. Re-apply the floor — clusters that lose too many members on
        #    validation get dropped entirely rather than persisting on weak
        #    evidence.
        filtered_clusters: list[dict] = []
        dropped_for_size = 0
        dropped_for_validation = 0
        members_dropped_total = 0

        for cdata in cluster_data:
            valid_indices = sorted({
                i for i in cdata.get("member_indices", [])
                if isinstance(i, int) and 0 <= i < len(relevant_complaints)
            })
            if len(valid_indices) < MIN_CLUSTER_SIZE:
                dropped_for_size += 1
                continue

            # Second-pass: ask the LLM to grade each member's membership.
            members = [
                {
                    "text": relevant_complaints[i]["text"],
                    "source": relevant_complaints[i]["source"],
                }
                for i in valid_indices
            ]
            scores = await ai_service.validate_cluster_members(
                cdata.get("label", ""),
                cdata.get("summary", ""),
                members,
            )
            kept_indices = [
                idx for idx, score in zip(valid_indices, scores)
                if score >= CLUSTER_MEMBERSHIP_THRESHOLD
            ]
            members_dropped_total += len(valid_indices) - len(kept_indices)

            if len(kept_indices) < MIN_CLUSTER_SIZE:
                dropped_for_validation += 1
                continue

            cdata["member_indices"] = kept_indices
            filtered_clusters.append(cdata)

        if dropped_for_size or dropped_for_validation or members_dropped_total:
            logger.info(
                "Cluster QA for '%s': dropped %d below floor, %d after validation, "
                "%d members removed for low membership confidence",
                query, dropped_for_size, dropped_for_validation, members_dropped_total,
            )
        cluster_data = filtered_clusters

        for cdata in cluster_data:
            member_indices = cdata.get("member_indices", [])
            cluster_complaints_text = [
                relevant_complaints[i]["text"] for i in member_indices
                if i < len(relevant_complaints)
            ]

            source_counts: dict[str, int] = {}
            for i in member_indices:
                if i < len(relevant_complaints):
                    src = relevant_complaints[i]["source"]
                    source_counts[src] = source_counts.get(src, 0) + 1

            cluster_auth_scores = [
                relevant_complaints[i]["authenticity_score"] for i in member_indices
                if i < len(relevant_complaints)
            ]
            avg_auth = (
                sum(cluster_auth_scores) / len(cluster_auth_scores)
                if cluster_auth_scores else 0.5
            )

            scores = await ai_service.score_cluster(
                query,
                cdata.get("label", "Unknown"),
                cluster_complaints_text,
                avg_authenticity=avg_auth,
            )

            top_examples = [t[:500] for t in cluster_complaints_text[:5]]

            cluster = PainCluster(
                search_id=search_id,
                label=cdata.get("label", "Unknown"),
                summary=cdata.get("summary", ""),
                complaint_count=len(member_indices),
                frequency_score=scores["frequency_score"],
                emotion_score=scores["emotion_score"],
                urgency_score=scores["urgency_score"],
                relevance_score=scores["relevance_score"],
                opportunity_score=scores["opportunity_score"],
                avg_authenticity=avg_auth,
                source_breakdown=source_counts,
                top_complaints=top_examples,
                who_has_problem=cdata.get("who_has_problem", ""),
                why_it_matters=cdata.get("why_it_matters", ""),
                suggested_solution=cdata.get("suggested_solution", ""),
                product_angle=cdata.get("product_angle", ""),
            )
            db.add(cluster)
            await db.flush()

            for i in member_indices:
                if i < len(relevant_complaints):
                    relevant_complaints[i]["record"].cluster_id = cluster.id

        # --- EXECUTIVE SUMMARY ---
        cluster_summaries = [
            {"label": c.get("label", ""), "summary": c.get("summary", "")}
            for c in cluster_data
        ]
        search.summary = await ai_service.generate_search_summary(query, cluster_summaries)

        search.status = "completed"
        search.completed_at = utcnow()
        await db.commit()

        logger.info(
            "Pipeline completed for '%s': %d clusters from %d relevant complaints",
            query, len(cluster_data), len(relevant_complaints),
        )

    except Exception as e:
        logger.error("Pipeline error for search %s: %s", search_id, e)
        await db.rollback()

        # Clean up any partially committed posts and clusters for this search (H7)
        try:
            await db.execute(delete(RawPost).where(RawPost.search_id == search_id))
            await db.execute(delete(PainCluster).where(PainCluster.search_id == search_id))
        except Exception as cleanup_err:
            logger.warning("Partial state cleanup failed for search %s: %s", search_id, cleanup_err)

        search = await db.get(Search, search_id)
        if search:
            search.status = "failed"
            await db.commit()


async def generate_prd_for_cluster(cluster_id: uuid.UUID, db: AsyncSession) -> PRDDraft:
    """Generate a niche-specific PRD for a pain point cluster."""
    cluster = await db.get(PainCluster, cluster_id)
    if not cluster:
        raise ValueError(f"Cluster {cluster_id} not found")

    existing = await db.execute(
        select(PRDDraft).where(PRDDraft.cluster_id == cluster_id)
    )
    existing_prd = existing.scalar_one_or_none()
    if existing_prd:
        return existing_prd

    search = await db.get(Search, cluster.search_id)
    query = search.query if search else ""

    prd_data = await ai_service.generate_prd(
        query=query,
        cluster_label=cluster.label,
        summary=cluster.summary or "",
        complaints=cluster.top_complaints or [],
        who=cluster.who_has_problem or "",
        solution=cluster.suggested_solution or "",
    )

    mvp_raw = prd_data.get("mvp_suggestion", "")
    if isinstance(mvp_raw, dict):
        parts = []
        if mvp_raw.get("description"):
            parts.append(mvp_raw["description"])
        if mvp_raw.get("build_time"):
            parts.append(f"Build time: {mvp_raw['build_time']}")
        if mvp_raw.get("focus"):
            parts.append(f"Focus: {mvp_raw['focus']}")
        mvp_suggestion = " ".join(parts) if parts else json.dumps(mvp_raw)
    else:
        mvp_suggestion = str(mvp_raw) if mvp_raw else ""

    prd = PRDDraft(
        cluster_id=cluster_id,
        product_concept=prd_data.get("product_concept", ""),
        target_user=prd_data.get("target_user", ""),
        problem_statement=prd_data.get("problem_statement", ""),
        core_features=prd_data.get("core_features", []),
        mvp_suggestion=mvp_suggestion,
        full_text=prd_data.get("full_text", ""),
    )
    db.add(prd)
    await db.commit()
    return prd


async def _collect_from_sources_expanded(
    original_query: str, subtopics: list[str], sources: list[str]
) -> list[CollectedPost]:
    """
    Collect from sources using expanded subtopic queries with controlled concurrency.
    Runs at most 4 collection tasks in parallel.
    """
    allowed_sources = [source for source in sources if source in COLLECTOR_MAP]
    if not allowed_sources:
        return []

    all_queries = _normalize_collection_queries(original_query, subtopics)
    max_queries_for_sources = max(1, MAX_COLLECTION_TASKS // len(allowed_sources))
    if len(all_queries) > max_queries_for_sources:
        logger.info(
            "Capping collection queries from %d to %d for %d sources",
            len(all_queries), max_queries_for_sources, len(allowed_sources),
        )
        all_queries = all_queries[:max_queries_for_sources]

    per_query_limit = max(8, 40 // len(all_queries))

    task_specs: list[tuple[str, str]] = []
    for search_query in all_queries:
        for source in allowed_sources:
            task_specs.append((search_query, source))

    if not task_specs:
        return []

    semaphore = asyncio.Semaphore(4)

    async def _run_one(q: str, src: str) -> list[CollectedPost]:
        async with semaphore:
            try:
                collector = COLLECTOR_MAP[src]()
                return await collector.collect(q, limit=per_query_limit)
            except Exception as e:
                logger.warning("Collection failed (%s, %.40s): %s", src, q, e)
                return []

    results = await asyncio.gather(*[_run_one(q, s) for q, s in task_specs])
    all_posts: list[CollectedPost] = []
    for batch in results:
        all_posts.extend(batch)

    return all_posts


def _deduplicate_posts(posts: list[CollectedPost]) -> list[CollectedPost]:
    """
    Remove duplicate posts using two complementary strategies (M5):
    1. Exact URL match — same post fetched by multiple subtopic queries.
    2. Normalized text fingerprint — same content with slight formatting differences.
    """
    seen_urls: set[str] = set()
    seen_text_keys: set[str] = set()
    unique: list[CollectedPost] = []

    for post in posts:
        # Primary: deduplicate by canonical URL
        if post.url:
            if post.url in seen_urls:
                continue
            seen_urls.add(post.url)

        # Secondary: deduplicate by normalized text fingerprint
        normalized = re.sub(r"\W+", "", post.text.lower())[:400]
        if normalized in seen_text_keys:
            continue
        seen_text_keys.add(normalized)

        unique.append(post)

    return unique
