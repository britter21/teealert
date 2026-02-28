import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ConfirmationPage() {
  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-xl border border-[var(--color-sand)]/8 bg-[var(--color-surface)] p-8 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-sage)]/10">
          <svg
            className="h-6 w-6 text-[var(--color-sage)]"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m4.5 12.75 6 6 9-13.5"
            />
          </svg>
        </div>
        <h2 className="mb-2 font-[family-name:var(--font-display)] text-xl text-[var(--color-cream)]">
          You&apos;re all set
        </h2>
        <p className="mb-6 text-sm text-[var(--color-sand-muted)]">
          Your subscription is active. You now have access to more alerts,
          faster polling, and additional notification channels.
        </p>
        <div className="grid gap-3">
          <Button
            asChild
            className="w-full bg-[var(--color-terracotta)] text-white hover:bg-[var(--color-terracotta-glow)]"
          >
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full border-[var(--color-sand)]/10 text-[var(--color-sand)] hover:bg-[var(--color-surface-raised)]"
          >
            <Link href="/courses">Browse Courses</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
