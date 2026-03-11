"use client";

import { Cluster } from "@/lib/api";

interface ClusterListProps {
  clusters: Cluster[];
  selectedClusterId: string | null;
  onSelectCluster: (cluster: Cluster) => void;
}

export function ClusterList({ clusters, selectedClusterId, onSelectCluster }: ClusterListProps) {
  return (
    <div className="text-left min-w-0">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Gap Clusters</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {clusters.length} clusters found, ranked by opportunity score
        </p>
      </div>

      <div className="grid gap-4 min-w-0">
        {clusters.map((cluster, idx) => (
          <ClusterCard
            key={cluster.id}
            cluster={cluster}
            rank={idx + 1}
            isSelected={cluster.id === selectedClusterId}
            onClick={() => onSelectCluster(cluster)}
          />
        ))}
      </div>
    </div>
  );
}

function ClusterCard({
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
  const scoreColor = cluster.opportunity_score >= 7
    ? "text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/40 dark:border-green-800"
    : cluster.opportunity_score >= 5
    ? "text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950/40 dark:border-yellow-800"
    : "text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-[#262626] dark:border-white/10";

  return (
    <button
      onClick={onClick}
      className={`w-full min-w-0 text-left p-5 rounded-xl border-2 transition-all hover:shadow-md overflow-hidden ${
        isSelected
          ? "border-gray-900 bg-gray-50 shadow-md dark:bg-[#262626] dark:border-white/30"
          : "border-gray-200 bg-white hover:border-gray-300 dark:border-white/10 dark:bg-[#262626] dark:hover:border-white/20"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500">#{rank}</span>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{cluster.label}</h3>
          </div>
          {cluster.summary && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">{cluster.summary}</p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              {cluster.complaint_count} complaints
            </span>
            {Object.entries(cluster.source_breakdown).map(([src, count]) => (
              <span key={src} className="capitalize">{src}: {count}</span>
            ))}
            <AuthenticityBadge value={cluster.avg_authenticity} />
          </div>
        </div>

        <div className={`text-center px-2 sm:px-3 py-2 rounded-lg border ${scoreColor} shrink-0`}>
          <div className="text-xl font-bold">{cluster.opportunity_score.toFixed(1)}</div>
          <div className="text-[10px] font-medium uppercase tracking-wider">Score</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ScoreMini label="Relevance" value={cluster.relevance_score} />
        <ScoreMini label="Frequency" value={cluster.frequency_score} />
        <ScoreMini label="Emotion" value={cluster.emotion_score} />
        <ScoreMini label="Urgency" value={cluster.urgency_score} />
      </div>
    </button>
  );
}

function AuthenticityBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.7 ? "text-green-600 dark:text-green-400" : value >= 0.4 ? "text-yellow-600 dark:text-yellow-400" : "text-red-500 dark:text-red-400";
  const label = value >= 0.7 ? "Strong evidence" : value >= 0.4 ? "Mixed evidence" : "Weak evidence";
  return (
    <span className={`font-medium ${color}`} title={label}>
      {pct}% authentic
    </span>
  );
}

function ScoreMini({ label, value }: { label: string; value: number }) {
  const pct = (value / 10) * 100;
  const barColor = value >= 7 ? "bg-green-400" : value >= 5 ? "bg-yellow-400" : "bg-gray-300 dark:bg-[#404040]";

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">{label}</span>
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{value.toFixed(1)}</span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-[#262626] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
