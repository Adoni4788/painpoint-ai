import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Privacy Policy — GapLens",
  description: "Privacy Policy for GapLens, the AI-powered opportunity discovery engine.",
};

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-12">Last updated: March 17, 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-10 text-gray-300 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Introduction</h2>
            <p>
              GapLens ("we", "us", or "our"), operated by Wayne Boreland, is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, and safeguard information when you use our
              AI-powered opportunity discovery platform at{" "}
              <a href="https://gaplens.io" className="text-[#4d7c7a] hover:underline">gaplens.io</a>{" "}
              ("the Service").
            </p>
            <p className="mt-3">
              By using GapLens, you agree to the collection and use of information as described in this policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Information We Collect</h2>

            <h3 className="text-base font-semibold text-gray-200 mt-4 mb-2">Information you provide</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Account information (email address, name) collected via Clerk authentication when you sign up</li>
              <li>Search queries and keywords you enter into the Service</li>
              <li>Payment information — processed securely by Lemon Squeezy; we never store card details</li>
            </ul>

            <h3 className="text-base font-semibold text-gray-200 mt-4 mb-2">Information collected automatically</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Usage data (pages visited, features used, search history within the Service)</li>
              <li>Device and browser information (browser type, operating system, IP address)</li>
              <li>Cookies and session tokens used to maintain your login state</li>
              <li>Analytics events via PostHog to understand how users interact with the product</li>
              <li>Error and performance data via Sentry to diagnose and fix issues</li>
            </ul>

            <h3 className="text-base font-semibold text-gray-200 mt-4 mb-2">Public data we analyze on your behalf</h3>
            <p>
              When you run a search, GapLens retrieves and analyzes publicly available content from third-party
              platforms (such as Reddit, Hacker News, Amazon, YouTube, Stack Overflow, and GitHub). We do not scrape
              or store private user data from those platforms — only publicly accessible content is processed.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide, operate, and improve the Service</li>
              <li>To authenticate your identity and maintain your account</li>
              <li>To process payments and manage your subscription</li>
              <li>To store and display your search history and generated reports</li>
              <li>To send transactional emails (account confirmation, billing receipts)</li>
              <li>To monitor and improve performance, diagnose errors, and prevent abuse</li>
              <li>To comply with legal obligations</li>
            </ul>
            <p className="mt-3">
              We do not sell your personal data to third parties. We do not use your data to train AI models.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Cookies</h2>
            <p>
              GapLens uses cookies and similar tracking technologies to maintain your session and remember your
              preferences. You can control cookies through your browser settings, but disabling them may affect
              your ability to log in or use the Service.
            </p>
            <p className="mt-3">We use the following types of cookies:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong className="text-white">Essential cookies</strong> — Required for authentication and security (provided by Clerk)</li>
              <li><strong className="text-white">Analytics cookies</strong> — Help us understand how users interact with the product (PostHog)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Data Sharing and Third Parties</h2>
            <p>We share data with trusted third-party service providers only as necessary to operate the Service:</p>
            <ul className="list-disc pl-5 mt-3 space-y-1">
              <li><strong className="text-white">Clerk</strong> — Authentication and user identity management</li>
              <li><strong className="text-white">Lemon Squeezy</strong> — Payment processing and subscription management</li>
              <li><strong className="text-white">PostHog</strong> — Product analytics</li>
              <li><strong className="text-white">Sentry</strong> — Error monitoring and performance tracking</li>
              <li><strong className="text-white">Render</strong> — Cloud infrastructure and hosting</li>
              <li><strong className="text-white">OpenAI / AI providers</strong> — Your search queries are sent to AI APIs to generate opportunity analysis</li>
            </ul>
            <p className="mt-3">
              Each of these providers has their own privacy policy and data processing terms. We do not share your
              data with any other third parties without your explicit consent, except as required by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Data Retention</h2>
            <p>
              We retain your account data and search history for as long as your account is active. If you delete
              your account, we will delete your personal data within 30 days, except where we are required by law
              to retain it longer (e.g., billing records).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Your Rights</h2>
            <p>Depending on your location, you may have the following rights regarding your personal data:</p>
            <ul className="list-disc pl-5 mt-3 space-y-1">
              <li><strong className="text-white">Access</strong> — Request a copy of the data we hold about you</li>
              <li><strong className="text-white">Correction</strong> — Request that we correct inaccurate data</li>
              <li><strong className="text-white">Deletion</strong> — Request that we delete your account and personal data</li>
              <li><strong className="text-white">Portability</strong> — Request your data in a machine-readable format</li>
              <li><strong className="text-white">Objection</strong> — Object to certain types of processing</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, email us at{" "}
              <a href="mailto:support@gaplens.io" className="text-[#4d7c7a] hover:underline">
                support@gaplens.io
              </a>
              . We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Security</h2>
            <p>
              We take reasonable technical and organizational measures to protect your data, including encrypted
              connections (HTTPS), secure authentication via Clerk, and access controls on our backend systems.
              However, no method of transmission over the internet is 100% secure. We encourage you to use a
              strong, unique password for your account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Children&apos;s Privacy</h2>
            <p>
              GapLens is not directed at children under 13 years of age. We do not knowingly collect personal
              information from children. If you believe we have inadvertently collected such information, please
              contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. When we make significant changes, we will
              notify you via email or a notice within the Service. Your continued use of the Service after
              changes are posted constitutes your acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">11. Contact</h2>
            <p>
              If you have any questions or concerns about this Privacy Policy, please contact us at:
            </p>
            <p className="mt-2">
              <a href="mailto:support@gaplens.io" className="text-[#4d7c7a] hover:underline font-medium">
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
