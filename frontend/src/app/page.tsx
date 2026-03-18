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
  MdMenu,
  MdClose,
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
    scoreColor: "text-red-400 dark:text-red-300",
    scoreBg: "bg-red-500/10 dark:bg-red-400/10",
    borderGlow: "group-hover:border-red-500/50",
    shadowGlow: "group-hover:shadow-[0_0_30px_-5px_var(--tw-shadow-color)] shadow-red-500/20",
  },
  {
    title: "Missing export & integrations",
    score: 79,
    mentions: 218,
    platforms: ["Hacker News", "Reddit"],
    quote: '"Why can\'t I export to CSV? This is table stakes for a B2B tool."',
    accent: "#f59e0b",
    scoreColor: "text-amber-500 dark:text-amber-400",
    scoreBg: "bg-amber-500/10 dark:bg-amber-400/10",
    borderGlow: "group-hover:border-amber-500/50",
    shadowGlow: "group-hover:shadow-[0_0_30px_-5px_var(--tw-shadow-color)] shadow-amber-500/20",
  },
  {
    title: "Pricing feels unpredictable",
    score: 71,
    mentions: 156,
    platforms: ["G2", "Amazon"],
    quote: '"Got a surprise bill at month-end. No warning whatsoever."',
    accent: "#3b82f6",
    scoreColor: "text-blue-500 dark:text-blue-400",
    scoreBg: "bg-blue-500/10 dark:bg-blue-400/10",
    borderGlow: "group-hover:border-blue-500/50",
    shadowGlow: "group-hover:shadow-[0_0_30px_-5px_var(--tw-shadow-color)] shadow-blue-500/20",
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Append Clerk user ID so the webhook can grant Pro after purchase.
  const checkoutHref = user
    ? `${LS_CHECKOUT_BASE}?checkout[custom][clerk_user_id]=${user.id}`
    : LS_CHECKOUT_BASE;
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setHeaderSolid(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setEmailLoading(true);
    setEmailError(null);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { error?: string };
      if (res.ok) {
        setEmailSubmitted(true);
      } else {
        setEmailError(data?.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setEmailError("Something went wrong. Please try again.");
    } finally {
      setEmailLoading(false);
    }
  };

  const navLinks = [
    { label: "Discover", path: "/discover" },
    { label: "Validate", path: "/validate" },
    { label: "Reports", path: "/reports" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden selection:bg-[#4d7c7a]/30 selection:text-white">

      {/* ════════════════════════════════════════════════
          HEADER (Responsive)
      ════════════════════════════════════════════════ */}
      <header
        className="fixed top-0 left-0 right-0 z-[100] transition-all duration-500"
        style={{
          background: headerSolid || mobileMenuOpen ? "rgba(10,10,10,0.92)" : "transparent",
          borderBottom: headerSolid || mobileMenuOpen ? "1px solid rgba(255,255,255,0.05)" : "1px solid transparent",
          backdropFilter: headerSolid || mobileMenuOpen ? "blur(20px) saturate(180%)" : "none",
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group z-50 drop-shadow-none shadow-none text-shadow-none opacity-60 hover:opacity-100 transition-opacity">
            <Logo size={32} color="#4d7c7a" className="drop-shadow-none" />
            <span className="text-2xl font-bold font-logo tracking-tight drop-shadow-none" style={{
              backgroundImage: "linear-gradient(to right, #4d7c7a, #a16207)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: "none",
            }}>GapLens.io</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ label, path }) => (
              <Link key={label} href={path}
                onClick={(e) => { e.preventDefault(); router.push(path); }}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all">
                {label}
              </Link>
            ))}

            <div className="w-px h-5 bg-white/10 mx-2" />

            <button onClick={toggleTheme}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
              title={theme === "dark" ? "Light mode" : "Dark mode"}>
              {theme === "dark" ? <MdLightMode size={18} /> : <MdDarkMode size={18} />}
            </button>

            <Link href="/validate"
              onClick={(e) => { e.preventDefault(); router.push("/validate"); }}
              className="ml-2 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-white text-black rounded-lg hover:bg-gray-100 transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.15)]">
              Get Started <MdArrowForward size={14} />
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-3 z-50">
            <button onClick={toggleTheme}
              className="p-2 text-gray-400 hover:text-white transition-colors">
              {theme === "dark" ? <MdLightMode size={20} /> : <MdDarkMode size={20} />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 -mr-2 text-gray-400 hover:text-white transition-colors"
            >
              {mobileMenuOpen ? <MdClose size={24} /> : <MdMenu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        <div className={`md:hidden absolute top-full left-0 right-0 bg-[#0a0a0b]/95 backdrop-blur-xl border-b border-white/10 transition-all duration-300 overflow-hidden ${mobileMenuOpen ? "max-h-80 py-4 opacity-100" : "max-h-0 py-0 opacity-0 pointer-events-none"}`}>
          <div className="flex flex-col px-6 gap-2">
            {navLinks.map(({ label, path }) => (
              <Link key={label} href={path}
                onClick={(e) => { 
                  e.preventDefault(); 
                  setMobileMenuOpen(false);
                  router.push(path); 
                }}
                className="block px-4 py-3 text-base font-medium text-gray-300 hover:text-white rounded-lg hover:bg-white/5 transition-all">
                {label}
              </Link>
            ))}
            <div className="h-px w-full bg-white/10 my-2" />
            <Link href="/validate"
              onClick={(e) => { 
                e.preventDefault(); 
                setMobileMenuOpen(false);
                router.push("/validate"); 
              }}
              className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 mt-1 text-base font-medium bg-white text-black rounded-lg hover:bg-gray-100 transition-all shadow-lg shadow-white/10">
              Get Started <MdArrowForward size={16} />
            </Link>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════════════
          HERO — Retained as requested
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
            className="group inline-flex items-center gap-2 px-7 py-3.5 text-sm font-bold gradient-brand text-white rounded-xl hover:opacity-90 transition-all hover:scale-[1.015] active:scale-[0.985] shadow-sm shadow-orange-500/5">
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
      </section>

      {/* ════════════════════════════════════════════════
          STATS BAR — Redesigned for premium feel
      ════════════════════════════════════════════════ */}
      <div className="relative z-[5] max-w-5xl mx-auto px-6 -mt-8 mb-16">
        <div className="flex flex-col md:flex-row items-stretch overflow-hidden rounded-2xl bg-[#0f0f12]/80 backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.5)] divide-y md:divide-y-0 md:divide-x divide-white/[0.05]">
          {[
            { value: "6", label: "Platforms scanned", color: "from-blue-500/20" },
            { value: "AI‑scored", label: "Authenticity filtering", color: "from-emerald-500/20" },
            { value: "< 5 min", label: "Idea to insight", color: "from-amber-500/20" },
          ].map((stat, i) => (
            <div key={stat.label} className="relative flex-1 text-center p-8 group">
              {/* Subtle hover gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-b ${stat.color} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
              <p className="font-heading text-3xl font-bold tracking-tight text-white/90 group-hover:text-white drop-shadow-md transition-colors">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-2 uppercase tracking-[0.15em] font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          EXAMPLE OUTPUT — Premium Glassmorphism Cards
      ════════════════════════════════════════════════ */}
      <section className="relative z-[5] px-6 py-28 max-w-6xl mx-auto">
        {/* Background ambient glow setup */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-[400px] bg-[#4d7c7a] opacity-[0.03] blur-[120px] rounded-full pointer-events-none" />

        <div className="text-center mb-20 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/10 mb-6">
            <span className="text-[10px] uppercase tracking-[0.15em] text-gray-400 font-semibold">What you get</span>
          </div>
          <h2 className="font-heading text-4xl md:text-5xl font-bold mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500">
            Real pain points.<br />Scored with evidence.
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto leading-relaxed">
            Stop guessing. GapLens brings you authentic complaints clustered by AI, showing exactly what users desperately need.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {SAMPLE_PAIN_POINTS.map((p, i) => (
            <div key={p.title}
              className={`group relative rounded-3xl bg-[#111111]/80 backdrop-blur-sm border border-white/[0.08] p-8 transition-all duration-500 hover:-translate-y-2 ${p.shadowGlow} overflow-hidden`}
            >
              <div className={`absolute inset-0 border-2 border-transparent rounded-3xl ${p.borderGlow} transition-colors duration-500 pointer-events-none opacity-0 group-hover:opacity-100`} />
              {/* Top ambient color glow */}
              <div className="absolute top-0 inset-x-0 h-32 opacity-20 transition-opacity duration-500 group-hover:opacity-40 pointer-events-none"
                style={{ background: `linear-gradient(to bottom, ${p.accent}, transparent)` }} />

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-6">
                  <div className={`w-12 h-12 rounded-2xl ${p.scoreBg} flex items-center justify-center shrink-0 shadow-inner border border-white/5`}>
                    <span className={`font-heading text-lg font-bold ${p.scoreColor}`}>{p.score}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 font-mono tracking-wider mb-1">MENTIONS</p>
                    <p className="text-lg font-semibold text-white/90">{p.mentions}</p>
                  </div>
                </div>

                <h3 className="font-heading font-bold text-xl text-white leading-snug mb-4">{p.title}</h3>
                
                <div className="relative bg-black/40 border border-white/5 rounded-2xl p-5 mb-6">
                  <span className="absolute -top-3 left-4 text-4xl text-gray-700 leading-none select-none">"</span>
                  <p className="text-gray-400 text-sm italic leading-relaxed relative z-10">{p.quote.replace(/"/g, '')}</p>
                </div>

                <div className="flex flex-wrap gap-2 mt-auto">
                  {p.platforms.map(platform => (
                    <span key={platform} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-gray-300">
                      {platform}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          HOW IT WORKS — Dynamic Step Layout
      ════════════════════════════════════════════════ */}
      <section id="how-it-works" className="relative z-[5] px-6 py-28 bg-[#080808] border-y border-white/[0.03]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(77,124,122,0.05),transparent_50%)]" />
        
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="font-heading text-4xl md:text-5xl font-bold mb-4 tracking-tight">Three steps to clarity</h2>
            <p className="text-gray-400 text-lg">No complex setup. Just raw insights formatted for action.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12 relative">
            {/* Animated Connector Line */}
            <div className="hidden md:absolute md:block top-12 left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent">
              <div className="absolute top-0 left-0 w-1/4 h-full bg-gradient-to-r from-transparent via-[#4d7c7a] to-transparent animate-[slide_3s_ease-in-out_infinite]" />
            </div>

            {/* Step 1 */}
            <div className="relative group flex flex-col items-center text-center">
              <div className="relative w-24 h-24 mb-8">
                <div className="absolute inset-0 bg-blue-500/20 rounded-[2rem] rotate-6 group-hover:rotate-12 transition-transform duration-500" />
                <div className="absolute inset-0 bg-[#111111] border border-blue-500/30 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.15)] z-10">
                  <MdSearch size={32} className="text-blue-400" />
                </div>
              </div>
              <span className="text-blue-400 font-mono text-sm tracking-widest font-semibold mb-3">STEP 01</span>
              <h3 className="font-heading text-2xl font-bold text-white mb-4">Drop your niche</h3>
              <p className="text-gray-400 text-base leading-relaxed">
                Type a keyword or problem space. GapLens immediately starts trawling millions of conversations across platforms.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative group flex flex-col items-center text-center pt-8 md:pt-0">
              <div className="relative w-24 h-24 mb-8">
                <div className="absolute inset-0 bg-emerald-500/20 rounded-[2rem] -rotate-6 group-hover:-rotate-12 transition-transform duration-500" />
                <div className="absolute inset-0 bg-[#111111] border border-emerald-500/30 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.15)] z-10">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <span className="text-emerald-400 font-mono text-sm tracking-widest font-semibold mb-3">STEP 02</span>
              <h3 className="font-heading text-2xl font-bold text-white mb-4">AI finds patterns</h3>
              <p className="text-gray-400 text-base leading-relaxed">
                We eliminate spam and hype. Real complaints are clustered into overarching themes and scored for intensity.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative group flex flex-col items-center text-center pt-8 md:pt-0">
              <div className="relative w-24 h-24 mb-8">
                <div className="absolute inset-0 bg-amber-500/20 rounded-[2rem] rotate-3 group-hover:rotate-6 transition-transform duration-500" />
                <div className="absolute inset-0 bg-[#111111] border border-amber-500/30 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.15)] z-10">
                  <MdAssessment size={32} className="text-amber-400" />
                </div>
              </div>
              <span className="text-amber-400 font-mono text-sm tracking-widest font-semibold mb-3">STEP 03</span>
              <h3 className="font-heading text-2xl font-bold text-white mb-4">Export the PRD</h3>
              <p className="text-gray-400 text-base leading-relaxed">
                Review the deep-dive report, armed with literal user quotes, and export a ready-to-build PRD in one click.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          DATA SOURCES — Sleek Grids
      ════════════════════════════════════════════════ */}
      <section className="relative z-[5] px-6 py-28 max-w-5xl mx-auto text-center">
        <div className="mb-16">
          <h2 className="font-heading text-3xl font-bold mb-4">Unmatched Coverage</h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Surface signals from the noise. Our engines index the platforms where brutal honesty lives.
          </p>
        </div>
        
        <div className="flex flex-wrap justify-center items-center gap-4 max-w-3xl mx-auto">
          {SOURCES.map((s) => (
            <div key={s.id}
              className={`group relative flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.15] transition-all duration-300 hover:scale-105 cursor-default hover:shadow-xl`}>
              <div className={`p-2 rounded-xl bg-white/5 ${s.iconColor} group-hover:scale-110 transition-transform`}>
                <s.Icon size={20} />
              </div>
              <span className="font-medium text-gray-300 group-hover:text-white transition-colors tracking-wide">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          PRICING — Striking Pro Tier
      ════════════════════════════════════════════════ */}
      <section id="pricing" className="relative z-[5] px-6 py-28 bg-[#0a0a0a]">
        {/* Glow behind pricing */}
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#4d7c7a]/[0.05] blur-[150px] rounded-full pointer-events-none" />

        <div className="text-center mb-20 relative">
          <h2 className="font-heading text-4xl md:text-5xl font-bold mb-6">Simple, honest pricing</h2>
          <p className="text-gray-400 text-lg max-w-md mx-auto">Build with confidence without breaking the bank.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto relative relative z-10">
          {PRICING_PLANS.map((plan) => (
            <div key={plan.name}
              className={`relative rounded-[2rem] p-10 flex flex-col transition-transform duration-500 ${
                plan.highlight
                  ? "bg-gradient-to-b from-[#111114] to-[#0a0a0b] border border-[#4d7c7a]/30 shadow-[0_0_60px_rgba(77,124,122,0.15)] transform md:-translate-y-4"
                  : "bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] hover:bg-white/[0.03]"
              }`}
            >
              {plan.highlight && (
                <div className="absolute inset-0 rounded-[2rem] border border-[#7ec8c5]/20 pointer-events-none" />
              )}
              {plan.highlight && (
                <div className="absolute -top-4 w-full flex justify-center left-0">
                  <span className="px-5 py-1.5 rounded-full bg-gradient-to-r from-[#4d7c7a] to-[#7ec8c5] text-black text-xs font-bold uppercase tracking-widest shadow-lg shadow-[#7ec8c5]/30">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-8 mt-2">
                <h3 className="font-heading text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="flex items-end gap-2">
                  <span className="font-heading text-5xl font-extrabold tracking-tight text-white">{plan.price}</span>
                  <span className="text-gray-500 font-medium pb-1">{plan.period}</span>
                </div>
                <p className="text-gray-400 text-sm mt-4">{plan.description}</p>
              </div>

              <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />

              <ul className="space-y-4 mb-10 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-4 text-gray-300 font-medium">
                    <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <MdCheck size={12} className="text-emerald-400" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>

              <Link href={plan.highlight ? checkoutHref : plan.href}
                target={plan.external ? "_blank" : undefined}
                rel={plan.external ? "noopener noreferrer" : undefined}
                className={`flex items-center justify-center gap-2 w-full py-4 rounded-xl text-sm font-bold transition-all ${
                  plan.highlight
                    ? "bg-white text-black hover:bg-gray-100 hover:scale-[1.02] shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                    : "bg-white/[0.05] border border-white/[0.1] text-white hover:bg-white/[0.1] hover:scale-[1.02]"
                }`}>
                {plan.cta}
                <MdArrowForward size={16} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          EMAIL CAPTURE — Exclusive Feel
      ════════════════════════════════════════════════ */}
      <section className="relative z-[5] px-6 py-24 mb-10">
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-[2.5rem] bg-gradient-to-b from-white/[0.04] to-transparent border border-white/5 p-12 text-center overflow-hidden shadow-2xl">
            {/* Inner background glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02),transparent_70%)]" />
            
            <div className="relative z-10">
              <h2 className="font-heading text-3xl font-bold text-white mb-4">
                The Pain Point Digest
              </h2>
              <p className="text-gray-400 text-base max-w-md mx-auto mb-10 leading-relaxed">
                Every Friday, we send out the 3 fastest-growing complaints on the internet. High signal, zero noise. Join the list.
              </p>

              {emailSubmitted ? (
                <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium shadow-lg mx-auto gap-3">
                  <div className="bg-emerald-500/20 p-2 rounded-full">
                    <MdCheck size={20} />
                  </div>
                  You're in. Watch your inbox this Friday.
                </div>
              ) : (
                <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row items-center gap-3 justify-center max-w-lg mx-auto">
                  <div className="relative w-full sm:w-auto flex-1">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
                      placeholder="founder@startup.com"
                      required
                      disabled={emailLoading}
                      className="w-full px-6 py-4 rounded-2xl bg-black/50 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-white/30 focus:ring-4 focus:ring-white/5 transition-all text-sm backdrop-blur-md shadow-inner disabled:opacity-50"
                    />
                  </div>
                  <button type="submit" disabled={emailLoading}
                    className="w-full sm:w-auto px-8 py-4 bg-white text-black rounded-2xl font-bold text-sm hover:bg-gray-100 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2">
                    {emailLoading ? "Joining..." : "Subscribe"}
                    {!emailLoading && <MdArrowForward size={16} />}
                  </button>
                </form>
              )}
              {emailError && (
                <p className="text-sm text-red-400 mt-4 font-medium">{emailError}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          FINAL CTA
      ════════════════════════════════════════════════ */}
      <section className="relative z-10 px-6 py-32 border-t border-white/[0.05] bg-gradient-to-b from-transparent to-[#050505]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-heading text-4xl sm:text-5xl font-bold mb-8 leading-[1.15] tracking-tight text-white">
            Your next users are online right now—complaining about exactly what you should build.
          </h2>
          <Link href="/validate"
            onClick={(e) => { e.preventDefault(); router.push("/validate"); }}
            className="group inline-flex items-center gap-3 px-10 py-5 text-lg font-bold bg-white text-black rounded-full hover:bg-gray-100 transition-all hover:scale-[1.03] active:scale-[0.97] shadow-[0_0_40px_rgba(255,255,255,0.15)]">
            Start finding pain points
            <MdArrowForward size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          FOOTER — Clean & Polished
      ════════════════════════════════════════════════ */}
      <footer className="relative z-[5] border-t border-white/[0.05] bg-black py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="flex items-center gap-2">
              <Logo size={20} color="#4d7c7a" />
              <span className="text-lg font-bold tracking-tight text-white">GapLens</span>
            </div>
            <p className="text-sm text-gray-500">© {new Date().getFullYear()} GapLens. All rights reserved.</p>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-8 gap-y-4 text-sm font-medium text-gray-400">
            <Link href="/gummysearch-alternative" className="hover:text-white transition-colors">GummySearch Alt</Link>
            <Link href="/validate" className="hover:text-white transition-colors">Validate</Link>
            <Link href="/discover" className="hover:text-white transition-colors">Discover</Link>
            <Link href="/reports" className="hover:text-white transition-colors">Reports</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/refund-policy" className="hover:text-white transition-colors">Refund</Link>
          </div>
        </div>
      </footer>
      
      {/* Global CSS for animations in this file to avoid breaking tailwind configs unnecessarily */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slide {
          0%, 100% { transform: translateX(0%); }
          50% { transform: translateX(300%); }
        }
      `}} />
    </div>
  );
}
