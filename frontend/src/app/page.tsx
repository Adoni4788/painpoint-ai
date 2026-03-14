"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { useTheme } from "@/components/ThemeProvider";
import { MdSearch, MdAssessment, MdLightMode, MdDarkMode, MdArrowForward } from "react-icons/md";
import { SOURCES } from "@/lib/sources";

export default function LandingPage() {
  const { theme, toggle: toggleTheme } = useTheme();
  const [headerTransparent, setHeaderTransparent] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setHeaderTransparent(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] dark:bg-[#0a0a0a] text-white overflow-x-hidden">
      {/* Hero background video - plays continuously in the background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-70"
          style={{ objectPosition: "center center" }}
        >
          <source src="/video/Futuristic_Data_Device_Looping_Video.mp4" type="video/mp4" />
        </video>
        {/* Dark overlay so text stays readable */}
        <div className="absolute inset-0 bg-[#0a0a0a]/45" />
      </div>
      {/* Subtle gradient mesh (layered above video) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.12),transparent)]" />
        <div className="absolute top-1/2 -right-1/4 w-1/2 h-1/2 bg-[radial-gradient(ellipse_60%_40%_at_80%_50%,rgba(34,197,94,0.06),transparent)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* Header - fixed, content scrolls behind it; solid bg so content is hidden underneath */}
      <header
        className="fixed top-0 left-0 right-0 z-[100] transition-all duration-300"
        style={{
          background: headerTransparent
            ? "rgba(10,10,10,0.98)"
            : "linear-gradient(to bottom, #0a0a0a 0%, rgba(10,10,10,0.85) 50%, rgba(10,10,10,0.2) 85%, transparent 100%)",
        }}
      >
        <div className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Logo size={32} color="#4d7c7a" className="logo-carved group-hover:opacity-90 transition-opacity" />
          <span className="text-xl font-semibold tracking-tight text-carved">
            <span style={{ color: "#4d7c7a" }}>Gap</span>
            <span style={{ color: "#d97706" }}>Lens</span>
          </span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/discover"
            className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Discover
          </Link>
          <Link
            href="/validate"
            className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Validate
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
        </div>
      </header>

      {/* Hero - pt accounts for fixed header; z-[5] so content scrolls behind header */}
      <section id="main-content" className="relative z-[5] px-6 pt-24 pb-24 max-w-4xl mx-auto text-center">
        <p className="text-sm text-gray-400 mb-3">Idea validation engine</p>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
          Find problems worth solving – before you build.
        </h1>
        <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-4 leading-relaxed">
          GapLens mines Reddit, Hacker News, Amazon, G2, and YouTube for real complaints—with authenticity scoring so you see evidence, not hype. Stop guessing. Start building what&apos;s actually needed.
        </p>
        <p className="text-sm text-gray-500 max-w-xl mx-auto mb-10">
          Got an idea from IdeaBrowser or elsewhere? Validate it here.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
          <Link
            href="/validate"
            className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold bg-white text-black rounded-xl hover:bg-gray-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Validate your idea – it&apos;s free
            <MdArrowForward size={20} />
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium text-gray-300 hover:text-white border border-white/20 hover:border-white/40 rounded-xl transition-all"
          >
            See how it works
          </a>
        </div>
        <p className="text-sm text-gray-500">
          Free to try · No credit card required
        </p>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative z-[5] px-6 py-20 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-16 text-shadow-readable">How it works</h2>
        <div className="grid md:grid-cols-3 gap-12">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
              <MdSearch size={28} className="text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-shadow-readable">Search</h3>
            <p className="text-gray-400 text-sm leading-relaxed text-shadow-readable">
              Enter a keyword, niche, or product category. GapLens expands your query and scans multiple platforms.
            </p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-shadow-readable">Cluster & Score</h3>
            <p className="text-gray-400 text-sm leading-relaxed text-shadow-readable">
              AI groups similar complaints into pain point clusters and scores each by opportunity potential.
            </p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
              <MdAssessment size={28} className="text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-shadow-readable">Report & PRD</h3>
            <p className="text-gray-400 text-sm leading-relaxed text-shadow-readable">
              Get full opportunity reports with evidence, suggested solutions, and AI-generated PRD drafts.
            </p>
          </div>
        </div>
      </section>

      {/* Data sources */}
      <section className="relative z-[5] px-6 py-20 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-4 text-shadow-readable">Mine real conversations</h2>
        <p className="text-gray-400 text-center mb-12 max-w-xl mx-auto text-shadow-readable">
          Unlike tools that only scan Reddit, GapLens pulls from five public sources. We score authenticity—so you see real user frustration, not promotional content.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {SOURCES.map((s) => (
            <span
              key={s.id}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border ${s.landingColor}`}
            >
              <s.Icon size={18} />
              {s.label}
            </span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 py-24 max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4 text-shadow-readable">Don&apos;t build until you&apos;re sure</h2>
        <p className="text-gray-400 mb-8 text-shadow-readable">
          Find the pain first. Then build the solution.
        </p>
        <Link
          href="/validate"
          className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold bg-white text-black rounded-xl hover:bg-gray-100 transition-all"
        >
          Validate your idea – it&apos;s free
          <MdArrowForward size={20} />
        </Link>
      </section>

      {/* Footer */}
      <footer className="relative z-[5] border-t border-white/5 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size={20} color="#4d7c7a" className="logo-carved" />
            <span className="text-sm text-carved">
              <span style={{ color: "#4d7c7a" }}>Gap</span>
              <span style={{ color: "#d97706" }}>Lens</span>
            </span>
          </div>
          <p className="text-xs text-gray-600 text-shadow-readable">© {new Date().getFullYear()} GapLens</p>
        </div>
      </footer>
    </div>
  );
}
