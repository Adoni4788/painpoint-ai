/**
 * Unified source configuration for SearchBar, SourceFilters, and landing page.
 */

import { SiReddit, SiYcombinator, SiG2, SiYoutube, SiStackoverflow, SiGithub } from "react-icons/si";
import { FaAmazon, FaFacebook } from "react-icons/fa";

export interface SourceConfig {
  id: string;
  label: string;
  icon: string;
  color: string;
  /** For landing page badges */
  landingColor: string;
  /** Icon brand color (Tailwind text class) for landing page */
  iconColor: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  /**
   * Visible in the picker but not selectable. Set when a source needs gating
   * (e.g. requires a paid backend integration we haven't shipped yet) so
   * users don't tick it, hit an invisible wall, and lose trust in the tool.
   */
  disabled?: boolean;
  /** Tooltip shown on hover for a disabled source. */
  disabledReason?: string;
}

export const SOURCES: SourceConfig[] = [
  { id: "reddit", label: "Reddit", icon: "R", color: "bg-orange-500", landingColor: "bg-orange-500/25 text-white border-orange-500/50", iconColor: "text-orange-400", Icon: SiReddit },
  { id: "hackernews", label: "Hacker News", icon: "Y", color: "bg-amber-500", landingColor: "bg-amber-500/25 text-white border-amber-500/50", iconColor: "text-amber-400", Icon: SiYcombinator },
  { id: "amazon", label: "Amazon Discussions", icon: "A", color: "bg-yellow-600", landingColor: "bg-amber-600/25 text-white border-amber-600/50", iconColor: "text-amber-400", Icon: FaAmazon },
  // G2 requires a paid Brand subscription ($299+/mo) for legitimate API access.
  // Greyed out until we ship an alternate B2B-SaaS-reviews source on Pro.
  { id: "g2", label: "G2", icon: "G", color: "bg-green-600", landingColor: "bg-emerald-500/25 text-white border-emerald-500/50", iconColor: "text-emerald-400", Icon: SiG2, disabled: true, disabledReason: "Coming soon — Pro plan" },
  { id: "youtube", label: "YouTube", icon: "▶", color: "bg-red-600", landingColor: "bg-red-500/25 text-white border-red-500/50", iconColor: "text-red-400", Icon: SiYoutube },
  { id: "facebook", label: "Facebook Discussions", icon: "f", color: "bg-blue-600", landingColor: "bg-blue-500/25 text-white border-blue-500/50", iconColor: "text-blue-400", Icon: FaFacebook },
  { id: "stackoverflow", label: "Stack Overflow", icon: "S", color: "bg-orange-600", landingColor: "bg-orange-600/25 text-white border-orange-600/50", iconColor: "text-orange-500", Icon: SiStackoverflow },
  { id: "github", label: "GitHub Issues", icon: "GH", color: "bg-gray-800", landingColor: "bg-gray-700/40 text-white border-gray-500/50", iconColor: "text-gray-300", Icon: SiGithub },
];

/** Set of source ids that are present in the UI but cannot be selected. */
export const DISABLED_SOURCE_IDS: ReadonlySet<string> = new Set(
  SOURCES.filter((s) => s.disabled).map((s) => s.id),
);

/** For SearchBar/SourceFilters – same structure plus the disabled metadata. */
export const SOURCE_OPTIONS = SOURCES.map(({ id, label, icon, color, disabled, disabledReason }) => ({
  id,
  label,
  icon,
  color,
  disabled: disabled ?? false,
  disabledReason: disabledReason ?? "",
}));
