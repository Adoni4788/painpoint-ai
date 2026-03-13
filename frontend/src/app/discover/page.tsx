"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SearchBar, SourceFilters } from "@/components/SearchBar";
import { MdExpandMore, MdExpandLess } from "react-icons/md";
import { AppShell } from "@/components/AppShell";
import { ClusterList } from "@/components/ClusterList";
import { ReportPanel } from "@/components/ReportPanel";
import { StatusBanner } from "@/components/StatusBanner";
import {
  SearchResult,
  Cluster,
  OpportunityReport,
  getSearch,
  getClusters,
  getOpportunityReport,
  createSearch,
} from "@/lib/api";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useRefreshSearches } from "@/contexts/RefreshSearchesContext";
import { captureEvent } from "@/lib/analytics";

export default function DiscoverPage() {
  const searchParams = useSearchParams();
  const [activeSearch, setActiveSearch] = useState<SearchResult | null>(null);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedReport, setSelectedReport] = useState<OpportunityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<string[]>(["reddit", "hackernews", "amazon"]);
  const router = useRouter();
  const { activeWorkspaceId } = useWorkspace();
  const refreshSearches = useRefreshSearches();
  const analyticsSourceRef = useRef<"validate" | "standard" | null>(null);
  const [analyticsSource, setAnalyticsSource] = useState<"validate" | "standard" | null>(null);
  const resultsViewedForSearchRef = useRef<string | null>(null);
  const fromValidateRedirectRef = useRef(false);

  // Handle ?search_id= from Validate flow redirect
  const urlSearchId = searchParams.get("search_id");
  useEffect(() => {
    if (!urlSearchId) {
      if (!fromValidateRedirectRef.current) {
        captureEvent("discover_page_view");
      }
      return;
    }
    fromValidateRedirectRef.current = true;
    (async () => {
      try {
        const search = await getSearch(urlSearchId);
        setActiveSearch(search);
        analyticsSourceRef.current = "validate";
        setAnalyticsSource("validate");
        refreshSearches();
        if (search.status === "completed") {
          const clusterData = await getClusters(search.id);
          setClusters(clusterData);
          captureEvent("validate_results_viewed", {
            search_id: search.id,
            has_clusters: clusterData.length > 0,
          });
        }
        router.replace("/discover", { scroll: false });
      } catch (e) {
        console.error("Failed to load search from URL:", e);
      }
    })();
  }, [urlSearchId, router, refreshSearches]);

  const toggleSource = (id: string) => {
    setSources((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  // Track discover_results_viewed when results load
  useEffect(() => {
    if (
      activeSearch?.status === "completed" &&
      resultsViewedForSearchRef.current !== activeSearch.id
    ) {
      resultsViewedForSearchRef.current = activeSearch.id;
      const source = analyticsSourceRef.current ?? "unknown";
      captureEvent("discover_results_viewed", {
        source,
        search_id: activeSearch.id,
        cluster_count: clusters.length,
      });
    }
  }, [activeSearch, clusters.length]);

  useEffect(() => {
    if (!activeSearch || activeSearch.status === "completed" || activeSearch.status === "failed") {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const updated = await getSearch(activeSearch.id);
        setActiveSearch(updated);
        if (updated.status === "completed") {
          const clusterData = await getClusters(updated.id);
          setClusters(clusterData);
        }
      } catch (e) {
        console.error("Poll error:", e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeSearch]);

  const handleSearch = async (query: string) => {
    if (sources.length === 0) return;
    setLoading(true);
    setClusters([]);
    setSelectedReport(null);
    analyticsSourceRef.current = "standard";
    setAnalyticsSource("standard");
    captureEvent("standard_search_submitted", {
      query_length: query.length,
      sources: sources.join(","),
    });
    try {
      const search = await createSearch(query, sources, activeWorkspaceId ?? undefined);
      setActiveSearch(search);
      refreshSearches();
    } catch (e) {
      console.error("Search failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSearch = async (search: SearchResult) => {
    setActiveSearch(search);
    setSelectedReport(null);
    analyticsSourceRef.current = null;
    setAnalyticsSource(null);
    if (search.status === "completed") {
      try {
        const clusterData = await getClusters(search.id);
        setClusters(clusterData);
      } catch (e) {
        console.error("Failed to load clusters:", e);
        setClusters([]);
      }
    } else {
      setClusters([]);
    }
  };

  const handleSelectCluster = async (cluster: Cluster) => {
    const source = analyticsSourceRef.current ?? "unknown";
    captureEvent("discover_cluster_clicked", {
      cluster_label: cluster.label,
      opportunity_score: cluster.opportunity_score,
      source,
    });
    captureEvent(source === "validate" ? "validate_report_opened" : "discover_report_opened", {
      cluster_label: cluster.label,
    });
    try {
      const report = await getOpportunityReport(cluster.id);
      setSelectedReport(report);
    } catch (e) {
      console.error("Failed to load report:", e);
    }
  };

  return (
    <AppShell
      activeSearchId={activeSearch?.id}
      onSelectSearch={handleSelectSearch}
      headerCenter={
        <div className="w-full max-w-lg">
          <SearchBar onSearch={handleSearch} loading={loading} />
        </div>
      }
    >
      {/* Top bar: sources dropdown in main content area, left-aligned with main content */}
      <div className="flex items-center justify-start gap-4 px-6 pt-4 pb-3 shrink-0 border-b border-gray-200/60 dark:border-white/5">
        <SourceFilters sources={sources} onToggle={toggleSource} />
      </div>

      {activeSearch && (
        <StatusBanner search={activeSearch} />
      )}

      <div className="flex-1 flex overflow-hidden min-w-0 w-full">
        <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-6 transition-all">
          {activeSearch?.status === "completed" && activeSearch.summary && (
            <KeyInsightsSummary summary={activeSearch.summary} />
          )}
          {clusters.length > 0 ? (
            <ClusterList
              clusters={clusters}
              selectedClusterId={selectedReport?.cluster.id ?? null}
              onSelectCluster={handleSelectCluster}
            />
          ) : activeSearch?.status === "completed" && clusters.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <p className="text-lg font-medium">No pain points found</p>
                <p className="text-sm mt-1">Try a different keyword or broaden your search</p>
              </div>
            </div>
          ) : !activeSearch ? (
            <EmptyState />
          ) : null}
        </div>

        {selectedReport && (
          <div className="flex-1 min-w-0 border-l border-gray-200 dark:border-white/10 overflow-y-auto overflow-x-hidden bg-white dark:bg-black">
            <ReportPanel
              report={selectedReport}
              onClose={() => setSelectedReport(null)}
              onReportUpdate={setSelectedReport}
              analyticsSource={analyticsSource}
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}

function KeyInsightsSummary({ summary }: { summary: string }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="mb-6 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-[#171717]/50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-100/50 dark:hover:bg-white/5 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Key insights</span>
        {expanded ? <MdExpandLess size={20} className="text-gray-500" /> : <MdExpandMore size={20} className="text-gray-500" />}
      </button>
      {expanded && (
        <p className="px-4 pb-4 pt-0 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {summary}
        </p>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-gray-100 dark:bg-[#262626] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Discover Pain Points</h2>
        <p className="text-gray-500 dark:text-gray-400">
          Enter a keyword, niche, competitor, or product category to find real frustrations people are sharing online.
        </p>
      </div>
    </div>
  );
}
