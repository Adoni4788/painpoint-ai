"use client";

import { useUser } from "@clerk/nextjs";

/**
 * Returns whether the signed-in user is on the Pro plan.
 *
 * Pro status is the source of truth for paid features (Pro-only sources,
 * trend data, future quotas). It's set by the Lemon Squeezy webhook on
 * successful checkout, which flips Clerk's `public_metadata.pro` to true.
 *
 * Returns false while Clerk is still loading the user so we don't briefly
 * show Pro-only UI to free users and then yank it away.
 */
export function useIsPro(): boolean {
  const { isLoaded, user } = useUser();
  if (!isLoaded || !user) return false;
  const meta = user.publicMetadata as { pro?: unknown } | null | undefined;
  return meta?.pro === true;
}
