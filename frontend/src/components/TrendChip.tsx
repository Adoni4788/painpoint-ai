"use client";

import { useEffect, useState } from "react";
import { ClusterTrendDelta, getClusterTrend } from "@/lib/api";

interface TrendChipProps {
  niche: string | null | undefined;
  label: string;
  /** Optional: render compact (chip-only, no sparkline). */
  compact?: boolean;
}

/**
 * Shows "+47% vs last week" + a tiny sparkline for any cluster that has
 * snapshot history. Renders nothing for clusters without snapshots — most
 * ad-hoc user searches will be in this bucket until the digest cron has
 * been running for a few weeks.
 */
export function TrendChip({ niche, label, compact = false }: TrendChipProps) {
  const [trend, setTrend] = useState<ClusterTrendDelta | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!niche || !label) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    getClusterTrend(niche, label)
      .then((data) => {
        if (!cancelled) {
          setTrend(data);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [niche, label]);

  if (!loaded || !trend || trend.weeks_observed < 2) return null;

  const pct = trend.opportunity_score_delta_pct;
  if (pct === null || Number.isNaN(pct)) return null;

  const direction: "up" | "down" | "flat" =
    pct > 1 ? "up" : pct < -1 ? "down" : "flat";

  const colors = {
    up: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300 border-emerald-500/30",
    down: "bg-red-500/10 text-red-700 dark:bg-red-400/10 dark:text-red-300 border-red-500/30",
    flat: "bg-gray-500/10 text-gray-600 dark:bg-gray-400/10 dark:text-gray-400 border-gray-500/30",
  }[direction];

  const arrow = direction === "up" ? "↑" : direction === "down" ? "↓" : "→";
  const formatted = `${pct > 0 ? "+" : ""}${pct.toFixed(0)}%`;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold ${colors}`}
      title={`Tracked across ${trend.weeks_observed} weeks. Latest: ${trend.latest_opportunity_score.toFixed(1)}, previous: ${(trend.previous_opportunity_score ?? 0).toFixed(1)}.`}
    >
      <span aria-hidden>{arrow}</span>
      <span>{formatted}</span>
      {!compact && trend.weeks_observed >= 3 && (
        <Sparkline points={trend.points.map((p) => p.opportunity_score)} />
      )}
    </span>
  );
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const w = 36;
  const h = 12;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const path = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((v - min) / span) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="opacity-80"
      aria-hidden
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
