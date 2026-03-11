"use client";

import { SearchResult } from "@/lib/api";

interface StatusBannerProps {
  search: SearchResult;
}

const STATUS_MESSAGES: Record<string, string> = {
  pending: "Starting search...",
  expanding: "Expanding query into subtopics...",
  collecting: "Collecting posts...",
  analyzing: "Analyzing content...",
  detecting: "Detecting complaints...",
  clustering: "Clustering pain points...",
  scoring: "Scoring opportunities...",
  failed: "Search failed. Please try again.",
};

export function StatusBanner({ search }: StatusBannerProps) {
  if (search.status === "completed") return null;

  const isFailed = search.status === "failed";

  return (
    <div className={`px-6 py-2.5 border-b text-sm flex items-center gap-2.5 ${
      isFailed
        ? "bg-red-50 text-red-600 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900"
        : "bg-gray-50 text-gray-600 border-gray-100 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-800"
    }`}>
      {!isFailed && (
        <svg className="animate-spin w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      <span className="text-xs font-medium">{STATUS_MESSAGES[search.status] ?? search.status}</span>
      {search.total_posts_fetched > 0 && (
        <span className="text-[11px] text-gray-400 dark:text-gray-500">
          {search.total_posts_fetched} posts
          {search.total_relevant_complaints > 0 && ` · ${search.total_relevant_complaints} relevant`}
        </span>
      )}
    </div>
  );
}
