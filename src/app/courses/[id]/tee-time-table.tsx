"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getBookingUrl } from "@/lib/booking-url";
import { CreateAlertButton } from "./create-alert-button";

interface TeeTime {
  time: string;
  holes: number;
  availableSpots: number;
  minPlayers?: number;
  greenFee: number;
  cartFee?: number;
}

interface BookingClass {
  platform_booking_class_id: string;
  name: string;
  is_default: boolean;
  is_protected: boolean;
}

function formatTime12h(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${mStr} ${suffix}`;
}

interface Props {
  courseId: string;
  courseName: string;
  defaultDate: string;
  platform: string;
  platformCourseId: string;
  platformScheduleId?: string | null;
  bookingSlug?: string | null;
  bookingWindowDays?: number | null;
}

export function TeeTimeTable({ courseId, courseName, defaultDate, platform, platformCourseId, platformScheduleId, bookingSlug, bookingWindowDays }: Props) {
  const [date, setDate] = useState(defaultDate);
  const [times, setTimes] = useState<TeeTime[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bookingClasses, setBookingClasses] = useState<BookingClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [playerFilter, setPlayerFilter] = useState<number>(0); // 0 = Any

  // Fetch booking classes on mount
  useEffect(() => {
    fetch(`/api/courses/${courseId}/booking-classes`)
      .then((r) => r.json())
      .then((data) => {
        const classes: BookingClass[] = data.bookingClasses || [];
        setBookingClasses(classes);
        const def = classes.find((c) => c.is_default);
        if (def) setSelectedClass(def.platform_booking_class_id);
      })
      .catch(() => {});
  }, [courseId]);

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const fetchTimes = useCallback(
    async (d: string, bc: string, silent = false) => {
      if (!silent) {
        setLoading(true);
        setError("");
      }
      try {
        const params = new URLSearchParams({ date: d });
        if (bc) params.set("booking_class", bc);
        const res = await fetch(
          `/api/courses/${courseId}/availability?${params}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch");
        setTimes(data.times || []);
        setLastUpdated(new Date());
        if (silent) setError("");
      } catch (err) {
        if (!silent) {
          setError((err as Error).message);
          setTimes([]);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [courseId]
  );

  // Fetch tee times when date or booking class changes
  useEffect(() => {
    if (!selectedClass && bookingClasses.length > 0) return;
    fetchTimes(date, selectedClass);
  }, [date, selectedClass, fetchTimes, bookingClasses.length]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      fetchTimes(date, selectedClass, true);
    }, 15_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [date, selectedClass, fetchTimes]);

  const available = times.filter((t) => t.availableSpots !== 0);
  const filtered = playerFilter === 0
    ? available
    : available.filter((t) => t.availableSpots < 0 || t.availableSpots >= playerFilter);
  const showClassSelector = bookingClasses.filter((c) => !c.is_protected).length > 1;

  return (
    <div>
      {/* Date picker + Rate selector */}
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="grid gap-2">
          <Label
            htmlFor="date"
            className="text-xs uppercase tracking-wider text-[var(--color-sand-muted)]"
          >
            Date
          </Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-44 border-[var(--color-sand)]/10 bg-[var(--color-surface-raised)] text-[var(--color-charcoal-text)]"
          />
        </div>

        {showClassSelector && (
          <div className="grid gap-2">
            <Label
              htmlFor="booking-class"
              className="text-xs uppercase tracking-wider text-[var(--color-sand-muted)]"
            >
              Rate
            </Label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-56 border-[var(--color-sand)]/10 bg-[var(--color-surface-raised)] text-[var(--color-charcoal-text)]">
                <SelectValue placeholder="Select rate..." />
              </SelectTrigger>
              <SelectContent className="border-[var(--color-sand)]/10 bg-[var(--color-surface)] text-[var(--color-charcoal-text)]">
                {bookingClasses
                  .filter((bc) => !bc.is_protected)
                  .map((bc) => (
                    <SelectItem
                      key={bc.platform_booking_class_id}
                      value={bc.platform_booking_class_id}
                    >
                      {bc.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid gap-2">
          <Label className="text-xs uppercase tracking-wider text-[var(--color-sand-muted)]">
            Players
          </Label>
          <div className="flex gap-1">
            {[{ value: 0, label: "Any" }, { value: 1, label: "1+" }, { value: 2, label: "2+" }, { value: 3, label: "3+" }, { value: 4, label: "4" }].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPlayerFilter(opt.value)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  playerFilter === opt.value
                    ? "bg-[var(--color-terracotta)] text-white"
                    : "bg-[var(--color-surface-raised)] text-[var(--color-sand-muted)] hover:text-[var(--color-sand)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ml-auto flex items-end pb-0.5">
          <CreateAlertButton
            courseId={courseId}
            courseName={courseName}
            bookingWindowDays={bookingWindowDays}
            defaultDate={date}
          />
        </div>

        {loading && (
          <div className="flex items-center gap-2 pb-2">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--color-sand)]/20 border-t-[var(--color-terracotta)]" />
            <span className="text-sm text-[var(--color-sand-muted)]">
              Loading...
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-[var(--color-terracotta)]/20 bg-[var(--color-terracotta)]/5 px-4 py-3">
          <p className="text-sm text-[var(--color-terracotta)]">{error}</p>
        </div>
      )}

      {!loading && available.length === 0 && !error && (
        <div className="rounded-xl border border-[var(--color-sand)]/8 bg-[var(--color-surface)] px-6 py-12 text-center">
          <p className="text-[var(--color-sand-muted)]">
            No tee times available for this date.
          </p>
        </div>
      )}

      {available.length > 0 && (
        <>
          <div className="mb-4 flex items-center gap-3">
            <Badge
              variant="secondary"
              className="border-0 bg-[var(--color-surface-raised)] text-xs text-[var(--color-sand-muted)]"
            >
              {filtered.length} of {available.length} available
            </Badge>
            {lastUpdated && (
              <span className="flex items-center gap-1.5 text-xs text-[var(--color-sand-muted)]">
                <span className="pulse-available h-1.5 w-1.5 rounded-full bg-[var(--color-sage)]" />
                Live
              </span>
            )}
            <a
              href={getBookingUrl(platform, platformCourseId, date, bookingSlug, platformScheduleId)}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1.5 text-sm font-medium text-[var(--color-terracotta)] hover:text-[var(--color-terracotta-glow)]"
            >
              Book tee time
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-[var(--color-sand)]/8 bg-[var(--color-surface)] px-6 py-12 text-center">
              <p className="text-[var(--color-sand-muted)]">
                No tee times with {playerFilter}+ player spots available.
              </p>
            </div>
          ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--color-sand)]/8">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-sand)]/8 bg-[var(--color-surface-raised)]">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-sand-muted)]">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-sand-muted)]">
                    Holes
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-sand-muted)]">
                    Players
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-sand-muted)]">
                    Green Fee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-sand-muted)]">
                    Cart Fee
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-sand)]/5">
                {filtered.map((t, i) => (
                  <tr
                    key={i}
                    className="transition-colors hover:bg-[var(--color-surface-raised)]/50"
                  >
                    <td className="px-4 py-3.5 font-medium text-[var(--color-sand-bright)]">
                      {formatTime12h(t.time)}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-[var(--color-charcoal-text)]">
                      {t.holes}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-sm text-[var(--color-sage)]">
                        <span className="pulse-available h-1.5 w-1.5 rounded-full bg-[var(--color-sage)]" />
                        {t.availableSpots < 0
                          ? "Open"
                          : t.minPlayers && t.minPlayers < t.availableSpots
                            ? `${t.minPlayers}\u2013${t.availableSpots}`
                            : t.availableSpots}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-[var(--color-charcoal-text)]">
                      ${t.greenFee}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-[var(--color-sand-muted)]">
                      {t.cartFee != null ? `$${t.cartFee}` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </>
      )}
    </div>
  );
}
