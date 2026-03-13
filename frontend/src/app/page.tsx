"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { useTheme } from "@/components/ThemeProvider";
import { MdSearch, MdAssessment, MdLightMode, MdDarkMode, MdArrowForward } from "react-icons/md";

const SOURCES = [
  { name: "Reddit", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  { name: "Hacker News", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  { name: "Amazon", color: "bg-sky-500/20 text-sky-400 border-sky-500/30" },
  { name: "G2", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  { name: "YouTube", color: "bg-red-500/20 text-red-400 border-red-500/30" },
];

export default function LandingPage() {
  const { theme, toggle: toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-[#0a0a0a] dark:bg-[#0a0a0a] text-white overflow-x-hidden">
      {/* Hero background video - plays continuously in the background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-60"
          style={{ objectPosition: "center center" }}
        >
          <source src="/video/Futuristic_Data_Device_Looping_Video.mp4" type="video/mp4" />
        </video>
        {/* Dark overlay so text stays readable */}
        <div className="absolute inset-0 bg-[#0a0a0a]/50" />
      </div>
      {/* Subtle gradient mesh (layered above video) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.12),transparent)]" />
        <div className="absolute top-1/2 -right-1/4 w-1/2 h-1/2 bg-[radial-gradient(ellipse_60%_40%_at_80%_50%,rgba(34,197,94,0.06),transparent)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Logo size={32} className="text-white group-hover:opacity-90 transition-opacity" />
          <span className="text-xl font-semibold tracking-tight">GapLens</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/discover"
            className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Discover
          </Link>
          <Link
            href="/reports"
            className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Reports
          </Link>
          <button
            onClick={toggleTheme}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <MdLightMode size={18} /> : <MdDarkMode size={18} />}
          </button>
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white text-black rounded-lg hover:bg-gray-200 transition-colors"
          >
            Get Started
            <MdArrowForward size={16} />
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 px-6 pt-16 pb-24 max-w-4xl mx-auto text-center">
        <p className="text-sm font-medium text-blue-400/90 uppercase tracking-widest mb-6">
          Opportunity Discovery Engine
        </p>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
          Turn public complaints into{" "}
          <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            product opportunities
          </span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
          Search any niche, product, or market. GapLens mines Reddit, Hacker News, Amazon, and more—finding real pain points people are begging to solve.
        </p>
        <Link
          href="/discover"
          className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold bg-white text-black rounded-xl hover:bg-gray-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          Start Discovering
          <MdArrowForward size={20} />
        </Link>
      </section>

      {/* How it works */}
      <section className="relative z-10 px-6 py-20 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-16">How it works</h2>
        <div className="grid md:grid-cols-3 gap-12">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
              <MdSearch size={28} className="text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Search</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Enter a keyword, niche, or product category. GapLens expands your query and scans multiple platforms.
            </p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Cluster & Score</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              AI groups similar complaints into pain point clusters and scores each by opportunity potential.
            </p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
              <MdAssessment size={28} className="text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Report & PRD</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Get full opportunity reports with evidence, suggested solutions, and AI-generated PRD drafts.
            </p>
          </div>
        </div>
      </section>

      {/* Data sources */}
      <section className="relative z-10 px-6 py-20 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-4">Mine real conversations</h2>
        <p className="text-gray-400 text-center mb-12 max-w-xl mx-auto">
          Unlike tools that only scan Reddit, GapLens pulls from five public sources—giving you a fuller picture of what people actually complain about.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {SOURCES.map((s) => (
            <span
              key={s.name}
              className={`px-4 py-2 rounded-lg text-sm font-medium border ${s.color}`}
            >
              {s.name}
            </span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 py-24 max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4">Don&apos;t build until you&apos;re sure</h2>
        <p className="text-gray-400 mb-8">
          Find the pain first. Then build the solution.
        </p>
        <Link
          href="/discover"
          className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold bg-white text-black rounded-xl hover:bg-gray-100 transition-all"
        >
          Start Discovering
          <MdArrowForward size={20} />
        </Link>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size={20} className="text-gray-500" />
            <span className="text-sm text-gray-500">GapLens</span>
          </div>
          <p className="text-xs text-gray-600">© {new Date().getFullYear()} GapLens</p>
        </div>
      </footer>
    </div>
  );
}
