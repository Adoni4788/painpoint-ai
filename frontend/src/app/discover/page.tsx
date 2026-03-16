"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SourceFilters } from "@/components/SearchBar";
import { MdExpandMore, MdExpandLess, MdTrendingUp, MdArrowForward } from "react-icons/md";
import { SOURCES } from "@/lib/sources";
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

  const handleNewSearch = () => {
    setActiveSearch(null);
    setClusters([]);
    setSelectedReport(null);
  };

  return (
    <AppShell
      activeSearchId={activeSearch?.id}
      onSelectSearch={handleSelectSearch}
      onNewSearch={handleNewSearch}
      pageLabel={activeSearch ? "Recent Search" : undefined}
    >
      {!activeSearch ? (
        /* Empty state: source bar + hero + search */
        <>
          <div className="shrink-0 flex items-center justify-start gap-4 px-6 pt-4 pb-3 border-b border-gray-200/60 dark:border-white/5">
            <SourceFilters sources={sources} onToggle={toggleSource} />
          </div>
          <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center min-h-0 px-6 py-12">
            <div className="max-w-xl w-full mx-auto text-center">

              {/* Icon */}
              <div className="w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center mx-auto mb-7">
                <MdTrendingUp size={36} className="text-indigo-500 dark:text-indigo-400" />
              </div>

              {/* Heading */}
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Discover Pain Points</h2>

              {/* Subtitle */}
              <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                Enter a keyword, niche, competitor, or product category to find real frustrations people are sharing online.
              </p>

              {/* Search form */}
              <DiscoverSearchForm onSearch={handleSearch} loading={loading} />

              {/* Source badges */}
              <div className="flex items-center justify-center gap-5 flex-wrap mt-6">
                {SOURCES.filter(s => ["reddit","hackernews","amazon","youtube"].includes(s.id)).map((src) => (
                  <span key={src.id} className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    <src.Icon size={13} className={src.iconColor} />
                    {src.label}
                  </span>
                ))}
              </div>

            </div>
          </div>
        </>
      ) : (
        /* Results state (recent search): no search bar, just banner + results */
        <>
          {activeSearch && <StatusBanner search={activeSearch} />}

          <div className="flex-1 flex overflow-hidden min-w-0 w-full">
            {/* Left panel: header fixed, content scrolls behind it. Full width when no report, constrained when report open. */}
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
              {/* Header — fixed, not scrollable */}
              {(activeSearch?.status === "completed" && (activeSearch.summary || clusters.length > 0)) && (
                <div className="shrink-0 bg-white dark:bg-black min-w-0">
                  <div className="px-6 pt-4 pb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{activeSearch?.query}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Key insights</p>
                  </div>
                  {selectedReport ? (
                    <div className="px-6">
                      <div className="border-b border-gray-200 dark:border-white/10" />
                    </div>
                  ) : (
                    <div className="border-b border-gray-200 dark:border-white/10" />
                  )}
                </div>
              )}
              {/* Scrollable content — full width when no report, padded when report open */}
              <div className={`flex-1 min-w-0 overflow-y-auto overflow-x-hidden py-6 transition-all scrollbar-dark ${selectedReport ? "px-6" : "px-6"}`}>
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
              ) : null}
              </div>
            </div>

            {selectedReport && (
              <div className="flex-1 min-w-0 border-l border-gray-200 dark:border-white/10 overflow-y-auto overflow-x-hidden bg-white dark:bg-black scrollbar-dark rounded-tr-2xl rounded-br-2xl">
                <ReportPanel
                  report={selectedReport}
                  onClose={() => setSelectedReport(null)}
                  onReportUpdate={setSelectedReport}
                  analyticsSource={analyticsSource}
                />
              </div>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}

function DiscoverSearchForm({
  onSearch,
  loading,
}: {
  onSearch: (q: string) => void;
  loading: boolean;
}) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !loading) onSearch(query.trim());
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center gap-3 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-full px-5 py-2.5 shadow-sm focus-within:border-indigo-300 dark:focus-within:border-indigo-500/40 transition-colors">
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a niche, keyword, or competitor..."
          className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none min-w-0"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="shrink-0 flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-full transition-colors"
        >
          {loading ? "Searching…" : <><span>Discover</span><MdArrowForward size={16} /></>}
        </button>
      </div>
    </form>
  );
}

function KeyInsightsSummary({ summary }: { summary: string }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="mb-6 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-[#171717]/50 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-100/50 dark:hover:bg-white/5 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Summary</span>
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

