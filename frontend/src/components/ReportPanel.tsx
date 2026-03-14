"use client";

import { useState } from "react";
import { OpportunityReport, generatePRD } from "@/lib/api";
import { captureEvent } from "@/lib/analytics";
import { AuthenticityBadge } from "@/components/AuthenticityBadge";
import { getAuthenticityColorClasses } from "@/lib/scoreUtils";

interface ReportPanelProps {
  report: OpportunityReport;
  onClose: () => void;
  onReportUpdate: (report: OpportunityReport) => void;
  analyticsSource?: "validate" | "standard" | null;
}

export function ReportPanel({ report, onClose, onReportUpdate, analyticsSource }: ReportPanelProps) {
  const [generatingPRD, setGeneratingPRD] = useState(false);
  const [activeTab, setActiveTab] = useState<"report" | "prd">("report");
  const { cluster, posts, prd } = report;

  const handleGeneratePRD = async () => {
    setGeneratingPRD(true);
    try {
      const newPrd = await generatePRD(cluster.id);
      captureEvent(
        analyticsSource === "validate" ? "validate_prd_generated" : "discover_prd_generated",
        { cluster_label: cluster.label }
      );
      onReportUpdate({ ...report, prd: newPrd });
      setActiveTab("prd");
    } catch (e) {
      console.error("PRD generation failed:", e);
    } finally {
      setGeneratingPRD(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-w-0 overflow-hidden">
      {/* Header — same height as Key insight area (pt-4 pb-2) */}
      <div className="bg-white dark:bg-black min-w-0">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 pt-4 pb-2 text-left">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{cluster.label}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Opportunity Report</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded shrink-0"
            title="Close report"
            aria-label="Close report"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mx-4 sm:mx-6 border-b border-gray-200 dark:border-white/10" />
      </div>

      {/* Tabs — left-aligned */}
      <div className="flex justify-start gap-6 px-4 sm:px-6 text-left">
        <button
          onClick={() => setActiveTab("report")}
          className={`py-3 px-0 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === "report"
              ? "border-gray-600 text-gray-600 dark:border-gray-400 dark:text-gray-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          }`}
        >
          Report
        </button>
        <button
          onClick={() => prd ? setActiveTab("prd") : handleGeneratePRD()}
          className={`py-3 px-0 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === "prd"
              ? "border-gray-600 text-gray-600 dark:border-gray-400 dark:text-gray-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          }`}
        >
          PRD Draft
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 min-w-0 scrollbar-dark">
        {activeTab === "report" ? (
          <ReportContent
            cluster={cluster}
            posts={posts}
            prd={prd}
            onGeneratePRD={handleGeneratePRD}
            generatingPRD={generatingPRD}
          />
        ) : prd ? (
          <PRDContent prd={prd} />
        ) : (
          <div className="flex items-center justify-center h-48">
            <button
              onClick={handleGeneratePRD}
              disabled={generatingPRD}
              className="px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
            >
              {generatingPRD ? "Generating PRD..." : "Generate PRD Draft"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ReportContent({
  cluster,
  posts,
  prd,
  onGeneratePRD,
  generatingPRD,
}: {
  cluster: OpportunityReport["cluster"];
  posts: OpportunityReport["posts"];
  prd: OpportunityReport["prd"];
  onGeneratePRD: () => void;
  generatingPRD: boolean;
}) {
  return (
    <div className="space-y-6 min-w-0">
      {/* Opportunity Score */}
      <div className="rounded-xl p-4 sm:p-5 min-w-0 bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="shrink-0">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Opportunity Score</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{cluster.opportunity_score.toFixed(1)} <span className="text-lg font-normal text-gray-500 dark:text-gray-500">/ 10</span></p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center min-w-0">
            <ScoreCell label="Relev." value={cluster.relevance_score} title="Relevance" />
            <ScoreCell label="Frequ." value={cluster.frequency_score} title="Frequency" />
            <ScoreCell label="Emotion" value={cluster.emotion_score} />
            <ScoreCell label="Urgency" value={cluster.urgency_score} />
            <AuthenticityBadge value={cluster.avg_authenticity} variant="cell" />
          </div>
        </div>
      </div>

      {cluster.summary && (
        <Section title="Problem Summary">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words">{cluster.summary}</p>
        </Section>
      )}

      {cluster.who_has_problem && (
        <Section title="Who Has This Problem">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{cluster.who_has_problem}</p>
        </Section>
      )}

      {cluster.why_it_matters && (
        <Section title="Why It Matters">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words">{cluster.why_it_matters}</p>
        </Section>
      )}

      <Section title="Source Distribution">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {Object.entries(cluster.source_breakdown).map(([src, count]) => (
            <span key={src} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-[#262626] text-gray-700 dark:text-gray-300 capitalize">
              {src}: {count}
            </span>
          ))}
        </div>
      </Section>

      <Section title="Top Complaint Examples">
        <div className="space-y-3">
          {cluster.top_complaints.map((text, i) => (
            <blockquote key={i} className="text-sm text-gray-600 dark:text-gray-400 border-l-3 border-gray-300 dark:border-white/20 pl-4 py-1 italic leading-relaxed break-words bg-gray-50 dark:bg-[#262626] rounded-r-lg pr-3">
              &ldquo;{text}&rdquo;
            </blockquote>
          ))}
        </div>
      </Section>

      {cluster.suggested_solution && (
        <Section title="Suggested Solution">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words">{cluster.suggested_solution}</p>
        </Section>
      )}

      {cluster.product_angle && (
        <Section title="Product Angle">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words">{cluster.product_angle}</p>
        </Section>
      )}

      {posts.length > 0 && (
        <Section title={`Related Posts (${posts.length})`}>
          <div className="space-y-2">
            {posts.slice(0, 10).map((post) => (
              <div key={post.id} className="text-sm bg-gray-50 dark:bg-[#262626] rounded-lg p-3 min-w-0">
                <div className="flex items-center gap-2 mb-1 min-w-0">
                  {post.title && <p className="font-medium text-gray-800 dark:text-gray-200 flex-1 min-w-0 truncate">{post.title}</p>}
                  <ContentTypeBadge type={post.content_type} />
                </div>
                <p className="text-gray-600 dark:text-gray-400 line-clamp-3 break-words">{post.text}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500">
                  <span className="capitalize">{post.source}</span>
                  {post.author && <span>by {post.author}</span>}
                  <span title="Authenticity score" className={`font-medium ${getAuthenticityColorClasses(post.authenticity_score)}`}>
                    Auth: {post.authenticity_score.toFixed(1)}
                  </span>
                  {post.url && (
                    <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-gray-900 dark:text-gray-300 hover:underline">
                      View source
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {!prd && (
        <div className="pt-4 border-t border-gray-200 dark:border-white/10">
          <button
            onClick={onGeneratePRD}
            disabled={generatingPRD}
            className="w-full py-3 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            {generatingPRD ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating PRD...
              </span>
            ) : (
              "Generate PRD Draft"
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function PRDContent({ prd }: { prd: NonNullable<OpportunityReport["prd"]> }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (prd.full_text) {
      navigator.clipboard.writeText(prd.full_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">PRD Draft</h3>
        <button
          onClick={handleCopy}
          className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-[#262626] text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-[#333333] transition-colors shrink-0"
        >
          {copied ? "Copied!" : "Copy to Clipboard"}
        </button>
      </div>

      {prd.product_concept && (
        <Section title="Product Concept">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words">{prd.product_concept}</p>
        </Section>
      )}

      {prd.target_user && (
        <Section title="Target User">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words">{prd.target_user}</p>
        </Section>
      )}

      {prd.problem_statement && (
        <Section title="Problem Statement">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{prd.problem_statement}</p>
        </Section>
      )}

      {prd.core_features && prd.core_features.length > 0 && (
        <Section title="Core Features">
          <ul className="space-y-2">
            {prd.core_features.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span className="w-5 h-5 bg-gray-200 dark:bg-[#404040] text-gray-700 dark:text-gray-300 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {f}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {prd.mvp_suggestion && (
        <Section title="MVP Suggestion">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words">{prd.mvp_suggestion}</p>
        </Section>
      )}

      {prd.full_text && (
        <Section title="Full PRD (Markdown)">
          <div className="bg-gray-50 dark:bg-[#262626] rounded-lg p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto break-words min-w-0">
            {prd.full_text}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 overflow-hidden break-words">
      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{title}</h4>
      {children}
    </div>
  );
}

function ScoreCell({ label, value, title }: { label: string; value: number; title?: string }) {
  return (
    <div title={title}>
      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
      <p className="text-lg font-bold text-gray-900 dark:text-gray-200">{value.toFixed(1)}</p>
    </div>
  );
}

const CONTENT_TYPE_STYLES: Record<string, { label: string; light: string; dark: string }> = {
  firsthand_complaint: { label: "Firsthand", light: "bg-green-100 text-green-700", dark: "dark:bg-green-900/30 dark:text-green-400" },
  help_seeking: { label: "Help Seeking", light: "bg-blue-100 text-blue-700", dark: "dark:bg-blue-900/30 dark:text-blue-400" },
  workaround_discussion: { label: "Workaround", light: "bg-indigo-100 text-indigo-700", dark: "dark:bg-indigo-900/30 dark:text-indigo-400" },
  comparison_post: { label: "Comparison", light: "bg-gray-100 text-gray-600", dark: "dark:bg-[#262626] dark:text-gray-400" },
  promotional_content: { label: "Promotional", light: "bg-red-100 text-red-600", dark: "dark:bg-red-900/30 dark:text-red-400" },
  guide_article: { label: "Guide/Article", light: "bg-orange-100 text-orange-600", dark: "dark:bg-orange-900/30 dark:text-orange-400" },
};

function ContentTypeBadge({ type }: { type: string }) {
  const style = CONTENT_TYPE_STYLES[type] || { label: type, light: "bg-gray-100 text-gray-500", dark: "dark:bg-[#262626] dark:text-gray-400" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${style.light} ${style.dark}`}>
      {style.label}
    </span>
  );
}
