import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { createServiceClient } from "@/lib/supabase/server";
import { pollForeUp } from "@/lib/pollers/foreup";
import { pollChronogolf } from "@/lib/pollers/chronogolf";
import { diffAndDetectNew } from "@/lib/diff";
import { matchAndNotify } from "@/lib/matcher";
import type { Course, TeeTime } from "@/lib/pollers/types";

async function pollCourse(course: Course, targetDate: string): Promise<TeeTime[]> {
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

async function handler() {
  const supabase = createServiceClient();

  // Get all active courses that have at least one active alert
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

  const results = await Promise.allSettled(
    courses.map(async (course) => {
      // Calculate target date based on booking window
      const now = new Date();
      const targetDate = new Date(now);
      if (course.booking_window_days) {
        targetDate.setDate(targetDate.getDate() + course.booking_window_days);
      }
      const dateStr = targetDate.toISOString().split("T")[0];

      // Poll the course
      const times = await pollCourse(course as Course, dateStr);

      // Diff against cache
      const newTimes = await diffAndDetectNew(course.id, dateStr, times);

      // Match and notify if new times found
      let notifications: { alertId: string; matched: number }[] = [];
      if (newTimes.length > 0) {
        notifications = await matchAndNotify(
          course.id,
          course.name,
          dateStr,
          newTimes
        );
      }

      return {
        course: course.name,
        date: dateStr,
        totalTimes: times.length,
        newTimes: newTimes.length,
        notifications: notifications.length,
      };
    })
  );

  return Response.json({
    polled: courses.length,
    results: results.map((r) =>
      r.status === "fulfilled"
        ? r.value
        : { error: (r.reason as Error).message }
    ),
  });
}

export const POST = verifySignatureAppRouter(handler);

// Also allow GET for manual testing (no signature verification)
export async function GET() {
  return handler();
}
