"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface TeeTime {
  time: string;
  holes: number;
  availableSpots: number;
  greenFee: number;
  cartFee?: number;
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
  defaultDate: string;
}

export function TeeTimeTable({ courseId, defaultDate }: Props) {
  const [date, setDate] = useState(defaultDate);
  const [times, setTimes] = useState<TeeTime[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchTimes = useCallback(
    async (d: string) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/courses/${courseId}/availability?date=${d}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch");
        setTimes(data.times || []);
      } catch (err) {
        setError((err as Error).message);
        setTimes([]);
      } finally {
        setLoading(false);
      }
    },
    [courseId]
  );

  useEffect(() => {
    fetchTimes(date);
  }, [date, fetchTimes]);

  const available = times.filter((t) => t.availableSpots > 0);

  return (
    <div>
      {/* Date picker */}
      <div className="mb-6 flex items-end gap-4">
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

      {!loading && times.length === 0 && !error && (
        <div className="rounded-xl border border-[var(--color-sand)]/8 bg-[var(--color-surface)] px-6 py-12 text-center">
          <p className="text-[var(--color-sand-muted)]">
            No tee times available for this date.
          </p>
        </div>
      )}

      {times.length > 0 && (
        <>
          <div className="mb-4 flex items-center gap-3">
            <Badge
              variant="secondary"
              className="border-0 bg-[var(--color-surface-raised)] text-xs text-[var(--color-sand-muted)]"
            >
              {times.length} tee times
            </Badge>
            {available.length > 0 && (
              <Badge className="border-0 bg-[var(--color-sage)]/15 text-xs text-[var(--color-sage)]">
                {available.length} available
              </Badge>
            )}
          </div>

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
                    Spots
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
                {times.map((t, i) => (
                  <tr
                    key={i}
                    className={`transition-colors hover:bg-[var(--color-surface-raised)]/50 ${
                      t.availableSpots === 0 ? "opacity-40" : ""
                    }`}
                  >
                    <td className="px-4 py-3.5 font-medium text-[var(--color-sand-bright)]">
                      {formatTime12h(t.time)}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-[var(--color-charcoal-text)]">
                      {t.holes}
                    </td>
                    <td className="px-4 py-3.5">
                      {t.availableSpots > 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-[var(--color-sage)]">
                          <span className="pulse-available h-1.5 w-1.5 rounded-full bg-[var(--color-sage)]" />
                          {t.availableSpots}
                        </span>
                      ) : (
                        <span className="text-sm text-[var(--color-sand-muted)]">
                          Full
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-[var(--color-charcoal-text)]">
                      ${t.greenFee}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-[var(--color-sand-muted)]">
                      {t.cartFee != null ? `$${t.cartFee}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
