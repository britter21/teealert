"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ReferralRedirect() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const code = params.code as string;
    if (code) {
      document.cookie = `ref=${code};path=/;max-age=${60 * 60 * 24 * 30};samesite=lax`;
    }
    router.replace("/login");
  }, [params.code, router]);

  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-6">
      <div className="flex items-center gap-3">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-sand)]/20 border-t-[var(--color-terracotta)]" />
        <span className="text-[var(--color-sand-muted)]">Redirecting...</span>
      </div>
    </div>
  );
}
