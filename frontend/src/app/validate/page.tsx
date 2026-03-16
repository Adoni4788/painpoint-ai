"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MdCasino } from "react-icons/md";
import { AppShell } from "@/components/AppShell";
import { FocusTrap } from "@/components/FocusTrap";
import { RotatingTips } from "@/components/RotatingTips";
import { validateMinimal } from "@/lib/api";
import { captureEvent } from "@/lib/analytics";

const VALIDATE_TIPS = [
  "Be specific – include who it's for and the problem it solves.",
  "We scan Reddit, HN, Amazon, G2, and YouTube for real complaints.",
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
        price_question: "15_month_or_99_year",
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Validation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      headerCenter={<ValidateHeaderContent />}
    >
      {/* Page header with bottom border */}
      <div className="shrink-0 bg-white dark:bg-black">
        <div className="px-6 pt-4 pb-2">
          <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100">Validate your idea</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Check if there&apos;s real demand before you build</p>
        </div>
        <div className="border-b border-gray-200 dark:border-white/10" />
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center min-h-0">
        <div className="max-w-xl w-full mx-auto">
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Describe your product idea in a sentence. GapLens will search for real pain points to validate demand.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <label htmlFor="validate-idea-input" className="sr-only">
              Describe your product idea
            </label>
            <div className="relative rounded-xl bg-white dark:bg-[#171717] border border-gray-200 dark:border-white/10 focus-within:ring-2 focus-within:ring-[#4d7c7a]/50 focus-within:border-[#4d7c7a]/60">
              <textarea
                id="validate-idea-input"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="e.g. A tool that helps email marketers improve deliverability and avoid spam folders"
                className="w-full h-32 px-4 pt-3 pb-10 rounded-xl bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none resize-none"
                disabled={loading}
                maxLength={500}
                aria-label="Describe your product idea in a sentence"
              />
              <button
                type="button"
                onClick={handleRandomIdea}
                className="absolute bottom-2 left-2 p-1.5 rounded-lg text-amber-500 dark:text-amber-400 hover:bg-amber-500/10 dark:hover:bg-amber-500/10 transition-colors"
                title="Random idea"
                aria-label="Get a random idea"
              >
                <MdCasino size={20} />
              </button>
            </div>
            {error && (
              <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || !idea.trim()}
              className={`w-full py-3 rounded-xl font-semibold transition-all ${
                submitted
                  ? "bg-green-600 dark:bg-green-500 text-white"
                  : "bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              }`}
            >
              {submitted ? "✓ Validating…" : loading ? "Searching for pain points…" : "Validate idea"}
            </button>
          </form>
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
                Would you pay $15/month or $99/year for unlimited validations?
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
    </AppShell>
  );
}
