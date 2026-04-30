"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MdAdd, MdExpandMore, MdEdit, MdDelete, MdPushPin, MdOutlinePushPin } from "react-icons/md";
import { useUser } from "@clerk/nextjs";
import { SearchResult } from "@/lib/api";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Logo } from "@/components/Logo";
import { GlobalResearchIcon, DiscoverIcon, VoteYeaIcon, SettingsIcon, FolderPlusCircleIcon } from "@/components/SidebarIcons";

const FREE_LIMIT = 3;
const LS_CHECKOUT_BASE =
  "https://gaplens.lemonsqueezy.com/checkout/buy/aa085b19-4069-424a-8ad3-4f615bc5fb75";

interface SidebarProps {
  searches: SearchResult[];
  activeSearchId: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onSelectSearch: (search: SearchResult) => void;
}

const NAV_ITEMS = [
  {
    label: "Discover",
    href: "/discover",
    icon: <GlobalResearchIcon />,
  },
  {
    label: "Validate",
    href: "/validate",
    icon: <VoteYeaIcon />,
  },
  {
    label: "Reports",
    href: "/reports",
    icon: <DiscoverIcon />,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: <SettingsIcon />,
  },
];

export function Sidebar({ searches, activeSearchId, isOpen, onToggle, onSelectSearch }: SidebarProps) {
  const pathname = usePathname();
  const {
    workspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
  } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!searchModalOpen) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") { setSearchModalOpen(false); setSearchQuery(""); }
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [searchModalOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      // If the clicked element was removed from the DOM by a React re-render
      // (e.g. "New workspace" button replaced by the input), don't close —
      // the click was inside our component.
      if (!document.body.contains(e.target as Node)) return;
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setWorkspaceMenuOpen(false);
        setCreateMode(false);
        setEditingId(null);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const displayName = activeWorkspace?.name ?? "All workspaces";

  const filteredSearches = useMemo(() =>
    searchQuery.trim()
      ? searches.filter((s) => s.query.toLowerCase().includes(searchQuery.toLowerCase()))
      : searches,
    [searches, searchQuery]
  );


  return (
    <aside
      data-expanded={isOpen}
      className={`sidebar-aside group h-full flex flex-col bg-[#f2f3f5] dark:bg-[#0D0D0D] rounded-2xl border border-[#dcdcde] dark:border-white/[0.07] shadow-none dark:shadow-[0_8px_48px_rgba(0,0,0,0.7)] transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden ${isOpen ? "w-64" : "w-16 hover:w-64"}`}
    >
      {/* Sidebar header: logo, name, collapse */}
      <div className="shrink-0 flex flex-col min-w-[240px]">
        <div className="flex items-center gap-2 px-3 py-4">
          <div className="flex items-center gap-2 shrink-0">
            {/* Fixed-width centering shell: w-10 (40px) + px-3 (12px) = 32px center = exact middle of w-16 rail */}
            <div className="w-10 flex items-center justify-center shrink-0 text-[#050505] dark:text-white">
              <Logo size={22} className="logo-app" />
            </div>
            <span className="text-[#050505] dark:text-white text-lg font-heading font-semibold tracking-tight truncate overflow-hidden opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto group-data-[expanded=true]:opacity-100 group-data-[expanded=true]:w-auto transition-all duration-300">
              GapLens
            </span>
          </div>
          <button
            onClick={onToggle}
            className={`ml-auto p-1 text-[#050505] hover:text-gray-700 dark:text-gray-500 dark:hover:text-white rounded-lg hover:bg-gray-200/60 dark:hover:bg-white/10 transition-colors shrink-0 opacity-0 group-hover:opacity-100 group-data-[expanded=true]:opacity-100`}
            title={isOpen ? "Unpin sidebar" : "Pin sidebar"}
            aria-label={isOpen ? "Unpin sidebar" : "Pin sidebar"}
          >
            {isOpen ? <MdPushPin size={18} /> : <MdOutlinePushPin size={18} />}
          </button>
        </div>
        <div className="mx-3 h-px bg-[#dcdcde] dark:bg-white/[0.07]" />
      </div>
      {/* Scrollable body — nav, workspace, recent searches */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-sidebar min-h-0 flex flex-col">

        {/* Navigation Links */}
        <div className="flex flex-col gap-0.5 px-2 pt-3 pb-2">
          {/* Discover, Validate */}
          {NAV_ITEMS.slice(0, 2).map((item) => {
            const isActive =
              item.href === "/discover"
                ? pathname === "/discover" && !activeSearchId
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-1.5 text-[13px] font-medium transition-all duration-200 w-full rounded-lg ${
                  isActive
                    ? "bg-[#dcdcde] text-gray-900 dark:bg-white/10 dark:text-white"
                    : "text-[#050505] hover:bg-gray-200/60 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
                }`}
              >
                <span className={`[&>svg]:w-4 [&>svg]:h-4 ${isActive ? "text-[#050505] dark:text-white" : "text-[#050505] dark:text-gray-500"}`}>
                  {item.icon}
                </span>
                <span className="opacity-0 w-0 overflow-hidden group-hover:opacity-100 group-hover:w-auto group-data-[expanded=true]:opacity-100 group-data-[expanded=true]:w-auto transition-all duration-300 whitespace-nowrap">
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Search — after Validate */}
          <button
            onClick={() => setSearchModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-[13px] font-medium transition-all duration-200 w-full rounded-lg text-[#050505] hover:bg-gray-200/60 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <span className="text-[#050505] dark:text-gray-500 shrink-0 w-4 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <span className="opacity-0 w-0 overflow-hidden group-hover:opacity-100 group-hover:w-auto group-data-[expanded=true]:opacity-100 group-data-[expanded=true]:w-auto transition-all duration-300 whitespace-nowrap">
              Search
            </span>
          </button>

          {/* Reports, Settings */}
          {NAV_ITEMS.slice(2).map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-1.5 text-[13px] font-medium transition-all duration-200 w-full rounded-lg ${
                  isActive
                    ? "bg-[#dcdcde] text-gray-900 dark:bg-white/10 dark:text-white"
                    : "text-[#050505] hover:bg-gray-200/60 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
                }`}
              >
                <span className={`[&>svg]:w-4 [&>svg]:h-4 ${isActive ? "text-[#050505] dark:text-white" : "text-[#050505] dark:text-gray-500"}`}>
                  {item.icon}
                </span>
                <span className="opacity-0 w-0 overflow-hidden group-hover:opacity-100 group-hover:w-auto group-data-[expanded=true]:opacity-100 group-data-[expanded=true]:w-auto transition-all duration-300 whitespace-nowrap">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Workspace Selector — inline expansion (no absolute dropdown to avoid overflow-clip issues) */}
        <div className="hidden group-hover:block group-data-[expanded=true]:block px-3 py-2" ref={menuRef}>
          <div className="px-2 mb-1.5">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Workspace</p>
          </div>
          {/* Trigger button */}
          <button
            onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-[#050505] dark:text-gray-300 bg-white/50 dark:bg-white/5 rounded-lg border border-black/5 dark:border-white/5 hover:bg-white/80 dark:hover:bg-white/10 transition-colors shadow-sm"
          >
            <span className="flex items-center gap-2 min-w-0">
              <FolderPlusCircleIcon size={16} className="text-gray-500 shrink-0" />
              <span className="truncate">{displayName}</span>
            </span>
            <MdExpandMore size={20} className={`shrink-0 transition-transform ${workspaceMenuOpen ? "rotate-180" : ""}`} />
          </button>
          {/* Inline expanded list — no absolute positioning */}
          {workspaceMenuOpen && (
            <div className="mt-1 py-1 bg-white/50 dark:bg-[#0A0A0B]/80 backdrop-blur-md rounded-lg border border-gray-200 dark:border-white/10 shadow-lg">
              <button
                onClick={() => { setActiveWorkspaceId(null); setWorkspaceMenuOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white dark:hover:bg-white/10 transition-colors ${!activeWorkspaceId ? "bg-white dark:bg-white/10 font-medium text-gray-900 dark:text-white" : ""}`}
              >
                <FolderPlusCircleIcon size={14} className="text-gray-400 shrink-0" />
                <span className="truncate">All workspaces</span>
              </button>
              {workspaces.map((w) =>
                editingId === w.id ? (
                  <div key={w.id} className="flex items-center gap-1 px-2 py-1.5">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") updateWorkspace(w.id, editName).then(() => setEditingId(null));
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="flex-1 min-w-0 px-2 py-1 text-sm border border-gray-200 dark:border-white/10 rounded bg-white dark:bg-[#262626] focus:outline-none focus:ring-1 focus:ring-[#4d7c7a]/50"
                      autoFocus
                    />
                    <button
                      onClick={() => updateWorkspace(w.id, editName).then(() => setEditingId(null))}
                      className="shrink-0 p-1 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-950/40 rounded"
                      title="Save" aria-label="Save rename"
                    >
                      <MdEdit size={14} />
                    </button>
                  </div>
                ) : (
                  <div key={w.id} className={`group/item flex items-center gap-2 px-3 py-2 text-sm hover:bg-white dark:hover:bg-white/10 transition-colors ${activeWorkspaceId === w.id ? "bg-white dark:bg-white/10 font-medium text-gray-900 dark:text-white" : ""}`}>
                    <button
                      onClick={() => { setActiveWorkspaceId(w.id); setWorkspaceMenuOpen(false); }}
                      className="flex-1 flex items-center gap-2 min-w-0 text-left"
                    >
                      <FolderPlusCircleIcon size={14} className="text-gray-400 shrink-0" />
                      <span className="truncate">{w.name}</span>
                    </button>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingId(w.id); setEditName(w.name); }}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                        title="Rename"
                      ><MdEdit size={14} /></button>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${w.name}"? Searches will be unassigned.`)) deleteWorkspace(w.id); }}
                        className="p-1 text-gray-400 hover:text-red-500 rounded"
                        title="Delete"
                      ><MdDelete size={14} /></button>
                    </div>
                  </div>
                )
              )}
              {/* Create new workspace */}
              {createMode ? (
                <div className="flex items-center gap-1 px-2 py-1.5 border-t border-gray-100 dark:border-white/10">
                  <input
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newWorkspaceName.trim()) {
                        createWorkspace(newWorkspaceName.trim())
                          .then(() => { setCreateMode(false); setNewWorkspaceName(""); })
                          .catch((err) => { console.error("Failed to create workspace:", err); alert("Failed to create workspace. Please try again."); });
                      }
                      if (e.key === "Escape") { setCreateMode(false); setNewWorkspaceName(""); }
                    }}
                    placeholder="Workspace name"
                    className="flex-1 min-w-0 px-2 py-1 text-sm border border-gray-200 dark:border-white/10 rounded bg-white dark:bg-[#262626] focus:outline-none focus:ring-1 focus:ring-[#4d7c7a]/50"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      if (newWorkspaceName.trim()) {
                        createWorkspace(newWorkspaceName.trim())
                          .then(() => { setCreateMode(false); setNewWorkspaceName(""); })
                          .catch((err) => { console.error("Failed to create workspace:", err); alert("Failed to create workspace. Please try again."); });
                      }
                    }}
                    disabled={!newWorkspaceName.trim()}
                    className="shrink-0 p-1 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-950/40 rounded disabled:opacity-50"
                    title="Create workspace" aria-label="Create workspace"
                  >
                    <MdAdd size={18} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setCreateMode(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:bg-white dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white border-t border-gray-200 dark:border-white/10 transition-colors"
                >
                  <MdAdd size={20} />
                  New workspace
                </button>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="hidden group-hover:block group-data-[expanded=true]:block mx-4 border-t border-gray-200/60 dark:border-white/5" />

        {/* Recent Searches */}
        <nav className="hidden group-hover:flex group-data-[expanded=true]:flex flex-col py-3 min-h-0">
          <div className="px-3 mb-2">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2">Recent Searches</p>
          </div>
          {filteredSearches.length === 0 ? (
            <p className="px-5 py-3 text-sm text-gray-400 dark:text-gray-500">
              {searchQuery ? "No matches found" : "No searches yet"}
            </p>
          ) : (
            <ul className="space-y-0 pl-4">
              {filteredSearches.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => onSelectSearch(s)}
                    className={`w-full text-left pl-5 pr-4 py-2 text-sm transition-colors border-0 ring-0 -ml-4 rounded-r-xl relative z-10 ${
                      s.id === activeSearchId
                        ? "bg-white text-gray-900 dark:bg-white/10 dark:text-white shadow-sm font-medium"
                        : "text-gray-600 hover:bg-white/60 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium truncate mr-2">{s.query}</span>
                      <StatusDot status={s.status} />
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 dark:text-gray-500">
                      <span>{new Date(s.created_at).toLocaleDateString()}</span>
                      {s.status === "completed" && (
                        <span>{s.total_relevant_complaints || s.total_complaints_found} relevant</span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>

      </div>{/* end scrollable body */}

      {/* Sticky bottom — upgrade banner + version, always visible, content scrolls behind */}
      <div className="hidden group-hover:flex group-data-[expanded=true]:flex shrink-0 flex-col bg-transparent">
        <SearchUsage searches={searches} />
        <p className="font-mono text-[10px] text-gray-400 dark:text-gray-500 text-center pb-3">GapLens v0.1</p>
      </div>

      {/* Search modal */}
      {searchModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh]"
          onClick={() => { setSearchModalOpen(false); setSearchQuery(""); }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-[#ffffff] dark:bg-[#111111] rounded-2xl shadow-2xl ring-1 ring-black/10 dark:ring-white/10 w-full max-w-lg mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input row */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-white/[0.07]">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search history…"
                className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none border-none focus:ring-0"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  aria-label="Clear"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {/* Results */}
            <div className="max-h-80 overflow-y-auto py-1">
              {filteredSearches.length === 0 ? (
                <p className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500">
                  {searchQuery ? "No matches found" : "No searches yet"}
                </p>
              ) : (
                filteredSearches.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { onSelectSearch(s); setSearchModalOpen(false); setSearchQuery(""); }}
                    className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${s.id === activeSearchId ? "bg-gray-50 dark:bg-white/5" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-medium text-gray-800 dark:text-gray-200 truncate">{s.query}</span>
                      <StatusDot status={s.status} />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                      <span>{new Date(s.created_at).toLocaleDateString()}</span>
                      {s.status === "completed" && (
                        <span>{s.total_relevant_complaints || s.total_complaints_found} relevant</span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function SearchUsage({ searches }: { searches: SearchResult[] }) {
  const { user } = useUser();
  const isPro = user?.publicMetadata?.pro === true;

  // Count searches created this calendar month
  const now = new Date();
  const thisMonthCount = searches.filter((s) => {
    const d = new Date(s.created_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  const checkoutHref = user
    ? `${LS_CHECKOUT_BASE}?checkout[custom][clerk_user_id]=${user.id}`
    : LS_CHECKOUT_BASE;

  if (isPro) {
    return (
      <div className="hidden group-hover:flex group-data-[expanded=true]:flex items-center gap-2 px-3 py-2 mx-3 mb-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20">
        <span className="text-amber-500 text-sm">⚡</span>
        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Pro — Unlimited</span>
      </div>
    );
  }

  const used = Math.min(thisMonthCount, FREE_LIMIT);
  const pct = (used / FREE_LIMIT) * 100;
  const remaining = Math.max(FREE_LIMIT - used, 0);
  const isAtLimit = remaining === 0;

  return (
    <div className="hidden group-hover:block group-data-[expanded=true]:block px-3 pb-2">
      <div className={`p-3 rounded-xl border shadow-sm ${isAtLimit ? "bg-red-50 dark:bg-red-950/20 border-red-200/60 dark:border-red-500/20" : "bg-white/50 dark:bg-white/5 border-black/5 dark:border-white/10"}`}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">
            {isAtLimit ? "Limit reached" : `${remaining} search${remaining === 1 ? "" : "es"} left`}
          </span>
          <span className="text-[11px] text-gray-400 dark:text-gray-500">{used}/{FREE_LIMIT}</span>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden mb-2">
          <div
            className={`h-full rounded-full transition-all ${isAtLimit ? "bg-red-400" : pct >= 66 ? "bg-amber-400" : "bg-[#5d9d9b]"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <a
          href={checkoutHref}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center text-[11px] font-semibold py-1.5 rounded-lg gradient-brand text-white hover:opacity-90 transition-opacity"
        >
          Upgrade to Pro ⚡
        </a>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    pending: "bg-yellow-400",
    expanding: "bg-cyan-400 animate-pulse",
    collecting: "bg-yellow-400 animate-pulse",
    analyzing: "bg-blue-400 animate-pulse",
    detecting: "bg-blue-400 animate-pulse",
    clustering: "bg-purple-400 animate-pulse",
    scoring: "bg-purple-400 animate-pulse",
    completed: "bg-green-400",
    failed: "bg-red-400",
  };

  return (
    <span className={`w-2 h-2 rounded-full shrink-0 ${colorMap[status] || "bg-gray-300"}`} />
  );
}
