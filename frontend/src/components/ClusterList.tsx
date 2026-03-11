"use client";

import { Cluster } from "@/lib/api";

interface ClusterListProps {
  clusters: Cluster[];
  selectedClusterId: string | null;
  onSelectCluster: (cluster: Cluster) => void;
}

export function ClusterList({ clusters, selectedClusterId, onSelectCluster }: ClusterListProps) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Pain Point Clusters</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {clusters.length} clusters found, ranked by opportunity score
        </p>
      </div>

      <div className="grid gap-3">
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
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-lg border transition-all ${
        isSelected
          ? "border-gray-900 bg-gray-50 shadow-sm dark:bg-gray-800/50 dark:border-gray-400"
          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">#{rank}</span>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{cluster.label}</h3>
          </div>
          {cluster.summary && (
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2 leading-relaxed">{cluster.summary}</p>
          )}

          <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500">
            <span>{cluster.complaint_count} complaints</span>
            {Object.entries(cluster.source_breakdown).map(([src, count]) => (
              <span key={src} className="capitalize">{src}: {count}</span>
            ))}
            <AuthenticityBadge value={cluster.avg_authenticity} />
          </div>
        </div>

        <div className="text-center shrink-0">
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100 tabular-nums">{cluster.opportunity_score.toFixed(1)}</div>
          <div className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">Score</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
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
  const label = value >= 0.7 ? "Strong evidence" : value >= 0.4 ? "Mixed evidence" : "Weak evidence";
  return (
    <span className="text-gray-400 dark:text-gray-500" title={label}>
      {pct}% authentic
    </span>
  );
}

function ScoreMini({ label, value }: { label: string; value: number }) {
  const pct = (value / 10) * 100;

  return (
    <div>
      <div className="flex justify-between items-center mb-0.5">
        <span className="text-[9px] font-medium text-gray-400 dark:text-gray-500 uppercase">{label}</span>
        <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 tabular-nums">{value.toFixed(1)}</span>
      </div>
      <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-gray-900 dark:bg-gray-300 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
