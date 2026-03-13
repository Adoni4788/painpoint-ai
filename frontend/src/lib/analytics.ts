/**
 * Analytics wrapper for Experiment 2 (Validate flow engagement).
 * Uses PostHog when configured; no-ops when env vars are missing.
 */

declare global {
  interface Window {
    posthog?: {
      capture: (event: string, properties?: Record<string, unknown>) => void;
    };
  }
}

export function captureEvent(event: string, properties?: Record<string, unknown>) {
  if (typeof window !== "undefined" && window.posthog) {
    window.posthog.capture(event, properties);
  }
}
