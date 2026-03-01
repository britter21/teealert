"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import Link from "next/link";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const PLAYER_OPTIONS = [1, 2, 3, 4];
const LEAD_DAY_OPTIONS = [
  { value: "", label: "Immediately" },
  { value: "1", label: "1 day" },
  { value: "3", label: "3 days" },
  { value: "5", label: "5 days" },
  { value: "7", label: "1 week" },
  { value: "14", label: "2 weeks" },
  { value: "30", label: "30 days" },
];

interface AlertDefaults {
  earliest_time?: string;
  latest_time?: string;
  min_players?: number;
  max_price?: number | null;
  lead_days?: string;
  is_recurring?: boolean;
  recurrence_days?: number[];
}

interface Profile {
  email: string;
  phone: string | null;
  notification_phone: string | null;
  tier: string;
  alert_defaults: AlertDefaults;
}

const tierColors: Record<string, string> = {
  starter: "bg-[var(--color-terracotta)]/15 text-[var(--color-terracotta)]",
  unlimited: "bg-[var(--color-sage)]/15 text-[var(--color-sage)]",
};

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-sand)]/10 text-[10px] font-medium text-[var(--color-sand-muted)] hover:bg-[var(--color-sand)]/20 hover:text-[var(--color-sand)]"
        >
          ?
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4}>
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [phone, setPhone] = useState("");
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushMessage, setPushMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [testingPush, setTestingPush] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [defaultsMessage, setDefaultsMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Alert default form state
  const [defaults, setDefaults] = useState<{
    earliest_time: string;
    latest_time: string;
    min_players: string;
    max_price: string;
    lead_days: string;
    is_recurring: boolean;
    recurrence_days: number[];
  }>({
    earliest_time: "06:00",
    latest_time: "18:00",
    min_players: "4",
    max_price: "",
    lead_days: "",
    is_recurring: false,
    recurrence_days: [],
  });

  useEffect(() => {
    fetch("/api/user/profile")
      .then((res) => res.json())
      .then((data) => {
        setProfile(data);
        setPhone(data.phone || "");
        if (data.alert_defaults && Object.keys(data.alert_defaults).length > 0) {
          const d = data.alert_defaults as AlertDefaults;
          setDefaults({
            earliest_time: d.earliest_time || "06:00",
            latest_time: d.latest_time || "18:00",
            min_players: d.min_players ? String(d.min_players) : "4",
            max_price: d.max_price != null ? String(d.max_price) : "",
            lead_days: d.lead_days || "",
            is_recurring: d.is_recurring || false,
            recurrence_days: d.recurrence_days || [],
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // Check push notification support and current subscription status
  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setPushSupported(true);
      navigator.serviceWorker.ready.then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setPushSubscribed(!!sub);
      });
    }
  }, []);

  // Register service worker on mount
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  async function handlePushToggle() {
    setPushLoading(true);
    setPushMessage(null);

    try {
      const reg = await navigator.serviceWorker.ready;

      if (pushSubscribed) {
        // Unsubscribe
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/push/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
        setPushSubscribed(false);
        setPushMessage({ type: "success", text: "Push notifications disabled." });
      } else {
        // Subscribe
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
        setPushSubscribed(true);
        setPushMessage({ type: "success", text: "Push notifications enabled!" });
      }
    } catch (err) {
      const msg =
        (err as Error).message === "Registration failed - permission denied"
          ? "Permission denied. Please enable notifications in your browser settings."
          : "Failed to update push notifications. Please try again.";
      setPushMessage({ type: "error", text: msg });
    } finally {
      setPushLoading(false);
    }
  }

  function updateDefault(field: string, value: string | boolean | number[]) {
    setDefaults((prev) => ({ ...prev, [field]: value }));
  }

  function toggleDay(day: number) {
    setDefaults((prev) => {
      const days = prev.recurrence_days.includes(day)
        ? prev.recurrence_days.filter((d) => d !== day)
        : [...prev.recurrence_days, day].sort();
      return { ...prev, recurrence_days: days };
    });
  }

  async function handleSavePhone(e: React.FormEvent) {
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

      if (data.phone) {
        setMessage({ type: "success", text: "Phone number saved. Sending confirmation..." });
        try {
          const smsRes = await fetch("/api/user/test-sms", { method: "POST" });
          if (smsRes.ok) {
            setMessage({ type: "success", text: "Phone number saved. Check your messages!" });
          } else {
            setMessage({ type: "success", text: "Phone number saved. Confirmation message could not be sent." });
          }
        } catch {
          setMessage({ type: "success", text: "Phone number saved. Confirmation message could not be sent." });
        }
      } else {
        setMessage({ type: "success", text: "Phone number removed." });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDefaults(e: React.FormEvent) {
    e.preventDefault();
    setSavingDefaults(true);
    setDefaultsMessage(null);

    try {
      const payload: AlertDefaults = {
        earliest_time: defaults.earliest_time || "06:00",
        latest_time: defaults.latest_time || "18:00",
        min_players: Number(defaults.min_players) || 4,
        max_price: defaults.max_price ? Number(defaults.max_price) : null,
        lead_days: defaults.lead_days,
        is_recurring: defaults.is_recurring,
        recurrence_days: defaults.is_recurring && defaults.recurrence_days.length > 0
          ? defaults.recurrence_days
          : [],
      };

      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alert_defaults: payload }),
      });

      const data = await res.json();
      if (!res.ok) {
        setDefaultsMessage({ type: "error", text: data.error });
        return;
      }

      setProfile(data);
      setDefaultsMessage({ type: "success", text: "Alert defaults saved." });
    } catch {
      setDefaultsMessage({ type: "error", text: "Failed to save. Please try again." });
    } finally {
      setSavingDefaults(false);
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

      <div className="space-y-8">
        {/* Account section */}
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
          onSubmit={handleSavePhone}
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

        {/* Push Notifications section */}
        <div className="rounded-xl border border-[var(--color-sand)]/8 bg-[var(--color-surface)] p-6">
          <h2 className="mb-1 font-[family-name:var(--font-display)] text-lg text-[var(--color-sand-bright)]">
            Push Notifications
          </h2>
          <p className="mb-5 text-sm text-[var(--color-sand-muted)]">
            Get instant notifications on your device when tee times match your alerts.
          </p>

          {pushSupported ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={pushSubscribed}
                    disabled={pushLoading}
                    onClick={handlePushToggle}
                    className={`relative h-5 w-9 rounded-full transition-colors disabled:opacity-50 ${
                      pushSubscribed
                        ? "bg-[var(--color-terracotta)]"
                        : "bg-[var(--color-sand)]/20"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                        pushSubscribed ? "translate-x-4" : ""
                      }`}
                    />
                  </button>
                  <Label className="text-sm text-[var(--color-sand)]">
                    {pushLoading
                      ? "Updating..."
                      : pushSubscribed
                        ? "Enabled"
                        : "Disabled"}
                  </Label>
                </div>
                {pushSubscribed && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={testingPush}
                    onClick={async () => {
                      setTestingPush(true);
                      setPushMessage(null);
                      try {
                        const res = await fetch("/api/push/test", { method: "POST" });
                        if (res.ok) {
                          setPushMessage({ type: "success", text: "Test notification sent! Check your device." });
                        } else {
                          const data = await res.json();
                          setPushMessage({ type: "error", text: data.error || "Failed to send test notification." });
                        }
                      } catch {
                        setPushMessage({ type: "error", text: "Failed to send test notification." });
                      } finally {
                        setTestingPush(false);
                      }
                    }}
                    className="border-[var(--color-sand)]/10 text-xs text-[var(--color-sand)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-cream)]"
                  >
                    {testingPush ? "Sending..." : "Send Test"}
                  </Button>
                )}
              </div>

              {pushMessage && (
                <p
                  className={`mt-3 text-sm ${
                    pushMessage.type === "success"
                      ? "text-[var(--color-sage)]"
                      : "text-[var(--color-terracotta)]"
                  }`}
                >
                  {pushMessage.text}
                </p>
              )}
            </>
          ) : (
            <div className="rounded-lg bg-[var(--color-surface-raised)] p-4">
              <p className="text-sm font-medium text-[var(--color-sand)]">
                Install the app to enable push
              </p>
              <p className="mt-1.5 text-xs text-[var(--color-sand-muted)]">
                On iPhone, tap the{" "}
                <svg className="inline h-4 w-4 align-text-bottom text-[var(--color-terracotta)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3V15" />
                </svg>
                {" "}Share button at the bottom of Safari, then tap &ldquo;Add to Home Screen.&rdquo; Once installed, come back here to enable push notifications.
              </p>
            </div>
          )}
        </div>

        {/* Alert Defaults section */}
        <form
          onSubmit={handleSaveDefaults}
          className="rounded-xl border border-[var(--color-sand)]/8 bg-[var(--color-surface)] p-6"
        >
          <h2 className="mb-1 font-[family-name:var(--font-display)] text-lg text-[var(--color-sand-bright)]">
            Alert Defaults
          </h2>
          <p className="mb-5 text-sm text-[var(--color-sand-muted)]">
            Pre-fill new alerts with your preferred settings. You can still adjust per alert.
          </p>

          <div className="space-y-5">
            {/* Recurring toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={defaults.is_recurring}
                onClick={() => updateDefault("is_recurring", !defaults.is_recurring)}
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  defaults.is_recurring
                    ? "bg-[var(--color-terracotta)]"
                    : "bg-[var(--color-sand)]/20"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                    defaults.is_recurring ? "translate-x-4" : ""
                  }`}
                />
              </button>
              <Label className="text-sm text-[var(--color-sand)]">
                Default to recurring
              </Label>
              <InfoTip text="When enabled, new alerts will default to recurring mode, repeating on your selected days each week." />
            </div>

            {/* Day picker for recurring */}
            {defaults.is_recurring && (
              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <Label className="text-xs uppercase tracking-wider text-[var(--color-sand-muted)]">
                    Default days
                  </Label>
                  <InfoTip text="New recurring alerts will have these days pre-selected. You can change them per alert." />
                </div>
                <div className="flex gap-1.5">
                  {DAY_LABELS.map((label, i) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                        defaults.recurrence_days.includes(i)
                          ? "bg-[var(--color-terracotta)] text-white"
                          : "bg-[var(--color-surface-raised)] text-[var(--color-sand-muted)] hover:text-[var(--color-sand)]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Time window */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="def_earliest"
                    className="text-xs uppercase tracking-wider text-[var(--color-sand-muted)]"
                  >
                    Earliest time
                  </Label>
                  <InfoTip text="Only match tee times starting at or after this time." />
                </div>
                <Input
                  id="def_earliest"
                  type="time"
                  value={defaults.earliest_time}
                  onChange={(e) => updateDefault("earliest_time", e.target.value)}
                  className="border-[var(--color-sand)]/10 bg-[var(--color-surface-raised)] text-[var(--color-charcoal-text)]"
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="def_latest"
                    className="text-xs uppercase tracking-wider text-[var(--color-sand-muted)]"
                  >
                    Latest time
                  </Label>
                  <InfoTip text="Only match tee times starting at or before this time." />
                </div>
                <Input
                  id="def_latest"
                  type="time"
                  value={defaults.latest_time}
                  onChange={(e) => updateDefault("latest_time", e.target.value)}
                  className="border-[var(--color-sand)]/10 bg-[var(--color-surface-raised)] text-[var(--color-charcoal-text)]"
                />
              </div>
            </div>

            {/* Players & Price */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <Label className="text-xs uppercase tracking-wider text-[var(--color-sand-muted)]">
                    Min players
                  </Label>
                  <InfoTip text="Only match tee times with at least this many open spots." />
                </div>
                <div className="flex gap-1.5">
                  {PLAYER_OPTIONS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => updateDefault("min_players", String(n))}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                        defaults.min_players === String(n)
                          ? "bg-[var(--color-terracotta)] text-white"
                          : "bg-[var(--color-surface-raised)] text-[var(--color-sand-muted)] hover:text-[var(--color-sand)]"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="def_max_price"
                    className="text-xs uppercase tracking-wider text-[var(--color-sand-muted)]"
                  >
                    Max green fee
                  </Label>
                  <InfoTip text="Only match tee times at or below this price. Leave empty for any price." />
                </div>
                <Input
                  id="def_max_price"
                  type="number"
                  min="0"
                  placeholder="Any"
                  value={defaults.max_price}
                  onChange={(e) => updateDefault("max_price", e.target.value)}
                  className="border-[var(--color-sand)]/10 bg-[var(--color-surface-raised)] text-[var(--color-charcoal-text)] placeholder:text-[var(--color-sand-muted)]/50"
                />
              </div>
            </div>

            {/* Lead time */}
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs uppercase tracking-wider text-[var(--color-sand-muted)]">
                  Start monitoring
                </Label>
                <InfoTip text="How far in advance to start checking for tee times. &quot;Immediately&quot; means as soon as the alert is created. Other options delay monitoring until N days before the target date." />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {LEAD_DAY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateDefault("lead_days", opt.value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      defaults.lead_days === opt.value
                        ? "bg-[var(--color-terracotta)] text-white"
                        : "bg-[var(--color-surface-raised)] text-[var(--color-sand-muted)] hover:text-[var(--color-sand)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {defaultsMessage && (
              <p
                className={`text-sm ${
                  defaultsMessage.type === "success"
                    ? "text-[var(--color-sage)]"
                    : "text-[var(--color-terracotta)]"
                }`}
              >
                {defaultsMessage.text}
              </p>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={savingDefaults}
                className="bg-[var(--color-terracotta)] text-white hover:bg-[var(--color-terracotta-glow)] disabled:opacity-50"
              >
                {savingDefaults ? "Saving..." : "Save Defaults"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
