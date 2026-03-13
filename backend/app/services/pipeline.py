"""
Main analysis pipeline that orchestrates query expansion, data collection,
complaint detection, relevance filtering, clustering, scoring, and report generation.
"""
import asyncio
import logging
import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..models.search import Search, RawPost, PainCluster, PRDDraft
from .collectors import RedditCollector, HackerNewsCollector, AmazonCollector, G2Collector, YouTubeCollector
from .collectors.base import CollectedPost
from . import ai_service

logger = logging.getLogger(__name__)

COLLECTOR_MAP = {
    "reddit": RedditCollector,
    "hackernews": HackerNewsCollector,
    "amazon": AmazonCollector,
    "g2": G2Collector,
    "youtube": YouTubeCollector,
}

# Rule-based authenticity caps by content type.
# Even if the LLM overscores a promotional post, these caps enforce hard limits.
AUTHENTICITY_CAPS = {
    "promotional_content": 0.15,
    "guide_article": 0.25,
    "comparison_post": 0.45,
}


def _apply_authenticity_cap(content_type: str, authenticity_score: float) -> float:
    """Cap authenticity score based on content_type classification."""
    cap = AUTHENTICITY_CAPS.get(content_type)
    if cap is not None and authenticity_score > cap:
        logger.debug(
            f"Authenticity capped: {content_type} scored {authenticity_score:.2f}, "
            f"capped to {cap:.2f}"
        )
        return cap
    return authenticity_score


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
        logger.error(f"Search {search_id} not found")
        return

    try:
        # --- EXPAND QUERY ---
        search.status = "expanding"
        await db.commit()

        expansion = await ai_service.expand_query(query)
        subtopics = expansion.get("subtopics", [query])
        niche_keywords = expansion.get("keywords", [])
        niche_description = expansion.get("niche_description")

        logger.info(f"Expanded '{query}' into {len(subtopics)} subtopics: {subtopics}")

        # --- COLLECT (using expanded subtopic queries) ---
        search.status = "collecting"
        await db.commit()

        all_posts = await _collect_from_sources_expanded(query, subtopics, sources)
        all_posts = _deduplicate_posts(all_posts)
        logger.info(f"Collected {len(all_posts)} unique posts for query '{query}'")

        if not all_posts:
            search.status = "completed"
            search.completed_at = datetime.utcnow()
            await db.commit()
            return

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

        texts_for_analysis = [{"text": p.text} for p in all_posts]
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

        # --- RELEVANCE FILTER (authenticity-aware) ---
        # Block promotional/guide content regardless of complaint score
        relevant_complaints = []
        for c in all_complaint_posts:
            if c["relevance"] != "directly_relevant" or c["relevance_score"] < 0.6:
                continue
            if c["authenticity_score"] < 0.4:
                continue
            relevant_complaints.append(c)

        if len(relevant_complaints) < 5:
            somewhat = [
                c for c in all_complaint_posts
                if c["relevance"] == "somewhat_relevant" and c["relevance_score"] >= 0.4
                and c["authenticity_score"] >= 0.4
            ]
            relevant_complaints.extend(somewhat)

        # Sort so firsthand complaints and high-authenticity posts come first
        # This ensures clustering sees the best evidence first
        relevant_complaints.sort(key=lambda c: c["authenticity_score"], reverse=True)

        search.total_relevant_complaints = len(relevant_complaints)
        await db.commit()

        blocked_by_auth = sum(
            1 for c in all_complaint_posts
            if c["relevance"] == "directly_relevant" and c["relevance_score"] >= 0.6
            and c["authenticity_score"] < 0.4
        )
        logger.info(
            f"Relevance filter: {len(all_complaint_posts)} complaints -> "
            f"{len(relevant_complaints)} relevant for '{query}' "
            f"({blocked_by_auth} blocked by authenticity)"
        )

        if not relevant_complaints:
            search.status = "completed"
            search.completed_at = datetime.utcnow()
            await db.commit()
            return

        # --- CLUSTER (niche-aware) ---
        search.status = "clustering"
        await db.commit()

        cluster_data = await ai_service.cluster_complaints(
            query, [{"text": c["text"]} for c in relevant_complaints]
        )

        # --- SCORE + SAVE ---
        search.status = "scoring"
        await db.commit()

        for cdata in cluster_data:
            member_indices = cdata.get("member_indices", [])
            cluster_complaints_text = [
                relevant_complaints[i]["text"] for i in member_indices
                if i < len(relevant_complaints)
            ]

            source_counts = {}
            for i in member_indices:
                if i < len(relevant_complaints):
                    src = relevant_complaints[i]["source"]
                    source_counts[src] = source_counts.get(src, 0) + 1

            # Compute average authenticity for this cluster
            cluster_authenticity_scores = [
                relevant_complaints[i]["authenticity_score"] for i in member_indices
                if i < len(relevant_complaints)
            ]
            avg_auth = (
                sum(cluster_authenticity_scores) / len(cluster_authenticity_scores)
                if cluster_authenticity_scores else 0.5
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
        search.completed_at = datetime.utcnow()
        await db.commit()

        logger.info(
            f"Pipeline completed for '{query}': {len(cluster_data)} clusters "
            f"from {len(relevant_complaints)} relevant complaints"
        )

    except Exception as e:
        logger.error(f"Pipeline error for search {search_id}: {e}")
        await db.rollback()
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

    prd = PRDDraft(
        cluster_id=cluster_id,
        product_concept=prd_data.get("product_concept", ""),
        target_user=prd_data.get("target_user", ""),
        problem_statement=prd_data.get("problem_statement", ""),
        core_features=prd_data.get("core_features", []),
        mvp_suggestion=prd_data.get("mvp_suggestion", ""),
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
    Runs at most 4 collection tasks in parallel to avoid overwhelming APIs and the server.
    """
    all_queries = [original_query] + [s for s in subtopics if s != original_query]
    per_query_limit = max(8, 40 // len(all_queries))

    # Build list of (query, source) pairs
    task_specs: list[tuple[str, str]] = []
    for search_query in all_queries:
        for source in sources:
            if source in COLLECTOR_MAP:
                task_specs.append((search_query, source))

    if not task_specs:
        return []

    all_posts: list[CollectedPost] = []
    semaphore = asyncio.Semaphore(4)

    async def _run_one(q: str, src: str) -> list[CollectedPost]:
        async with semaphore:
            try:
                collector = COLLECTOR_MAP[src]()
                return await collector.collect(q, limit=per_query_limit)
            except Exception as e:
                logger.warning(f"Collection failed ({src}, {q[:40]}): {e}")
                return []

    results = await asyncio.gather(*[_run_one(q, s) for q, s in task_specs])
    for batch in results:
        all_posts.extend(batch)

    return all_posts


def _deduplicate_posts(posts: list[CollectedPost]) -> list[CollectedPost]:
    """Remove duplicate posts based on text similarity (exact prefix match)."""
    seen_texts: set[str] = set()
    unique: list[CollectedPost] = []

    for post in posts:
        # Use first 200 chars as dedup key
        key = post.text[:200].strip().lower()
        if key not in seen_texts:
            seen_texts.add(key)
            unique.append(post)

    return unique
