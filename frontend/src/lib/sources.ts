/**
 * Unified source configuration for SearchBar, SourceFilters, and landing page.
 */

import { SiReddit, SiYcombinator, SiG2, SiYoutube } from "react-icons/si";
import { FaAmazon } from "react-icons/fa";

export interface SourceConfig {
  id: string;
  label: string;
  icon: string;
  color: string;
  /** For landing page badges */
  landingColor: string;
  Icon: React.ComponentType<{ size?: number }>;
}

export const SOURCES: SourceConfig[] = [
  { id: "reddit", label: "Reddit", icon: "R", color: "bg-orange-500", landingColor: "bg-orange-500/20 text-orange-400 border-orange-500/30", Icon: SiReddit },
  { id: "hackernews", label: "Hacker News", icon: "Y", color: "bg-amber-500", landingColor: "bg-amber-500/20 text-amber-400 border-amber-500/30", Icon: SiYcombinator },
  { id: "amazon", label: "Amazon Reviews", icon: "A", color: "bg-yellow-600", landingColor: "bg-sky-500/20 text-sky-400 border-sky-500/30", Icon: FaAmazon },
  { id: "g2", label: "G2", icon: "G", color: "bg-green-600", landingColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", Icon: SiG2 },
  { id: "youtube", label: "YouTube", icon: "▶", color: "bg-red-600", landingColor: "bg-red-500/20 text-red-400 border-red-500/30", Icon: SiYoutube },
];

/** For SearchBar/SourceFilters – same structure, backward compatible */
export const SOURCE_OPTIONS = SOURCES.map(({ id, label, icon, color }) => ({ id, label, icon, color }));
