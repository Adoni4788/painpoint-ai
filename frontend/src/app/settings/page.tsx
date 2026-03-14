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
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl text-left">
          <div className="w-14 h-14 bg-gray-50/80 dark:bg-white/5 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Settings</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Customize how GapLens looks and which workspace you see by default.
          </p>

          {/* Appearance */}
          <section className="rounded-xl bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-xl border border-gray-200/60 dark:border-white/10 shadow-xl shadow-black/10 dark:shadow-black/10 p-5 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Appearance</h3>
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
          <section className="rounded-xl bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-xl border border-gray-200/60 dark:border-white/10 shadow-xl shadow-black/10 dark:shadow-black/10 p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Default workspace</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Which workspace to show when you open GapLens. You can also change this from the sidebar.
            </p>
            <select
              value={activeWorkspaceId ?? ""}
              onChange={(e) => setActiveWorkspaceId(e.target.value || null)}
              className="w-full max-w-xs px-3 py-2.5 text-sm font-medium bg-gray-100 dark:bg-[#262626] text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-white/20"
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
