import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Terms of Service — GapLens",
  description: "Terms of Service for GapLens, the AI-powered opportunity discovery engine.",
};

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-12">Last updated: March 17, 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-10 text-gray-300 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Agreement to Terms</h2>
            <p>
              By accessing or using GapLens ("the Service"), operated by Wayne Boreland ("we", "us", or "our"),
              you agree to be bound by these Terms of Service. If you do not agree, you may not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Description of Service</h2>
            <p>
              GapLens is an AI-powered opportunity discovery engine that scans public data sources — including Reddit,
              Hacker News, Amazon reviews, G2, and YouTube — to surface validated pain points and score them for
              market opportunity. The Service is intended for founders, product managers, and entrepreneurs conducting
              market research.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Accounts</h2>
            <p>
              You must create an account to access certain features. You are responsible for maintaining the
              security of your account credentials and for all activities that occur under your account.
              Accounts are managed via Clerk authentication. You must provide accurate and complete information
              when registering.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Subscription and Billing</h2>
            <p>
              GapLens offers a free tier and a paid Pro plan. Paid subscriptions are billed through
              Lemon Squeezy and are subject to their payment processing terms. By subscribing, you authorize
              us to charge your payment method on a recurring basis.
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-1">
              <li><strong className="text-white">Free Plan:</strong> 3 searches per month with limited features.</li>
              <li><strong className="text-white">Pro Plan:</strong> $29/month. Includes a 7-day free trial. Unlimited searches, full clustering, AI-generated PRDs, and exports.</li>
            </ul>
            <p className="mt-3">
              You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period.
              Please see our <Link href="/refund-policy" className="text-[#4d7c7a] hover:underline">Refund Policy</Link> for details on refunds.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 mt-3 space-y-1">
              <li>Use the Service for any unlawful purpose or in violation of any applicable laws</li>
              <li>Attempt to reverse-engineer, scrape, or copy the Service's underlying algorithms or data</li>
              <li>Use the Service to generate content that is fraudulent, misleading, or harmful</li>
              <li>Share your account credentials with third parties</li>
              <li>Use automated tools to abuse or overload the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Intellectual Property</h2>
            <p>
              The GapLens platform, including its design, code, branding, and content, is owned by us and protected
              by applicable intellectual property laws. You retain ownership of any data or content you input into
              the Service. We do not claim ownership of your searches or generated reports.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Data and Privacy</h2>
            <p>
              GapLens analyzes publicly available data from third-party platforms. We do not scrape or store
              private user data from those platforms. Your use of the Service is also governed by our Privacy Policy,
              which is incorporated into these Terms by reference.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Disclaimer of Warranties</h2>
            <p>
              The Service is provided "as is" and "as available" without warranties of any kind, express or implied.
              We do not guarantee that the Service will be uninterrupted, error-free, or that the results obtained
              will be accurate or reliable. AI-generated content should be independently verified before making
              business decisions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, we shall not be liable for any indirect, incidental, special,
              consequential, or punitive damages arising from your use of the Service, including but not limited to
              loss of profits, data, or business opportunities, even if we have been advised of the possibility of
              such damages. Our total liability to you shall not exceed the amount you paid us in the 12 months
              preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Modifications to the Service and Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will notify you of significant changes via
              email or through the Service. Continued use of the Service after changes constitutes acceptance of
              the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">11. Termination</h2>
            <p>
              We may suspend or terminate your account at our discretion if you violate these Terms or engage in
              conduct we deem harmful. You may also terminate your account at any time by contacting us.
              Upon termination, your right to use the Service ceases immediately.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">12. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which
              the operator resides, without regard to its conflict of law provisions. Any disputes shall be resolved
              through good-faith negotiation first, then binding arbitration if necessary.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">13. Contact</h2>
            <p>
              For questions about these Terms, please contact us at:{" "}
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
