"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { MdAssessment, MdFilterList, MdContentCopy, MdFileDownload, MdCompareArrows, MdClose, MdCheckBox, MdCheckBoxOutlineBlank, MdExpandMore } from "react-icons/md";
import { AppShell } from "@/components/AppShell";
import { ClusterWithQuery, listAllClusters } from "@/lib/api";

type SortField = "opportunity_score" | "frequency_score" | "emotion_score" | "urgency_score" | "relevance_score" | "created_at";

export default function ReportsPage() {
  const [clusters, setClusters] = useState<ClusterWithQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [nicheFilter, setNicheFilter] = useState<string>("all");
  const [minScore, setMinScore] = useState<number>(0);
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortField>("opportunity_score");

  // Comparison
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [showCompare, setShowCompare] = useState(false);

  // Export
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadClusters();
  }, []);

  async function loadClusters() {
    try {
      setLoading(true);
      const data = await listAllClusters();
      setClusters(data);
    } catch (e) {
      setError("Failed to load clusters");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Unique niches for filter dropdown
  const niches = useMemo(() => {
    const unique = [...new Set(clusters.map((c) => c.search_query))];
    return unique.sort();
  }, [clusters]);

  // Date filter helper
  const getDateCutoff = useCallback((filter: string): Date | null => {
    const now = new Date();
    switch (filter) {
      case "7d": return new Date(now.getTime() - 7 * 86400000);
      case "30d": return new Date(now.getTime() - 30 * 86400000);
      case "90d": return new Date(now.getTime() - 90 * 86400000);
      default: return null;
    }
  }, []);

  // Filtered & sorted clusters
  const filtered = useMemo(() => {
    let result = [...clusters];

    if (nicheFilter !== "all") {
      result = result.filter((c) => c.search_query === nicheFilter);
    }
    if (minScore > 0) {
      result = result.filter((c) => c.opportunity_score >= minScore);
    }
    const cutoff = getDateCutoff(dateFilter);
    if (cutoff) {
      result = result.filter((c) => new Date(c.created_at) >= cutoff);
    }

    result.sort((a, b) => {
      if (sortBy === "created_at") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return (b[sortBy] as number) - (a[sortBy] as number);
    });

    return result;
  }, [clusters, nicheFilter, minScore, dateFilter, sortBy, getDateCutoff]);

  // Toggle comparison selection
  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 2) {
        next.add(id);
      }
      return next;
    });
  }

  // Generate markdown export
  function generateMarkdown(): string {
    const lines: string[] = ["# GapLens — Opportunity Report\n"];
    lines.push(`Generated: ${new Date().toLocaleDateString()}\n`);
    lines.push(`Total opportunities: ${filtered.length}\n`);

    filtered.forEach((c, i) => {
      lines.push(`## ${i + 1}. ${c.label}`);
      lines.push(`**Niche:** ${c.search_query}  `);
      lines.push(`**Opportunity Score:** ${c.opportunity_score.toFixed(1)} / 10  `);
      lines.push(`**Scores:** Relevance ${c.relevance_score.toFixed(1)} · Frequency ${c.frequency_score.toFixed(1)} · Emotion ${c.emotion_score.toFixed(1)} · Urgency ${c.urgency_score.toFixed(1)}  `);
      lines.push(`**Complaints:** ${c.complaint_count} · **Authenticity:** ${Math.round(c.avg_authenticity * 100)}%\n`);
      if (c.summary) lines.push(`${c.summary}\n`);
      if (c.who_has_problem) lines.push(`**Who has this problem:** ${c.who_has_problem}\n`);
      if (c.why_it_matters) lines.push(`**Why it matters:** ${c.why_it_matters}\n`);
      if (c.suggested_solution) lines.push(`**Suggested solution:** ${c.suggested_solution}\n`);
      if (c.product_angle) lines.push(`**Product angle:** ${c.product_angle}\n`);
      lines.push("---\n");
    });

    return lines.join("\n");
  }

  function handleCopyToClipboard() {
    navigator.clipboard.writeText(generateMarkdown());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleExportMarkdown() {
    const md = generateMarkdown();
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gaplens-report-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Comparison clusters
  const compareClusters = useMemo(() => {
    return clusters.filter((c) => compareIds.has(c.id));
  }, [clusters, compareIds]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">Loading reports...</div>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <p className="text-sm text-red-500 dark:text-red-400 mb-2">{error}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Make sure the backend is running and the database has completed searches with clusters.
            </p>
            <button
              onClick={() => {
                setError(null);
                loadClusters();
              }}
              className="px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-[#262626] text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-[#333333] transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (clusters.length === 0) {
    return (
      <AppShell>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-gray-100 dark:bg-[#262626] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MdAssessment size={32} className="text-gray-500 dark:text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No Reports Yet</h2>
            <p className="text-gray-500 dark:text-gray-400">
              Complete a search on the Discover page to see your opportunity reports here.
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-black shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Opportunity Reports</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {filtered.length} opportunities across {niches.length} {niches.length === 1 ? "niche" : "niches"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {compareIds.size === 2 && (
                <button
                  onClick={() => setShowCompare(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-black text-white rounded-lg hover:bg-gray-800 transition-colors dark:bg-white dark:text-black dark:hover:bg-gray-200"
                >
                  <MdCompareArrows size={14} />
                  Compare ({compareIds.size})
                </button>
              )}
              <button
                onClick={handleCopyToClipboard}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-[#262626] text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-[#333333] transition-colors"
              >
                <MdContentCopy size={14} />
                {copied ? "Copied!" : "Clipboard"}
              </button>
              <button
                onClick={handleExportMarkdown}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-[#262626] text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-[#333333] transition-colors"
              >
                <MdFileDownload size={14} />
                Export .md
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <MdFilterList size={14} />
              Filters
            </div>

            <FilterSelect
              value={nicheFilter}
              onChange={(e) => setNicheFilter(e.target.value)}
              aria-label="Filter by niche"
            >
              <option value="all">All niches</option>
              {niches.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </FilterSelect>

            <FilterSelect
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              aria-label="Filter by minimum score"
            >
              <option value={0}>Any score</option>
              <option value={5}>Score 5+</option>
              <option value={6}>Score 6+</option>
              <option value={7}>Score 7+</option>
              <option value={8}>Score 8+</option>
            </FilterSelect>

            <FilterSelect
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              aria-label="Filter by date range"
            >
              <option value="all">All time</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </FilterSelect>

            <FilterSelect
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              aria-label="Sort by"
            >
              <option value="opportunity_score">Sort: Opportunity</option>
              <option value="frequency_score">Sort: Frequency</option>
              <option value="emotion_score">Sort: Emotion</option>
              <option value="urgency_score">Sort: Urgency</option>
              <option value="relevance_score">Sort: Relevance</option>
              <option value="created_at">Sort: Newest</option>
            </FilterSelect>

            {compareIds.size > 0 && (
              <button
                onClick={() => setCompareIds(new Set())}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Clear selection
              </button>
            )}
          </div>
        </div>

        {/* Cluster Table */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-gray-500 dark:text-gray-400">
              No opportunities match your filters
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 dark:bg-black z-10">
                <tr className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-white/10">
                  <th className="pl-6 pr-2 py-3 text-left w-8"><span className="sr-only">Select</span></th>
                  <th className="px-2 py-3 text-left w-8">#</th>
                  <th className="px-3 py-3 text-left">Opportunity</th>
                  <th className="px-3 py-3 text-left">Niche</th>
                  <th className="px-3 py-3 text-center w-20">Score</th>
                  <th className="px-3 py-3 text-center w-16">Rel</th>
                  <th className="px-3 py-3 text-center w-16">Freq</th>
                  <th className="px-3 py-3 text-center w-16">Emo</th>
                  <th className="px-3 py-3 text-center w-16">Urg</th>
                  <th className="px-3 py-3 text-center w-20">Evidence</th>
                  <th className="px-3 py-3 text-right pr-6 w-24">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                {filtered.map((cluster, idx) => (
                  <ClusterRow
                    key={cluster.id}
                    cluster={cluster}
                    rank={idx + 1}
                    isSelected={compareIds.has(cluster.id)}
                    canSelect={compareIds.size < 2 || compareIds.has(cluster.id)}
                    onToggle={() => toggleCompare(cluster.id)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Comparison Overlay */}
      {showCompare && compareClusters.length === 2 && (
        <ComparisonPanel
          clusters={compareClusters}
          onClose={() => setShowCompare(false)}
        />
      )}
    </AppShell>
  );
}


function FilterSelect({
  value,
  onChange,
  "aria-label": ariaLabel,
  children,
}: {
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  "aria-label"?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative inline-flex">
      <select
        value={value}
        onChange={onChange}
        aria-label={ariaLabel}
        className="text-xs pl-3 pr-9 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#262626] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-white/20 focus:border-transparent appearance-none cursor-pointer"
      >
        {children}
      </select>
      <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500">
        <MdExpandMore size={16} />
      </span>
    </div>
  );
}


function ClusterRow({
  cluster,
  rank,
  isSelected,
  canSelect,
  onToggle,
}: {
  cluster: ClusterWithQuery;
  rank: number;
  isSelected: boolean;
  canSelect: boolean;
  onToggle: () => void;
}) {
  const scoreColor = cluster.opportunity_score >= 7
    ? "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/40"
    : cluster.opportunity_score >= 5
    ? "text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950/40"
    : "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-[#262626]";

  const authPct = Math.round(cluster.avg_authenticity * 100);
  const authColor = cluster.avg_authenticity >= 0.7
    ? "text-green-600 dark:text-green-400"
    : cluster.avg_authenticity >= 0.4
    ? "text-yellow-600 dark:text-yellow-400"
    : "text-red-500 dark:text-red-400";

  return (
    <tr className="hover:bg-gray-50/50 dark:hover:bg-[#262626]/50 transition-colors group">
      <td className="pl-6 pr-2 py-3">
        <button
          onClick={onToggle}
          disabled={!canSelect && !isSelected}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
          title={isSelected ? "Deselect" : canSelect ? "Select for comparison" : "Max 2 selected"}
        >
          {isSelected ? <MdCheckBox size={16} /> : <MdCheckBoxOutlineBlank size={16} />}
        </button>
      </td>
      <td className="px-2 py-3 text-xs font-bold text-gray-400 dark:text-gray-500">{rank}</td>
      <td className="px-3 py-3">
        <div className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-xs">{cluster.label}</div>
        {cluster.summary && (
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs mt-0.5">{cluster.summary}</div>
        )}
      </td>
      <td className="px-3 py-3">
        <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-[#262626] text-gray-600 dark:text-gray-400 rounded-full truncate max-w-[140px]">
          {cluster.search_query}
        </span>
      </td>
      <td className="px-3 py-3 text-center">
        <span className={`inline-flex px-2 py-0.5 rounded-md text-sm font-bold ${scoreColor}`}>
          {cluster.opportunity_score.toFixed(1)}
        </span>
      </td>
      <td className="px-3 py-3 text-center">
        <MiniScore value={cluster.relevance_score} />
      </td>
      <td className="px-3 py-3 text-center">
        <MiniScore value={cluster.frequency_score} />
      </td>
      <td className="px-3 py-3 text-center">
        <MiniScore value={cluster.emotion_score} />
      </td>
      <td className="px-3 py-3 text-center">
        <MiniScore value={cluster.urgency_score} />
      </td>
      <td className="px-3 py-3 text-center">
        <span className={`text-xs font-medium ${authColor}`}>{authPct}%</span>
      </td>
      <td className="px-3 py-3 text-right pr-6 text-xs text-gray-500 dark:text-gray-400">
        {new Date(cluster.created_at).toLocaleDateString()}
      </td>
    </tr>
  );
}


function MiniScore({ value }: { value: number }) {
  const color = value >= 7 ? "text-green-600 dark:text-green-400"
    : value >= 5 ? "text-yellow-600 dark:text-yellow-400"
    : "text-gray-500 dark:text-gray-400";
  return <span className={`text-xs font-semibold ${color}`}>{value.toFixed(1)}</span>;
}


function ComparisonPanel({
  clusters,
  onClose,
}: {
  clusters: ClusterWithQuery[];
  onClose: () => void;
}) {
  const [a, b] = clusters;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-[#171717] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <MdCompareArrows size={20} className="text-gray-500" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Side-by-Side Comparison</h2>
          </div>
          <button onClick={onClose} title="Close comparison" className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded">
            <MdClose size={20} />
          </button>
        </div>

        {/* Comparison Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-6">
            <CompareColumn cluster={a} />
            <CompareColumn cluster={b} />
          </div>

          {/* Score Comparison */}
          <div className="mt-8">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Score Comparison</h3>
            <div className="space-y-3">
              <CompareBar label="Opportunity" a={a.opportunity_score} b={b.opportunity_score} />
              <CompareBar label="Relevance" a={a.relevance_score} b={b.relevance_score} />
              <CompareBar label="Frequency" a={a.frequency_score} b={b.frequency_score} />
              <CompareBar label="Emotion" a={a.emotion_score} b={b.emotion_score} />
              <CompareBar label="Urgency" a={a.urgency_score} b={b.urgency_score} />
              <CompareBar label="Authenticity" a={a.avg_authenticity * 10} b={b.avg_authenticity * 10} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function CompareColumn({ cluster }: { cluster: ClusterWithQuery }) {
  const scoreColor = cluster.opportunity_score >= 7
    ? "text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/40 dark:border-green-800"
    : cluster.opportunity_score >= 5
    ? "text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950/40 dark:border-yellow-800"
    : "text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-[#262626] dark:border-white/10";

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{cluster.label}</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">{cluster.search_query}</span>
        </div>
        <div className={`text-center px-2.5 py-1.5 rounded-lg border shrink-0 ${scoreColor}`}>
          <div className="text-lg font-bold">{cluster.opportunity_score.toFixed(1)}</div>
          <div className="text-[9px] font-medium uppercase tracking-wider">Score</div>
        </div>
      </div>

      {cluster.summary && (
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-3">{cluster.summary}</p>
      )}

      <div className="space-y-2 text-xs">
        {cluster.who_has_problem && (
          <div>
            <span className="font-semibold text-gray-500 dark:text-gray-400 uppercase text-[10px]">Who</span>
            <p className="text-gray-700 dark:text-gray-300 mt-0.5">{cluster.who_has_problem}</p>
          </div>
        )}
        {cluster.suggested_solution && (
          <div>
            <span className="font-semibold text-gray-500 dark:text-gray-400 uppercase text-[10px]">Solution</span>
            <p className="text-gray-700 dark:text-gray-300 mt-0.5">{cluster.suggested_solution}</p>
          </div>
        )}
        {cluster.product_angle && (
          <div>
            <span className="font-semibold text-gray-500 dark:text-gray-400 uppercase text-[10px]">Product Angle</span>
            <p className="text-gray-700 dark:text-gray-300 mt-0.5">{cluster.product_angle}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mt-3 text-xs text-gray-500 dark:text-gray-400">
        <span>{cluster.complaint_count} complaints</span>
        <span>·</span>
        <span>{Math.round(cluster.avg_authenticity * 100)}% authentic</span>
      </div>
    </div>
  );
}


function CompareBar({ label, a, b }: { label: string; a: number; b: number; }) {
  const max = 10;
  const aPct = (a / max) * 100;
  const bPct = (b / max) * 100;
  const aWins = a > b;
  const bWins = b > a;

  return (
    <div className="flex items-center gap-3">
      <span className={`w-16 text-xs text-right font-semibold ${aWins ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"}`}>
        {a.toFixed(1)}
      </span>
      <div className="flex-1 flex gap-1">
        <div className="flex-1 h-2 bg-gray-100 dark:bg-[#262626] rounded-full overflow-hidden flex justify-end">
          <div
            className={`h-full rounded-full ${aWins ? "bg-green-400" : "bg-gray-300 dark:bg-[#404040]"}`}
            style={{ width: `${aPct}%` }}
          />
        </div>
        <div className="flex-1 h-2 bg-gray-100 dark:bg-[#262626] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${bWins ? "bg-green-400" : "bg-gray-300 dark:bg-[#404040]"}`}
            style={{ width: `${bPct}%` }}
          />
        </div>
      </div>
      <span className={`w-16 text-xs font-semibold ${bWins ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"}`}>
        {b.toFixed(1)}
      </span>
      <span className="w-20 text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase">{label}</span>
    </div>
  );
}
