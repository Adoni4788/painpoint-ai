"use client";

import { SearchResult } from "@/lib/api";

interface StatusBannerProps {
  search: SearchResult;
}

const STATUS_MESSAGES: Record<string, { label: string; light: string; dark: string }> = {
  pending: { label: "Starting search...", light: "bg-yellow-50 text-yellow-700 border-yellow-200", dark: "dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-900" },
  expanding: { label: "Expanding query into niche subtopics...", light: "bg-cyan-50 text-cyan-700 border-cyan-200", dark: "dark:bg-cyan-950/30 dark:text-cyan-400 dark:border-cyan-900" },
  collecting: { label: "Collecting from expanded subtopic searches...", light: "bg-blue-50 text-blue-700 border-blue-200", dark: "dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900" },
  analyzing: { label: "Analyzing content...", light: "bg-blue-50 text-blue-700 border-blue-200", dark: "dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900" },
  detecting: { label: "Detecting complaints and filtering by relevance...", light: "bg-indigo-50 text-indigo-700 border-indigo-200", dark: "dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900" },
  clustering: { label: "Clustering niche-specific pain points...", light: "bg-purple-50 text-purple-700 border-purple-200", dark: "dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900" },
  scoring: { label: "Scoring opportunities...", light: "bg-purple-50 text-purple-700 border-purple-200", dark: "dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900" },
  failed: { label: "Search failed. Please try again.", light: "bg-red-50 text-red-700 border-red-200", dark: "dark:bg-red-950/30 dark:text-red-400 dark:border-red-900" },
};

export function StatusBanner({ search }: StatusBannerProps) {
  if (search.status === "completed") return null;

  const info = STATUS_MESSAGES[search.status] ?? {
    label: search.status,
    light: "bg-gray-50 text-gray-700 border-gray-200",
    dark: "dark:bg-[#262626] dark:text-gray-300 dark:border-white/10",
  };

  return (
    <div className={`px-6 py-3 border-b text-sm flex items-center gap-3 ${info.light} ${info.dark}`}>
      {search.status !== "failed" && (
        <svg className="animate-spin w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      <span className="font-medium">{info.label}</span>
      {search.total_posts_fetched > 0 && (
        <span className="text-xs opacity-75">
          {search.total_posts_fetched} posts collected
          {search.total_relevant_complaints > 0 && ` · ${search.total_relevant_complaints} relevant`}
        </span>
      )}
    </div>
  );
}
