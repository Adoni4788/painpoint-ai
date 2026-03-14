import { NextResponse } from "next/server";

/**
 * Debug endpoint to verify NEXT_PUBLIC_SENTRY_DSN is set at build/runtime.
 * Remove or restrict in production once Sentry is confirmed working.
 */
export async function GET() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  return NextResponse.json({
    sentryConfigured: !!dsn,
    hint: dsn
      ? "DSN is set. If events still don't appear, check ad blockers or try Incognito."
      : "NEXT_PUBLIC_SENTRY_DSN is missing. Add it to Render frontend env and redeploy.",
  });
}
