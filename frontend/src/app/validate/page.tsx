"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { validateMinimal } from "@/lib/api";

export default function ValidatePage() {
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const search = await validateMinimal(idea.trim());
      router.push(`/discover?search_id=${search.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Validation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center min-h-0">
        <div className="max-w-xl w-full mx-auto">
          <div className="w-14 h-14 bg-gray-50/80 dark:bg-white/5 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-amber-500 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Validate your idea</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Describe your product idea in a sentence. GapLens will search for real pain points to validate demand.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="e.g. A tool that helps email marketers improve deliverability and avoid spam folders"
              className="w-full h-32 px-4 py-3 rounded-xl bg-white dark:bg-[#171717] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none"
              disabled={loading}
              maxLength={500}
            />
            {error && (
              <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || !idea.trim()}
              className="px-6 py-3 rounded-xl font-semibold bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Searching for pain points…" : "Validate idea"}
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
