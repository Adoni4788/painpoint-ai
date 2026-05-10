import { NextResponse } from "next/server";

/**
 * Debug endpoint to verify NEXT_PUBLIC_SENTRY_DSN is set at build/runtime.
 * Disabled in production to avoid leaking config state.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  return NextResponse.json({
    sentryConfigured: !!dsn,
    hint: dsn
      ? "DSN is set. If events still don't appear, check ad blockers or try Incognito."
      : "NEXT_PUBLIC_SENTRY_DSN is missing. Add it to Render frontend env and redeploy.",
  });
}
