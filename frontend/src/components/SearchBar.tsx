"use client";

import { useState, useRef, useEffect } from "react";

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
            ? "border-gray-400 shadow-[0_0_0_1px_rgba(0,0,0,0.1)] bg-white dark:bg-[#262626]"
            : "border-gray-300 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/20 bg-white dark:bg-[#262626]"
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
          className="shrink-0 px-4 py-1 bg-black text-white text-xs font-semibold rounded-full hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:bg-white dark:text-black dark:hover:bg-gray-200"
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
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const selectedCount = sources.length;
  const label = selectedCount === 0 ? "Sources" : `${selectedCount} source${selectedCount === 1 ? "" : "s"}`;

  return (
    <div className="relative w-fit" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 text-gray-700 dark:text-gray-200 ${
          open
            ? "bg-white dark:bg-[#1a1a1a] shadow-md shadow-black/5 dark:shadow-black/10 ring-1 ring-gray-200/80 dark:ring-white/10"
            : "bg-gray-50/80 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 hover:shadow-sm"
        }`}
      >
        <span className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          {label}
        </span>
        <svg className={`w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 py-2 min-w-[200px] rounded-xl bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-xl border border-gray-200/60 dark:border-white/10 shadow-xl shadow-black/10 dark:shadow-black/10 z-50">
          <div className="px-2.5">
            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 mb-2">Data sources</p>
            <div className="space-y-0.5">
              {SOURCE_OPTIONS.map((src) => {
                const active = sources.includes(src.id);
                return (
                  <button
                    key={src.id}
                    type="button"
                    onClick={() => onToggle(src.id)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                      active
                        ? "text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-white/10"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                    }`}
                  >
                  <span className={`w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-bold text-white shrink-0 ${active ? src.color : "bg-gray-300 dark:bg-[#404040]"}`}>
                    {src.icon}
                  </span>
                  {src.label}
                  {active && (
                    <svg className="w-3 h-3 text-emerald-500 dark:text-emerald-400 ml-auto shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { SOURCE_OPTIONS };
