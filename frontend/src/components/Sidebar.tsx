"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchResult } from "@/lib/api";

interface SidebarProps {
  searches: SearchResult[];
  activeSearchId: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onSelectSearch: (search: SearchResult) => void;
}

const NAV_ITEMS = [
  {
    label: "Discover",
    href: "/",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    label: "Reports",
    href: "/reports",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/settings",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export function Sidebar({ searches, activeSearchId, isOpen, onToggle, onSelectSearch }: SidebarProps) {
  const pathname = usePathname();

  if (!isOpen) return null;

  return (
    <aside className="w-64 bg-white dark:bg-gray-900 flex flex-col shrink-0">
      {/* Navigation Links */}
      <div className="px-3 pt-3 pb-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              }`}
            >
              <span className={isActive ? "text-brand-600 dark:text-brand-400" : "text-gray-400 dark:text-gray-500"}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-gray-100 dark:border-gray-800" />

      {/* Recent Searches */}
      <nav className="flex-1 overflow-y-auto py-3">
        <div className="px-3 mb-2">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2">Recent Searches</p>
        </div>
        {searches.length === 0 ? (
          <p className="px-5 py-3 text-sm text-gray-400 dark:text-gray-500">No searches yet</p>
        ) : (
          <ul className="space-y-0">
            {searches.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => onSelectSearch(s)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    s.id === activeSearchId
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
                      : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate mr-2">{s.query}</span>
                    <StatusDot status={s.status} />
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 dark:text-gray-500">
                    <span>{new Date(s.created_at).toLocaleDateString()}</span>
                    {s.status === "completed" && (
                      <span>{s.total_relevant_complaints || s.total_complaints_found} relevant</span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <div className="p-3">
        <p className="text-[10px] text-gray-400 dark:text-gray-600 text-center">PainPoint AI v0.1</p>
      </div>
    </aside>
  );
}

function StatusDot({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    pending: "bg-yellow-400",
    expanding: "bg-cyan-400 animate-pulse",
    collecting: "bg-yellow-400 animate-pulse",
    analyzing: "bg-blue-400 animate-pulse",
    detecting: "bg-blue-400 animate-pulse",
    clustering: "bg-purple-400 animate-pulse",
    scoring: "bg-purple-400 animate-pulse",
    completed: "bg-green-400",
    failed: "bg-red-400",
  };

  return (
    <span className={`w-2 h-2 rounded-full shrink-0 ${colorMap[status] || "bg-gray-300"}`} />
  );
}
