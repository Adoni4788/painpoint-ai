import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl.replace(/\/$/, "")}/api/:path*`,
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.posthog.com https://*.sentry.io https://browser.sentry-cdn.com https://*.clerk.com https://*.clerk.accounts.dev https://*.gaplens.io https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.clerk.com https://*.clerk.accounts.dev https://*.gaplens.io",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https://fonts.gstatic.com https://*.clerk.com https://*.gaplens.io",
              "connect-src 'self' https://*.posthog.com https://*.sentry.io https://ingest.sentry.io wss://*.sentry.io https://*.clerk.com https://*.clerk.accounts.dev https://*.gaplens.io",
              "worker-src blob: 'self'",
              "frame-src https://*.clerk.com https://*.clerk.accounts.dev https://challenges.cloudflare.com",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG ?? "",
  project: process.env.SENTRY_PROJECT ?? "",
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
