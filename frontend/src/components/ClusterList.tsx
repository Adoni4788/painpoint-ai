"use client";

import { useState } from "react";

import { Cluster } from "@/lib/api";
import { getScoreBarColor } from "@/lib/scoreUtils";
import { TrendChip } from "@/components/TrendChip";

interface ClusterListProps {
  clusters: Cluster[];
  selectedClusterId: string | null;
  onSelectCluster: (cluster: Cluster) => void;
  /** Total complaints/data points for Data Coverage card */
  totalDataPoints?: number;
  /**
   * Optional niche resolver — given a cluster, returns the niche string used
   * for trend lookup. Reports passes the cluster's parent search_query;
   * Discover passes the active search's query. When null/undefined, the
   * trend chip simply doesn't render.
   */
  getNiche?: (cluster: Cluster) => string | null;
}

const INITIAL_SHOW_COUNT = 6;

export function ClusterList({
  clusters,
  selectedClusterId,
  onSelectCluster,
  totalDataPoints = 0,
  getNiche,
}: ClusterListProps) {
  const [showAll, setShowAll] = useState(false);
  const [featured, ...rest] = clusters;
  const displayed = showAll ? rest : rest.slice(0, INITIAL_SHOW_COUNT - 1);
  const hasMore = rest.length > INITIAL_SHOW_COUNT - 1;

  const dataPointsFormatted =
    totalDataPoints >= 1_000_000
      ? `${(totalDataPoints / 1_000_000).toFixed(1)}M`
      : totalDataPoints >= 1_000
        ? `${(totalDataPoints / 1_000).toFixed(1)}K`
        : totalDataPoints.toString();

  return (
    <div className="min-w-0 text-left font-sans">
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-normal text-gray-900 dark:text-white">
            Opportunity Board
          </h2>
          <p className="mt-1 font-mono text-xs text-gray-500 dark:text-gray-400">
            {clusters.length} clusters · ranked by opportunity score
          </p>
        </div>
        {totalDataPoints > 0 && (
          <div className="rounded-lg border border-gray-200/80 bg-white/60 px-4 py-2 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
            <p className="mb-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400">
              Data Coverage
            </p>
            <p className="font-mono text-base font-semibold text-gray-900 dark:text-white">
              {dataPointsFormatted} analyzed
            </p>
          </div>
        )}
      </div>

      <div className="grid min-w-0 gap-4">
        {featured && (
          <FeaturedClusterCard
            cluster={featured}
            rank={1}
            isSelected={featured.id === selectedClusterId}
            onClick={() => onSelectCluster(featured)}
            niche={getNiche?.(featured) ?? null}
          />
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {displayed.map((cluster, idx) => (
            <ClusterCard
              key={cluster.id}
              cluster={cluster}
              rank={idx + 2}
              isSelected={cluster.id === selectedClusterId}
              onClick={() => onSelectCluster(cluster)}
              niche={getNiche?.(cluster) ?? null}
            />
          ))}
        </div>
      </div>

      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="rounded-lg border border-gray-200 px-4 py-2 font-mono text-sm font-medium text-gray-500 transition-colors hover:border-gray-300 hover:text-ink dark:border-white/10 dark:text-gray-400 dark:hover:border-white/20 dark:hover:text-paper"
          >
            {showAll ? "Show less" : `Show all ${clusters.length} clusters`}
          </button>
        </div>
      )}
    </div>
  );
}

function FeaturedClusterCard({
  cluster,
  rank,
  isSelected,
  onClick,
  niche,
}: {
  cluster: Cluster;
  rank: number;
  isSelected: boolean;
  onClick: () => void;
  niche: string | null;
}) {
  return (
    <button
      onClick={onClick}
      className={`group/card relative w-full min-w-0 overflow-hidden rounded-lg border p-5 text-left transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 fill-mode-both delay-100 md:p-6 ${
        isSelected
          ? "border-[#4d7c7a]/50 bg-white ring-1 ring-[#4d7c7a] shadow-lg shadow-[#4d7c7a]/10 dark:bg-[#111214]"
          : "border-black/10 bg-white/60 hover:border-[#4d7c7a]/35 hover:bg-white hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-[#121214]"
      }`}
    >
      <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-3">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4d7c7a] dark:text-teal-300">
              Featured
            </span>
            <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
              #{rank}
            </span>
          </div>
          <h3 className="font-heading text-xl font-semibold leading-tight tracking-normal text-gray-900 dark:text-white md:text-2xl">
            {cluster.label}
          </h3>
          {cluster.summary && (
            <p className="mt-2 max-w-5xl text-sm leading-6 text-gray-600 line-clamp-2 dark:text-gray-400">
              {cluster.summary}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
              {cluster.complaint_count} complaints
            </span>
            <AuthenticityBar value={cluster.avg_authenticity} />
            <TrendChip niche={niche} label={cluster.label} />
          </div>
        </div>
        <div className="flex shrink-0 flex-row items-center justify-between gap-3 md:flex-col md:items-end">
          <div className="font-heading text-3xl font-semibold text-[#8b5cf6] dark:text-[#9f7aea] md:text-4xl">
            {cluster.opportunity_score.toFixed(1)}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400 md:mt-1">
            Opportunity
          </div>
        </div>
      </div>
      <div className="relative z-10 mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
        <ScoreBar label="Relevance" value={cluster.relevance_score} />
        <ScoreBar label="Frequency" value={cluster.frequency_score} />
        <ScoreBar label="Emotion" value={cluster.emotion_score} />
        <ScoreBar label="Urgency" value={cluster.urgency_score} />
      </div>
    </button>
  );
}

function ClusterCard({
  cluster,
  rank,
  isSelected,
  onClick,
  niche,
}: {
  cluster: Cluster;
  rank: number;
  isSelected: boolean;
  onClick: () => void;
  niche: string | null;
}) {
  return (
    <button
      onClick={onClick}
      style={{ animationDelay: `${rank * 100 + 100}ms` }}
      className={`group/card relative w-full min-w-0 overflow-hidden rounded-lg border p-4 text-left transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 fill-mode-both ${
        isSelected
          ? "border-[#4d7c7a]/50 bg-white ring-1 ring-[#4d7c7a]/50 shadow-lg shadow-[#4d7c7a]/10 dark:bg-[#111214]"
          : "border-black/10 bg-white/60 hover:border-[#4d7c7a]/35 hover:bg-white hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-[#121214]"
      }`}
    >
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-start gap-2">
            <span className="mt-0.5 shrink-0 font-mono text-[10px] font-semibold text-gray-400 dark:text-gray-500">
              #{rank}
            </span>
            <h3 className="font-heading text-base font-semibold leading-snug tracking-normal text-gray-900 line-clamp-2 dark:text-white">
              {cluster.label}
            </h3>
          </div>
          {cluster.summary && (
            <p className="mb-3 text-sm leading-5 text-gray-600 line-clamp-2 dark:text-gray-400">
              {cluster.summary}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-mono text-[10px] text-gray-500 dark:text-gray-400">
              {cluster.complaint_count} complaints
            </span>
            <AuthenticityBar value={cluster.avg_authenticity} />
            <TrendChip niche={niche} label={cluster.label} compact />
          </div>
        </div>
        <div className="shrink-0 font-heading text-xl font-semibold text-[#8b5cf6] dark:text-[#9f7aea]">
          {cluster.opportunity_score.toFixed(1)}
        </div>
      </div>
      <div className="relative z-10 mt-4 grid grid-cols-2 gap-2">
        <ScoreBar label="Rel" value={cluster.relevance_score} />
        <ScoreBar label="Freq" value={cluster.frequency_score} />
        <ScoreBar label="Emo" value={cluster.emotion_score} />
        <ScoreBar label="Urg" value={cluster.urgency_score} />
      </div>
    </button>
  );
}

function AuthenticityBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const barColor =
    value >= 0.7
      ? "bg-emerald-500"
      : value >= 0.5
        ? "bg-amber-500"
        : "bg-gray-400";

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] text-gray-500 dark:text-gray-400">
        AUTH
      </span>
      <div className="flex min-w-[80px] items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
          <div
            className={`h-full rounded-full ${barColor} transition-all duration-500`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="w-8 font-mono text-[10px] font-semibold text-gray-700 dark:text-gray-300">
          {pct}%
        </span>
      </div>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = (value / 10) * 100;
  const barColor = getScoreBarColor(value);

  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-medium uppercase text-gray-500 dark:text-gray-400">
          {label}
        </span>
        <span className="font-mono text-[10px] font-semibold text-ink dark:text-paper">
          {value.toFixed(1)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
