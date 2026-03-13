import posthog from "posthog-js";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";

if (typeof window !== "undefined") {
  if (key) {
    posthog.init(key, {
      api_host: host,
      capture_pageview: false,
    });
    (window as Window & { posthog?: typeof posthog }).posthog = posthog;
    if (document.location?.search?.includes("debug=posthog")) {
      console.log("[PostHog] Initialized", { host, keyPrefix: key?.slice(0, 8) + "..." });
    }
  } else {
    console.warn("[PostHog] Missing NEXT_PUBLIC_POSTHOG_KEY – analytics disabled. Add it in Render → Environment.");
  }
}

export default posthog;
