"use client";

/**
 * SearchesContext — loads the sidebar search list ONCE at the root layout level
 * and shares it across all pages so navigating between Discover / Validate /
 * Reports / Settings never triggers a redundant API call.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { SearchResult, listSearches } from "@/lib/api";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface SearchesContextValue {
  searches: SearchResult[];
  backendUnavailable: boolean;
  setBackendUnavailable: (v: boolean) => void;
  rateLimited: boolean;
  setRateLimited: (v: boolean) => void;
  loadSearches: () => Promise<void>;
}

const SearchesContext = createContext<SearchesContextValue | null>(null);

export function SearchesProvider({ children }: { children: ReactNode }) {
  const [searches, setSearches] = useState<SearchResult[]>([]);
  const [backendUnavailable, setBackendUnavailable] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const { activeWorkspaceId } = useWorkspace();

  const loadSearches = useCallback(async () => {
    try {
      setBackendUnavailable(false);
      setRateLimited(false);
      const data = await listSearches(activeWorkspaceId ?? undefined);
      setSearches(data);
    } catch (e) {
      console.error("Failed to load searches:", e);
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("502") || msg.includes("503")) {
        setBackendUnavailable(true);
      } else if (msg.includes("rate limit") || msg.includes("429")) {
        setRateLimited(true);
      }
    }
  }, [activeWorkspaceId]);

  // Load once on mount (and whenever the active workspace changes)
  useEffect(() => {
    loadSearches();
  }, [loadSearches]);

  return (
    <SearchesContext.Provider
      value={{
        searches,
        backendUnavailable,
        setBackendUnavailable,
        rateLimited,
        setRateLimited,
        loadSearches,
      }}
    >
      {children}
    </SearchesContext.Provider>
  );
}

export function useSearches(): SearchesContextValue {
  const ctx = useContext(SearchesContext);
  if (!ctx) throw new Error("useSearches must be used within <SearchesProvider>");
  return ctx;
}
