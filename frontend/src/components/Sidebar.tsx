"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MdAdd, MdExpandMore, MdEdit, MdDelete, MdChevronLeft, MdMenu } from "react-icons/md";
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
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

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

  if (false) {
    return (
      <aside className="w-14 bg-paper dark:bg-ink flex flex-col shrink-0">
        <div className="shrink-0 flex flex-col">
          <div className="flex flex-col items-center gap-2 px-2 pt-4 pb-3">
          <Logo size={24} color="#4d7c7a" className="logo-app shrink-0" />
          <button
            onClick={onToggle}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-200/60 dark:hover:bg-[#262626] transition-colors"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <MdMenu size={20} />
          </button>
          </div>
          <div className="mx-2 border-b border-gray-200 dark:border-white/20" />
        </div>
        <div className="flex flex-col gap-0.5 px-2 pt-3 pb-2">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/discover"
                ? pathname === "/discover" && !activeSearchId
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex items-center justify-center p-2 transition-colors border-0 ring-0 rounded-full ${
                  isActive
                    ? "bg-[#dedede] text-gray-900 dark:bg-[#262626] dark:text-gray-100"
                    : "text-gray-600 hover:bg-gray-200/60 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#262626] dark:hover:text-gray-200"
                }`}
              >
                <span className={isActive ? "text-[#434343] dark:text-gray-300" : "text-gray-400 dark:text-gray-500"}>
                  {item.icon}
                </span>
              </Link>
            );
          })}
        </div>
        {searches.length > 0 && (
          <button
            onClick={onToggle}
            title={`Expand to see ${searches.length} recent search${searches.length === 1 ? "" : "es"}`}
            className="mt-auto mx-2 mb-2 p-2 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-[#262626] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 12h14" />
            </svg>
          </button>
        )}
      </aside>
    );
  }

  return (
    <aside
      data-expanded={isOpen}
      className={`sidebar-aside group bg-[#F7F7F7] dark:bg-ink flex flex-col shrink-0 transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden ${isOpen ? "w-60" : "w-16 hover:w-60"}`}
    >
      {/* Sidebar header: logo, name, collapse */}
      <div className="shrink-0 flex flex-col min-w-[240px]">
        <div className="flex items-center gap-2 px-3 py-4">
          <div className="flex items-center gap-2 shrink-0">
            {/* Fixed-width centering shell: w-10 (40px) + px-3 (12px) = 32px center = exact middle of w-16 rail */}
            <div className="w-10 flex items-center justify-center shrink-0">
              <Logo size={22} color="#4d7c7a" className="logo-app" />
            </div>
            <span className="gradient-brand-text text-lg font-heading font-semibold tracking-tight truncate overflow-hidden opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto group-data-[expanded=true]:opacity-100 group-data-[expanded=true]:w-auto transition-all duration-300">
              GapLens
            </span>
          </div>
          <button
            onClick={onToggle}
            className={`ml-auto p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-200/60 dark:hover:bg-[#262626] transition-colors shrink-0 ${!isOpen ? "opacity-0 group-hover:opacity-100" : ""}`}
            title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
            aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isOpen ? <MdChevronLeft size={20} /> : <MdMenu size={20} />}
          </button>
        </div>
        {/* Separator — hidden when rail is collapsed, fades in when expanded/hovered */}
        <div className="mx-3 border-b border-gray-200 dark:border-white/20 opacity-0 group-hover:opacity-100 group-data-[expanded=true]:opacity-100 transition-opacity duration-200" />
      </div>
      {/* Scrollable body — nav, workspace, recent searches */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-sidebar min-h-0 flex flex-col">

        {/* Navigation Links */}
        <div className="flex flex-col gap-0.5 px-2 pt-3 pb-2">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/discover"
                ? pathname === "/discover" && !activeSearchId
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2.5 text-[13px] font-medium transition-colors w-full rounded-xl ${
                  isActive
                    ? "bg-white text-gray-900 dark:bg-black dark:text-gray-100"
                    : "text-gray-600 hover:bg-gray-200/60 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#262626] dark:hover:text-gray-200"
                }`}
              >
                <span className={isActive ? "text-[#434343] dark:text-gray-300" : "text-gray-400 dark:text-gray-500"}>
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
            className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100/80 dark:bg-black rounded-lg hover:bg-gray-200/80 dark:hover:bg-[#262626] transition-colors"
          >
            <span className="flex items-center gap-2 min-w-0">
              <FolderPlusCircleIcon size={20} className="text-gray-500 shrink-0" />
              <span className="truncate">{displayName}</span>
            </span>
            <MdExpandMore size={20} className={`shrink-0 transition-transform ${workspaceMenuOpen ? "rotate-180" : ""}`} />
          </button>
          {/* Inline expanded list — no absolute positioning */}
          {workspaceMenuOpen && (
            <div className="mt-1 py-1 bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-white/10">
              <button
                onClick={() => { setActiveWorkspaceId(null); setWorkspaceMenuOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-[#262626] ${!activeWorkspaceId ? "bg-gray-100 dark:bg-[#262626] font-medium" : ""}`}
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
                  <div key={w.id} className={`group/item flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#262626] ${activeWorkspaceId === w.id ? "bg-gray-100 dark:bg-[#262626] font-medium" : ""}`}>
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
                        createWorkspace(newWorkspaceName.trim()).then(() => { setCreateMode(false); setNewWorkspaceName(""); });
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
                        createWorkspace(newWorkspaceName.trim()).then(() => { setCreateMode(false); setNewWorkspaceName(""); });
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
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-[#262626] border-t border-gray-100 dark:border-white/10"
                >
                  <MdAdd size={20} />
                  New workspace
                </button>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="hidden group-hover:block group-data-[expanded=true]:block mx-4 border-t border-gray-100 dark:border-white/10" />

        {/* Recent Searches */}
        <nav className="hidden group-hover:flex group-data-[expanded=true]:flex flex-col py-3 min-h-0">
          <div className="px-3 mb-2">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2">Recent Searches</p>
          </div>
          {searches.length === 0 ? (
            <p className="px-5 py-3 text-sm text-gray-400 dark:text-gray-500">No searches yet</p>
          ) : (
            <ul className="space-y-0 pl-4">
              {searches.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => onSelectSearch(s)}
                    className={`w-full text-left pl-5 pr-4 py-2.5 text-sm transition-colors border-0 ring-0 -ml-4 rounded-r-xl relative z-10 ${
                      s.id === activeSearchId
                        ? "bg-white text-gray-900 dark:bg-black dark:text-gray-100"
                        : "text-gray-700 hover:bg-gray-200/60 dark:text-gray-300 dark:hover:bg-[#262626]"
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
      <div className="hidden group-hover:flex group-data-[expanded=true]:flex shrink-0 flex-col bg-[#F7F7F7] dark:bg-ink">
        <SearchUsage searches={searches} />
        <p className="font-mono text-[10px] text-gray-400 dark:text-gray-500 text-center pb-3">GapLens v0.1</p>
      </div>
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
      <div className="hidden group-hover:flex group-data-[expanded=true]:flex items-center gap-2 px-4 py-2.5 mx-2 mb-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20">
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
      <div className={`p-3 rounded-xl border ${isAtLimit ? "bg-red-50 dark:bg-red-500/10 border-red-200/60 dark:border-red-500/20" : "bg-gray-100/80 dark:bg-white/5 border-gray-200/60 dark:border-white/10"}`}>
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
