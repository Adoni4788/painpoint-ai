"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Logo } from "@/components/Logo";
import { useTheme } from "@/components/ThemeProvider";
import {
  MdSearch,
  MdAssessment,
  MdLightMode,
  MdDarkMode,
  MdArrowForward,
  MdCheck,
  MdKeyboardArrowDown,
} from "react-icons/md";
import { SOURCES } from "@/lib/sources";

// ─── Data ────────────────────────────────────────────────────────────────────

const SAMPLE_PAIN_POINTS = [
  {
    title: "Onboarding takes too long",
    score: 87,
    mentions: 342,
    platforms: ["Reddit", "G2"],
    quote: '"I gave up after 20 minutes. Couldn\'t figure out where to start."',
    accent: "#ef4444",
    scoreColor: "text-red-400",
    scoreBg: "bg-red-400/10",
  },
  {
    title: "Missing export & integrations",
    score: 79,
    mentions: 218,
    platforms: ["Hacker News", "Reddit"],
    quote: '"Why can\'t I export to CSV? This is table stakes for a B2B tool."',
    accent: "#f59e0b",
    scoreColor: "text-amber-400",
    scoreBg: "bg-amber-400/10",
  },
  {
    title: "Pricing feels unpredictable",
    score: 71,
    mentions: 156,
    platforms: ["G2", "Amazon"],
    quote: '"Got a surprise bill at month-end. No warning whatsoever."',
    accent: "#3b82f6",
    scoreColor: "text-blue-400",
    scoreBg: "bg-blue-400/10",
  },
];

const LS_CHECKOUT_BASE =
  "https://gaplens.lemonsqueezy.com/checkout/buy/aa085b19-4069-424a-8ad3-4f615bc5fb75";

const PRICING_PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "For founders exploring their first idea",
    features: [
      "3 searches per month",
      "Up to 5 pain point clusters",
      "Basic opportunity scoring",
      "Evidence quotes included",
    ],
    cta: "Start free",
    href: "/validate",
    highlight: false,
    external: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/ month",
    description: "For founders who validate before they build",
    features: [
      "Unlimited searches",
      "Full pain point clustering",
      "AI-generated PRD drafts",
      "Export to PDF & CSV",
      "Priority processing",
      "All 6 platforms",
    ],
    cta: "Start 7-day free trial",
    href: LS_CHECKOUT_BASE,
    highlight: true,
    external: true,
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();
  const { theme, toggle: toggleTheme } = useTheme();
  const { user } = useUser();
  const [headerSolid, setHeaderSolid] = useState(false);

  // Append Clerk user ID so the webhook can grant Pro after purchase.
  const checkoutHref = user
    ? `${LS_CHECKOUT_BASE}?checkout[custom][clerk_user_id]=${user.id}`
    : LS_CHECKOUT_BASE;
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    const onScroll = () => setHeaderSolid(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setEmailLoading(true);
    // TODO: replace with real email service (Loops, ConvertKit, Buttondown, etc.)
    await new Promise((r) => setTimeout(r, 800));
    setEmailSubmitted(true);
    setEmailLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">

      {/* ════════════════════════════════════════════════
          HEADER
      ════════════════════════════════════════════════ */}
      <header
        className="fixed top-0 left-0 right-0 z-[100] transition-all duration-500"
        style={{
          background: headerSolid ? "rgba(10,10,10,0.92)" : "transparent",
          borderBottom: headerSolid ? "1px solid rgba(255,255,255,0.05)" : "none",
          backdropFilter: headerSolid ? "blur(20px) saturate(180%)" : "none",
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
          <Link href="/" className="flex items-center gap-2 group">
            <Logo size={26} color="#4d7c7a" className="group-hover:opacity-80 transition-opacity" />
            <span className="text-base font-semibold tracking-tight" style={{
              backgroundImage: "linear-gradient(to right, #4d7c7a, #a16207)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>GapLens</span>
          </Link>

          <nav className="flex items-center gap-1">
            {[
              { label: "Discover", path: "/discover" },
              { label: "Validate", path: "/validate" },
              { label: "Reports", path: "/reports" },
            ].map(({ label, path }) => (
              <Link key={label} href={path}
                onClick={(e) => { e.preventDefault(); router.push(path); }}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-white rounded-lg hover:bg-white/5 transition-all">
                {label}
              </Link>
            ))}

            <div className="w-px h-4 bg-white/10 mx-1" />

            <button onClick={toggleTheme}
              className="p-1.5 text-gray-600 hover:text-white rounded-lg hover:bg-white/5 transition-all"
              title={theme === "dark" ? "Light mode" : "Dark mode"}>
              {theme === "dark" ? <MdLightMode size={16} /> : <MdDarkMode size={16} />}
            </button>

            <Link href="/validate"
              onClick={(e) => { e.preventDefault(); router.push("/validate"); }}
              className="ml-1 inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium bg-white text-black rounded-lg hover:bg-gray-100 transition-all">
              Get Started <MdArrowForward size={13} />
            </Link>
          </nav>
        </div>
      </header>

      {/* ════════════════════════════════════════════════
          HERO — video confined here only
      ════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* Video — scoped to hero only */}
        <div className="absolute inset-0 pointer-events-none">
          <video autoPlay loop muted playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-50"
            style={{ objectPosition: "center center" }}>
            <source src="/video/Futuristic_Data_Device_Looping_Video.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-[#0a0a0a]/60" />
          {/* Ambient glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(77,124,122,0.08),transparent_70%)]" />
          {/* Fade to solid background at the bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
        </div>

        {/* Hero content */}
        <div className="relative z-10 px-6 pt-36 pb-24 max-w-3xl mx-auto text-center">

        {/* Status pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-xs text-gray-500 mb-8 tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Market research · In minutes, not months
        </div>

        {/* Headline */}
        <h1 className="font-heading text-5xl sm:text-6xl md:text-[4.5rem] font-bold tracking-[-0.025em] leading-[1.04] mb-6">
          Stop building things
          <br />
          <span style={{
            backgroundImage: "linear-gradient(115deg, #5d9d9b 0%, #7ec8c5 45%, #b07b20 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>nobody wants.</span>
        </h1>

        {/* Sub */}
        <p className="text-[1.05rem] text-gray-400 max-w-lg mx-auto mb-10 leading-[1.7]">
          GapLens mines six platforms for real user frustrations — clusters them with AI, scores each opportunity, and hands you a PRD ready to build from.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-5">
          <Link href="/validate"
            className="group inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold bg-white text-black rounded-xl hover:bg-gray-50 transition-all hover:scale-[1.015] active:scale-[0.985] shadow-[0_1px_0_rgba(255,255,255,0.15)_inset]">
            Find my first pain point — free
            <MdArrowForward size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <a href="#how-it-works"
            className="inline-flex items-center gap-1.5 px-5 py-3.5 text-sm text-gray-500 hover:text-gray-200 border border-white/[0.08] hover:border-white/20 rounded-xl transition-all">
            How it works
            <MdKeyboardArrowDown size={16} />
          </a>
        </div>

        <p className="text-xs text-gray-700 tracking-wide">Free to try · No credit card required</p>
        </div>{/* end hero content */}
      </section>{/* end hero — video ends here */}

      {/* ════════════════════════════════════════════════
          STATS BAR
      ════════════════════════════════════════════════ */}
      <div className="relative z-[5] border-y border-white/[0.05] bg-white/[0.015]">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-stretch divide-x divide-white/[0.05]">
          {[
            { value: "6", label: "Platforms scanned" },
            { value: "AI‑scored", label: "Authenticity filtering" },
            { value: "< 5 min", label: "Idea to insight" },
          ].map((stat) => (
            <div key={stat.label} className="flex-1 text-center px-6 first:pl-0 last:pr-0">
              <p className="font-heading text-xl font-bold tracking-tight">{stat.value}</p>
              <p className="text-[10px] text-gray-600 mt-0.5 uppercase tracking-[0.1em]">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          EXAMPLE OUTPUT
      ════════════════════════════════════════════════ */}
      <section className="relative z-[5] px-6 py-24 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[10px] uppercase tracking-[0.15em] text-gray-600 mb-3">What you get</p>
          <h2 className="font-heading text-3xl font-bold mb-3">Real pain points. Scored. With evidence.</h2>
          <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">
            The kinds of clusters you&apos;ll see after one search — scored, sourced, and quoted.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {SAMPLE_PAIN_POINTS.map((p) => (
            <div key={p.title}
              className="group relative rounded-2xl bg-white/[0.025] border border-white/[0.07] p-5 hover:bg-white/[0.04] hover:border-white/[0.12] transition-all overflow-hidden"
            >
              {/* Left accent bar */}
              <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full"
                style={{ background: p.accent + "50" }} />

              {/* Score badge */}
              <div className={`absolute top-4 right-4 w-9 h-9 rounded-full ${p.scoreBg} flex items-center justify-center shrink-0`}>
                <span className={`font-heading text-xs font-bold ${p.scoreColor}`}>{p.score}</span>
              </div>

              <h3 className="font-heading font-semibold text-sm text-white leading-snug pr-10 mb-3 pl-2">{p.title}</h3>
              <p className="text-gray-500 text-xs italic leading-relaxed mb-4 pl-2">{p.quote}</p>

              <div className="flex items-center justify-between text-[10px] text-gray-700 pt-3 border-t border-white/[0.05] pl-2 uppercase tracking-wide">
                <span>{p.mentions} mentions</span>
                <span>{p.platforms.join(" · ")}</span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-[11px] text-gray-700 mt-5">
          Illustrative example — your results will reflect your actual niche
        </p>
      </section>

      {/* ════════════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════════════ */}
      <section id="how-it-works" className="relative z-[5] px-6 py-24 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-[10px] uppercase tracking-[0.15em] text-gray-600 mb-3">Simple process</p>
          <h2 className="font-heading text-3xl font-bold">Three steps from idea to clarity</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-[26px] left-[calc(50%/3+56px)] right-[calc(50%/3+56px)] h-px border-t border-dashed border-white/[0.08]" />

          {/* Step 1 */}
          <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            <div className="relative w-[52px] h-[52px] rounded-full bg-blue-500/[0.08] border border-blue-500/20 flex items-center justify-center mb-5 z-10">
              <MdSearch size={22} className="text-blue-400" />
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#111] border border-white/10 flex items-center justify-center text-[9px] font-mono text-gray-500">1</span>
            </div>
            <h3 className="font-heading text-base font-semibold mb-2">Drop in your niche</h3>
            <p className="text-gray-500 text-sm leading-relaxed">Type a keyword, problem space, or product idea. GapLens expands your query and scans all 6 platforms.</p>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            <div className="relative w-[52px] h-[52px] rounded-full bg-emerald-500/[0.08] border border-emerald-500/20 flex items-center justify-center mb-5 z-10">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#111] border border-white/10 flex items-center justify-center text-[9px] font-mono text-gray-500">2</span>
            </div>
            <h3 className="font-heading text-base font-semibold mb-2">AI finds the patterns</h3>
            <p className="text-gray-500 text-sm leading-relaxed">Complaints clustered into themes, scored by frequency, recency, and sentiment — so you know which pain is biggest.</p>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            <div className="relative w-[52px] h-[52px] rounded-full bg-amber-500/[0.08] border border-amber-500/20 flex items-center justify-center mb-5 z-10">
              <MdAssessment size={22} className="text-amber-400" />
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#111] border border-white/10 flex items-center justify-center text-[9px] font-mono text-gray-500">3</span>
            </div>
            <h3 className="font-heading text-base font-semibold mb-2">Get your report + PRD</h3>
            <p className="text-gray-500 text-sm leading-relaxed">Full opportunity report with real quotes as evidence, suggested solutions, and a PRD ready to hand to a developer.</p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          DATA SOURCES
      ════════════════════════════════════════════════ */}
      <section className="relative z-[5] px-6 py-24 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[10px] uppercase tracking-[0.15em] text-gray-600 mb-3">Coverage</p>
          <h2 className="font-heading text-3xl font-bold mb-3">Six platforms. One search.</h2>
          <p className="text-gray-500 text-sm max-w-xs mx-auto leading-relaxed">
            Most tools only scan Reddit. GapLens pulls from six public sources and scores each result for authenticity.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2.5">
          {SOURCES.map((s) => (
            <span key={s.id}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border ${s.landingColor} hover:scale-[1.02] transition-transform cursor-default`}>
              <span className={`shrink-0 ${s.iconColor}`}><s.Icon size={15} className="inline-block" /></span>
              {s.label}
            </span>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          PRICING
      ════════════════════════════════════════════════ */}
      <section id="pricing" className="relative z-[5] px-6 py-24 max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[10px] uppercase tracking-[0.15em] text-gray-600 mb-3">Pricing</p>
          <h2 className="font-heading text-3xl font-bold mb-2">Simple, honest pricing</h2>
          <p className="text-gray-500 text-sm">No surprise bills. No usage traps.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {PRICING_PLANS.map((plan) => (
            <div key={plan.name}
              className={`relative rounded-2xl p-6 flex flex-col ${
                plan.highlight
                  ? "bg-white/[0.04] border border-white/[0.12]"
                  : "bg-white/[0.02] border border-white/[0.07]"
              }`}
              style={plan.highlight ? {
                boxShadow: "0 0 0 1px rgba(93,157,155,0.15), 0 0 50px rgba(93,157,155,0.05)",
              } : {}}
            >
              {/* Top glow line on Pro */}
              {plan.highlight && (
                <div className="absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-[#5d9d9b]/50 to-transparent" />
              )}

              {plan.highlight && (
                <span className="self-start text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[#5d9d9b]/15 text-[#7ec8c5] border border-[#5d9d9b]/20 mb-4 uppercase tracking-wide">
                  Most popular
                </span>
              )}

              <h3 className="font-heading text-xl font-bold mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="font-heading text-4xl font-bold tracking-tight">{plan.price}</span>
                <span className="text-gray-600 text-sm">{plan.period}</span>
              </div>
              <p className="text-gray-500 text-sm mb-5 pb-5 border-b border-white/[0.06]">{plan.description}</p>

              <ul className="space-y-2.5 mb-7 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-300">
                    <MdCheck size={14} className="text-emerald-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link href={plan.highlight ? checkoutHref : plan.href}
                target={plan.external ? "_blank" : undefined}
                rel={plan.external ? "noopener noreferrer" : undefined}
                className={`block text-center py-3 rounded-xl text-sm font-semibold transition-all ${
                  plan.highlight
                    ? "bg-white text-black hover:bg-gray-100"
                    : "border border-white/[0.12] text-gray-300 hover:text-white hover:border-white/25 hover:bg-white/[0.03]"
                }`}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          EMAIL CAPTURE
      ════════════════════════════════════════════════ */}
      <section className="relative z-[5] px-6 py-16 max-w-lg mx-auto text-center">
        {/* Hairline rule with label */}
        <div className="flex items-center gap-4 mb-10">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/[0.07]" />
          <p className="text-[10px] uppercase tracking-[0.15em] text-gray-600 whitespace-nowrap">Stay ahead</p>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/[0.07]" />
        </div>

        <h2 className="font-heading text-2xl font-bold mb-2">
          Get 3 trending pain points every Friday
        </h2>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          The fastest-growing complaints across the internet, surfaced weekly. Free. No spam.
        </p>

        {emailSubmitted ? (
          <div className="inline-flex items-center gap-2 text-emerald-400 text-sm">
            <MdCheck size={17} />
            <span>You&apos;re in — see you Friday.</span>
          </div>
        ) : (
          <form onSubmit={handleEmailSubmit} className="flex gap-2 max-w-sm mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-700 text-sm focus:outline-none focus:border-white/20 transition-colors"
            />
            <button type="submit" disabled={emailLoading}
              className="px-4 py-2.5 bg-white text-black rounded-xl font-semibold text-sm hover:bg-gray-100 transition-colors disabled:opacity-40 whitespace-nowrap">
              {emailLoading ? "···" : "Subscribe"}
            </button>
          </form>
        )}
      </section>

      {/* ════════════════════════════════════════════════
          FINAL CTA
      ════════════════════════════════════════════════ */}
      <section className="relative z-10 px-6 py-24 border-t border-white/[0.05]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4 leading-[1.15] tracking-[-0.015em]">
            Your next users are online right now —
            <br />
            <span className="text-gray-500">complaining about exactly what you could build.</span>
          </h2>
          <p className="text-gray-600 mb-10 text-sm">The question is whether you&apos;re listening.</p>
          <Link href="/validate"
            onClick={(e) => { e.preventDefault(); router.push("/validate"); }}
            className="group inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold bg-white text-black rounded-xl hover:bg-gray-50 transition-all hover:scale-[1.015] active:scale-[0.985]">
            Start for free — no card needed
            <MdArrowForward size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════ */}
      <footer className="relative z-[5] border-t border-white/[0.05] py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo size={17} color="#4d7c7a" />
            <span className="text-sm font-medium" style={{
              backgroundImage: "linear-gradient(to right, #4d7c7a, #a16207)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>GapLens</span>
          </div>

          <div className="flex items-center gap-5 text-xs text-gray-700">
            <Link href="/gummysearch-alternative" className="hover:text-gray-400 transition-colors">GummySearch Alternative</Link>
            <Link href="/validate" className="hover:text-gray-400 transition-colors">Validate</Link>
            <Link href="/discover" className="hover:text-gray-400 transition-colors">Discover</Link>
            <Link href="/reports" className="hover:text-gray-400 transition-colors">Reports</Link>
            <Link href="/terms" className="hover:text-gray-400 transition-colors">Terms</Link>
            <Link href="/refund-policy" className="hover:text-gray-400 transition-colors">Refund Policy</Link>
          </div>

          <p className="text-xs text-gray-700">© {new Date().getFullYear()} GapLens</p>
        </div>
      </footer>
    </div>
  );
}
