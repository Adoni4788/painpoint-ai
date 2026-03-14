"use client";

import * as Sentry from "@sentry/nextjs";

export default function TestSentryPage() {
  const handleCapture = () => {
    Sentry.captureException(new Error("Sentry test — triggered from /test-sentry button"));
  };

  const handleThrow = () => {
    throw new Error("Sentry test — uncaught throw from /test-sentry button");
  };

  return (
    <div className="min-h-screen p-8 max-w-lg mx-auto">
      <h1 className="text-xl font-semibold mb-4">Sentry test</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Use these buttons to verify Sentry is capturing errors. Check your Sentry Issues feed after clicking.
      </p>
      <div className="flex flex-col gap-3">
        <button
          onClick={handleCapture}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Send test error (captureException)
        </button>
        <button
          onClick={handleThrow}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
        >
          Throw uncaught error
        </button>
      </div>
    </div>
  );
}
