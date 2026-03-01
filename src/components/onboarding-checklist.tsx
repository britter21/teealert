"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Props {
  hasPhone: boolean;
  hasAlert: boolean;
  hasPush: boolean;
  onDismiss: () => void;
}

const STEPS = [
  {
    key: "alert",
    label: "Create your first alert",
    description: "Browse courses and set up a tee time alert",
    href: "/courses",
    cta: "Browse Courses",
  },
  {
    key: "phone",
    label: "Add your phone number",
    description: "Get iMessage alerts when tee times open up",
    href: "/settings",
    cta: "Go to Settings",
  },
  {
    key: "push",
    label: "Enable push notifications",
    description: "Get instant browser notifications on any device",
    href: "/settings",
    cta: "Go to Settings",
  },
] as const;

export function OnboardingChecklist({
  hasPhone,
  hasAlert,
  hasPush,
  onDismiss,
}: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const completion: Record<string, boolean> = {
    alert: hasAlert,
    phone: hasPhone,
    push: hasPush,
  };

  const completedCount = Object.values(completion).filter(Boolean).length;
  const allDone = completedCount === STEPS.length;

  if (allDone) return null;

  return (
    <div className="mb-8 rounded-xl border border-[var(--color-terracotta)]/20 bg-[var(--color-surface)] p-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-cream)]">
            Welcome to Tee Time Hawk
          </h2>
          <p className="mt-1 text-sm text-[var(--color-sand-muted)]">
            Complete these steps to get the most out of your alerts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            onDismiss();
          }}
          className="text-xs text-[var(--color-sand-muted)] hover:text-[var(--color-sand)]"
        >
          Dismiss
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-5 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-raised)]">
          <div
            className="h-full rounded-full bg-[var(--color-terracotta)] transition-all duration-500"
            style={{ width: `${(completedCount / STEPS.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-[var(--color-sand-muted)]">
          {completedCount}/{STEPS.length}
        </span>
      </div>

      <div className="space-y-3">
        {STEPS.map((step) => {
          const done = completion[step.key];
          return (
            <div
              key={step.key}
              className={`flex items-center justify-between rounded-lg p-3 ${
                done
                  ? "bg-[var(--color-sage)]/5"
                  : "bg-[var(--color-surface-raised)]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    done
                      ? "bg-[var(--color-sage)]/20 text-[var(--color-sage)]"
                      : "bg-[var(--color-sand)]/10 text-[var(--color-sand-muted)]"
                  }`}
                >
                  {done ? (
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m4.5 12.75 6 6 9-13.5"
                      />
                    </svg>
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-[var(--color-sand-muted)]" />
                  )}
                </div>
                <div>
                  <p
                    className={`text-sm font-medium ${
                      done
                        ? "text-[var(--color-sage)] line-through"
                        : "text-[var(--color-sand)]"
                    }`}
                  >
                    {step.label}
                  </p>
                  {!done && (
                    <p className="text-xs text-[var(--color-sand-muted)]">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
              {!done && (
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="border-[var(--color-sand)]/10 text-xs text-[var(--color-sand)] hover:bg-[var(--color-surface)] hover:text-[var(--color-cream)]"
                >
                  <Link href={step.href}>{step.cta}</Link>
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
