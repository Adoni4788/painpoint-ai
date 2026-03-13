"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { useTheme } from "@/components/ThemeProvider";
import { MdArrowForward, MdLightMode, MdDarkMode } from "react-icons/md";
import { validateMinimal } from "@/lib/api";

export default function ValidatePage() {
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme, toggle: toggleTheme } = useTheme();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const search = await validateMinimal(idea.trim());
      router.push(`/discover?search_id=${search.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Validation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] dark:bg-[#0a0a0a] text-white flex flex-col">
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Logo size={32} color="#4d7c7a" className="logo-carved group-hover:opacity-90 transition-opacity" />
          <span className="text-xl font-semibold tracking-tight text-carved">
            <span style={{ color: "#4d7c7a" }}>Gap</span>
            <span style={{ color: "#d97706" }}>Lens</span>
          </span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/discover" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
            Discover
          </Link>
          <Link href="/reports" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
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
            Discover
            <MdArrowForward size={16} />
          </Link>
        </nav>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          <h1 className="text-2xl font-bold mb-2">Validate your idea</h1>
          <p className="text-gray-400 mb-8">
            Describe your product idea in a sentence. GapLens will search for real pain points to validate demand.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="e.g. A tool that helps email marketers improve deliverability and avoid spam folders"
              className="w-full h-32 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none"
              disabled={loading}
              maxLength={500}
            />
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || !idea.trim()}
              className="w-full py-3 px-6 rounded-xl font-semibold bg-white text-black hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Searching for pain points…" : "Validate idea"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
