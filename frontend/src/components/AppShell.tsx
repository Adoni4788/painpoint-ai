"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MdChevronLeft, MdMenu, MdLightMode, MdDarkMode, MdPerson } from "react-icons/md";
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
      <header className="bg-[#f2f2f2] dark:bg-[#171717] px-4 py-3.5 shrink-0 z-10">
        <div className="flex items-center gap-3">
          {/* Left: toggle + logo — matches sidebar width */}
          <div className="w-60 flex items-center gap-2 shrink-0">
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
              className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#262626] flex items-center justify-center hover:ring-2 hover:ring-gray-400/40 transition-all"
              title="Profile"
            >
              <MdPerson size={16} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 overflow-hidden bg-[#f2f2f2] dark:bg-[#171717]">
        <Sidebar
          searches={searches}
          activeSearchId={activeSearchId ?? null}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onSelectSearch={handleSelectSearch}
        />

        <main className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-black rounded-tl-2xl border-t border-l border-gray-200 dark:border-white/10">
          {children}
        </main>
      </div>
    </div>
  );
}
