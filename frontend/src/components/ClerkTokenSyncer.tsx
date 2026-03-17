"use client";

/**
 * ClerkTokenSyncer — bridges Clerk's React hook (useAuth) with the
 * non-React api.ts module so every fetch automatically carries the
 * signed-in user's JWT.
 *
 * Renders nothing; just wires up the token getter on mount and
 * whenever getToken changes.
 */

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { setAuthTokenGetter } from "@/lib/api";

export function ClerkTokenSyncer() {
  const { getToken } = useAuth();

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);

  return null;
}
