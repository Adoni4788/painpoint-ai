import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Refund Policy — GapLens",
  description: "Refund policy for GapLens Pro subscriptions.",
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-white/[0.05] py-4">
        <div className="max-w-3xl mx-auto px-6 flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 group">
            <Logo size={22} color="#4d7c7a" className="group-hover:opacity-80 transition-opacity" />
            <span
              className="text-sm font-semibold tracking-tight"
              style={{
                backgroundImage: "linear-gradient(to right, #4d7c7a, #a16207)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              GapLens
            </span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-2">Refund Policy</h1>
        <p className="text-sm text-gray-500 mb-12">Last updated: March 17, 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-10 text-gray-300 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7-Day Free Trial</h2>
            <p>
              All new Pro subscriptions include a <strong className="text-white">7-day free trial</strong>. You will
              not be charged until the trial period ends. You may cancel at any time during the trial without
              being charged.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Refund Eligibility</h2>
            <p>
              If you are charged and are not satisfied with GapLens Pro, you may request a full refund within
              <strong className="text-white"> 7 days of your first charge</strong> (after the free trial ends).
              We will process your refund with no questions asked.
            </p>
            <p className="mt-3">
              After the 7-day refund window, we are unable to offer refunds for partial billing periods. When you
              cancel your subscription, you will retain access to Pro features until the end of your current
              billing cycle.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">How to Request a Refund</h2>
            <p>To request a refund, simply email us at:</p>
            <p className="mt-2">
              <a href="mailto:support@gaplens.io" className="text-[#4d7c7a] hover:underline font-medium">
                support@gaplens.io
              </a>
            </p>
            <p className="mt-3">
              Please include the email address associated with your account. We will process your refund within
              3–5 business days. Refunds are returned to the original payment method.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Cancellations</h2>
            <p>
              You can cancel your Pro subscription at any time from your account settings or by contacting support.
              Cancellation stops future charges but does not remove access for the remainder of your paid period.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Exceptions</h2>
            <p>
              We reserve the right to decline refund requests where we have reasonable evidence of abuse of the
              refund policy (e.g., repeated subscribe-refund cycles).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Contact</h2>
            <p>
              Questions about our refund policy? Reach us at{" "}
              <a href="mailto:support@gaplens.io" className="text-[#4d7c7a] hover:underline">
                support@gaplens.io
              </a>
            </p>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.05] py-6 mt-10">
        <div className="max-w-3xl mx-auto px-6 flex items-center justify-between text-xs text-gray-700">
          <p>© {new Date().getFullYear()} GapLens</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-gray-400 transition-colors">Terms</Link>
            <Link href="/refund-policy" className="hover:text-gray-400 transition-colors">Refund Policy</Link>
            <Link href="/privacy" className="hover:text-gray-400 transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
