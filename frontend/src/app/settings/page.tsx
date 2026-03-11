"use client";

import { AppShell } from "@/components/AppShell";

export default function SettingsPage() {
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
            Configure your data sources, filtering preferences, and account settings to customize how GapLens works for you.
          </p>
          <div className="rounded-xl bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-xl border border-gray-200/60 dark:border-white/10 shadow-xl shadow-black/10 dark:shadow-black/10 p-5">
            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">Coming soon</p>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <p className="py-1">Default data source preferences</p>
              <p className="py-1">Authenticity threshold tuning</p>
              <p className="py-1">API key management</p>
              <p className="py-1">Data export and cleanup</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
