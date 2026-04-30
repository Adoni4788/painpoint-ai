"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MdAdd, MdDelete, MdEdit, MdFolderOpen, MdWarning } from "react-icons/md";
import { AppShell } from "@/components/AppShell";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { SearchResult, listSearches } from "@/lib/api";

export default function WorkspacesPage() {
  const router = useRouter();
  const {
    workspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
  } = useWorkspace();
  const [allSearches, setAllSearches] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoadError, setSearchLoadError] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    setLoading(true);
    setSearchLoadError(false);
    listSearches()
      .then(setAllSearches)
      .catch((e) => {
        console.error("Failed to load searches", e);
        setSearchLoadError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const workspaceStats = useMemo(() => {
    const map = new Map<string, { count: number; lastActivity: string | null }>();
    for (const ws of workspaces) map.set(ws.id, { count: 0, lastActivity: null });

    for (const s of allSearches) {
      if (!s.workspace_id) continue;
      const existing = map.get(s.workspace_id);
      if (!existing) continue;
      const current = new Date(s.created_at).getTime();
      const prev = existing.lastActivity ? new Date(existing.lastActivity).getTime() : 0;
      map.set(s.workspace_id, {
        count: existing.count + 1,
        lastActivity: current > prev ? s.created_at : existing.lastActivity,
      });
    }
    return map;
  }, [allSearches, workspaces]);

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-heading font-semibold text-gray-900 dark:text-gray-100">
            Workspaces
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage workspaces and quickly jump into discovery.
          </p>

          {/* Warning banner — activity data unavailable */}
          {searchLoadError && (
            <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 text-sm text-amber-800 dark:text-amber-300">
              <MdWarning size={16} className="shrink-0" />
              <span>
                Couldn&apos;t load search activity — search counts and last activity dates may be
                unavailable.
              </span>
            </div>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Skeleton cards while loading */}
            {loading &&
              [0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-[#111111] animate-pulse"
                >
                  <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-white/10 mb-2" />
                  <div className="h-3 w-1/3 rounded bg-gray-100 dark:bg-white/5 mb-1" />
                  <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-white/5 mb-4" />
                  <div className="h-8 w-24 rounded-lg bg-gray-200 dark:bg-white/10" />
                </div>
              ))}

            {/* Empty state */}
            {!loading && workspaces.length === 0 && (
              <div className="col-span-full py-16 flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500">
                <MdFolderOpen size={40} />
                <p className="text-sm font-medium">No workspaces yet</p>
                <p className="text-xs text-center max-w-xs">
                  Create a workspace to organise your searches and jump straight into discovery.
                </p>
              </div>
            )}

            {/* Workspace cards */}
            {!loading &&
              workspaces.map((ws) => {
                const stats = workspaceStats.get(ws.id) ?? { count: 0, lastActivity: null };
                const isActive = activeWorkspaceId === ws.id;
                const searchLabel =
                  stats.count === 1 ? "1 search" : `${stats.count} searches`;

                return (
                  <div
                    key={ws.id}
                    className={`rounded-2xl border p-4 bg-white dark:bg-[#111111] ${
                      isActive
                        ? "border-[#4d7c7a]"
                        : "border-gray-200 dark:border-white/10"
                    }`}
                  >
                    {editingId === ws.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && editName.trim())
                              updateWorkspace(ws.id, editName.trim()).then(() =>
                                setEditingId(null)
                              );
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#262626] focus:outline-none focus:ring-1 focus:ring-[#4d7c7a]/50"
                          autoFocus
                        />
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                              {ws.name}
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {searchLabel}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {stats.lastActivity
                                ? `Last activity ${new Date(
                                    stats.lastActivity
                                  ).toLocaleDateString()}`
                                : "No activity yet"}
                            </p>
                          </div>
                          {isActive && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#d8eceb] text-[#2f5d5b] dark:bg-[#1e3231] dark:text-[#98cfcb]">
                              Active
                            </span>
                          )}
                        </div>

                        <div className="mt-4 flex items-center gap-2">
                          <button
                            onClick={() => {
                              setActiveWorkspaceId(ws.id);
                              router.push("/discover");
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-[#4d7c7a] text-white hover:opacity-90 transition-opacity"
                          >
                            <MdFolderOpen size={16} />
                            Open
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(ws.id);
                              setEditName(ws.name);
                            }}
                            className="p-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                            aria-label="Rename workspace"
                            title="Rename workspace"
                          >
                            <MdEdit size={16} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete workspace "${ws.name}"?`))
                                deleteWorkspace(ws.id);
                            }}
                            className="p-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 hover:text-red-500 hover:border-red-200 dark:hover:border-red-500/30 transition-colors"
                            aria-label="Delete workspace"
                            title="Delete workspace"
                          >
                            <MdDelete size={16} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

            {/* New workspace card */}
            {!loading && (
              <div className="rounded-2xl border-2 border-dashed border-gray-300 dark:border-white/15 p-4 bg-white dark:bg-[#111111]">
                {creating ? (
                  <div className="space-y-3">
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newName.trim())
                          createWorkspace(newName.trim()).then(() => {
                            setCreating(false);
                            setNewName("");
                          });
                        if (e.key === "Escape") {
                          setCreating(false);
                          setNewName("");
                        }
                      }}
                      placeholder="Workspace name"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#262626] focus:outline-none focus:ring-1 focus:ring-[#4d7c7a]/50"
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (!newName.trim()) return;
                          createWorkspace(newName.trim()).then(() => {
                            setCreating(false);
                            setNewName("");
                          });
                        }}
                        disabled={!newName.trim()}
                        className="px-3 py-1.5 text-sm rounded-lg bg-[#4d7c7a] text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                      >
                        Create
                      </button>
                      <button
                        onClick={() => {
                          setCreating(false);
                          setNewName("");
                        }}
                        className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setCreating(true)}
                    className="w-full h-full min-h-28 flex flex-col items-center justify-center text-gray-600 dark:text-gray-300 gap-2 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    <MdAdd size={22} />
                    <span className="text-sm font-medium">New workspace</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
