"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface MatchedTime {
  time: string;
  holes: number;
  availableSpots: number;
  greenFee: number;
}

interface Notification {
  id: string;
  course_name: string;
  location_city: string | null;
  location_state: string | null;
  target_date: string;
  matched_times: MatchedTime[];
  booking_url: string | null;
  channels_sent: string[];
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

const channelLabels: Record<string, string> = {
  push: "Push",
  email: "Email",
  imessage: "SMS",
};

export default function NotificationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [notif, setNotif] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/notifications/${id}`);
        if (!res.ok) {
          setError(true);
          return;
        }
        const data = await res.json();
        setNotif(data);

        // Mark as read (fire-and-forget)
        if (!data.read_at) {
          fetch(`/api/notifications/${id}`, { method: "PATCH" });
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

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

  if (error || !notif) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10 text-center">
        <p className="mb-4 text-[var(--color-sand-muted)]">Notification not found.</p>
        <Button asChild variant="ghost" className="text-[var(--color-sand-muted)]">
          <Link href="/notifications">Back to notifications</Link>
        </Button>
      </div>
    );
  }

  const location = [notif.location_city, notif.location_state].filter(Boolean).join(", ");

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 md:py-16">
      {/* Back link */}
      <button
        onClick={() => router.push("/notifications")}
        className="mb-8 flex items-center gap-2 text-sm text-[var(--color-sand-muted)] transition-colors hover:text-[var(--color-sand)]"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Notifications
      </button>

      {/* Header */}
      <div className="mb-8">
        <div className="accent-line mb-6" />
        <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--color-cream)] sm:text-3xl">
          {notif.course_name}
        </h1>
        {location && (
          <p className="mt-1 text-[var(--color-sand-muted)]">{location}</p>
        )}
        <p className="mt-2 text-sm text-[var(--color-sand-muted)]">
          {formatDate(notif.target_date)} &middot; {formatRelativeTime(notif.created_at)}
        </p>
      </div>

      {/* Matched tee times table */}
      <div className="mb-8 overflow-hidden rounded-xl border border-[var(--color-sand)]/8 bg-[var(--color-surface)]">
        <div className="border-b border-[var(--color-sand)]/8 px-5 py-3">
          <h2 className="text-sm font-medium text-[var(--color-sand-bright)]">
            Matched Tee Times
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-sand)]/5 text-left text-xs text-[var(--color-sand-muted)]">
                <th className="px-5 py-2.5 font-medium">Time</th>
                <th className="px-5 py-2.5 font-medium">Spots</th>
                <th className="px-5 py-2.5 font-medium">Holes</th>
                <th className="px-5 py-2.5 font-medium text-right">Fee</th>
              </tr>
            </thead>
            <tbody>
              {notif.matched_times.map((t, i) => (
                <tr key={i} className="border-b border-[var(--color-sand)]/5 last:border-0">
                  <td className="px-5 py-2.5 text-[var(--color-charcoal-text)]">
                    {formatTime12h(t.time)}
                  </td>
                  <td className="px-5 py-2.5 text-[var(--color-charcoal-text)]">
                    {t.availableSpots < 0 ? "Open" : t.availableSpots}
                  </td>
                  <td className="px-5 py-2.5 text-[var(--color-charcoal-text)]">{t.holes}</td>
                  <td className="px-5 py-2.5 text-right text-[var(--color-charcoal-text)]">
                    ${t.greenFee}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Book Now CTA */}
      {notif.booking_url && (
        <a
          href={notif.booking_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-8 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-terracotta)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--color-terracotta-glow)]"
        >
          Book Now
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </a>
      )}

      {/* Channels sent + timestamp */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-sand-muted)]">
        <span>Sent via:</span>
        {notif.channels_sent.map((ch) => (
          <Badge
            key={ch}
            variant="outline"
            className="border-[var(--color-sand)]/10 text-xs text-[var(--color-sand-muted)]"
          >
            {channelLabels[ch] || ch}
          </Badge>
        ))}
      </div>
    </div>
  );
}
