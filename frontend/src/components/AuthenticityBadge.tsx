"use client";

import { getAuthenticityColorClasses, getAuthenticityBgClasses, getAuthenticityLabel, getAuthenticityShortLabel } from "@/lib/scoreUtils";

interface AuthenticityBadgeProps {
  value: number;
  /** "badge" = inline "{pct}% authentic" | "cell" = "Evidence" label + "{pct}% {label}" */
  variant?: "badge" | "cell";
}

export function AuthenticityBadge({ value, variant = "badge" }: AuthenticityBadgeProps) {
  const pct = Math.round(value * 100);
  const colorClasses = getAuthenticityColorClasses(value);
  const label = getAuthenticityLabel(value);
  const shortLabel = getAuthenticityShortLabel(value);

  if (variant === "cell") {
    const bgClasses = getAuthenticityBgClasses(value);
    return (
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Evidence</p>
        <p
          className={`text-sm font-bold ${colorClasses} ${bgClasses} rounded px-1 py-0.5`}
          title={`${pct}% authentic — ${label}`}
        >
          {pct}% {shortLabel}
        </p>
      </div>
    );
  }

  return (
    <span className={`font-medium ${colorClasses}`} title={label}>
      {pct}% authentic
    </span>
  );
}
