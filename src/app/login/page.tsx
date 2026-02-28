"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  if (sent) {
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
                d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
              />
            </svg>
          </div>
          <h2 className="mb-2 font-[family-name:var(--font-display)] text-xl text-[var(--color-cream)]">
            Check your email
          </h2>
          <p className="mb-6 text-sm text-[var(--color-sand-muted)]">
            We sent a magic link to{" "}
            <strong className="text-[var(--color-sand)]">{email}</strong>. Click
            it to sign in.
          </p>
          <Button
            variant="outline"
            className="w-full border-[var(--color-sand)]/10 text-[var(--color-sand)] hover:bg-[var(--color-surface-raised)]"
            onClick={() => setSent(false)}
          >
            Use a different email
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-xl border border-[var(--color-sand)]/8 bg-[var(--color-surface)] p-8">
        <div className="mb-6 text-center">
          <h2 className="mb-2 font-[family-name:var(--font-display)] text-xl text-[var(--color-cream)]">
            Sign in to TeeAlert
          </h2>
          <p className="text-sm text-[var(--color-sand-muted)]">
            Enter your email to receive a magic link
          </p>
        </div>
        <form onSubmit={handleLogin} className="grid gap-5">
          <div className="grid gap-2">
            <Label
              htmlFor="email"
              className="text-xs uppercase tracking-wider text-[var(--color-sand-muted)]"
            >
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-[var(--color-sand)]/10 bg-[var(--color-surface-raised)] text-[var(--color-charcoal-text)] placeholder:text-[var(--color-sand-muted)]/50"
            />
          </div>
          {error && (
            <div className="rounded-lg border border-[var(--color-terracotta)]/20 bg-[var(--color-terracotta)]/5 px-4 py-3">
              <p className="text-sm text-[var(--color-terracotta)]">{error}</p>
            </div>
          )}
          <Button
            type="submit"
            className="w-full bg-[var(--color-terracotta)] text-white hover:bg-[var(--color-terracotta-glow)] disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send magic link"}
          </Button>
        </form>
      </div>
    </div>
  );
}
