/**
 * Unified source configuration for SearchBar, SourceFilters, and landing page.
 */

import { SiReddit, SiYcombinator, SiG2, SiYoutube, SiStackoverflow } from "react-icons/si";
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
}

export const SOURCES: SourceConfig[] = [
  { id: "reddit", label: "Reddit", icon: "R", color: "bg-orange-500", landingColor: "bg-orange-500/25 text-white border-orange-500/50", iconColor: "text-orange-400", Icon: SiReddit },
  { id: "hackernews", label: "Hacker News", icon: "Y", color: "bg-amber-500", landingColor: "bg-amber-500/25 text-white border-amber-500/50", iconColor: "text-amber-400", Icon: SiYcombinator },
  { id: "amazon", label: "Amazon Discussions", icon: "A", color: "bg-yellow-600", landingColor: "bg-amber-600/25 text-white border-amber-600/50", iconColor: "text-amber-400", Icon: FaAmazon },
  { id: "g2", label: "G2", icon: "G", color: "bg-green-600", landingColor: "bg-emerald-500/25 text-white border-emerald-500/50", iconColor: "text-emerald-400", Icon: SiG2 },
  { id: "youtube", label: "YouTube", icon: "▶", color: "bg-red-600", landingColor: "bg-red-500/25 text-white border-red-500/50", iconColor: "text-red-400", Icon: SiYoutube },
  { id: "facebook", label: "Facebook Discussions", icon: "f", color: "bg-blue-600", landingColor: "bg-blue-500/25 text-white border-blue-500/50", iconColor: "text-blue-400", Icon: FaFacebook },
  { id: "stackoverflow", label: "Stack Overflow", icon: "S", color: "bg-orange-600", landingColor: "bg-orange-600/25 text-white border-orange-600/50", iconColor: "text-orange-500", Icon: SiStackoverflow },
];

/** For SearchBar/SourceFilters – same structure, backward compatible */
export const SOURCE_OPTIONS = SOURCES.map(({ id, label, icon, color }) => ({ id, label, icon, color }));
