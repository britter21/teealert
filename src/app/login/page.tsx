"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Record<string, unknown>).standalone === true)
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [isPwa, setIsPwa] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setIsPwa(isStandalone());
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();

    if (isPwa) {
      // In PWA: request OTP code (no magic link) so user stays in the app
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        setError(error.message);
        posthog.capture("login_error", { error: error.message });
      } else {
        setSent(true);
        posthog.capture("otp_requested");
      }
    } else {
      // In browser: use magic link as before
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
        posthog.capture("login_error", { error: error.message });
      } else {
        setSent(true);
        posthog.capture("magic_link_requested");
      }
    }
    setLoading(false);
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });

    if (error) {
      setError(error.message);
      posthog.capture("otp_verify_error", { error: error.message });
    } else {
      posthog.capture("user_logged_in", { method: "otp" });
      router.push("/dashboard");
    }
    setVerifying(false);
  }

  if (sent && isPwa) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-xl border border-[var(--color-sand)]/8 bg-[var(--color-surface)] p-8">
          <div className="mb-6 text-center">
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
              Enter your code
            </h2>
            <p className="text-sm text-[var(--color-sand-muted)]">
              We sent a 6-digit code to{" "}
              <strong className="text-[var(--color-sand)]">{email}</strong>
            </p>
          </div>
          <form onSubmit={handleVerifyOtp} className="grid gap-5">
            <div className="grid gap-2">
              <Label
                htmlFor="otp"
                className="text-xs uppercase tracking-wider text-[var(--color-sand-muted)]"
              >
                Verification code
              </Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                required
                className="border-[var(--color-sand)]/10 bg-[var(--color-surface-raised)] text-center text-lg tracking-[0.3em] text-[var(--color-charcoal-text)] placeholder:text-[var(--color-sand-muted)]/50"
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
              disabled={verifying || otp.length !== 6}
            >
              {verifying ? "Verifying..." : "Sign in"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full border-[var(--color-sand)]/10 text-[var(--color-sand)] hover:bg-[var(--color-surface-raised)]"
              onClick={() => {
                setSent(false);
                setOtp("");
                setError("");
              }}
            >
              Use a different email
            </Button>
          </form>
        </div>
      </div>
    );
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
            Sign in to Tee Time Hawk
          </h2>
          <p className="text-sm text-[var(--color-sand-muted)]">
            {isPwa
              ? "Enter your email to receive a sign-in code"
              : "Enter your email to receive a magic link"}
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
            {loading ? "Sending..." : isPwa ? "Send code" : "Send magic link"}
          </Button>
        </form>
      </div>
    </div>
  );
}
