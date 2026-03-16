import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "GummySearch Alternative — GapLens | Find Pain Points Across 6 Platforms",
  description:
    "GummySearch shut down in November 2025. GapLens is the best replacement — mine Reddit, Hacker News, Amazon, G2, YouTube & Facebook for real user pain points, then generate a PRD in one click.",
  openGraph: {
    title: "GummySearch Alternative — GapLens",
    description:
      "GummySearch shut down. GapLens replaces it — and does more. Mine 6 platforms for real pain points, score them by opportunity, and generate PRD drafts instantly.",
    url: "https://gaplens.io/gummysearch-alternative",
    siteName: "GapLens",
    type: "website",
  },
  alternates: {
    canonical: "https://gaplens.io/gummysearch-alternative",
  },
};

const features = [
  {
    heading: "6 sources, not just Reddit",
    body: "GummySearch was Reddit-only. GapLens mines Reddit, Hacker News, Amazon Reviews, G2, YouTube comments, and Facebook Groups — giving you a fuller picture of real user frustration.",
  },
  {
    heading: "Authenticity scoring",
    body: "Every complaint is scored for authenticity. Promotional posts, listicles, and affiliate content are flagged and down-weighted so you see genuine user pain — not marketing noise.",
  },
  {
    heading: "AI-clustered pain points",
    body: "Instead of raw posts, GapLens groups findings into named pain-point clusters with frequency, emotion, urgency, and opportunity scores. You get insights, not a wall of text.",
  },
  {
    heading: "One-click PRD generation",
    body: "No other research tool does this. Click any pain cluster and GapLens writes a full Product Requirements Document — target user, problem statement, core features, and MVP suggestion.",
  },
  {
    heading: "Workspaces for multiple projects",
    body: "Organise searches by product, client, or market. Every search, cluster, and report is saved so you can come back, compare, and build a research archive over time.",
  },
  {
    heading: "Free to start",
    body: "Run your first searches for free — no credit card required. Upgrade when you need more searches or want to unlock all six data sources.",
  },
];

const comparison = [
  { feature: "Data sources", gummysearch: "Reddit only", gaplens: "Reddit, HN, Amazon, G2, YouTube, Facebook" },
  { feature: "Authenticity scoring", gummysearch: "No", gaplens: "Yes — filters promotional & fake content" },
  { feature: "AI pain-point clustering", gummysearch: "Basic grouping", gaplens: "Named clusters with 5 scored dimensions" },
  { feature: "Opportunity scoring", gummysearch: "No", gaplens: "Yes — frequency × emotion × urgency" },
  { feature: "PRD generation", gummysearch: "No", gaplens: "Yes — full PRD in one click" },
  { feature: "Workspaces", gummysearch: "Yes", gaplens: "Yes" },
  { feature: "Still active", gummysearch: "Shut down Nov 2025", gaplens: "Yes" },
];

const faqs = [
  {
    q: "Why did GummySearch shut down?",
    a: "GummySearch announced it was shutting down in November 2025. The founder cited the sustainability of running a bootstrapped tool against increasing API costs. Their users were left without a replacement.",
  },
  {
    q: "How is GapLens different from GummySearch?",
    a: "GapLens covers six platforms vs GummySearch's one (Reddit). It also adds authenticity scoring to filter out noise, AI-powered opportunity scoring across multiple dimensions, and — uniquely — one-click PRD generation from any pain cluster.",
  },
  {
    q: "Can I import my GummySearch data?",
    a: "GummySearch didn't export data in a standard format, so direct import isn't possible. But you can re-run your previous searches in GapLens — often getting richer results because of the additional data sources.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes. You can run searches on Reddit and Hacker News for free without a credit card. Paid plans unlock all six sources, more searches per month, and PRD generation.",
  },
  {
    q: "How current is the data?",
    a: "GapLens fetches live data at search time — you always get recent posts, not a cached snapshot.",
  },
];

export default function GummySearchAlternativePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Nav */}
      <header className="border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={28} color="#4d7c7a" />
            <span
              className="text-lg font-semibold tracking-tight"
              style={{
                background: "linear-gradient(to right, #4d7c7a, #a16207)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              GapLens
            </span>
          </Link>
          <Link
            href="/validate"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white text-black rounded-lg hover:bg-gray-200 transition-colors"
          >
            Try free →
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-8">
          GummySearch shut down November 2025
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
          The best GummySearch{" "}
          <span
            style={{
              background: "linear-gradient(to right, #4d7c7a, #a16207)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            alternative
          </span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-4 leading-relaxed">
          GapLens replaces GummySearch — and goes further. Mine Reddit, Hacker News, Amazon, G2, YouTube, and Facebook for real pain points, then generate a full PRD in one click.
        </p>
        <p className="text-sm text-gray-500 mb-10">
          Free to start · No credit card required · Live data
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/validate"
            className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold bg-white text-black rounded-xl hover:bg-gray-100 transition-all hover:scale-[1.02]"
          >
            Start for free
          </Link>
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 px-6 py-3.5 text-base font-medium text-gray-300 hover:text-white border border-white/20 hover:border-white/40 rounded-xl transition-all"
          >
            See how it works
          </Link>
        </div>
      </section>

      {/* Comparison table */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="font-heading text-2xl font-bold text-center mb-10">GummySearch vs GapLens</h2>
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left px-5 py-4 text-gray-400 font-medium w-1/3">Feature</th>
                <th className="text-left px-5 py-4 text-gray-400 font-medium w-1/3">
                  GummySearch
                  <span className="ml-2 text-xs text-red-400 font-normal">(shut down)</span>
                </th>
                <th className="text-left px-5 py-4 font-semibold w-1/3"
                  style={{
                    background: "linear-gradient(to right, #4d7c7a, #a16207)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  GapLens
                </th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row, i) => (
                <tr
                  key={row.feature}
                  className={`border-b border-white/5 ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}
                >
                  <td className="px-5 py-4 text-gray-300 font-medium">{row.feature}</td>
                  <td className="px-5 py-4 text-gray-500">{row.gummysearch}</td>
                  <td className="px-5 py-4 text-gray-200">{row.gaplens}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="font-heading text-2xl font-bold text-center mb-12">
          Everything GummySearch had — and more
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.heading}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 hover:border-white/20 transition-colors"
            >
              <h3 className="font-heading font-semibold text-white mb-2">{f.heading}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof placeholder */}
      <section className="max-w-3xl mx-auto px-6 pb-20 text-center">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10">
          <p className="text-lg text-gray-300 italic leading-relaxed mb-4">
            &ldquo;I used GummySearch every week for customer discovery. When it shut down I was lost. GapLens does everything it did — the extra sources and the PRD feature are a huge bonus.&rdquo;
          </p>
          <p className="text-sm text-gray-500">— Indie founder, Product Hunt community</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <h2 className="font-heading text-2xl font-bold text-center mb-10">
          Frequently asked questions
        </h2>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div
              key={faq.q}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-6"
            >
              <h3 className="font-heading font-semibold text-white mb-2">{faq.q}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 pb-24 text-center">
        <h2 className="font-heading text-3xl font-bold mb-4">
          Start finding pain points today
        </h2>
        <p className="text-gray-400 mb-8">
          Free to try. No credit card. Live data from six platforms.
        </p>
        <Link
          href="/validate"
          className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold bg-white text-black rounded-xl hover:bg-gray-100 transition-all hover:scale-[1.02]"
        >
          Try GapLens free →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size={18} color="#4d7c7a" />
            <span className="text-sm text-gray-600">GapLens</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-600">
            <Link href="/" className="hover:text-gray-400 transition-colors">Home</Link>
            <Link href="/discover" className="hover:text-gray-400 transition-colors">Discover</Link>
            <Link href="/validate" className="hover:text-gray-400 transition-colors">Validate</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
