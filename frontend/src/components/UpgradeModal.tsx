"use client";

import { useUser } from "@clerk/nextjs";
import { FocusTrap } from "@/components/FocusTrap";
import { HiOutlineArrowUpRight } from "react-icons/hi2";

const LS_CHECKOUT_BASE =
  "https://gaplens.lemonsqueezy.com/checkout/buy/aa085b19-4069-424a-8ad3-4f615bc5fb75";

const PRO_FEATURES = [
  "Unlimited searches",
  "Full pain point clustering",
  "AI-generated PRD drafts",
  "All 6 platforms",
  "Priority processing",
];

export function UpgradeModal({ onClose }: { onClose: () => void }) {
  const { user } = useUser();

  const checkoutHref = user
    ? `${LS_CHECKOUT_BASE}?checkout[custom][clerk_user_id]=${user.id}`
    : LS_CHECKOUT_BASE;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50"
      role="presentation"
    >
      <FocusTrap active onEscape={onClose}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="upgrade-modal-title"
          className="bg-white dark:bg-[#171717] rounded-2xl p-6 max-w-sm w-full shadow-xl border border-gray-200 dark:border-white/10"
        >
          {/* Header */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-500/15 mb-3">
              <span className="text-2xl">⚡</span>
            </div>
            <h2
              id="upgrade-modal-title"
              className="text-lg font-bold text-gray-900 dark:text-gray-100"
            >
              You&apos;ve used all 3 free searches
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Upgrade to Pro to keep discovering opportunities.
            </p>
          </div>

          {/* Features */}
          <ul className="space-y-2 mb-5">
            {PRO_FEATURES.map((f) => (
              <li
                key={f}
                className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
              >
                <span className="text-emerald-500">✓</span>
                {f}
              </li>
            ))}
          </ul>

          {/* Price */}
          <div className="text-center mb-4">
            <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              $29
            </span>
            <span className="text-gray-500 dark:text-gray-400 text-sm">
              / month
            </span>
          </div>

          {/* CTA */}
          <a
            href={checkoutHref}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl gradient-brand hover:opacity-90 text-white font-semibold transition-all shadow-lg shadow-orange-500/20"
          >
            Upgrade to Pro
            <HiOutlineArrowUpRight size={16} />
          </a>

          {/* Dismiss */}
          <button
            type="button"
            onClick={onClose}
            className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-center"
          >
            Maybe later
          </button>
        </div>
      </FocusTrap>
    </div>
  );
}
