"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SourceFilters } from "@/components/SearchBar";
import { MdExpandMore, MdExpandLess } from "react-icons/md";
import { HiOutlineArrowUpRight } from "react-icons/hi2";
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
import { UpgradeModal } from "@/components/UpgradeModal";

export default function DiscoverPage() {
  return (
    <Suspense fallback={null}>
      <DiscoverPageContent />
    </Suspense>
  );
}

function DiscoverPageContent() {
  const searchParams = useSearchParams();
  const [activeSearch, setActiveSearch] = useState<SearchResult | null>(null);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedReport, setSelectedReport] = useState<OpportunityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
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
    } catch (e: any) {
      // 402 = free tier limit reached — show upgrade modal
      if (e?.message?.includes("402")) {
        setShowUpgradeModal(true);
      } else {
        console.error("Search failed:", e);
      }
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
      headerCenter={<SourceFilters sources={sources} onToggle={toggleSource} />}
    >
      {!activeSearch ? (
        /* Immersive search: full-screen */
        <>
          <div className="noise-overlay flex-1 overflow-y-auto scrollbar-main flex flex-col items-center justify-center min-h-0 px-6 py-12 relative">
            <div className="relative z-10 max-w-2xl w-full mx-auto text-center">

              {/* Deep Search heading */}
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-ink dark:text-paper mb-2">
                Find the Gap
              </h2>
              <p className="font-mono text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-8">
                Deep Search · Opportunity Discovery
              </p>

              {/* Subtitle */}
              <p className="text-gray-600 dark:text-gray-400 mb-10 leading-relaxed max-w-lg mx-auto">
                Enter a keyword, niche, or product category. GapLens mines six platforms for real frustrations—with authenticity scoring.
              </p>

              {/* Million-Dollar search bar — pill shape, shadow, focus-within accent */}
              <DiscoverSearchForm onSearch={handleSearch} loading={loading} />

              {/* Source badges */}
              <div className="flex items-center justify-center gap-6 flex-wrap mt-8">
                {SOURCES.map((src) => (
                  <span key={src.id} className="flex items-center gap-1.5 font-mono text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    <src.Icon size={12} className={src.iconColor} />
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
              <div className={`flex-1 min-w-0 overflow-y-auto overflow-x-hidden py-6 transition-all scrollbar-main ${selectedReport ? "px-6" : "px-6"}`}>
              {activeSearch?.status === "completed" && activeSearch.summary && (
                <KeyInsightsSummary summary={activeSearch.summary} />
              )}
              {clusters.length > 0 ? (
                <ClusterList
                  clusters={clusters}
                  selectedClusterId={selectedReport?.cluster.id ?? null}
                  onSelectCluster={handleSelectCluster}
                  totalDataPoints={activeSearch?.total_relevant_complaints ?? activeSearch?.total_complaints_found ?? 0}
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
              <div className="flex-1 min-w-0 border-l border-gray-200 dark:border-white/10 overflow-y-auto overflow-x-hidden bg-white dark:bg-black scrollbar-main rounded-tr-2xl rounded-br-2xl">
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
      {showUpgradeModal && (
        <UpgradeModal onClose={() => setShowUpgradeModal(false)} />
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
    <form onSubmit={handleSubmit} className="w-full max-w-3xl relative mx-auto">
      <div className="relative flex items-center p-2 bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 rounded-[32px] shadow-2xl focus-within:border-accent/50 transition-all duration-500">
        {/* Search/Command icon */}
        <div className="pl-6 pr-4 text-slate-400 dark:text-slate-500 shrink-0">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Input field */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a niche, competitor, or pain point..."
          className="flex-1 bg-transparent border-none focus:ring-0 text-xl py-6 placeholder:text-slate-300 dark:placeholder:text-slate-500 text-ink dark:text-paper outline-none min-w-0"
          disabled={loading}
        />

        {/* Analyze button */}
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="gradient-brand hover:opacity-90 text-white px-10 py-5 rounded-[24px] font-bold transition-all flex items-center gap-3 shadow-xl shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              Analyze
              <HiOutlineArrowUpRight size={20} />
            </>
          )}
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

