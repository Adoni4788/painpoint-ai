"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MdLightMode, MdDarkMode, MdPerson, MdAdd } from "react-icons/md";
import { Sidebar } from "@/components/Sidebar";
import { useTheme } from "@/components/ThemeProvider";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { RefreshSearchesProvider } from "@/contexts/RefreshSearchesContext";
import { SearchResult, listSearches } from "@/lib/api";

interface AppShellProps {
  children: ReactNode;
  headerCenter?: ReactNode;
  headerRight?: ReactNode;
  activeSearchId?: string | null;
  onSelectSearch?: (search: SearchResult) => void;
  onNewSearch?: () => void;
  pageLabel?: string;
}

export function AppShell({ children, headerCenter, headerRight, activeSearchId, onSelectSearch, onNewSearch, pageLabel }: AppShellProps) {
  const [searches, setSearches] = useState<SearchResult[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [backendUnavailable, setBackendUnavailable] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();
  const { activeWorkspaceId } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();

  const PAGE_LABELS: Record<string, string> = {
    "/discover": "Discover",
    "/validate": "Validate",
    "/reports": "Opportunity Reports",
    "/settings": "Settings",
    "/test-sentry": "Test Sentry",
  };
  const currentPageLabel = pageLabel ?? PAGE_LABELS[pathname] ?? pathname?.replace(/^\//, "") ?? "GapLens";

  const loadSearches = useCallback(async () => {
    try {
      setBackendUnavailable(false);
      const data = await listSearches(activeWorkspaceId ?? undefined);
      setSearches(data);
    } catch (e) {
      console.error("Failed to load searches:", e);
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("502") || msg.includes("503")) {
        setBackendUnavailable(true);
      }
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    loadSearches();
  }, [loadSearches]);

  const handleSelectSearch = async (search: SearchResult) => {
    onSelectSearch?.(search);
    router.push("/discover");
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#e9edf5] dark:bg-[#171717]">
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
      {/* Body: sidebar + main content */}
      <div className="flex flex-1 overflow-hidden bg-[#e9edf5] dark:bg-[#171717]">
        <Sidebar
          searches={searches}
          activeSearchId={activeSearchId ?? null}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onSelectSearch={handleSelectSearch}
        />

        {/* bg matches canvas so rounded-tr-2xl corner on content div shows the correct color */}
        <main id="main-content" className="flex-1 flex flex-col overflow-hidden min-w-0 bg-[#e9edf5] dark:bg-[#171717] rounded-2xl border-t border-l border-gray-200 dark:border-white/10">
          {/* Tab bar */}
          <div className="shrink-0 flex items-end gap-1 pl-0 pr-4 pt-3 pb-0 bg-[#e9edf5] dark:bg-[#171717]">
            {/* Tab + plus button — vertically aligned */}
            <div className="flex items-center gap-1 -mb-px">
              <div className="-ml-px pl-6 pr-8 py-3 rounded-t-xl bg-white dark:bg-black border-x border-t border-gray-200 dark:border-white/10 relative z-10">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 text-left">
                  {currentPageLabel}
                </p>
                {/* Curved element at bottom-right to blend tab into content */}
                <svg
                  className="absolute bottom-0 right-0 w-6 h-6 pointer-events-none"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    d="M 0 24 L 24 24 L 24 0 A 24 24 0 0 1 0 24 Z"
                    className="fill-white dark:fill-black"
                  />
                </svg>
              </div>
              {pathname === "/discover" && onNewSearch && (
                <button
                  onClick={onNewSearch}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-[#262626] transition-colors shrink-0"
                  title="New search"
                  aria-label="New search"
                >
                  <MdAdd size={18} />
                </button>
              )}
            </div>
            <div className="flex-1 flex items-center justify-center min-w-0 pb-2">
              {headerCenter}
            </div>
            <div className="shrink-0 flex items-center gap-2 pb-2">
              {headerRight}
              <button
                onClick={toggleTheme}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-[#262626] transition-colors"
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? (
                  <MdLightMode size={16} />
                ) : (
                  <MdDarkMode size={16} />
                )}
              </button>
              <button
                onClick={() => router.push("/settings")}
                className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#262626] flex items-center justify-center ring-1 ring-gray-300/50 dark:ring-white/10 hover:ring-amber-500/60 dark:hover:ring-amber-500/60 transition-all"
                title="Settings"
                aria-label="Open settings"
              >
                <MdPerson size={16} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white dark:bg-black border-t border-r border-gray-200 dark:border-white/10 rounded-tr-2xl rounded-br-2xl">
            <RefreshSearchesProvider refresh={loadSearches}>
              {children}
            </RefreshSearchesProvider>
          </div>
        </main>
      </div>
    </div>
  );
}
