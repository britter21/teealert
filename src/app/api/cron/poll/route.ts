import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { Client } from "@upstash/qstash";
import { createServiceClient } from "@/lib/supabase/server";

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

function getTargetDates(bookingWindowDays: number | null): string[] {
  const dates: string[] = [];
  const now = new Date();

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  dates.push(tomorrow.toISOString().split("T")[0]);

  if (bookingWindowDays && bookingWindowDays > 1) {
    const edge = new Date(now);
    edge.setDate(edge.getDate() + bookingWindowDays);
    dates.push(edge.toISOString().split("T")[0]);
  }

  return [...new Set(dates)];
}

async function handler() {
  const supabase = createServiceClient();

  await advanceRecurringAlerts();

  const today = new Date().toISOString().split("T")[0];
  const { data: alertedCourseIds } = await supabase
    .from("alerts")
    .select("course_id")
    .eq("is_active", true)
    .is("triggered_at", null)
    .lte("start_monitoring_date", today);

  if (!alertedCourseIds || alertedCourseIds.length === 0) {
    return Response.json({ polled: 0, message: "No active alerts" });
  }

  const courseIds = [...new Set(alertedCourseIds.map((a) => a.course_id))];

  const { data: courses, error } = await supabase
    .from("courses")
    .select("*")
    .eq("is_active", true)
    .in("id", courseIds);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!courses || courses.length === 0) {
    return Response.json({ polled: 0, message: "No courses to poll" });
  }

  // Fan out: publish one QStash message per course+date
  const qstash = new Client({ token: process.env.QSTASH_TOKEN! });
  const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://teetimehawk.com";

  const messages: { courseId: string; courseName: string; date: string }[] = [];

  for (const course of courses) {
    const dates = getTargetDates(course.booking_window_days);
    for (const dateStr of dates) {
      messages.push({
        courseId: course.id,
        courseName: course.name,
        date: dateStr,
      });
    }
  }

  // Batch publish — each message becomes its own function invocation
  await Promise.all(
    messages.map((msg) =>
      qstash.publishJSON({
        url: `${baseUrl}/api/cron/poll-course`,
        body: msg,
      })
    )
  );

  return Response.json({
    polled: courses.length,
    dispatched: messages.length,
    courses: messages.map((m) => `${m.courseName} (${m.date})`),
  });
}

export const POST = verifySignatureAppRouter(handler);
