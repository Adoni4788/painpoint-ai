"use client";

import { useState } from "react";

const SOURCE_OPTIONS = [
  { id: "reddit", label: "Reddit", icon: "R", color: "bg-orange-500" },
  { id: "hackernews", label: "Hacker News", icon: "Y", color: "bg-amber-500" },
  { id: "amazon", label: "Amazon Reviews", icon: "A", color: "bg-yellow-600" },
  { id: "g2", label: "G2", icon: "G", color: "bg-green-600" },
];

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading: boolean;
}

export function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors ${
          focused
            ? "border-amber-400 shadow-[0_0_0_1px_rgba(251,191,36,0.4)] bg-white dark:bg-gray-800"
            : "border-gray-300 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-600 bg-white dark:bg-gray-800"
        }`}
      >
        <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search a niche, keyword, or competitor..."
          className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none min-w-0"
          disabled={loading}
        />

        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="shrink-0 px-4 py-1 bg-brand-600 text-white text-xs font-semibold rounded-full hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center gap-1.5">
              <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing
            </span>
          ) : (
            "Discover"
          )}
        </button>
      </div>
    </form>
  );
}

export function SourceFilters({
  sources,
  onToggle,
}: {
  sources: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {SOURCE_OPTIONS.map((src) => {
        const active = sources.includes(src.id);
        return (
          <button
            key={src.id}
            type="button"
            onClick={() => onToggle(src.id)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all border ${
              active
                ? "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 shadow-sm"
                : "bg-transparent text-gray-400 dark:text-gray-500 border-transparent hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-700"
            }`}
          >
            <span className={`w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-bold text-white ${
              active ? src.color : "bg-gray-300 dark:bg-gray-600"
            }`}>
              {src.icon}
            </span>
            {src.label}
            {active && (
              <svg className="w-2.5 h-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}

export { SOURCE_OPTIONS };
