"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Profile {
  email: string;
  phone: string | null;
  notification_phone: string | null;
  tier: string;
}

const tierColors: Record<string, string> = {
  starter: "bg-[var(--color-terracotta)]/15 text-[var(--color-terracotta)]",
  unlimited: "bg-[var(--color-sage)]/15 text-[var(--color-sage)]",
};

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((res) => res.json())
      .then((data) => {
        setProfile(data);
        setPhone(data.phone || "");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone || null }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error });
        return;
      }

      setProfile(data);
      setPhone(data.phone || "");
      setMessage({ type: "success", text: "Phone number saved." });
    } catch {
      setMessage({ type: "error", text: "Failed to save. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-sand)]/20 border-t-[var(--color-terracotta)]" />
          <span className="text-[var(--color-sand-muted)]">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 md:py-16">
      <div className="mb-10">
        <div className="accent-line mb-6" />
        <div className="flex items-center gap-3">
          <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--color-cream)] sm:text-4xl">
            Settings
          </h1>
          {profile && (
            <Badge
              className={`border-0 text-xs uppercase tracking-wider ${tierColors[profile.tier] || tierColors.starter}`}
            >
              {profile.tier}
            </Badge>
          )}
        </div>
        <p className="mt-3 text-[var(--color-sand-muted)]">
          Manage your account and notification preferences.
        </p>
      </div>

      {/* Account section */}
      <div className="space-y-8">
        <div className="rounded-xl border border-[var(--color-sand)]/8 bg-[var(--color-surface)] p-6">
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg text-[var(--color-sand-bright)]">
            Account
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-sand-muted)]">Email</span>
              <span className="text-[var(--color-charcoal-text)]">
                {profile?.email}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-sand-muted)]">Plan</span>
              <div className="flex items-center gap-2">
                <span className="text-[var(--color-charcoal-text)] capitalize">
                  {profile?.tier || "starter"}
                </span>
                {profile?.tier === "starter" && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-7 border-[var(--color-terracotta)]/30 px-2 text-xs text-[var(--color-terracotta)] hover:bg-[var(--color-terracotta)]/5 hover:text-[var(--color-terracotta)]"
                  >
                    <Link href="/pricing">Upgrade</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Phone number section */}
        <form
          onSubmit={handleSave}
          className="rounded-xl border border-[var(--color-sand)]/8 bg-[var(--color-surface)] p-6"
        >
          <h2 className="mb-1 font-[family-name:var(--font-display)] text-lg text-[var(--color-sand-bright)]">
            Notifications
          </h2>
          <p className="mb-5 text-sm text-[var(--color-sand-muted)]">
            Set your phone number to receive tee time alerts via iMessage.
          </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="phone"
                className="text-sm text-[var(--color-sand-muted)]"
              >
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 555 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="border-[var(--color-sand)]/10 bg-[var(--color-surface-raised)] text-[var(--color-charcoal-text)] placeholder:text-[var(--color-sand-muted)]/50 focus-visible:ring-[var(--color-terracotta)]/40"
              />
              <p className="text-xs text-[var(--color-sand-muted)]">
                US numbers only. Used for iMessage alerts when SMS notifications
                are enabled on an alert.
              </p>
            </div>

            {message && (
              <p
                className={`text-sm ${
                  message.type === "success"
                    ? "text-[var(--color-sage)]"
                    : "text-[var(--color-terracotta)]"
                }`}
              >
                {message.text}
              </p>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={saving}
                className="bg-[var(--color-terracotta)] text-white hover:bg-[var(--color-terracotta-glow)] disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
