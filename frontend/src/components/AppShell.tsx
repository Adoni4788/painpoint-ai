"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { useTheme } from "@/components/ThemeProvider";
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
  const { theme, toggle: toggleTheme } = useTheme();
  const router = useRouter();

  const loadSearches = useCallback(async () => {
    try {
      const data = await listSearches();
      setSearches(data);
    } catch (e) {
      console.error("Failed to load searches:", e);
    }
  }, []);

  useEffect(() => {
    loadSearches();
  }, [loadSearches]);

  const handleSelectSearch = async (search: SearchResult) => {
    onSelectSearch?.(search);
    router.push("/");
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Full-width header */}
      <header className="bg-[#f2f2f2] dark:bg-gray-900 px-4 py-3.5 shrink-0 z-10">
        <div className="flex items-center gap-3">
          {/* Left: toggle + logo — matches sidebar width */}
          <div className="w-60 flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {sidebarOpen ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
            <span className="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100 hidden sm:inline">PainPoint AI</span>
          </div>

          {/* Center: page-specific content (e.g. search bar) */}
          <div className="flex-1 flex">
            {headerCenter}
          </div>

          {/* Right: page-specific actions + theme toggle + profile avatar */}
          <div className="shrink-0 flex items-center gap-2">
            {headerRight}
            <button
              onClick={toggleTheme}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <button
              className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:ring-2 hover:ring-gray-400/40 transition-all"
              title="Profile"
            >
              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 overflow-hidden bg-[#f2f2f2] dark:bg-gray-900">
        <Sidebar
          searches={searches}
          activeSearchId={activeSearchId ?? null}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onSelectSearch={handleSelectSearch}
        />

        <main className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-950 rounded-tl-2xl border-t border-l border-gray-200 dark:border-gray-800">
          {children}
        </main>
      </div>
    </div>
  );
}
