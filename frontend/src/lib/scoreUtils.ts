/**
 * Shared utilities for score and authenticity display.
 * Used by ClusterList, ReportPanel, and reports page.
 */

/** Opportunity score thresholds: >=7 green, >=5 yellow, else gray */
export function getScoreColorClasses(score: number, options?: { includeBorder?: boolean }): string {
  const border = options?.includeBorder !== false;
  if (score >= 7) {
    const base = "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/40";
    return border ? `${base} border-green-200 dark:border-green-800` : base;
  }
  if (score >= 5) {
    const base = "text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950/40";
    return border ? `${base} border-yellow-200 dark:border-yellow-800` : base;
  }
  const base = "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-[#262626]";
  return border ? `${base} border-gray-200 dark:border-white/10` : base;
}

/** Compact score color for inline text (no bg/border) */
export function getScoreTextColorClasses(score: number): string {
  if (score >= 7) return "text-green-600 dark:text-green-400";
  if (score >= 5) return "text-yellow-600 dark:text-yellow-400";
  return "text-gray-500 dark:text-gray-400";
}

/** Bar color for score progress bars */
export function getScoreBarColor(score: number): string {
  if (score >= 7) return "bg-green-400";
  if (score >= 5) return "bg-yellow-400";
  return "bg-gray-300 dark:bg-[#404040]";
}

/** Authenticity thresholds: >=0.7 strong, >=0.4 mixed, else weak */
export function getAuthenticityColorClasses(value: number): string {
  if (value >= 0.7) return "text-green-600 dark:text-green-400";
  if (value >= 0.4) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-500 dark:text-red-400";
}

/** Authenticity background classes for badges */
export function getAuthenticityBgClasses(value: number): string {
  if (value >= 0.7) return "bg-green-50 dark:bg-green-950/40";
  if (value >= 0.4) return "bg-yellow-50 dark:bg-yellow-950/40";
  return "bg-red-50 dark:bg-red-950/40";
}

/** Human-readable authenticity label */
export function getAuthenticityLabel(value: number): "Strong evidence" | "Mixed evidence" | "Weak evidence" {
  if (value >= 0.7) return "Strong evidence";
  if (value >= 0.4) return "Mixed evidence";
  return "Weak evidence";
}

/** Short label for cell display (High/Mixed/Low) */
export function getAuthenticityShortLabel(value: number): "High" | "Mixed" | "Low" {
  if (value >= 0.7) return "High";
  if (value >= 0.4) return "Mixed";
  return "Low";
}
