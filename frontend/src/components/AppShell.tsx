"use client";

import { useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MdAdd } from "react-icons/md";
import { UserButton, useUser } from "@clerk/nextjs";
import { BellNotificationIcon, DarkModeIcon, LightModeIcon } from "@/components/SidebarIcons";
import { Sidebar } from "@/components/Sidebar";
import { useTheme } from "@/components/ThemeProvider";
import { RefreshSearchesProvider } from "@/contexts/RefreshSearchesContext";
import { useSearches } from "@/contexts/SearchesContext";
import { SearchResult } from "@/lib/api";

interface AppShellProps {
  children: ReactNode;
  headerCenter?: ReactNode;
  headerRight?: ReactNode;
  activeSearchId?: string | null;
  onSelectSearch?: (search: SearchResult) => void;
  onNewSearch?: () => void;
}

export function AppShell({ children, headerCenter, headerRight, activeSearchId, onSelectSearch, onNewSearch }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { theme, toggle: toggleTheme } = useTheme();
  const { user } = useUser();
  const isPro = user?.publicMetadata?.pro === true;
  const router = useRouter();
  const pathname = usePathname();

  // Shared across all pages — no re-fetch on navigation
  const {
    searches,
    backendUnavailable,
    setBackendUnavailable,
    rateLimited,
    setRateLimited,
    loadSearches,
  } = useSearches();

  const handleSelectSearch = async (search: SearchResult) => {
    onSelectSearch?.(search);
    router.push("/discover");
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F0F2F5] dark:bg-[#050505]">
      {backendUnavailable && (
        <div className="shrink-0 px-4 py-2.5 bg-amber-500/15 dark:bg-amber-500/10 border-b border-amber-500/30 dark:border-amber-500/20 flex items-center justify-between gap-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Backend is starting or unavailable. Free-tier services may take up to a minute to wake.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadSearches()}
              className="shrink-0 px-3 py-1.5 text-xs font-medium bg-amber-500/20 dark:bg-amber-500/20 text-amber-800 dark:text-amber-200 rounded-lg hover:bg-amber-500/30 dark:hover:bg-amber-500/30 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => setBackendUnavailable(false)}
              className="shrink-0 p-1.5 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 dark:hover:bg-amber-500/20 rounded transition-colors"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      {rateLimited && (
        <div className="shrink-0 px-4 py-2.5 bg-orange-500/15 dark:bg-orange-500/10 border-b border-orange-500/30 dark:border-orange-500/20 flex items-center justify-between gap-4">
          <p className="text-sm text-orange-800 dark:text-orange-200">
            You&apos;ve hit the rate limit. Please wait a moment before trying again.
          </p>
          <button
            onClick={() => setRateLimited(false)}
            className="shrink-0 p-1.5 text-orange-700 dark:text-orange-300 hover:bg-orange-500/20 dark:hover:bg-orange-500/20 rounded transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      {/* Body: sidebar + right column */}
      <div className="flex flex-1 overflow-hidden bg-transparent">
        <Sidebar
          searches={searches}
          activeSearchId={activeSearchId ?? null}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onSelectSearch={handleSelectSearch}
        />

        {/* Right column: single full-height main panel with integrated header */}
        <main id="main-content" className="main-panel flex-1 flex flex-col overflow-hidden min-w-0 bg-white dark:bg-[#0A0A0B] border-l border-gray-200/60 dark:border-white/5">
          {/* Integrated header — one row: page label | center slot | controls */}
          <div className="noise-overlay shrink-0 flex items-center gap-3 pl-6 pr-4 h-16 rounded-tl-xl rounded-bl-xl">
            <div className="flex items-center gap-2 shrink-0">
              {headerCenter}
              {pathname === "/discover" && onNewSearch && (
                <button
                  onClick={onNewSearch}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-[#262626] transition-colors"
                  title="New search"
                  aria-label="New search"
                >
                  <MdAdd size={17} />
                </button>
              )}
            </div>
            <div className="flex-1 flex items-center justify-center min-w-0">
            </div>
            <div className="shrink-0 flex items-center gap-1">
              {headerRight}
              <button
                onClick={toggleTheme}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-[#262626] transition-colors"
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? <LightModeIcon size={18} /> : <DarkModeIcon size={18} />}
              </button>
              <button
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-[#262626] transition-colors"
                title="Notifications"
                aria-label="Notifications"
              >
                <BellNotificationIcon size={18} />
              </button>
              <div className="h-5 w-px bg-gray-200/60 dark:bg-white/10 self-center mx-1 shrink-0" aria-hidden />
              {isPro && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/25 mr-1">
                  ⚡ Pro
                </span>
              )}
              <UserButton />
            </div>
          </div>

          {/* Page content — full height */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <RefreshSearchesProvider refresh={loadSearches}>
              {children}
            </RefreshSearchesProvider>
          </div>
        </main>
      </div>
    </div>
  );
}
