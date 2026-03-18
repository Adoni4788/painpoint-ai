"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { initPostHog } from "@/lib/posthog";

const STORAGE_KEY = "gaplens-cookie-consent";

export type CookieConsent = "accepted" | "rejected" | null;

interface CookieConsentContextValue {
  consent: CookieConsent;
  accept: () => void;
  reject: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextValue>({
  consent: null,
  accept: () => {},
  reject: () => {},
});

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsentState] = useState<CookieConsent>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as CookieConsent | null;
    if (stored === "accepted" || stored === "rejected") {
      setConsentState(stored);
      if (stored === "accepted") {
        initPostHog();
      }
    }
    setMounted(true);
  }, []);

  const accept = useCallback(() => {
    setConsentState("accepted");
    localStorage.setItem(STORAGE_KEY, "accepted");
    initPostHog();
  }, []);

  const reject = useCallback(() => {
    setConsentState("rejected");
    localStorage.setItem(STORAGE_KEY, "rejected");
  }, []);

  return (
    <CookieConsentContext.Provider value={{ consent: mounted ? consent : null, accept, reject }}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  return useContext(CookieConsentContext);
}
