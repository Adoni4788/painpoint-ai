"use client";

import { useEffect, useRef, useCallback } from "react";

interface FocusTrapProps {
  children: React.ReactNode;
  active: boolean;
  onEscape?: () => void;
}

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function FocusTrap({ children, active, onEscape }: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!active || e.key !== "Escape") return;
      onEscape?.();
    },
    [active, onEscape]
  );

  useEffect(() => {
    if (!active) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [active, handleKeyDown]);

  useEffect(() => {
    if (!active || !containerRef.current) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const el = containerRef.current;
    const focusable = el.querySelectorAll<HTMLElement>(FOCUSABLE);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    el.addEventListener("keydown", handleTab);
    return () => {
      el.removeEventListener("keydown", handleTab);
      previouslyFocused?.focus();
    };
  }, [active]);

  return <div ref={containerRef}>{children}</div>;
}
