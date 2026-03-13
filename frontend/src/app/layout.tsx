import type { Metadata } from "next";
import { Suspense } from "react";
import { Poppins } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { PostHogPageView } from "@/components/PostHogPageView";
import "./globals.css";

const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "GapLens — Opportunity Discovery Engine",
  description: "Turn public complaints into product opportunities",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark:bg-black" suppressHydrationWarning>
      <body className={`${poppins.className} bg-white text-gray-900 dark:bg-black dark:text-gray-100 antialiased transition-colors`} suppressHydrationWarning>
        <ThemeProvider>
        <WorkspaceProvider>
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          {children}
        </WorkspaceProvider>
      </ThemeProvider>
      </body>
    </html>
  );
}
