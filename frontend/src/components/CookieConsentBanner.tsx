"use client";

import Link from "next/link";
import { useCookieConsent } from "@/contexts/CookieConsentContext";

export function CookieConsentBanner() {
  const { consent, accept, reject } = useCookieConsent();

  if (consent !== null) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-[200] px-4 py-4 sm:px-6 sm:py-5 bg-white dark:bg-[#1a1a1a] border-t border-gray-200 dark:border-white/10 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)]"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          We use cookies for analytics (PostHog) to improve the product. By clicking &quot;Accept&quot; you consent to
          this.{" "}
          <Link href="/privacy" className="text-[#4d7c7a] hover:underline font-medium">
            Privacy Policy
          </Link>
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={reject}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-200 dark:border-white/20 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            Reject
          </button>
          <button
            onClick={accept}
            className="px-4 py-2.5 text-sm font-semibold text-white bg-[#4d7c7a] hover:bg-[#3d6c6a] rounded-xl transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
