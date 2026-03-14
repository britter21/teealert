"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  { value: "custom", label: "Custom" },
];

const WINDOW_OPTIONS = [
  { value: "14", label: "2 weeks" },
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
  { value: "90", label: "90 days" },
  { value: "custom", label: "Custom" },
];

interface AlertData {
  id?: string;
  course_id?: string;
  target_date: string;
  earliest_time: string | null;
  latest_time: string | null;
  min_players: number;
  max_price: number | null;
  start_monitoring_date: string | null;
  is_recurring: boolean;
  recurrence_days: number[] | null;
  recurrence_window_days: number | null;
}

interface AlertDefaults {
  earliest_time?: string;
  latest_time?: string;
  min_players?: number;
  max_price?: number | null;
  lead_days?: string;
  is_recurring?: boolean;
  recurrence_days?: number[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseName: string;
  defaultDate?: string;
  /** Pre-fetched user defaults so we don't fetch on every dialog open */
  userDefaults?: AlertDefaults | null;
  /** If provided, form is in edit mode */
  existingAlert?: AlertData;
  onSaved?: () => void;
  /** User's subscription tier — "starter" disables recurring */
  userTier?: string;
}

export function AlertFormDialog({
  open,
  onOpenChange,
  courseId,
  courseName,
  defaultDate: defaultDateProp,
  userDefaults,
  existingAlert,
  onSaved,
  userTier,
}: Props) {
  const router = useRouter();
  const isEdit = !!existingAlert?.id;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split("T")[0];

  const [form, setForm] = useState({
    target_date: defaultDateProp || defaultDate,
    earliest_time: "06:00",
    latest_time: "18:00",
    min_players: "4",
    max_price: "",
    lead_days: "",
    lead_days_custom: "",
    is_recurring: false,
    recurrence_days: [] as number[],
    recurrence_window: "30",
    recurrence_window_custom: "",
  });

  // Populate form from existing alert (edit) or user defaults (create)
  useEffect(() => {
    if (existingAlert) {
      const leadDaysValue = (() => {
        if (!existingAlert.start_monitoring_date || !existingAlert.target_date) return "";
        const today = new Date().toISOString().split("T")[0];
        if (existingAlert.start_monitoring_date <= today) return "";
        const diff = Math.max(
          0,
          Math.round(
            (new Date(existingAlert.target_date).getTime() -
              new Date(existingAlert.start_monitoring_date).getTime()) /
              86400000
          )
        );
        const diffStr = String(diff);
        const isPreset = LEAD_DAY_OPTIONS.some((o) => o.value === diffStr);
        return isPreset ? diffStr : "custom";
      })();
      const leadDaysCustom = leadDaysValue === "custom"
        ? (() => {
            const diff = Math.max(
              0,
              Math.round(
                (new Date(existingAlert.target_date).getTime() -
                  new Date(existingAlert.start_monitoring_date!).getTime()) /
                  86400000
              )
            );
            return String(diff);
          })()
        : "";
      const windowDays = existingAlert.recurrence_window_days || 30;
      const windowStr = String(windowDays);
      const isWindowPreset = WINDOW_OPTIONS.some((o) => o.value === windowStr);
      setForm({
        target_date: existingAlert.target_date || defaultDate,
        earliest_time: (existingAlert.earliest_time || "06:00").slice(0, 5),
        latest_time: (existingAlert.latest_time || "18:00").slice(0, 5),
        min_players: String(existingAlert.min_players || 1),
        max_price: existingAlert.max_price ? String(existingAlert.max_price) : "",
        lead_days: leadDaysValue,
        lead_days_custom: leadDaysCustom,
        is_recurring: existingAlert.is_recurring || false,
        recurrence_days: existingAlert.recurrence_days || [],
        recurrence_window: isWindowPreset ? windowStr : "custom",
        recurrence_window_custom: isWindowPreset ? "" : windowStr,
      });
    } else if (open) {
      // Apply pre-fetched user defaults instantly (no network call)
      const d = userDefaults;
      if (d && Object.keys(d).length > 0) {
        setForm({
          target_date: defaultDateProp || defaultDate,
          earliest_time: d.earliest_time || "06:00",
          latest_time: d.latest_time || "18:00",
          min_players: d.min_players ? String(d.min_players) : "4",
          max_price: d.max_price != null ? String(d.max_price) : "",
          lead_days: d.lead_days != null ? d.lead_days : "",
          lead_days_custom: "",
          is_recurring: d.is_recurring ?? false,
          recurrence_days: d.recurrence_days?.length ? d.recurrence_days : [],
          recurrence_window: "30",
          recurrence_window_custom: "",
        });
      } else {
        setForm({
          target_date: defaultDateProp || defaultDate,
          earliest_time: "06:00",
          latest_time: "18:00",
          min_players: "4",
          max_price: "",
          lead_days: "",
          lead_days_custom: "",
          is_recurring: false,
          recurrence_days: [],
          recurrence_window: "30",
          recurrence_window_custom: "",
        });
      }
    }
  }, [existingAlert, defaultDate, defaultDateProp, open, userDefaults]);

  function update(field: string, value: string | boolean | number[]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleDay(day: number) {
    setForm((prev) => {
      const days = prev.recurrence_days.includes(day)
        ? prev.recurrence_days.filter((d) => d !== day)
        : [...prev.recurrence_days, day].sort();
      return { ...prev, recurrence_days: days };
    });
  }

  function getLeadDays(): number {
    if (!form.lead_days) return 0;
    if (form.lead_days === "custom") return Number(form.lead_days_custom) || 0;
    return Number(form.lead_days);
  }

  function computeStartDate(): string {
    const days = getLeadDays();
    if (!days) {
      return new Date().toISOString().split("T")[0];
    }
    const target = new Date(form.target_date);
    target.setDate(target.getDate() - days);
    return target.toISOString().split("T")[0];
  }

  function getWindowDays(): number {
    if (form.recurrence_window === "custom") {
      return Math.min(Math.max(Number(form.recurrence_window_custom) || 30, 1), 90);
    }
    return Number(form.recurrence_window) || 30;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        course_id: courseId,
        target_date: form.target_date,
        earliest_time: form.earliest_time || null,
        latest_time: form.latest_time || null,
        min_players: Number(form.min_players) || 1,
        max_price: form.max_price ? Number(form.max_price) : null,
        start_monitoring_date: computeStartDate(),
        is_recurring: form.is_recurring,
        recurrence_days:
          form.is_recurring && form.recurrence_days.length > 0
            ? form.recurrence_days
            : null,
        recurrence_window_days: form.is_recurring ? getWindowDays() : 30,
        holes: [9, 18],
        notify_sms: true,
        notify_email: true,
        notify_push: true,
      };

      let res: Response;
      if (isEdit) {
        res = await fetch(`/api/alerts/${existingAlert!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.status === 401) {
        router.push("/login?redirect=/courses/" + courseId);
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save alert");

      onOpenChange(false);
      if (onSaved) {
        onSaved();
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-[var(--color-sand)]/10 bg-[var(--color-surface)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-display)] text-xl text-[var(--color-cream)]">
            {isEdit ? "Edit Alert" : "Create Alert"}
          </DialogTitle>
          <DialogDescription className="text-[var(--color-sand-muted)]">
            {isEdit
              ? `Update alert for ${courseName}.`
              : `Get notified when tee times open up at ${courseName}.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-5 pt-2">
          {/* Recurring toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={form.is_recurring}
              disabled={userTier === "starter"}
              onClick={() => update("is_recurring", !form.is_recurring)}
              className={`relative h-5 w-9 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                form.is_recurring
                  ? "bg-[var(--color-terracotta)]"
                  : "bg-[var(--color-sand)]/20"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                  form.is_recurring ? "translate-x-4" : ""
                }`}
              />
            </button>
            <Label className={`text-sm ${userTier === "starter" ? "text-[var(--color-sand-muted)]" : "text-[var(--color-sand)]"}`}>
              Recurring alert
            </Label>
            {userTier === "starter" && (
              <Link
                href="/pricing"
                className="text-xs font-medium text-[var(--color-terracotta)] hover:text-[var(--color-terracotta-glow)]"
              >
                Unlimited only
              </Link>
            )}
          </div>

          {/* Day picker for recurring */}
          {form.is_recurring && (
            <>
              <div className="grid gap-2">
                <Label className="text-xs uppercase tracking-wider text-[var(--color-sand-muted)]">
                  Repeat on
                </Label>
                <div className="flex gap-1.5">
                  {DAY_LABELS.map((label, i) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                        form.recurrence_days.includes(i)
                          ? "bg-[var(--color-terracotta)] text-white"
                          : "bg-[var(--color-surface-raised)] text-[var(--color-sand-muted)] hover:text-[var(--color-sand)]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <Label className="text-xs uppercase tracking-wider text-[var(--color-sand-muted)]">
                  Look ahead
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {WINDOW_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update("recurrence_window", opt.value)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        form.recurrence_window === opt.value
                          ? "bg-[var(--color-terracotta)] text-white"
                          : "bg-[var(--color-surface-raised)] text-[var(--color-sand-muted)] hover:text-[var(--color-sand)]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {form.recurrence_window === "custom" && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      max="90"
                      placeholder="30"
                      value={form.recurrence_window_custom}
                      onChange={(e) => update("recurrence_window_custom", e.target.value)}
                      className="w-20 border-[var(--color-sand)]/10 bg-[var(--color-surface-raised)] text-[var(--color-charcoal-text)]"
                    />
                    <span className="text-xs text-[var(--color-sand-muted)]">days (max 90)</span>
                  </div>
                )}
                <p className="text-xs text-[var(--color-sand-muted)]">
                  Monitor the next {getWindowDays()} days of{" "}
                  {form.recurrence_days.length > 0
                    ? form.recurrence_days.map((d) => DAY_LABELS[d]).join(", ") + "s"
                    : "selected days"}
                </p>
              </div>
            </>
          )}

          {/* Date — shown for one-time alerts, hidden for recurring (auto-computed) */}
          {!form.is_recurring && (
            <div className="grid gap-2">
              <Label
                htmlFor="target_date"
                className="text-xs uppercase tracking-wider text-[var(--color-sand-muted)]"
              >
                Date
              </Label>
              <Input
                id="target_date"
                type="date"
                value={form.target_date}
                onChange={(e) => update("target_date", e.target.value)}
                required
                className="border-[var(--color-sand)]/10 bg-[var(--color-surface-raised)] text-[var(--color-charcoal-text)]"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label
                htmlFor="earliest_time"
                className="text-xs uppercase tracking-wider text-[var(--color-sand-muted)]"
              >
                Earliest time
              </Label>
              <Input
                id="earliest_time"
                type="time"
                value={form.earliest_time}
                onChange={(e) => update("earliest_time", e.target.value)}
                className="border-[var(--color-sand)]/10 bg-[var(--color-surface-raised)] text-[var(--color-charcoal-text)]"
              />
            </div>
            <div className="grid gap-2">
              <Label
                htmlFor="latest_time"
                className="text-xs uppercase tracking-wider text-[var(--color-sand-muted)]"
              >
                Latest time
              </Label>
              <Input
                id="latest_time"
                type="time"
                value={form.latest_time}
                onChange={(e) => update("latest_time", e.target.value)}
                className="border-[var(--color-sand)]/10 bg-[var(--color-surface-raised)] text-[var(--color-charcoal-text)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="text-xs uppercase tracking-wider text-[var(--color-sand-muted)]">
                Min players
              </Label>
              <div className="flex gap-1.5">
                {PLAYER_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => update("min_players", String(n))}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                      form.min_players === String(n)
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
              <Label
                htmlFor="max_price"
                className="text-xs uppercase tracking-wider text-[var(--color-sand-muted)]"
              >
                Max green fee ($)
              </Label>
              <Input
                id="max_price"
                type="number"
                min="0"
                placeholder="Any"
                value={form.max_price}
                onChange={(e) => update("max_price", e.target.value)}
                className="border-[var(--color-sand)]/10 bg-[var(--color-surface-raised)] text-[var(--color-charcoal-text)] placeholder:text-[var(--color-sand-muted)]/50"
              />
            </div>
          </div>

          {/* Lead time for delayed monitoring */}
          <div className="grid gap-2">
            <Label className="text-xs uppercase tracking-wider text-[var(--color-sand-muted)]">
              Start monitoring
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {LEAD_DAY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update("lead_days", opt.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    form.lead_days === opt.value
                      ? "bg-[var(--color-terracotta)] text-white"
                      : "bg-[var(--color-surface-raised)] text-[var(--color-sand-muted)] hover:text-[var(--color-sand)]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {form.lead_days === "custom" && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  placeholder="Days"
                  value={form.lead_days_custom}
                  onChange={(e) => update("lead_days_custom", e.target.value)}
                  className="w-20 border-[var(--color-sand)]/10 bg-[var(--color-surface-raised)] text-[var(--color-charcoal-text)]"
                />
                <span className="text-xs text-[var(--color-sand-muted)]">days before</span>
              </div>
            )}
            {getLeadDays() > 0 && !form.is_recurring && (
              <p className="text-xs text-[var(--color-sand-muted)]">
                Monitoring starts {computeStartDate()}
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-[var(--color-terracotta)]/20 bg-[var(--color-terracotta)]/5 px-4 py-3">
              <p className="text-sm text-[var(--color-terracotta)]">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="bg-[var(--color-terracotta)] text-white hover:bg-[var(--color-terracotta-glow)] disabled:opacity-50"
          >
            {loading
              ? isEdit
                ? "Saving..."
                : "Creating..."
              : isEdit
                ? "Save Changes"
                : "Create Alert"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
