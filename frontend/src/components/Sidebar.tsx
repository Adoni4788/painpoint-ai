"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MdAdd, MdExpandMore, MdEdit, MdDelete, MdChevronLeft, MdMenu } from "react-icons/md";
import { SearchResult } from "@/lib/api";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useTheme } from "@/components/ThemeProvider";
import { Logo } from "@/components/Logo";
import { GlobalResearchIcon, DiscoverIcon, VoteYeaIcon, SettingsIcon, FolderPlusCircleIcon } from "@/components/SidebarIcons";

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
  const { theme } = useTheme();
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
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setWorkspaceMenuOpen(false);
        setCreateMode(false);
        setEditingId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const displayName = activeWorkspace?.name ?? "All workspaces";

  if (false) {
    return (
      <aside className="w-14 bg-paper dark:bg-ink flex flex-col shrink-0">
        <div className="shrink-0 flex flex-col">
          <div className="flex flex-col items-center gap-2 px-2 pt-4 pb-3">
          <Logo size={24} color={theme === "dark" ? "#ffffff" : "#4d7c7a"} className="logo-app shrink-0" />
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
                <span className={isActive ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"}>
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
      className={`sidebar-aside group bg-paper dark:bg-ink flex flex-col shrink-0 transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden ${isOpen ? "w-60" : "w-16 hover:w-60"}`}
    >
      {/* Sidebar header: logo, name, collapse */}
      <div className="shrink-0 flex flex-col min-w-[240px]">
        <div className="flex items-center gap-2 px-3 py-4">
          <div className="flex items-center gap-2 shrink-0">
            <Logo size={22} color={theme === "dark" ? "#ffffff" : "#6366f1"} className="logo-app shrink-0" />
            <span className="gradient-primary-text text-lg font-heading font-semibold tracking-tight truncate overflow-hidden opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto group-data-[expanded=true]:opacity-100 group-data-[expanded=true]:w-auto transition-all duration-300">
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
        <div className="mx-3 border-b border-gray-200 dark:border-white/20" />
      </div>
      {/* Navigation Links */}
      <div className="flex flex-col gap-0.5 px-3 pt-3 pb-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/discover"
              ? pathname === "/discover" && !activeSearchId
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 pl-5 pr-4 py-2.5 text-[13px] font-medium transition-colors w-full border-0 ring-0 -ml-3 rounded-r-xl ${
                isActive
                  ? "bg-white text-gray-900 dark:bg-black dark:text-gray-100"
                  : "text-gray-600 hover:bg-gray-200/60 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#262626] dark:hover:text-gray-200"
              }`}
            >
<span className={isActive ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"}>
                  {item.icon}
                </span>
              <span className="opacity-0 w-0 overflow-hidden group-hover:opacity-100 group-hover:w-auto group-data-[expanded=true]:opacity-100 group-data-[expanded=true]:w-auto transition-all duration-300 whitespace-nowrap">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Workspace Selector — hidden when rail collapsed */}
      <div className="hidden group-hover:block group-data-[expanded=true]:block px-3 py-2 transition-opacity" ref={menuRef}>
        <div className="px-2 mb-1.5">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Workspace</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100/80 dark:bg-black rounded-lg hover:bg-gray-200/80 dark:hover:bg-[#262626] transition-colors border border-transparent"
          >
            <span className="flex items-center gap-2 truncate">
              <FolderPlusCircleIcon size={20} className="text-gray-500 shrink-0" />
              <span className="truncate">{displayName}</span>
            </span>
            <MdExpandMore size={20} className={`shrink-0 transition-transform ${workspaceMenuOpen ? "rotate-180" : ""}`} />
          </button>
          {workspaceMenuOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 py-1 bg-white dark:bg-black rounded-lg shadow-lg border border-gray-200 dark:border-white/10 z-20 max-h-56 overflow-y-auto">
              <button
                onClick={() => {
                  setActiveWorkspaceId(null);
                  setWorkspaceMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-[#262626] ${!activeWorkspaceId ? "bg-gray-100 dark:bg-[#262626] font-medium" : ""}`}
              >
                <FolderPlusCircleIcon size={14} className="text-gray-400" />
                All workspaces
              </button>
              {workspaces.map((w) =>
                editingId === w.id ? (
                  <div key={w.id} className="flex items-center gap-1 px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          updateWorkspace(w.id, editName).then(() => setEditingId(null));
                        }
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="flex-1 px-2 py-1 text-sm border border-gray-200 dark:border-white/10 rounded bg-white dark:bg-[#262626] focus:outline-none focus:ring-1 focus:ring-[#4d7c7a]/50"
                      autoFocus
                    />
                    <button
                      onClick={() => updateWorkspace(w.id, editName).then(() => setEditingId(null))}
                      className="p-1 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-950/40 rounded"
                      title="Save"
                      aria-label="Save rename"
                    >
                      <MdEdit size={14} />
                    </button>
                  </div>
                ) : (
                  <div
                    key={w.id}
                    className={`group flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-[#262626] ${activeWorkspaceId === w.id ? "bg-gray-100 dark:bg-[#262626] font-medium" : ""}`}
                  >
                    <button
                      onClick={() => {
                        setActiveWorkspaceId(w.id);
                        setWorkspaceMenuOpen(false);
                      }}
                      className="flex-1 flex items-center gap-2 truncate text-left"
                    >
                      <FolderPlusCircleIcon size={14} className="text-gray-400 shrink-0" />
                      <span className="truncate">{w.name}</span>
                    </button>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(w.id);
                          setEditName(w.name);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                        title="Rename"
                      >
                        <MdEdit size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete "${w.name}"? Searches will be unassigned.`)) {
                            deleteWorkspace(w.id);
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 rounded"
                        title="Delete"
                      >
                        <MdDelete size={14} />
                      </button>
                    </div>
                  </div>
                )
              )}
              {createMode ? (
                <div className="flex items-center gap-1 px-2 py-1.5 border-t border-gray-100 dark:border-white/10" onClick={(e) => e.stopPropagation()}>
                  <input
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newWorkspaceName.trim()) {
                        createWorkspace(newWorkspaceName.trim()).then(() => {
                          setCreateMode(false);
                          setNewWorkspaceName("");
                        });
                      }
                      if (e.key === "Escape") {
                        setCreateMode(false);
                        setNewWorkspaceName("");
                      }
                    }}
                    placeholder="Workspace name"
                    className="flex-1 px-2 py-1 text-sm border border-gray-200 dark:border-white/10 rounded bg-white dark:bg-[#262626] focus:outline-none focus:ring-1 focus:ring-[#4d7c7a]/50"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      if (newWorkspaceName.trim()) {
                        createWorkspace(newWorkspaceName.trim()).then(() => {
                          setCreateMode(false);
                          setNewWorkspaceName("");
                        });
                      }
                    }}
                    disabled={!newWorkspaceName.trim()}
                    className="p-1 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-950/40 rounded disabled:opacity-50"
                    title="Create workspace"
                    aria-label="Create workspace"
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
      </div>

      {/* Divider */}
      <div className="hidden group-hover:block group-data-[expanded=true]:block mx-4 border-t border-gray-100 dark:border-white/10" />

      {/* Recent Searches */}
      <nav className="hidden group-hover:flex group-data-[expanded=true]:flex flex-1 flex-col overflow-y-auto py-3 scrollbar-sidebar min-h-0">
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

      <div className="hidden group-hover:block group-data-[expanded=true]:block p-3">
        <p className="font-mono text-[10px] text-gray-400 dark:text-gray-500 text-center">GapLens v0.1</p>
      </div>
    </aside>
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
