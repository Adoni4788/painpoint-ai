"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MdChevronLeft, MdMenu, MdLightMode, MdDarkMode, MdPerson } from "react-icons/md";
import { Sidebar } from "@/components/Sidebar";
import { Logo } from "@/components/Logo";
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
}

export function AppShell({ children, headerCenter, headerRight, activeSearchId, onSelectSearch }: AppShellProps) {
  const [searches, setSearches] = useState<SearchResult[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [backendUnavailable, setBackendUnavailable] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();
  const { activeWorkspaceId } = useWorkspace();
  const router = useRouter();

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
    <div className="flex flex-col h-screen overflow-hidden">
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
      {/* Full-width header */}
      <header className="bg-[#e9edf5] dark:bg-[#171717] px-4 py-4 shrink-0 z-10">
        <div className="flex items-center gap-3">
          {/* Left: logo + toggle — matches sidebar width (w-64) */}
          <div className="w-64 flex items-center gap-2 shrink-0">
            <Logo size={28} color={theme === "dark" ? "#ffffff" : "#4d7c7a"} className="logo-app shrink-0" />
            <span className="text-lg font-semibold tracking-tight hidden sm:inline">
              <span style={{ color: theme === "dark" ? "#ffffff" : "#4d7c7a" }}>Gap</span>
              <span style={{ color: theme === "dark" ? "#ffffff" : "#d97706" }}>Lens</span>
            </span>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-[#262626] transition-colors"
            >
              {sidebarOpen ? (
                <MdChevronLeft size={16} />
              ) : (
                <MdMenu size={16} />
              )}
            </button>
          </div>

          {/* Center: search bar centered in header */}
          <div className="flex-1 flex justify-center min-w-0 pl-2">
            {headerCenter}
          </div>

          {/* Right: page-specific actions + theme toggle + profile avatar */}
          <div className="shrink-0 flex items-center gap-2">
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
              className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#262626] flex items-center justify-center ring-2 ring-gray-400/40 hover:ring-amber-500 dark:hover:ring-amber-500 transition-all"
              title="Profile"
            >
              <MdPerson size={16} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 overflow-hidden bg-[#e9edf5] dark:bg-[#171717]">
        <Sidebar
          searches={searches}
          activeSearchId={activeSearchId ?? null}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onSelectSearch={handleSelectSearch}
        />

        <main id="main-content" className="flex-1 flex flex-col overflow-hidden min-w-0 bg-white dark:bg-black rounded-tl-2xl border-t border-l border-gray-200 dark:border-white/10">
          <RefreshSearchesProvider refresh={loadSearches}>
            {children}
          </RefreshSearchesProvider>
        </main>
      </div>
    </div>
  );
}
