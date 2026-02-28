import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-xl border border-[var(--color-sand)]/8 bg-[var(--color-surface)] p-8 text-center">
        <p className="mb-2 font-[family-name:var(--font-display)] text-5xl font-light text-[var(--color-terracotta)]/40">
          404
        </p>
        <h2 className="mb-2 font-[family-name:var(--font-display)] text-xl text-[var(--color-cream)]">
          Page not found
        </h2>
        <p className="mb-6 text-sm text-[var(--color-sand-muted)]">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Button
          asChild
          className="w-full bg-[var(--color-terracotta)] text-white hover:bg-[var(--color-terracotta-glow)]"
        >
          <Link href="/">Go Home</Link>
        </Button>
      </div>
    </div>
  );
}
