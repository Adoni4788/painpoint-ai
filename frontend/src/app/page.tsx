"use client";

import { useState, useEffect } from "react";
import { SearchBar, SourceFilters } from "@/components/SearchBar";
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

export default function Home() {
  const [activeSearch, setActiveSearch] = useState<SearchResult | null>(null);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedReport, setSelectedReport] = useState<OpportunityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<string[]>(["reddit", "hackernews", "amazon"]);

  const toggleSource = (id: string) => {
    setSources((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

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
    try {
      const search = await createSearch(query, sources);
      setActiveSearch(search);
    } catch (e) {
      console.error("Search failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSearch = async (search: SearchResult) => {
    setActiveSearch(search);
    setSelectedReport(null);
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
      headerRight={
        <div className="hidden md:flex mr-1">
          <SourceFilters sources={sources} onToggle={toggleSource} />
        </div>
      }
    >
      {activeSearch && (
        <StatusBanner search={activeSearch} />
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className={`${selectedReport ? "w-1/2" : "w-full"} overflow-y-auto p-6 transition-all`}>
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
          <div className="w-1/2 border-l border-gray-200 dark:border-white/10 overflow-y-auto bg-white dark:bg-black">
            <ReportPanel
              report={selectedReport}
              onClose={() => setSelectedReport(null)}
              onReportUpdate={setSelectedReport}
            />
          </div>
        )}
      </div>
    </AppShell>
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
