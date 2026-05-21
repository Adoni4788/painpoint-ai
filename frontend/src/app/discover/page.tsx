"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SourceFilters } from "@/components/SearchBar";
import { MdExpandMore, MdExpandLess } from "react-icons/md";
import { HiOutlineArrowUpRight } from "react-icons/hi2";
import { DISABLED_SOURCE_IDS, PRO_ONLY_SOURCE_IDS, SOURCES } from "@/lib/sources";
import { useIsPro } from "@/lib/useIsPro";
import { AppShell } from "@/components/AppShell";
import { ClusterList } from "@/components/ClusterList";
import { ReportPanel } from "@/components/ReportPanel";
import { StatusBanner } from "@/components/StatusBanner";
import {
  ApiError,
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

  const isPro = useIsPro();

  const toggleSource = (id: string) => {
    // Defense-in-depth: disabled sources (e.g. G2 until we ship the paid
    // integration) must never enter the active sources array even if the
    // picker is bypassed somehow. Same for Pro-only sources when the user
    // isn't Pro — backend would 402 anyway, but failing in the UI is kinder.
    if (DISABLED_SOURCE_IDS.has(id)) return;
    if (PRO_ONLY_SOURCE_IDS.has(id) && !isPro) return;
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

    // Self-rescheduling poll with exponential backoff (3s → 30s) and a hard
    // 12-minute cap. The backend's pipeline_timeout_seconds is 600s, so any
    // longer-running search will already have been marked "failed" server-side.
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const startedAt = Date.now();
    const HARD_CAP_MS = 12 * 60 * 1000;
    const MAX_DELAY_MS = 30_000;
    let nextDelay = 3_000;

    const tick = async () => {
      if (cancelled) return;
      try {
        const updated = await getSearch(activeSearch.id);
        if (cancelled) return;
        setActiveSearch(updated);
        if (updated.status === "completed") {
          const clusterData = await getClusters(updated.id);
          if (!cancelled) setClusters(clusterData);
          return; // status change unmounts this effect via deps
        }
        if (updated.status === "failed") return;
      } catch (e) {
        console.error("Poll error:", e);
        // Errors also count toward the hard cap — back off the same way.
      }
      if (Date.now() - startedAt >= HARD_CAP_MS) return;
      nextDelay = Math.min(nextDelay * 2, MAX_DELAY_MS);
      timer = setTimeout(tick, nextDelay);
    };

    timer = setTimeout(tick, nextDelay);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
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
    } catch (e: unknown) {
      // 402 = free tier limit reached — show upgrade modal
      const status = e instanceof ApiError ? e.status : null;
      if (status === 402) {
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
          <div className="noise-overlay flex-1 overflow-y-auto scrollbar-main flex flex-col items-center justify-center min-h-0 px-6 py-12 relative bg-gradient-to-b from-transparent to-white/30 dark:to-black/20">
            <div className="relative z-10 max-w-2xl w-full mx-auto text-center animate-in fade-in slide-in-from-bottom-6 duration-1000">

              {/* Deep Search heading */}
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-ink dark:text-paper mb-2">
                Find the Gap
              </h2>
              <p className="font-mono text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-8">
                Deep Search · Opportunity Discovery
              </p>

              {/* Subtitle */}
              <p className="text-gray-600 dark:text-gray-400 mb-10 leading-relaxed max-w-lg mx-auto">
                Enter a keyword, niche, or product category. GapLens mines Reddit, HN, Amazon, YouTube, Stack Overflow & more for real frustrations—with authenticity scoring.
              </p>

              {/* AI Prompt search bar */}
              <DiscoverSearchForm onSearch={handleSearch} loading={loading} />

              {/* Source badges */}
              <div className="flex items-center justify-center gap-6 flex-wrap mt-10 opacity-70">
                {SOURCES.map((src) => (
                  <span key={src.id} className="flex items-center gap-2 font-mono text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest hover:text-gray-800 dark:hover:text-gray-200 transition-colors cursor-default">
                    <src.Icon size={14} className={src.iconColor} />
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
                  getNiche={() => activeSearch?.query ?? null}
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
    <form onSubmit={handleSubmit} className="w-full max-w-3xl relative mx-auto group">
      {/* Glow effect behind the prompt */}
      <div className="absolute -inset-1 bg-gradient-to-r from-[#4d7c7a]/20 to-[#f97316]/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700 pointer-events-none" />
      
      <div className="relative flex items-center p-2 bg-white/90 dark:bg-[#0A0A0B]/90 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] focus-within:border-[#4d7c7a]/40 dark:focus-within:border-[#4d7c7a]/40 transition-all duration-300">
        {/* Search/Command icon */}
        <div className="pl-5 pr-3 text-[#4d7c7a] dark:text-teal-500 shrink-0">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Input field */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g., fitness tracking apps, cold email softwa…"
          className="flex-1 bg-transparent border-none focus:ring-0 text-lg md:text-xl py-5 md:py-6 pr-3 placeholder:text-gray-400 dark:placeholder:text-gray-600 text-gray-900 dark:text-gray-100 outline-none min-w-0 font-medium"
          disabled={loading}
          autoFocus
        />

        {/* Analyze button */}
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="group/btn gradient-brand hover:opacity-90 text-white px-8 md:px-10 py-4 md:py-5 rounded-xl font-bold transition-all flex items-center gap-3 shadow-md shadow-orange-500/10 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              Analyze
              <HiOutlineArrowUpRight size={18} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
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

