"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";

export default function DiscoverError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-xl mx-auto mt-16 rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50/60 dark:bg-red-500/10 p-6">
          <h2 className="text-lg font-heading font-semibold text-red-900 dark:text-red-200">
            Discover ran into a problem
          </h2>
          <p className="mt-2 text-sm text-red-800/80 dark:text-red-200/80">
            We&apos;ve logged the error. You can keep using the rest of the app — try again or
            head back to your workspaces.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => reset()}
              className="px-3 py-1.5 text-sm rounded-lg bg-[#4d7c7a] text-white hover:opacity-90 transition-opacity"
            >
              Try again
            </button>
            <a
              href="/workspaces"
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              Back to workspaces
            </a>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
