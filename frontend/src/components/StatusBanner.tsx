"use client";

import { useEffect, useMemo, useState } from "react";

import { SearchResult } from "@/lib/api";
import { SOURCES } from "@/lib/sources";

interface StatusBannerProps {
  search: SearchResult;
}

type StageTone = {
  accent: string;
  badge: string;
  ring: string;
  panel: string;
};

type StageConfig = {
  id: string;
  label: string;
  detail: string;
  tone: StageTone;
};

const STAGES: StageConfig[] = [
  {
    id: "pending",
    label: "Preparing search",
    detail: "Setting up the run and validating your query.",
    tone: {
      accent: "text-amber-600 dark:text-amber-300",
      badge: "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/20",
      ring: "bg-amber-500",
      panel: "from-amber-500/10 to-transparent",
    },
  },
  {
    id: "expanding",
    label: "Expanding subtopics",
    detail: "Breaking the search into narrower angles to widen coverage.",
    tone: {
      accent: "text-cyan-700 dark:text-cyan-300",
      badge: "bg-cyan-500/12 text-cyan-700 dark:text-cyan-300 border-cyan-500/20",
      ring: "bg-cyan-500",
      panel: "from-cyan-500/10 to-transparent",
    },
  },
  {
    id: "collecting",
    label: "Collecting sources",
    detail: "Pulling raw posts and reviews from the selected source set.",
    tone: {
      accent: "text-blue-700 dark:text-blue-300",
      badge: "bg-blue-500/12 text-blue-700 dark:text-blue-300 border-blue-500/20",
      ring: "bg-blue-500",
      panel: "from-blue-500/10 to-transparent",
    },
  },
  {
    id: "analyzing",
    label: "Analyzing content",
    detail: "Reading each result and extracting the strongest signals.",
    tone: {
      accent: "text-sky-700 dark:text-sky-300",
      badge: "bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/20",
      ring: "bg-sky-500",
      panel: "from-sky-500/10 to-transparent",
    },
  },
  {
    id: "detecting",
    label: "Filtering complaints",
    detail: "Separating real pain points from noise and weak matches.",
    tone: {
      accent: "text-indigo-700 dark:text-indigo-300",
      badge: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
      ring: "bg-indigo-500",
      panel: "from-indigo-500/10 to-transparent",
    },
  },
  {
    id: "clustering",
    label: "Clustering themes",
    detail: "Grouping similar complaints into opportunity themes.",
    tone: {
      accent: "text-fuchsia-700 dark:text-fuchsia-300",
      badge: "bg-fuchsia-500/12 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/20",
      ring: "bg-fuchsia-500",
      panel: "from-fuchsia-500/10 to-transparent",
    },
  },
  {
    id: "scoring",
    label: "Scoring opportunities",
    detail: "Ranking the themes by frequency, urgency, and relevance.",
    tone: {
      accent: "text-violet-700 dark:text-violet-300",
      badge: "bg-violet-500/12 text-violet-700 dark:text-violet-300 border-violet-500/20",
      ring: "bg-violet-500",
      panel: "from-violet-500/10 to-transparent",
    },
  },
];

const FAILED_TONE: StageTone = {
  accent: "text-red-700 dark:text-red-300",
  badge: "bg-red-500/12 text-red-700 dark:text-red-300 border-red-500/20",
  ring: "bg-red-500",
  panel: "from-red-500/10 to-transparent",
};

function formatElapsed(createdAt: string, tick: number) {
  void tick;
  const started = new Date(createdAt).getTime();
  if (Number.isNaN(started)) return null;

  const seconds = Math.max(0, Math.floor((Date.now() - started) / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  if (minutes > 0) return `${minutes}m ${remainder}s`;
  return `${seconds}s`;
}

export function StatusBanner({ search }: StatusBannerProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (search.status === "completed" || search.status === "failed") return;

    const interval = window.setInterval(() => {
      setTick((value) => value + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [search.status]);

  if (search.status === "completed") return null;

  const currentStageIndex = STAGES.findIndex((stage) => stage.id === search.status);
  const currentStage =
    STAGES[currentStageIndex] ??
    ({
      id: search.status,
      label: search.status,
      detail: "Processing this search.",
      tone: search.status === "failed" ? FAILED_TONE : STAGES[0].tone,
    } satisfies StageConfig);

  const sourceLabels = search.sources
    .map((sourceId) => SOURCES.find((source) => source.id === sourceId)?.label ?? sourceId)
    .slice(0, 3);

  const stats = [
    {
      label: "Sources",
      value: `${search.sources.length}`,
      helper: sourceLabels.join(", "),
    },
    {
      label: "Collected",
      value: `${search.total_posts_fetched}`,
      helper: "raw posts",
    },
    {
      label: "Relevant",
      value: `${search.total_relevant_complaints}`,
      helper: "pain points",
    },
  ];

  const elapsed = formatElapsed(search.created_at, tick);

  return (
    <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#0A0A0B]">
      <div className={`relative overflow-hidden rounded-3xl border border-gray-200/80 dark:border-white/10 bg-gradient-to-br ${currentStage.tone.panel} via-white to-white dark:via-[#111214] dark:to-[#0D0E10] shadow-[0_18px_50px_rgba(15,23,42,0.06)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.28)]`}>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#4d7c7a]/45 to-transparent" />

        <div className="grid gap-6 px-5 py-5 lg:grid-cols-[minmax(0,1.25fr)_320px] lg:px-6">
          <div className="min-w-0 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${currentStage.tone.badge}`}>
                    {search.status !== "failed" ? (
                      <span className="relative flex h-2.5 w-2.5">
                        <span className={`absolute inset-0 rounded-full ${currentStage.tone.ring} opacity-35 animate-ping`} />
                        <span className={`relative rounded-full ${currentStage.tone.ring} h-2.5 w-2.5`} />
                      </span>
                    ) : (
                      <span className={`rounded-full ${currentStage.tone.ring} h-2.5 w-2.5`} />
                    )}
                    {search.status === "failed" ? "Run failed" : "Live activity"}
                  </span>
                  {elapsed && (
                    <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                      {elapsed} elapsed
                    </span>
                  )}
                </div>

                <h3 className={`mt-3 text-xl font-semibold tracking-tight ${currentStage.tone.accent}`}>
                  {currentStage.label}
                </h3>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                  {search.status === "failed"
                    ? "The run stopped before results were generated. You can retry the same search or adjust the query."
                    : currentStage.detail}
                </p>
              </div>

              <div className="min-w-0 rounded-2xl border border-gray-200 dark:border-white/10 bg-white/75 dark:bg-white/5 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                  Query
                </div>
                <div className="mt-1 max-w-[28rem] truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                  {search.query}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white/70 dark:bg-white/5 px-4 py-3"
                >
                  <div className="text-[11px] uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                    {stat.label}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {stat.helper}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white/70 dark:bg-white/5 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                  Progress
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {search.status === "failed"
                    ? "Stopped before completion"
                    : `${Math.max(currentStageIndex + 1, 1)} of ${STAGES.length} stages`}
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {STAGES.map((stage, index) => {
                  const isCurrent = stage.id === search.status;
                  const isComplete =
                    search.status !== "failed" && currentStageIndex > -1 && index < currentStageIndex;
                  const isFuture =
                    search.status !== "failed" && currentStageIndex > -1 && index > currentStageIndex;

                  return (
                    <div
                      key={stage.id}
                      className={`flex items-start gap-3 rounded-2xl border px-3 py-3 transition-colors ${
                        isCurrent
                          ? "border-[#4d7c7a]/25 bg-[#4d7c7a]/8 dark:border-[#4d7c7a]/30 dark:bg-[#4d7c7a]/10"
                          : isComplete
                            ? "border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-white/[0.04]"
                            : "border-transparent bg-transparent"
                      }`}
                    >
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                        {isComplete ? (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                              <path
                                fillRule="evenodd"
                                d="M16.704 5.29a1 1 0 010 1.42l-7.2 7.2a1 1 0 01-1.415 0l-3.2-3.2a1 1 0 111.414-1.42l2.493 2.494 6.493-6.494a1 1 0 011.415 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </span>
                        ) : isCurrent ? (
                          <span className="relative flex h-6 w-6 items-center justify-center">
                            <span className={`absolute inset-0 rounded-full ${stage.tone.ring} opacity-20`} />
                            <span className={`absolute inset-[5px] rounded-full ${stage.tone.ring} animate-pulse`} />
                          </span>
                        ) : (
                          <span className={`h-2.5 w-2.5 rounded-full ${isFuture ? "bg-gray-300 dark:bg-white/15" : stage.tone.ring}`} />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {stage.label}
                          </span>
                          {isCurrent && (
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${stage.tone.badge}`}>
                              Active
                            </span>
                          )}
                          {isComplete && (
                            <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                              Done
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                          {stage.detail}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <StatusSidePanel search={search} currentStage={currentStage} />
        </div>
      </div>
    </div>
  );
}

function StatusSidePanel({
  search,
  currentStage,
}: {
  search: SearchResult;
  currentStage: StageConfig;
}) {
  const sourceNames = useMemo(
    () =>
      search.sources.map(
        (sourceId) => SOURCES.find((source) => source.id === sourceId)?.label ?? sourceId,
      ),
    [search.sources],
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200/80 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
          What is happening
        </div>
        <p className="mt-3 text-sm leading-6 text-gray-700 dark:text-gray-300">
          {search.status === "failed"
            ? "This search ended early. No opportunity clusters were returned."
            : `GapLens is currently ${currentStage.label.toLowerCase()}. Results will appear below as soon as the pipeline finishes.`}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200/80 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
          Source set
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {sourceNames.map((source) => (
            <span
              key={source}
              className="inline-flex items-center rounded-full border border-gray-200 dark:border-white/10 bg-white/80 dark:bg-white/5 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300"
            >
              {source}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
