"use client";

import { AppShell } from "@/components/AppShell";

export default function ReportsPage() {
  return (
    <AppShell>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Reports</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            View all your opportunity reports and PRD drafts in one place. Compare findings across niches and export your best discoveries.
          </p>
          <div className="text-left bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Coming soon</p>
            <div className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
              <p>All PRDs across searches, ranked by opportunity score</p>
              <p>Quick filters by niche, score, and date</p>
              <p>Export reports to markdown or clipboard</p>
              <p>Side-by-side opportunity comparison</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
