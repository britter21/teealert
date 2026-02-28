"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertFormDialog } from "@/components/alert-form-dialog";
import { getBookingUrl } from "@/lib/booking-url";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Alert {
  id: string;
  course_id: string;
  target_date: string;
  earliest_time: string | null;
  latest_time: string | null;
  min_players: number;
  max_price: number | null;
  holes: number[] | null;
  is_active: boolean;
  triggered_at: string | null;
  created_at: string;
  start_monitoring_date: string | null;
  is_recurring: boolean;
  recurrence_days: number[] | null;
  courses: {
    name: string;
    platform: string;
    platform_course_id: string;
    platform_schedule_id: string | null;
    booking_slug: string | null;
    location_city: string | null;
    location_state: string | null;
  };
}

interface AccountInfo {
  tier: string;
  alertCount: number;
  maxAlerts: number | null;
  channels: string[];
  pollIntervalSeconds: number;
}

const tierColors: Record<string, string> = {
  free: "bg-[var(--color-sand)]/10 text-[var(--color-sand-muted)]",
  pro: "bg-[var(--color-terracotta)]/15 text-[var(--color-terracotta)]",
  birdie: "bg-[var(--color-sage)]/15 text-[var(--color-sage)]",
};

export default function DashboardPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const [alertsRes, accountRes] = await Promise.all([
        fetch("/api/alerts"),
        fetch("/api/account"),
      ]);
      if (alertsRes.ok) setAlerts(await alertsRes.json());
      if (accountRes.ok) setAccount(await accountRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  async function handleDelete(id: string) {
    await fetch(`/api/alerts/${id}`, { method: "DELETE" });
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  const activeAlerts = alerts.filter((a) => a.is_active && !a.triggered_at);
  const triggeredAlerts = alerts.filter((a) => a.triggered_at);
  const inactiveAlerts = alerts.filter(
    (a) => !a.is_active && !a.triggered_at
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-sand)]/20 border-t-[var(--color-terracotta)]" />
          <span className="text-[var(--color-sand-muted)]">
            Loading alerts...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:py-16">
      <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="accent-line mb-6" />
          <div className="flex items-center gap-3">
            <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--color-cream)] sm:text-4xl">
              Dashboard
            </h1>
            {account && (
              <Badge className={`border-0 text-xs uppercase tracking-wider ${tierColors[account.tier] || tierColors.free}`}>
                {account.tier}
              </Badge>
            )}
          </div>
          {account && (
            <p className="mt-3 text-[var(--color-sand-muted)]">
              {account.alertCount}/{account.maxAlerts ?? "\u221E"} alerts used
              {" \u00B7 "}
              {account.pollIntervalSeconds}s polling
              {" \u00B7 "}
              {account.channels.join(", ")}
            </p>
          )}
          {!account && (
            <p className="mt-3 text-[var(--color-sand-muted)]">
              Manage your tee time alerts.
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {account?.tier === "free" && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-[var(--color-terracotta)]/30 text-[var(--color-terracotta)] hover:bg-[var(--color-terracotta)]/5 hover:text-[var(--color-terracotta)]"
            >
              <Link href="/pricing">Upgrade</Link>
            </Button>
          )}
          {account?.tier !== "free" && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-[var(--color-sand)]/10 text-[var(--color-sand-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-sand)]"
            >
              <Link href="/api/portal">Manage Subscription</Link>
            </Button>
          )}
          <Button
            asChild
            className="bg-[var(--color-terracotta)] text-white hover:bg-[var(--color-terracotta-glow)]"
          >
            <Link href="/courses">Create Alert</Link>
          </Button>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-sand)]/8 bg-[var(--color-surface)] px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-surface-raised)]">
            <svg
              className="h-6 w-6 text-[var(--color-sand-muted)]"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
              />
            </svg>
          </div>
          <p className="mb-4 text-[var(--color-sand-muted)]">
            No alerts yet.
          </p>
          <Button
            asChild
            className="bg-[var(--color-terracotta)] text-white hover:bg-[var(--color-terracotta-glow)]"
          >
            <Link href="/courses">Browse courses to create your first alert</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-10">
          {activeAlerts.length > 0 && (
            <AlertSection
              title="Active Alerts"
              description="Monitoring for new tee times"
              alerts={activeAlerts}
              onDelete={handleDelete}
              onEdit={setEditingAlert}
            />
          )}
          {triggeredAlerts.length > 0 && (
            <AlertSection
              title="Triggered"
              description="Alerts that found matching tee times"
              alerts={triggeredAlerts}
              onDelete={handleDelete}
              onEdit={setEditingAlert}
            />
          )}
          {inactiveAlerts.length > 0 && (
            <AlertSection
              title="Inactive"
              description="Paused or expired alerts"
              alerts={inactiveAlerts}
              onDelete={handleDelete}
              onEdit={setEditingAlert}
            />
          )}
        </div>
      )}

      {/* Edit dialog */}
      {editingAlert && (
        <AlertFormDialog
          open={!!editingAlert}
          onOpenChange={(open) => {
            if (!open) setEditingAlert(null);
          }}
          courseId={editingAlert.course_id}
          courseName={editingAlert.courses?.name || "Course"}
          existingAlert={editingAlert}
          onSaved={() => {
            setEditingAlert(null);
            fetchAlerts();
          }}
        />
      )}
    </div>
  );
}

function AlertSection({
  title,
  description,
  alerts,
  onDelete,
  onEdit,
}: {
  title: string;
  description: string;
  alerts: Alert[];
  onDelete: (id: string) => void;
  onEdit: (alert: Alert) => void;
}) {
  return (
    <div>
      <h2 className="mb-1 font-[family-name:var(--font-display)] text-xl text-[var(--color-sand-bright)]">
        {title}
      </h2>
      <p className="mb-5 text-sm text-[var(--color-sand-muted)]">
        {description}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {alerts.map((alert) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        ))}
      </div>
    </div>
  );
}

function formatRecurrence(days: number[] | null): string | null {
  if (!days || days.length === 0) return null;
  if (days.length === 7) return "Every day";
  if (
    days.length === 5 &&
    [1, 2, 3, 4, 5].every((d) => days.includes(d))
  )
    return "Weekdays";
  if (
    days.length === 2 &&
    days.includes(0) &&
    days.includes(6)
  )
    return "Weekends";
  return days.map((d) => DAY_LABELS[d]).join(", ");
}

function monitoringStatus(alert: Alert): string | null {
  if (!alert.start_monitoring_date || !alert.target_date) return null;
  const today = new Date().toISOString().split("T")[0];
  if (alert.start_monitoring_date > today) {
    const start = new Date(alert.start_monitoring_date);
    const now = new Date(today);
    const daysUntil = Math.ceil(
      (start.getTime() - now.getTime()) / 86400000
    );
    return `Starts in ${daysUntil}d`;
  }
  return null;
}

function AlertCard({
  alert,
  onDelete,
  onEdit,
}: {
  alert: Alert;
  onDelete: (id: string) => void;
  onEdit: (alert: Alert) => void;
}) {
  const course = alert.courses;
  const recurrence = formatRecurrence(alert.recurrence_days);
  const monitoring = monitoringStatus(alert);

  return (
    <div className="course-card flex flex-col rounded-xl border border-[var(--color-sand)]/8 bg-[var(--color-surface)] p-5">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <Link
            href={`/courses/${alert.course_id}`}
            className="font-[family-name:var(--font-display)] text-base text-[var(--color-sand-bright)] hover:text-[var(--color-cream)]"
          >
            {course?.name || "Unknown Course"}
          </Link>
          <p className="mt-0.5 text-sm text-[var(--color-sand-muted)]">
            {[course?.location_city, course?.location_state]
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {alert.is_recurring && (
            <Badge
              variant="outline"
              className="border-[var(--color-sand)]/10 text-xs text-[var(--color-sand-muted)]"
            >
              {recurrence}
            </Badge>
          )}
          {monitoring && (
            <Badge className="border-0 bg-[var(--color-sand)]/10 text-xs text-[var(--color-sand-muted)]">
              {monitoring}
            </Badge>
          )}
          {alert.triggered_at ? (
            <Badge className="border-0 bg-[var(--color-sage)]/15 text-xs text-[var(--color-sage)]">
              Triggered
            </Badge>
          ) : alert.is_active ? (
            <Badge className="border-0 bg-[var(--color-terracotta)]/15 text-xs text-[var(--color-terracotta)]">
              Active
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="border-0 bg-[var(--color-surface-raised)] text-xs text-[var(--color-sand-muted)]"
            >
              Inactive
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <span className="text-[var(--color-sand-muted)]">Date: </span>
          <span className="text-[var(--color-charcoal-text)]">
            {alert.target_date}
          </span>
        </div>
        <div>
          <span className="text-[var(--color-sand-muted)]">Players: </span>
          <span className="text-[var(--color-charcoal-text)]">
            {alert.min_players}+
          </span>
        </div>
        <div>
          <span className="text-[var(--color-sand-muted)]">Time: </span>
          <span className="text-[var(--color-charcoal-text)]">
            {alert.earliest_time || "Any"} - {alert.latest_time || "Any"}
          </span>
        </div>
        <div>
          <span className="text-[var(--color-sand-muted)]">Max price: </span>
          <span className="text-[var(--color-charcoal-text)]">
            {alert.max_price ? `$${alert.max_price}` : "Any"}
          </span>
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-1 border-t border-[var(--color-sand)]/5 pt-3">
        <a
          href={getBookingUrl(course?.platform, course?.platform_course_id, alert.target_date, course?.booking_slug, course?.platform_schedule_id)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium text-[var(--color-sage)] hover:bg-[var(--color-sage)]/10"
        >
          Book
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </a>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-[var(--color-sand-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-sand)]"
          onClick={() => onEdit(alert)}
        >
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-[var(--color-terracotta)]/70 hover:bg-[var(--color-terracotta)]/5 hover:text-[var(--color-terracotta)]"
          onClick={() => onDelete(alert.id)}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
