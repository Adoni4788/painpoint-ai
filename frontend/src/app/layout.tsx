import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter, Space_Grotesk, JetBrains_Mono, Outfit } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/ThemeProvider";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { SearchesProvider } from "@/contexts/SearchesContext";
import { ClerkTokenSyncer } from "@/components/ClerkTokenSyncer";
import { PostHogPageView } from "@/components/PostHogPageView";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import "./globals.css";

const inter = Inter({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
});

const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

const outfit = Outfit({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://gaplens.io"),
  title: "GapLens — Opportunity Discovery Engine",
  description: "Turn public complaints into product opportunities. GapLens scans Reddit, Hacker News, Amazon, G2, and YouTube to surface validated pain points and score them for market opportunity.",
  openGraph: {
    type: "website",
    siteName: "GapLens",
    title: "GapLens — Opportunity Discovery Engine",
    description: "Turn public complaints into product opportunities. Scan Reddit, HN, Amazon, G2, and YouTube for validated pain points.",
    url: "https://gaplens.io",
  },
  twitter: {
    card: "summary_large_image",
    title: "GapLens — Opportunity Discovery Engine",
    description: "Turn public complaints into product opportunities. Scan Reddit, HN, Amazon, G2, and YouTube for validated pain points.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://gaplens.io",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} ${outfit.variable} dark:bg-ink`} suppressHydrationWarning>
      <body className={`${inter.className} ${spaceGrotesk.variable} ${jetbrainsMono.variable} ${outfit.variable} bg-[#ffffff] text-ink dark:bg-ink dark:text-paper antialiased transition-colors`} suppressHydrationWarning>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-white focus:dark:bg-gray-900 focus:rounded-lg focus:ring-2 focus:ring-[#4d7c7a] focus:outline-none"
        >
          Skip to main content
        </a>
        <ClerkProvider afterSignOutUrl="/">
          <ClerkTokenSyncer />
          <ThemeProvider>
            <CookieConsentProvider>
              <WorkspaceProvider>
                <SearchesProvider>
                  <Suspense fallback={null}>
                    <PostHogPageView />
                  </Suspense>
                  {children}
                  <CookieConsentBanner />
                </SearchesProvider>
              </WorkspaceProvider>
            </CookieConsentProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
