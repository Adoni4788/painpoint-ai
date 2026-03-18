"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import posthog from "@/lib/posthog";
import { useCookieConsent } from "@/contexts/CookieConsentContext";

export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { consent } = useCookieConsent();

  useEffect(() => {
    if (consent !== "accepted" || !pathname || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    let url = window.origin + pathname;
    if (searchParams?.toString()) {
      url += `?${searchParams.toString()}`;
    }
    posthog.capture("$pageview", { $current_url: url });
  }, [consent, pathname, searchParams]);

  return null;
}
