"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PullToRefresh } from "@/components/pull-to-refresh";

interface Notification {
  id: string;
  course_name: string;
  location_city: string | null;
  location_state: string | null;
  target_date: string;
  matched_times: { time: string }[];
  read_at: string | null;
  created_at: string;
}

function formatTime12h(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${mStr} ${suffix}`;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[d.getDay()]}, ${months[month - 1]} ${day}`;
}

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return formatDate(iso.split("T")[0]);
}

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const searchParams = useSearchParams();
  const alertId = searchParams.get("alert");

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [alertCourseName, setAlertCourseName] = useState<string | null>(null);

  const fetchNotifications = useCallback(async (offset = 0, append = false) => {
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    if (alertId) params.set("alert_id", alertId);

    const res = await fetch(`/api/notifications?${params}`);
    if (res.ok) {
      const data = await res.json();
      const notifs = append ? [...notifications, ...data.notifications] : data.notifications;
      setNotifications(notifs);
      setTotal(data.total ?? 0);

      // Extract course name from first notification for the header
      if (alertId && data.notifications.length > 0 && !alertCourseName) {
        setAlertCourseName(data.notifications[0].course_name);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertId]);

  useEffect(() => {
    fetchNotifications().finally(() => setLoading(false));
  }, [fetchNotifications]);

  async function handleLoadMore() {
    setLoadingMore(true);
    await fetchNotifications(notifications.length, true);
    setLoadingMore(false);
  }

  async function handleMarkAllRead() {
    await fetch("/api/notifications/read-all", { method: "PATCH" });
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
    );
  }

  const hasUnread = notifications.some((n) => !n.read_at);
  const hasMore = notifications.length < total;

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-sand)]/20 border-t-[var(--color-terracotta)]" />
          <span className="text-[var(--color-sand-muted)]">Loading notifications...</span>
        </div>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={() => fetchNotifications()}>
    <div className="mx-auto max-w-2xl px-6 py-10 md:py-16">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="accent-line mb-6" />
          <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--color-cream)] sm:text-4xl">
            Notifications
          </h1>
          <p className="mt-2 text-[var(--color-sand-muted)]">
            {alertId && alertCourseName
              ? `Alert history for ${alertCourseName}`
              : "Your alert history"}
          </p>
          {alertId && (
            <Link
              href="/notifications"
              className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--color-terracotta)] hover:text-[var(--color-terracotta-glow)]"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
              View all notifications
            </Link>
          )}
        </div>
        {hasUnread && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            className="text-xs text-[var(--color-sand-muted)] hover:text-[var(--color-sand)]"
          >
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-sand)]/8 bg-[var(--color-surface)] px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-surface-raised)]">
            <svg className="h-6 w-6 text-[var(--color-sand-muted)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
          </div>
          <p className="mb-2 text-[var(--color-sand-muted)]">
            {alertId ? "No notifications for this alert yet." : "No notifications yet."}
          </p>
          <p className="text-sm text-[var(--color-sand-muted)]/60">
            When your alerts find matching tee times, they&apos;ll appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Link
              key={n.id}
              href={`/notifications/${n.id}`}
              className="course-card flex items-start gap-3 rounded-xl border border-[var(--color-sand)]/8 bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-sand)]/15"
            >
              {/* Unread dot */}
              <div className="mt-1.5 flex-shrink-0">
                {!n.read_at ? (
                  <div className="h-2.5 w-2.5 rounded-full bg-[var(--color-terracotta)]" />
                ) : (
                  <div className="h-2.5 w-2.5" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-medium ${!n.read_at ? "text-[var(--color-sand-bright)]" : "text-[var(--color-sand)]"}`}>
                      {n.course_name}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-sand-muted)]">
                      {[n.location_city, n.location_state].filter(Boolean).join(", ")}
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-xs text-[var(--color-sand-muted)]">
                    {formatRelativeTime(n.created_at)}
                  </span>
                </div>

                <p className="mt-1.5 text-xs text-[var(--color-sand-muted)]">
                  {formatDate(n.target_date)} &middot;{" "}
                  {n.matched_times
                    .slice(0, 4)
                    .map((t) => formatTime12h(t.time))
                    .join(", ")}
                  {n.matched_times.length > 4 && ` +${n.matched_times.length - 4} more`}
                </p>
              </div>

              {/* Chevron */}
              <svg className="mt-1.5 h-4 w-4 flex-shrink-0 text-[var(--color-sand-muted)]/50" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          ))}

          {hasMore && (
            <div className="pt-4 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="text-[var(--color-sand-muted)] hover:text-[var(--color-sand)]"
              >
                {loadingMore ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}
