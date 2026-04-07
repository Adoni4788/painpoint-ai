"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import {
  Workspace,
  listWorkspaces,
  createWorkspace as apiCreateWorkspace,
  updateWorkspace as apiUpdateWorkspace,
  deleteWorkspace as apiDeleteWorkspace,
} from "@/lib/api";

const STORAGE_KEY = "gaplens-active-workspace-id";

interface WorkspaceContextValue {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string | null) => void;
  loadWorkspaces: () => Promise<void>;
  createWorkspace: (name: string) => Promise<Workspace>;
  updateWorkspace: (id: string, name: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadWorkspaces = useCallback(async () => {
    try {
      const data = await listWorkspaces();
      setWorkspaces(data);
      // Clear any pending retry — successful load
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
    } catch (e) {
      console.error("Failed to load workspaces:", e);
      // Don't retry on rate limit errors — retrying makes it worse
      const isRateLimit = e instanceof Error && e.message.toLowerCase().includes("rate limit");
      if (!isRateLimit && !retryTimer.current) {
        retryTimer.current = setTimeout(() => {
          retryTimer.current = null;
          loadWorkspaces();
        }, 5000);
      }
    }
  }, []);

  useEffect(() => {
    loadWorkspaces();
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [loadWorkspaces]);

  // Re-fetch workspaces when the tab becomes visible again (user returns after idle)
  // Only refetch if there's no pending retry (avoids hammering during rate limit recovery)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !retryTimer.current) {
        loadWorkspaces();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [loadWorkspaces]);

  useEffect(() => {
    const stored = typeof window !== "undefined"
      ? (localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem("painpoint-active-workspace-id"))
      : null;
    if (stored) {
      setActiveWorkspaceIdState(stored);
    }
  }, []);

  const setActiveWorkspaceId = useCallback((id: string | null) => {
    setActiveWorkspaceIdState(id);
    if (typeof window !== "undefined") {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const createWorkspace = useCallback(async (name: string) => {
    const ws = await apiCreateWorkspace(name);
    await loadWorkspaces();
    setActiveWorkspaceId(ws.id);
    return ws;
  }, [loadWorkspaces, setActiveWorkspaceId]);

  const updateWorkspace = useCallback(async (id: string, name: string) => {
    await apiUpdateWorkspace(id, name);
    await loadWorkspaces();
  }, [loadWorkspaces]);

  const deleteWorkspace = useCallback(async (id: string) => {
    await apiDeleteWorkspace(id);
    if (activeWorkspaceId === id) {
      setActiveWorkspaceId(null);
    }
    await loadWorkspaces();
  }, [activeWorkspaceId, loadWorkspaces, setActiveWorkspaceId]);

  const value: WorkspaceContextValue = {
    workspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    loadWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
