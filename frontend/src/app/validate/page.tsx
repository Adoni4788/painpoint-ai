"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MdCasino } from "react-icons/md";
import { HiOutlineArrowUpRight } from "react-icons/hi2";
import { AppShell } from "@/components/AppShell";
import { FocusTrap } from "@/components/FocusTrap";
import { RotatingTips } from "@/components/RotatingTips";
import { SOURCES } from "@/lib/sources";
import { ApiError, validateMinimal } from "@/lib/api";
import { captureEvent } from "@/lib/analytics";
import { UpgradeModal } from "@/components/UpgradeModal";

const VALIDATE_TIPS = [
  "Be specific – include who it's for and the problem it solves.",
  "We scan Reddit, HN, Amazon, YouTube, Stack Overflow & more for real complaints.",
  "More details = better keyword extraction = more relevant results.",
  "Think about the pain point, not just the solution.",
  "Try mentioning your target user, like 'for freelancers' or 'for remote teams'.",
  "The best ideas focus on a clear frustration people actually talk about.",
  "Not sure where to start? Click the dice for a random idea!",
];

const IDEA_ROULETTE = [
  "A tool that helps remote teams run better daily standups.",
  "An app that reminds you to drink water throughout the day.",
  "A platform connecting local farmers directly with restaurants.",
  "A browser extension that summarizes YouTube videos into key points.",
  "A service for freelancers that automatically sends payment reminders.",
  "An app that tracks your mood and suggests activities to improve it.",
  "A tool that scans your inbox and unsubscribes you from spam.",
  "A platform for trading used textbooks among college students.",
  "A meal planner that adapts to your dietary restrictions.",
  "A habit tracker that turns your goals into a game with rewards.",
  "A password manager that works seamlessly across all devices.",
  "A meditation app that lets you practice with a friend remotely.",
  "A service that finds the cheapest gas stations near you.",
  "A tool that checks your writing for tone and clarity.",
  "A platform for discovering local volunteer opportunities.",
];

function ValidateHeaderContent() {
  return (
    <div className="flex items-center justify-center w-full max-w-2xl">
      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 min-w-0">
        <RotatingTips tips={VALIDATE_TIPS} />
      </p>
    </div>
  );
}

export default function ValidatePage() {
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [pendingSearch, setPendingSearch] = useState<{ id: string } | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    captureEvent("validate_page_view");
  }, []);

  const handleRandomIdea = () => {
    const random = IDEA_ROULETTE[Math.floor(Math.random() * IDEA_ROULETTE.length)];
    setIdea(random);
  };

  const handleFeedbackResponse = useCallback(
    (response: "yes" | "no" | "maybe" | "skipped") => {
      const searchId = pendingSearch?.id;
      if (pendingSearch) {
        captureEvent("pricing_feedback", {
          response,
          search_id: pendingSearch.id,
          idea_length: idea.trim().length,
          price_question: "29_month",
        });
      }
      setShowFeedbackModal(false);
      setPendingSearch(null);
      if (searchId) {
        captureEvent("validate_redirect_to_discover", { search_id: searchId });
        router.push(`/discover?search_id=${searchId}`);
      }
    },
    [pendingSearch, idea, router]
  );

  const handleEscapeModal = useCallback(() => {
    handleFeedbackResponse("skipped");
  }, [handleFeedbackResponse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim()) return;
    setLoading(true);
    setError(null);
    captureEvent("validate_idea_submitted", { idea_length: idea.trim().length });
    try {
      const search = await validateMinimal(idea.trim());
      setSubmitted(true);
      setPendingSearch(search);
      setShowFeedbackModal(true);
    } catch (e: unknown) {
      // 402 = free tier limit reached — show upgrade modal
      const status = e instanceof ApiError ? e.status : null;
      if (status === 402) {
        setShowUpgradeModal(true);
      } else {
        const message = e instanceof Error ? e.message : "";
        setError(message || "Validation failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell headerCenter={<ValidateHeaderContent />}>

      {/* Immersive validate — mirrors Discover's "Find the Gap" layout */}
      <div className="noise-overlay flex-1 overflow-y-auto flex flex-col items-center justify-center min-h-0 px-6 py-4 relative bg-gradient-to-b from-transparent to-white/30 dark:to-black/20">
        <div className="relative z-10 max-w-2xl w-full mx-auto text-center animate-in fade-in slide-in-from-bottom-6 duration-1000">

          {/* Heading */}
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-ink dark:text-paper mb-1">
            Find Real Pain Points Before You Build
          </h2>
          <p className="font-mono text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
            Idea Validator · Market Signal
          </p>

          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed max-w-lg mx-auto">
            Describe your idea in one sentence. GapLens surfaces pain-point clusters, real complaints, and messaging angles from Reddit, HN, Amazon, YouTube, Stack Overflow & more — in minutes.
          </p>

          {/* Idea input card */}
          <form onSubmit={handleSubmit} className="w-full relative mx-auto group">
            {/* Glow effect behind the prompt */}
            <div className="absolute -inset-1 bg-gradient-to-r from-[#4d7c7a]/20 to-[#f97316]/20 rounded-3xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700 pointer-events-none" />

            <div className="relative bg-white/90 dark:bg-[#0A0A0B]/90 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] focus-within:border-[#4d7c7a]/40 dark:focus-within:border-[#4d7c7a]/40 transition-all duration-500">
              <label htmlFor="validate-idea-input" className="sr-only">
                Describe your product idea
              </label>
              <textarea
                id="validate-idea-input"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="e.g. A tool that helps email marketers improve deliverability and avoid spam folders"
                className="w-full h-20 px-5 pt-4 pb-3 rounded-3xl bg-transparent text-sm text-ink dark:text-paper placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none resize-none"
                disabled={loading}
                maxLength={500}
                aria-label="Describe your product idea"
              />

              {/* Bottom toolbar — mirrors Discover's inner submit row */}
              <div className="flex items-center justify-between px-3 pb-3 gap-3">
                <button
                  type="button"
                  onClick={handleRandomIdea}
                  className="flex items-center gap-1.5 p-2 pr-3 rounded-xl text-amber-500 dark:text-amber-400 hover:bg-amber-500/10 dark:hover:bg-amber-500/10 transition-colors text-xs font-medium"
                  title="Random idea"
                  aria-label="Get a random idea"
                >
                  <MdCasino size={18} />
                  Random
                </button>

                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-gray-400 dark:text-gray-600">
                    {idea.length}/500
                  </span>
                  <button
                    type="submit"
                    disabled={loading || !idea.trim()}
                    className={`group/btn ${
                      submitted
                        ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20"
                        : "gradient-brand hover:opacity-90 shadow-orange-500/10"
                    } text-white px-7 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {submitted ? (
                      "✓ Validating…"
                    ) : loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Searching…
                      </>
                    ) : (
                      <>
                        Validate
                        <HiOutlineArrowUpRight size={16} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-500 dark:text-red-400">{error}</p>
            )}
          </form>

          {/* Source badges — mirrors Discover's platform list */}
          <div className="flex items-center justify-center gap-4 flex-wrap mt-5 opacity-70">
            {SOURCES.map((src) => (
              <span
                key={src.id}
                className="flex items-center gap-2 font-mono text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest hover:text-gray-800 dark:hover:text-gray-200 transition-colors cursor-default"
              >
                <src.Icon size={14} className={src.iconColor} />
                {src.label}
              </span>
            ))}
          </div>

        </div>
      </div>

      {/* Pricing feedback modal – shown after successful validation */}
      {showFeedbackModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50"
          role="presentation"
        >
          <FocusTrap active={showFeedbackModal} onEscape={handleEscapeModal}>
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="feedback-modal-title"
              className="bg-white dark:bg-[#171717] rounded-2xl p-6 max-w-sm w-full shadow-xl border border-gray-200 dark:border-white/10"
            >
              <p id="feedback-modal-title" className="text-base font-medium text-gray-900 dark:text-gray-100 mb-4">
                Would you pay $29/month for unlimited validations?
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleFeedbackResponse("yes")}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
                >
                  Yes, I&apos;d pay
                </button>
                <button
                  type="button"
                  onClick={() => handleFeedbackResponse("no")}
                  className="w-full py-2.5 px-4 rounded-xl bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-900 dark:text-gray-100 font-medium transition-colors"
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={() => handleFeedbackResponse("maybe")}
                  className="w-full py-2.5 px-4 rounded-xl bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-900 dark:text-gray-100 font-medium transition-colors"
                >
                  Maybe
                </button>
                <button
                  type="button"
                  onClick={() => handleFeedbackResponse("skipped")}
                  className="mt-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  Skip
                </button>
              </div>
            </div>
          </FocusTrap>
        </div>
      )}
      {showUpgradeModal && (
        <UpgradeModal onClose={() => setShowUpgradeModal(false)} />
      )}
    </AppShell>
  );
}
