"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "install-prompt-dismissed-at";
const PUSH_DISMISS_KEY = "push-prompt-dismissed-at";
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

type PromptState = "install" | "push" | null;

function isDismissed(key: string): boolean {
  if (typeof window === "undefined") return true;
  const ts = localStorage.getItem(key);
  if (!ts) return false;
  return Date.now() - Number(ts) < SEVEN_DAYS;
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Record<string, unknown>).standalone === true)
  );
}

export function InstallPrompt() {
  const [promptState, setPromptState] = useState<PromptState>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [pushLoading, setPushLoading] = useState(false);

  const determine = useCallback(async () => {
    // Already installed — check push
    if (isStandalone()) {
      if (isDismissed(PUSH_DISMISS_KEY)) return setPromptState(null);
      if ("serviceWorker" in navigator && "PushManager" in window) {
        try {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          if (!sub) return setPromptState("push");
        } catch {}
      }
      return setPromptState(null);
    }

    // iOS — show manual install instructions
    if (isIos() && !isDismissed(DISMISS_KEY)) {
      return setPromptState("install");
    }

    // Android/Desktop — wait for beforeinstallprompt (handled in effect)
    // If no deferred prompt and not dismissed, check push as fallback
    if (isDismissed(PUSH_DISMISS_KEY)) return setPromptState(null);
    if ("serviceWorker" in navigator && "PushManager" in window) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!sub) return setPromptState("push");
      } catch {}
    }
    setPromptState(null);
  }, []);

  useEffect(() => {
    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!isDismissed(DISMISS_KEY)) {
        setPromptState("install");
      }
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    determine();

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, [determine]);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (result.outcome === "accepted") {
      setPromptState(null);
      // After install, check push after a short delay
      setTimeout(() => determine(), 1500);
    }
  }

  async function handleEnablePush() {
    setPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!res.ok) throw new Error("Failed to save subscription");
      setPromptState(null);
    } catch {
      // Permission denied or other error — dismiss so we don't nag
      localStorage.setItem(PUSH_DISMISS_KEY, String(Date.now()));
      setPromptState(null);
    } finally {
      setPushLoading(false);
    }
  }

  function handleDismiss() {
    if (promptState === "install") {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
      // After dismissing install, check if we should show push
      setPromptState(null);
      setTimeout(() => determine(), 100);
    } else if (promptState === "push") {
      localStorage.setItem(PUSH_DISMISS_KEY, String(Date.now()));
      setPromptState(null);
    }
  }

  if (!promptState) return null;

  if (promptState === "install" && isIos()) {
    return (
      <div className="mb-8 rounded-xl border border-[var(--color-terracotta)]/20 bg-[var(--color-surface)] p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-terracotta)]/10">
              <svg className="h-5 w-5 text-[var(--color-terracotta)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-sand-bright)]">
                Install Tee Time Hawk for instant alerts
              </p>
              <p className="mt-1.5 text-xs text-[var(--color-sand-muted)]">
                Tap{" "}
                <svg className="inline h-4 w-4 align-text-bottom text-[var(--color-terracotta)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                </svg>
                {" "}in the address bar, then{" "}
                <svg className="inline h-4 w-4 align-text-bottom text-[var(--color-terracotta)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3v11.25" />
                </svg>
                {" "}Share, then <strong className="text-[var(--color-sand)]">Add to Home Screen</strong>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="shrink-0 text-xs text-[var(--color-sand-muted)] hover:text-[var(--color-sand)]"
          >
            Not now
          </button>
        </div>
      </div>
    );
  }

  if (promptState === "install") {
    return (
      <div className="mb-8 rounded-xl border border-[var(--color-terracotta)]/20 bg-[var(--color-surface)] p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-terracotta)]/10">
              <svg className="h-5 w-5 text-[var(--color-terracotta)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-sand-bright)]">
                Install Tee Time Hawk for instant alerts
              </p>
              <p className="mt-1 text-xs text-[var(--color-sand-muted)]">
                Add to your home screen for quick access and push notifications.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleDismiss}
              className="text-xs text-[var(--color-sand-muted)] hover:text-[var(--color-sand)]"
            >
              Not now
            </button>
            <Button
              size="sm"
              onClick={handleInstall}
              className="bg-[var(--color-terracotta)] text-xs text-white hover:bg-[var(--color-terracotta-glow)]"
            >
              Install
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Push prompt
  return (
    <div className="mb-8 rounded-xl border border-[var(--color-terracotta)]/20 bg-[var(--color-surface)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-terracotta)]/10">
            <svg className="h-5 w-5 text-[var(--color-terracotta)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-sand-bright)]">
              Enable push notifications
            </p>
            <p className="mt-1 text-xs text-[var(--color-sand-muted)]">
              Get instant alerts on your device when tee times open up.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="text-xs text-[var(--color-sand-muted)] hover:text-[var(--color-sand)]"
          >
            Not now
          </button>
          <Button
            size="sm"
            onClick={handleEnablePush}
            disabled={pushLoading}
            className="bg-[var(--color-terracotta)] text-xs text-white hover:bg-[var(--color-terracotta-glow)]"
          >
            {pushLoading ? "Enabling..." : "Enable"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Type for the beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
