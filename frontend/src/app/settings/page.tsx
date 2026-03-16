"use client";

import { MdLightMode, MdDarkMode } from "react-icons/md";
import { AppShell } from "@/components/AppShell";
import { useTheme } from "@/components/ThemeProvider";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export default function SettingsPage() {
  const { theme, toggle: toggleTheme } = useTheme();
  const { workspaces, activeWorkspaceId, setActiveWorkspaceId } = useWorkspace();

  return (
    <AppShell>
      <div className="shrink-0 bg-white dark:bg-black px-6 py-3 border-b border-gray-200 dark:border-white/10">
        <h1 className="font-heading font-semibold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Customize how GapLens looks and which workspace you see by default.</p>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl text-left">

          {/* Appearance */}
          <section className="rounded-xl bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 p-5 mb-6">
            <h3 className="font-heading text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Appearance</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Choose light or dark mode.</p>
            <fieldset className="flex gap-2 border-0 p-0 m-0">
              <legend className="sr-only">Theme</legend>
              <label
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                  theme === "light"
                    ? "bg-gray-900 text-white dark:bg-white dark:text-black"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-[#262626] dark:text-gray-400 dark:hover:bg-[#333333]"
                }`}
              >
                <input
                  type="radio"
                  name="theme"
                  value="light"
                  checked={theme === "light"}
                  onChange={() => theme !== "light" && toggleTheme()}
                  className="sr-only"
                />
                <MdLightMode size={18} aria-hidden />
                Light
              </label>
              <label
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                  theme === "dark"
                    ? "bg-gray-900 text-white dark:bg-white dark:text-black"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-[#262626] dark:text-gray-400 dark:hover:bg-[#333333]"
                }`}
              >
                <input
                  type="radio"
                  name="theme"
                  value="dark"
                  checked={theme === "dark"}
                  onChange={() => theme !== "dark" && toggleTheme()}
                  className="sr-only"
                />
                <MdDarkMode size={18} aria-hidden />
                Dark
              </label>
            </fieldset>
          </section>

          {/* Default workspace */}
          <section className="rounded-xl bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 p-5">
            <h3 className="font-heading text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Default workspace</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Which workspace to show when you open GapLens. You can also change this from the sidebar.
            </p>
            <select
              value={activeWorkspaceId ?? ""}
              onChange={(e) => setActiveWorkspaceId(e.target.value || null)}
              className="w-full max-w-xs px-3 py-2.5 text-sm font-medium bg-gray-100 dark:bg-[#262626] text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4d7c7a]/50"
              aria-label="Default workspace"
            >
              <option value="">All workspaces</option>
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            {workspaces.length === 0 && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Create a workspace from the sidebar to organize your searches.
              </p>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
