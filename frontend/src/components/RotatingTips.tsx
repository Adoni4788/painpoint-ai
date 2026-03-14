"use client";

import { useState, useEffect } from "react";

interface RotatingTipsProps {
  tips: string[];
  interval?: number;
  className?: string;
}

export function RotatingTips({ tips, interval = 5000, className }: RotatingTipsProps) {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (tips.length <= 1) return;
    const id = setInterval(() => {
      setTipIndex((i) => (i + 1) % tips.length);
    }, interval);
    return () => clearInterval(id);
  }, [tips.length, interval]);

  if (tips.length === 0) return null;

  return (
    <span className={className}>
      {tips[tipIndex]}
    </span>
  );
}
