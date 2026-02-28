import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { createServiceClient } from "@/lib/supabase/server";
import { pollForeUp } from "@/lib/pollers/foreup";
import { pollChronogolf } from "@/lib/pollers/chronogolf";
import { diffAndDetectNew } from "@/lib/diff";
import { matchAndNotify } from "@/lib/matcher";
import type { Course, TeeTime } from "@/lib/pollers/types";

async function pollCourse(
  course: Course,
  targetDate: string
): Promise<TeeTime[]> {
  switch (course.platform) {
    case "foreup": {
      // ForeUp expects MM-DD-YYYY
      const [y, m, d] = targetDate.split("-");
      return pollForeUp(course, `${m}-${d}-${y}`);
    }
    case "chronogolf":
      return pollChronogolf(course, targetDate);
    default:
      throw new Error(`Unknown platform: ${course.platform}`);
  }
}

function getTargetDates(bookingWindowDays: number | null): string[] {
  const dates: string[] = [];
  const now = new Date();

  // Always poll tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  dates.push(tomorrow.toISOString().split("T")[0]);

  // Poll the booking window edge (where new times appear)
  if (bookingWindowDays && bookingWindowDays > 1) {
    const edge = new Date(now);
    edge.setDate(edge.getDate() + bookingWindowDays);
    dates.push(edge.toISOString().split("T")[0]);
  }

  return [...new Set(dates)]; // dedupe
}

function getNextOccurrence(days: number[]): string | null {
  if (!days || days.length === 0) return null;
  const now = new Date();
  for (let i = 1; i <= 7; i++) {
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + i);
    if (days.includes(candidate.getDay())) {
      return candidate.toISOString().split("T")[0];
    }
  }
  return null;
}

async function advanceRecurringAlerts() {
  const supabase = createServiceClient();
  const today = new Date().toISOString().split("T")[0];

  // Find recurring alerts whose target_date is in the past
  const { data: staleAlerts } = await supabase
    .from("alerts")
    .select("id, recurrence_days")
    .eq("is_recurring", true)
    .eq("is_active", true)
    .lt("target_date", today);

  if (!staleAlerts || staleAlerts.length === 0) return;

  for (const alert of staleAlerts) {
    const nextDate = getNextOccurrence(alert.recurrence_days);
    if (nextDate) {
      await supabase
        .from("alerts")
        .update({ target_date: nextDate, triggered_at: null })
        .eq("id", alert.id);
    }
  }
}

async function handler() {
  const supabase = createServiceClient();

  // Advance any recurring alerts whose date has passed
  await advanceRecurringAlerts();

  const { data: courses, error } = await supabase
    .from("courses")
    .select("*")
    .eq("is_active", true);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!courses || courses.length === 0) {
    return Response.json({ polled: 0, message: "No active courses" });
  }

  const allResults: Record<string, unknown>[] = [];

  for (const course of courses) {
    const dates = getTargetDates(course.booking_window_days);

    for (const dateStr of dates) {
      try {
        const times = await pollCourse(course as Course, dateStr);
        const newTimes = await diffAndDetectNew(course.id, dateStr, times);

        let notifications: { alertId: string; matched: number }[] = [];
        if (newTimes.length > 0) {
          notifications = await matchAndNotify(
            course.id,
            course.name,
            dateStr,
            newTimes
          );
        }

        allResults.push({
          course: course.name,
          date: dateStr,
          totalTimes: times.length,
          newTimes: newTimes.length,
          notifications: notifications.length,
        });
      } catch (err) {
        allResults.push({
          course: course.name,
          date: dateStr,
          error: (err as Error).message,
        });
      }
    }
  }

  return Response.json({ polled: courses.length, results: allResults });
}

export const POST = verifySignatureAppRouter(handler);

// Allow GET for manual testing (no QStash signature verification)
export async function GET() {
  return handler();
}
