"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Overview {
  totalCourses: number;
  activeCourses: number;
  totalAlerts: number;
  activeAlerts: number;
  triggeredLast7d: number;
  totalUsers: number;
  activeSubscriptions: number;
  totalNotifications: number;
  failedNotifications: number;
}

interface Notification {
  id: string;
  alert_id: string;
  channel: string;
  recipient: string;
  status: string;
  sent_at: string;
  payload: { course?: string; times?: unknown[] };
}

interface SupportRequest {
  id: string;
  category: string;
  subject: string;
  status: string;
  created_at: string;
  user_id: string;
}

interface RecentUser {
  id: string;
  created_at: string;
  tier: string;
}

interface TopCourse {
  name: string;
  count: number;
}

interface QStashSchedule {
  id: string;
  cron: string;
  destination: string;
  isPaused: boolean;
  retries: number;
  lastRun: string | null;
  nextRun: string | null;
  lastStates: Record<string, string>;
}

interface QStashEvent {
  time: string | null;
  state: string;
  url: string;
  messageId: string;
}

interface QStashData {
  schedule: QStashSchedule | null;
  totalSchedules: number;
  recentEvents: QStashEvent[];
  eventSummary: Record<string, number>;
}

interface Stats {
  overview: Overview;
  platforms: Record<string, number>;
  tierBreakdown: Record<string, number>;
  topCourses: TopCourse[];
  recentNotifications: Notification[];
  supportRequests: SupportRequest[];
  recentSignups: RecentUser[];
}

const categoryLabels: Record<string, string> = {
  missing_course: "Missing Course",
  bug: "Bug",
  feature_request: "Feature",
  billing: "Billing",
  other: "Other",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-sand)]/8 bg-[var(--color-surface)] p-4">
      <p className="text-xs uppercase tracking-wider text-[var(--color-sand-muted)]">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--color-cream)]">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-[var(--color-sand-muted)]">{sub}</p>}
    </div>
  );
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [qstash, setQstash] = useState<QStashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchStats = useCallback(async () => {
    try {
      const [statsRes, qstashRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/qstash"),
      ]);
      if (statsRes.status === 403) {
        setError("Access denied.");
        return;
      }
      if (!statsRes.ok) {
        setError("Failed to load stats.");
        return;
      }
      setStats(await statsRes.json());
      if (qstashRes.ok) setQstash(await qstashRes.json());
      setLastRefresh(new Date());
    } catch {
      setError("Failed to load stats.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-sand)]/20 border-t-[var(--color-terracotta)]" />
          <span className="text-[var(--color-sand-muted)]">Loading control center...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-[var(--color-terracotta)]">{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  const o = stats.overview;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:py-16">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="accent-line mb-6" />
          <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--color-cream)] sm:text-4xl">
            Control Center
          </h1>
          <p className="mt-2 text-sm text-[var(--color-sand-muted)]">
            Last updated {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <Button
          onClick={() => { setLoading(true); fetchStats(); }}
          variant="outline"
          size="sm"
          className="border-[var(--color-sand)]/10 text-[var(--color-sand-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-sand)]"
        >
          Refresh
        </Button>
      </div>

      {/* Overview stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Users" value={o.totalUsers} sub={`${o.activeSubscriptions} subscribed`} />
        <StatCard label="Active Alerts" value={o.activeAlerts} sub={`${o.totalAlerts} total`} />
        <StatCard label="Triggered (7d)" value={o.triggeredLast7d} />
        <StatCard label="Notifications" value={o.totalNotifications} sub={o.failedNotifications > 0 ? `${o.failedNotifications} failed` : "0 failed"} />
        <StatCard label="Courses" value={o.activeCourses} sub={`${o.totalCourses} total`} />
      </div>

      {/* QStash Polling Health */}
      {qstash && (
        <div className="mb-8 rounded-xl border border-[var(--color-sand)]/8 bg-[var(--color-surface)] p-5">
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg text-[var(--color-sand-bright)]">
            Polling Health (QStash)
          </h2>
          {qstash.schedule ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[var(--color-sand-muted)]">Status</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm">
                    <span className={`inline-block h-2 w-2 rounded-full ${qstash.schedule.isPaused ? "bg-[var(--color-terracotta)]" : "bg-[var(--color-sage)]"}`} />
                    <span className={qstash.schedule.isPaused ? "text-[var(--color-terracotta)]" : "text-[var(--color-sage)]"}>
                      {qstash.schedule.isPaused ? "Paused" : "Active"}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-[var(--color-sand-muted)]">Schedule</p>
                  <p className="mt-1 text-sm text-[var(--color-charcoal-text)]">{qstash.schedule.cron}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-[var(--color-sand-muted)]">Last Run</p>
                  <p className="mt-1 text-sm text-[var(--color-charcoal-text)]">
                    {qstash.schedule.lastRun ? timeAgo(qstash.schedule.lastRun) : "Never"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-[var(--color-sand-muted)]">Next Run</p>
                  <p className="mt-1 text-sm text-[var(--color-charcoal-text)]">
                    {qstash.schedule.nextRun ? timeAgo(qstash.schedule.nextRun) : "N/A"}
                  </p>
                </div>
              </div>

              {/* Last dispatch result */}
              {Object.keys(qstash.schedule.lastStates).length > 0 && (
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wider text-[var(--color-sand-muted)]">Last Dispatch</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(qstash.schedule.lastStates).map(([msgId, state]) => (
                      <Badge
                        key={msgId}
                        className={`border-0 text-xs ${
                          state === "SUCCESS"
                            ? "bg-[var(--color-sage)]/15 text-[var(--color-sage)]"
                            : "bg-[var(--color-terracotta)]/15 text-[var(--color-terracotta)]"
                        }`}
                      >
                        {state}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent events summary */}
              {Object.keys(qstash.eventSummary).length > 0 && (
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wider text-[var(--color-sand-muted)]">Recent Events (last 20)</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(qstash.eventSummary).map(([state, count]) => (
                      <span key={state} className="text-sm text-[var(--color-charcoal-text)]">
                        {count} {state.toLowerCase()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent event log */}
              {qstash.recentEvents.length > 0 && (
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wider text-[var(--color-sand-muted)]">Event Log</p>
                  <div className="max-h-40 space-y-1 overflow-y-auto">
                    {qstash.recentEvents.map((e, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                          e.state === "DELIVERED" ? "bg-[var(--color-sage)]"
                          : e.state === "ACTIVE" ? "bg-[var(--color-sand)]"
                          : "bg-[var(--color-terracotta)]"
                        }`} />
                        <span className="w-16 text-[var(--color-sand-muted)]">
                          {e.time ? timeAgo(e.time) : "—"}
                        </span>
                        <span className="text-[var(--color-charcoal-text)]">{e.state}</span>
                        <span className="truncate text-[var(--color-sand-muted)]">
                          {e.url?.replace("https://teetimehawk.com", "")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-terracotta)]">
              No polling schedule found. QStash may not be configured.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Platform & Tier breakdown */}
        <div className="space-y-6">
          <div className="rounded-xl border border-[var(--color-sand)]/8 bg-[var(--color-surface)] p-5">
            <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg text-[var(--color-sand-bright)]">
              Platforms
            </h2>
            <div className="space-y-2">
              {Object.entries(stats.platforms).map(([platform, count]) => (
                <div key={platform} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-[var(--color-sand)]">{platform}</span>
                  <span className="text-[var(--color-charcoal-text)]">{count} courses</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--color-sand)]/8 bg-[var(--color-surface)] p-5">
            <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg text-[var(--color-sand-bright)]">
              Users by Tier
            </h2>
            <div className="space-y-2">
              {Object.entries(stats.tierBreakdown).map(([tier, count]) => (
                <div key={tier} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-[var(--color-sand)]">{tier}</span>
                  <span className="text-[var(--color-charcoal-text)]">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--color-sand)]/8 bg-[var(--color-surface)] p-5">
            <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg text-[var(--color-sand-bright)]">
              Top Courses by Alerts
            </h2>
            {stats.topCourses.length === 0 ? (
              <p className="text-sm text-[var(--color-sand-muted)]">No active alerts</p>
            ) : (
              <div className="space-y-2">
                {stats.topCourses.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="truncate text-[var(--color-sand)]">{c.name}</span>
                    <Badge variant="secondary" className="ml-2 shrink-0 border-0 bg-[var(--color-surface-raised)] text-xs text-[var(--color-sand-muted)]">
                      {c.count} alerts
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Activity feeds */}
        <div className="space-y-6">
          {/* Recent notifications */}
          <div className="rounded-xl border border-[var(--color-sand)]/8 bg-[var(--color-surface)] p-5">
            <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg text-[var(--color-sand-bright)]">
              Recent Notifications (24h)
            </h2>
            {stats.recentNotifications.length === 0 ? (
              <p className="text-sm text-[var(--color-sand-muted)]">No notifications in the last 24 hours</p>
            ) : (
              <div className="max-h-80 space-y-3 overflow-y-auto">
                {stats.recentNotifications.map((n) => (
                  <div key={n.id} className="flex items-start justify-between rounded-lg bg-[var(--color-surface-raised)]/50 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-[var(--color-sand)]">
                        {n.payload?.course || "Unknown course"}
                      </p>
                      <p className="text-xs text-[var(--color-sand-muted)]">
                        {n.channel} → {n.recipient.slice(0, 4)}...{n.recipient.slice(-4)}
                      </p>
                    </div>
                    <div className="ml-2 flex shrink-0 items-center gap-2">
                      <Badge
                        className={`border-0 text-xs ${
                          n.status === "sent"
                            ? "bg-[var(--color-sage)]/15 text-[var(--color-sage)]"
                            : "bg-[var(--color-terracotta)]/15 text-[var(--color-terracotta)]"
                        }`}
                      >
                        {n.status}
                      </Badge>
                      <span className="text-xs text-[var(--color-sand-muted)]">{timeAgo(n.sent_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Support requests */}
          <div className="rounded-xl border border-[var(--color-sand)]/8 bg-[var(--color-surface)] p-5">
            <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg text-[var(--color-sand-bright)]">
              Support Requests
            </h2>
            {stats.supportRequests.length === 0 ? (
              <p className="text-sm text-[var(--color-sand-muted)]">No support requests yet</p>
            ) : (
              <div className="max-h-64 space-y-3 overflow-y-auto">
                {stats.supportRequests.map((r) => (
                  <div key={r.id} className="flex items-start justify-between rounded-lg bg-[var(--color-surface-raised)]/50 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-[var(--color-sand)]">{r.subject}</p>
                      <p className="text-xs text-[var(--color-sand-muted)]">
                        {categoryLabels[r.category] || r.category}
                      </p>
                    </div>
                    <div className="ml-2 flex shrink-0 items-center gap-2">
                      <Badge
                        className={`border-0 text-xs ${
                          r.status === "open"
                            ? "bg-[var(--color-terracotta)]/15 text-[var(--color-terracotta)]"
                            : "bg-[var(--color-sage)]/15 text-[var(--color-sage)]"
                        }`}
                      >
                        {r.status}
                      </Badge>
                      <span className="text-xs text-[var(--color-sand-muted)]">{timeAgo(r.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent signups */}
          <div className="rounded-xl border border-[var(--color-sand)]/8 bg-[var(--color-surface)] p-5">
            <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg text-[var(--color-sand-bright)]">
              Recent Signups (7d)
            </h2>
            {stats.recentSignups.length === 0 ? (
              <p className="text-sm text-[var(--color-sand-muted)]">No new signups this week</p>
            ) : (
              <div className="space-y-2">
                {stats.recentSignups.map((u) => (
                  <div key={u.id} className="flex items-center justify-between text-sm">
                    <span className="truncate font-mono text-xs text-[var(--color-sand-muted)]">
                      {u.id.slice(0, 8)}...
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="border-0 bg-[var(--color-surface-raised)] text-xs capitalize text-[var(--color-sand-muted)]">
                        {u.tier || "starter"}
                      </Badge>
                      <span className="text-xs text-[var(--color-sand-muted)]">{timeAgo(u.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
