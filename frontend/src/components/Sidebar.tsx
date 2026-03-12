"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MdSearch, MdAssessment, MdSettings } from "react-icons/md";
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
    icon: <MdSearch size={16} />,
  },
  {
    label: "Reports",
    href: "/reports",
    icon: <MdAssessment size={16} />,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: <MdSettings size={16} />,
  },
];

export function Sidebar({ searches, activeSearchId, isOpen, onToggle, onSelectSearch }: SidebarProps) {
  const pathname = usePathname();

  if (!isOpen) {
    return (
      <aside className="w-14 bg-[#f2f2f2] dark:bg-[#171717] flex flex-col shrink-0">
        <div className="flex flex-col gap-0.5 px-2 pt-3 pb-2">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex items-center justify-center p-2 transition-colors border-0 ring-0 rounded-full ${
                  isActive
                    ? "bg-[#dedede] text-gray-900 dark:bg-[#262626] dark:text-gray-100"
                    : "text-gray-600 hover:bg-gray-200/60 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#262626] dark:hover:text-gray-200"
                }`}
              >
                <span className={isActive ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"}>
                  {item.icon}
                </span>
              </Link>
            );
          })}
        </div>
        {searches.length > 0 && (
          <button
            onClick={onToggle}
            title={`Expand to see ${searches.length} recent search${searches.length === 1 ? "" : "es"}`}
            className="mt-auto mx-2 mb-2 p-2 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-[#262626] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 12h14" />
            </svg>
          </button>
        )}
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-[#f2f2f2] dark:bg-[#171717] flex flex-col shrink-0">
      {/* Navigation Links */}
      <div className="flex flex-col gap-0.5 px-3 pt-3 pb-2">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-2.5 py-1.5 text-[13px] font-medium transition-colors w-full border-0 ring-0 rounded-full ${
                isActive
                  ? "bg-[#dedede] text-gray-900 dark:bg-[#262626] dark:text-gray-100"
                  : "text-gray-600 hover:bg-gray-200/60 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#262626] dark:hover:text-gray-200"
              }`}
            >
              <span className={isActive ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-gray-100 dark:border-white/10" />

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
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-0 ring-0 ${
                    s.id === activeSearchId
                      ? "bg-[#dedede] text-gray-900 dark:bg-[#262626] dark:text-gray-100 rounded-l-full -mr-4 pr-5 relative z-10"
                      : "text-gray-700 hover:bg-gray-200/60 dark:text-gray-300 dark:hover:bg-[#262626] rounded-none"
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
        <p className="text-[10px] text-gray-400 dark:text-gray-600 text-center">GapLens v0.1</p>
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
