import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gap Lens — Opportunity Discovery Engine",
  description: "Turn public complaints into product opportunities",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark:bg-black" suppressHydrationWarning>
      <body className="bg-white text-gray-900 dark:bg-black dark:text-gray-100 antialiased transition-colors" suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
