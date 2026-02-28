"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-xl border border-[var(--color-sand)]/8 bg-[var(--color-surface)] p-8 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-terracotta)]/10">
          <svg
            className="h-6 w-6 text-[var(--color-terracotta)]"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <h2 className="mb-2 font-[family-name:var(--font-display)] text-xl text-[var(--color-cream)]">
          Something went wrong
        </h2>
        <p className="mb-6 text-sm text-[var(--color-sand-muted)]">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <Button
          onClick={reset}
          className="w-full bg-[var(--color-terracotta)] text-white hover:bg-[var(--color-terracotta-glow)]"
        >
          Try again
        </Button>
      </div>
    </div>
  );
}
