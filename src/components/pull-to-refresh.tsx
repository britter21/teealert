"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface Props {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

const THRESHOLD = 80;
const MAX_PULL = 120;

export function PullToRefresh({ onRefresh, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pulling = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Only enable in standalone PWA mode (installed app)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (refreshing || !isStandalone) return;
      // Only activate when scrolled to top
      if (window.scrollY > 0) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    },
    [refreshing, isStandalone]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pulling.current || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy < 0) {
        // Scrolling up, cancel pull
        pulling.current = false;
        setPullDistance(0);
        return;
      }
      // Apply resistance curve
      const distance = Math.min(MAX_PULL, dy * 0.5);
      setPullDistance(distance);
    },
    [refreshing]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullDistance >= THRESHOLD) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, onRefresh]);

  const progress = Math.min(1, pullDistance / THRESHOLD);
  const pastThreshold = pullDistance >= THRESHOLD;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="pointer-events-none flex items-center justify-center overflow-hidden transition-[height] duration-200"
        style={{
          height: pullDistance > 0 ? `${pullDistance}px` : 0,
          transitionDuration: pulling.current ? "0ms" : "200ms",
        }}
      >
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
            pastThreshold || refreshing
              ? "bg-[var(--color-terracotta)]/15"
              : "bg-[var(--color-sand)]/10"
          }`}
        >
          {refreshing ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-sand)]/20 border-t-[var(--color-terracotta)]" />
          ) : (
            <svg
              className={`h-4 w-4 transition-transform ${
                pastThreshold
                  ? "text-[var(--color-terracotta)]"
                  : "text-[var(--color-sand-muted)]"
              }`}
              style={{
                transform: `rotate(${progress * 180}deg)`,
              }}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3"
              />
            </svg>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
