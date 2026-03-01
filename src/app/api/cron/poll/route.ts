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

async function handler() {
  const supabase = createServiceClient();

  await advanceRecurringAlerts();

  const today = new Date().toISOString().split("T")[0];

  // Get all active, untriggered alerts that have started monitoring
  // This gives us the exact course+date pairs we need to poll
  const { data: activeAlerts } = await supabase
    .from("alerts")
    .select("course_id, target_date")
    .eq("is_active", true)
    .is("triggered_at", null)
    .lte("start_monitoring_date", today)
    .gte("target_date", today);

  if (!activeAlerts || activeAlerts.length === 0) {
    return Response.json({ polled: 0, message: "No active alerts" });
  }

  // Deduplicate to unique course+date pairs
  const pairSet = new Set(activeAlerts.map((a) => `${a.course_id}|${a.target_date}`));
  const pairs = [...pairSet].map((p) => {
    const [courseId, date] = p.split("|");
    return { courseId, date };
  });

  const courseIds = [...new Set(pairs.map((p) => p.courseId))];

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

  const courseMap = new Map(courses.map((c) => [c.id, c]));

  // Fan out: publish one QStash message per course+date pair
  const qstash = new Client({ token: process.env.QSTASH_TOKEN! });
  const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://teetimehawk.com";

  const messages: { courseId: string; courseName: string; date: string }[] = [];

  for (const pair of pairs) {
    const course = courseMap.get(pair.courseId);
    if (!course) continue;
    messages.push({
      courseId: course.id,
      courseName: course.name,
      date: pair.date,
    });
  }

  if (messages.length === 0) {
    return Response.json({ polled: 0, message: "No course+date pairs to poll" });
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
