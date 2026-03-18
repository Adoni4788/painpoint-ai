import posthog from "posthog-js";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";

let initialized = false;

/**
 * Initialize PostHog only after user has given cookie consent (GDPR).
 * Called from CookieConsentProvider when user accepts.
 */
export function initPostHog(): void {
  if (typeof window === "undefined" || initialized) return;
  if (key) {
    posthog.init(key, {
      api_host: host,
      capture_pageview: false,
    });
    (window as Window & { posthog?: typeof posthog }).posthog = posthog;
    initialized = true;
    if (document.location?.search?.includes("debug=posthog")) {
      console.log("[PostHog] Initialized (consent given)", { host, keyPrefix: key?.slice(0, 8) + "..." });
    }
  } else {
    console.warn("[PostHog] Missing NEXT_PUBLIC_POSTHOG_KEY – analytics disabled.");
  }
}

export default posthog;
