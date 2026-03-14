/**
 * Shared utilities for score and authenticity display.
 * Used by ClusterList, ReportPanel, and reports page.
 */

/** Opportunity score — toast-like: subtle bg + border that highlights */
export function getScoreColorClasses(score: number, options?: { includeBorder?: boolean }): string {
  const border = options?.includeBorder !== false;
  if (score >= 7) {
    const base = "text-emerald-700 bg-emerald-50/80 dark:text-emerald-300 dark:bg-emerald-950/30";
    return border ? `${base} border border-emerald-200 dark:border-emerald-700/50` : base;
  }
  if (score >= 5) {
    const base = "text-amber-700 bg-amber-50/80 dark:text-amber-300 dark:bg-amber-950/30";
    return border ? `${base} border border-amber-200 dark:border-amber-700/50` : base;
  }
  const base = "text-slate-600 bg-slate-50/80 dark:text-slate-300 dark:bg-slate-800/30";
  return border ? `${base} border border-slate-200 dark:border-slate-600/50` : base;
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
