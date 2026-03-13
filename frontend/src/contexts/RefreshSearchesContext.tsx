"use client";

import { createContext, useContext, ReactNode } from "react";

type RefreshSearchesFn = () => void;

const RefreshSearchesContext = createContext<RefreshSearchesFn | null>(null);

export function RefreshSearchesProvider({ children, refresh }: { children: ReactNode; refresh: RefreshSearchesFn }) {
  return (
    <RefreshSearchesContext.Provider value={refresh}>
      {children}
    </RefreshSearchesContext.Provider>
  );
}

export function useRefreshSearches() {
  const ctx = useContext(RefreshSearchesContext);
  return ctx ?? (() => {});
}
