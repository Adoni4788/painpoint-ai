"use client";

import { useState } from "react";
import { Cluster } from "@/lib/api";
import { getScoreBarColor } from "@/lib/scoreUtils";

interface ClusterListProps {
  clusters: Cluster[];
  selectedClusterId: string | null;
  onSelectCluster: (cluster: Cluster) => void;
  /** Total complaints/data points for Data Coverage card */
  totalDataPoints?: number;
}

const INITIAL_SHOW_COUNT = 6;

export function ClusterList({
  clusters,
  selectedClusterId,
  onSelectCluster,
  totalDataPoints = 0,
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
    <div className="text-left min-w-0 font-sans">
      {/* Bento Grid Header */}
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold text-ink dark:text-paper">
            Opportunity Board
          </h2>
          <p className="mt-1 font-mono text-xs text-gray-500 dark:text-gray-400">
            {clusters.length} clusters · ranked by opportunity score
          </p>
        </div>
        {totalDataPoints > 0 && (
          <div className="rounded-lg border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-ink/50 px-4 py-2">
            <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Data Coverage
            </p>
            <p className="font-mono text-lg font-semibold text-ink dark:text-paper">
              {dataPointsFormatted} analyzed
            </p>
          </div>
        )}
      </div>

      {/* Bento Grid */}
      <div className="grid gap-4 min-w-0">
        {/* Featured Opportunity — Hero card */}
        {featured && (
          <FeaturedClusterCard
            cluster={featured}
            rank={1}
            isSelected={featured.id === selectedClusterId}
            onClick={() => onSelectCluster(featured)}
          />
        )}

        {/* Secondary cards in grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map((cluster, idx) => (
            <BentoClusterCard
              key={cluster.id}
              cluster={cluster}
              rank={idx + 2}
              isSelected={cluster.id === selectedClusterId}
              onClick={() => onSelectCluster(cluster)}
            />
          ))}
        </div>
      </div>

      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="font-mono text-sm font-medium text-gray-500 hover:text-ink dark:text-gray-400 dark:hover:text-paper px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 transition-colors"
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
}: {
  cluster: Cluster;
  rank: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`noise-overlay w-full min-w-0 text-left p-6 rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
        isSelected
          ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-lg dark:shadow-indigo-500/10"
          : "border-gray-200 dark:border-white/20 bg-white dark:bg-ink/50 hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:shadow-lg"
      }`}
    >
      <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
              #FEATURED
            </span>
            <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
              #{rank}
            </span>
          </div>
          <h3 className="font-heading text-xl md:text-2xl font-bold text-ink dark:text-paper">
            {cluster.label}
          </h3>
          {cluster.summary && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {cluster.summary}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
              {cluster.complaint_count} complaints
            </span>
            <AuthenticityBar value={cluster.avg_authenticity} />
          </div>
        </div>
        <div className="shrink-0 flex flex-col items-end">
          <div className="gradient-primary-text font-heading text-3xl md:text-4xl font-bold">
            {cluster.opportunity_score.toFixed(1)}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1">
            Opportunity
          </div>
        </div>
      </div>
      <div className="relative z-10 mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <ScoreBar label="Relevance" value={cluster.relevance_score} />
        <ScoreBar label="Frequency" value={cluster.frequency_score} />
        <ScoreBar label="Emotion" value={cluster.emotion_score} />
        <ScoreBar label="Urgency" value={cluster.urgency_score} />
      </div>
    </button>
  );
}

function BentoClusterCard({
  cluster,
  rank,
  isSelected,
  onClick,
}: {
  cluster: Cluster;
  rank: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`noise-overlay w-full min-w-0 text-left p-5 rounded-xl border transition-all duration-300 overflow-hidden ${
        isSelected
          ? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 shadow-md"
          : "border border-gray-200 dark:border-white/10 bg-white dark:bg-ink/30 hover:border-indigo-300 dark:hover:border-indigo-500/30 hover:shadow-md"
      }`}
    >
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] font-bold text-gray-400 dark:text-gray-500">
              #{rank}
            </span>
            <h3 className="font-heading font-semibold text-ink dark:text-paper truncate">
              {cluster.label}
            </h3>
          </div>
          {cluster.summary && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
              {cluster.summary}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-mono text-[10px] text-gray-500 dark:text-gray-400">
              {cluster.complaint_count} complaints
            </span>
            <AuthenticityBar value={cluster.avg_authenticity} />
          </div>
        </div>
        <div className="gradient-primary-text font-heading text-xl font-bold shrink-0">
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
      <div className="flex items-center gap-2 min-w-[80px]">
        <div className="h-1.5 flex-1 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${barColor} transition-all duration-500`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="font-mono text-[10px] font-semibold text-gray-700 dark:text-gray-300 w-8">
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
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="font-mono text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">
          {label}
        </span>
        <span className="font-mono text-[10px] font-semibold text-ink dark:text-paper">
          {value.toFixed(1)}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
