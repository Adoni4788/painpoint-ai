"use client";

import { useState } from "react";
import { OpportunityReport, generatePRD } from "@/lib/api";

interface ReportPanelProps {
  report: OpportunityReport;
  onClose: () => void;
  onReportUpdate: (report: OpportunityReport) => void;
}

export function ReportPanel({ report, onClose, onReportUpdate }: ReportPanelProps) {
  const [generatingPRD, setGeneratingPRD] = useState(false);
  const [activeTab, setActiveTab] = useState<"report" | "prd">("report");
  const { cluster, posts, prd } = report;

  const handleGeneratePRD = async () => {
    setGeneratingPRD(true);
    try {
      const newPrd = await generatePRD(cluster.id);
      onReportUpdate({ ...report, prd: newPrd });
      setActiveTab("prd");
    } catch (e) {
      console.error("PRD generation failed:", e);
    } finally {
      setGeneratingPRD(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{cluster.label}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Opportunity Report</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 px-6">
        <button
          onClick={() => setActiveTab("report")}
          className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors mr-6 ${
            activeTab === "report"
              ? "border-brand-500 text-brand-600 dark:text-brand-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          Report
        </button>
        <button
          onClick={() => prd ? setActiveTab("prd") : handleGeneratePRD()}
          className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "prd"
              ? "border-brand-500 text-brand-600 dark:text-brand-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          PRD Draft
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
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
              className="px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 disabled:opacity-50"
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
    <div className="space-y-6">
      {/* Opportunity Score */}
      <div className="bg-gradient-to-r from-brand-50 to-indigo-50 dark:from-brand-950/30 dark:to-indigo-950/30 rounded-xl p-5 border border-brand-100 dark:border-brand-900/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-brand-800 dark:text-brand-300">Opportunity Score</p>
            <p className="text-3xl font-bold text-brand-700 dark:text-brand-400 mt-1">{cluster.opportunity_score.toFixed(1)} <span className="text-lg font-normal text-brand-500 dark:text-brand-500">/ 10</span></p>
          </div>
          <div className="grid grid-cols-5 gap-3 text-center">
            <ScoreCell label="Relevance" value={cluster.relevance_score} />
            <ScoreCell label="Frequency" value={cluster.frequency_score} />
            <ScoreCell label="Emotion" value={cluster.emotion_score} />
            <ScoreCell label="Urgency" value={cluster.urgency_score} />
            <AuthenticityCell value={cluster.avg_authenticity} />
          </div>
        </div>
      </div>

      {cluster.summary && (
        <Section title="Problem Summary">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{cluster.summary}</p>
        </Section>
      )}

      {cluster.who_has_problem && (
        <Section title="Who Has This Problem">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{cluster.who_has_problem}</p>
        </Section>
      )}

      {cluster.why_it_matters && (
        <Section title="Why It Matters">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{cluster.why_it_matters}</p>
        </Section>
      )}

      <Section title="Source Distribution">
        <div className="flex items-center gap-3">
          {Object.entries(cluster.source_breakdown).map(([src, count]) => (
            <span key={src} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 capitalize">
              {src}: {count}
            </span>
          ))}
        </div>
      </Section>

      <Section title="Top Complaint Examples">
        <div className="space-y-3">
          {cluster.top_complaints.map((text, i) => (
            <blockquote key={i} className="text-sm text-gray-600 dark:text-gray-400 border-l-3 border-brand-200 dark:border-brand-700 pl-4 py-1 italic leading-relaxed bg-gray-50 dark:bg-gray-800/50 rounded-r-lg pr-3">
              &ldquo;{text}&rdquo;
            </blockquote>
          ))}
        </div>
      </Section>

      {cluster.suggested_solution && (
        <Section title="Suggested Solution">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{cluster.suggested_solution}</p>
        </Section>
      )}

      {cluster.product_angle && (
        <Section title="Product Angle">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{cluster.product_angle}</p>
        </Section>
      )}

      {posts.length > 0 && (
        <Section title={`Related Posts (${posts.length})`}>
          <div className="space-y-2">
            {posts.slice(0, 10).map((post) => (
              <div key={post.id} className="text-sm bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  {post.title && <p className="font-medium text-gray-800 dark:text-gray-200 flex-1">{post.title}</p>}
                  <ContentTypeBadge type={post.content_type} />
                </div>
                <p className="text-gray-600 dark:text-gray-400 line-clamp-3">{post.text}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500">
                  <span className="capitalize">{post.source}</span>
                  {post.author && <span>by {post.author}</span>}
                  <span title="Authenticity score" className={`font-medium ${post.authenticity_score >= 0.7 ? "text-green-600 dark:text-green-400" : post.authenticity_score >= 0.4 ? "text-yellow-600 dark:text-yellow-400" : "text-red-500 dark:text-red-400"}`}>
                    Auth: {post.authenticity_score.toFixed(1)}
                  </span>
                  {post.url && (
                    <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-brand-500 dark:text-brand-400 hover:underline">
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
        <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={onGeneratePRD}
            disabled={generatingPRD}
            className="w-full py-3 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
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
          className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          {copied ? "Copied!" : "Copy to Clipboard"}
        </button>
      </div>

      {prd.product_concept && (
        <Section title="Product Concept">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{prd.product_concept}</p>
        </Section>
      )}

      {prd.target_user && (
        <Section title="Target User">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{prd.target_user}</p>
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
                <span className="w-5 h-5 bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
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
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{prd.mvp_suggestion}</p>
        </Section>
      )}

      {prd.full_text && (
        <Section title="Full PRD (Markdown)">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto">
            {prd.full_text}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{title}</h4>
      {children}
    </div>
  );
}

function ScoreCell({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-brand-600 dark:text-brand-400 font-medium">{label}</p>
      <p className="text-lg font-bold text-brand-800 dark:text-brand-300">{value.toFixed(1)}</p>
    </div>
  );
}

function AuthenticityCell({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.7 ? "text-green-700 dark:text-green-400" : value >= 0.4 ? "text-yellow-700 dark:text-yellow-400" : "text-red-600 dark:text-red-400";
  const bg = value >= 0.7 ? "bg-green-50 dark:bg-green-950/40" : value >= 0.4 ? "bg-yellow-50 dark:bg-yellow-950/40" : "bg-red-50 dark:bg-red-950/40";
  const label = value >= 0.7 ? "High" : value >= 0.4 ? "Mixed" : "Low";
  return (
    <div>
      <p className="text-xs text-brand-600 dark:text-brand-400 font-medium">Evidence</p>
      <p className={`text-sm font-bold ${color} ${bg} rounded px-1 py-0.5`} title={`${pct}% authentic — ${label} evidence quality`}>
        {pct}% {label}
      </p>
    </div>
  );
}

const CONTENT_TYPE_STYLES: Record<string, { label: string; light: string; dark: string }> = {
  firsthand_complaint: { label: "Firsthand", light: "bg-green-100 text-green-700", dark: "dark:bg-green-900/30 dark:text-green-400" },
  help_seeking: { label: "Help Seeking", light: "bg-blue-100 text-blue-700", dark: "dark:bg-blue-900/30 dark:text-blue-400" },
  workaround_discussion: { label: "Workaround", light: "bg-indigo-100 text-indigo-700", dark: "dark:bg-indigo-900/30 dark:text-indigo-400" },
  comparison_post: { label: "Comparison", light: "bg-gray-100 text-gray-600", dark: "dark:bg-gray-800 dark:text-gray-400" },
  promotional_content: { label: "Promotional", light: "bg-red-100 text-red-600", dark: "dark:bg-red-900/30 dark:text-red-400" },
  guide_article: { label: "Guide/Article", light: "bg-orange-100 text-orange-600", dark: "dark:bg-orange-900/30 dark:text-orange-400" },
};

function ContentTypeBadge({ type }: { type: string }) {
  const style = CONTENT_TYPE_STYLES[type] || { label: type, light: "bg-gray-100 text-gray-500", dark: "dark:bg-gray-800 dark:text-gray-400" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${style.light} ${style.dark}`}>
      {style.label}
    </span>
  );
}
