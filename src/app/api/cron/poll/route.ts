import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { Client } from "@upstash/qstash";
import { createServiceClient } from "@/lib/supabase/server";
import { sendPlainIMessage } from "@/lib/notifications/imessage";
import { Resend } from "resend";

const ADMIN_USER_ID = "3cefdaf3-2f71-4c83-88c3-dfe2f080ebe1";
const ERROR_RATE_THRESHOLD = 0.3; // 30% error rate triggers alert
const MIN_POLLS_FOR_ALERT = 5; // Need at least 5 polls to evaluate

async function checkPollHealthAndAlert(supabase: ReturnType<typeof createServiceClient>) {
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: recent } = await supabase
    .from("poll_results")
    .select("status, course_name, error_message")
    .gte("created_at", thirtyMinAgo);

  if (!recent || recent.length < MIN_POLLS_FOR_ALERT) return;

  const errors = recent.filter((r) => r.status === "error");
  const errorRate = errors.length / recent.length;

  if (errorRate < ERROR_RATE_THRESHOLD) return;

  // Check if we already alerted recently (avoid spam)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: recentAlerts } = await supabase
    .from("poll_results")
    .select("id")
    .eq("course_name", "__health_alert__")
    .gte("created_at", oneHourAgo)
    .limit(1);

  if (recentAlerts && recentAlerts.length > 0) return; // Already alerted within the hour

  // Build error summary
  const errorCourses: Record<string, number> = {};
  for (const e of errors) {
    errorCourses[e.course_name] = (errorCourses[e.course_name] || 0) + 1;
  }
  const topErrors = Object.entries(errorCourses)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => `${name}: ${count}`)
    .join("\n");

  const message = [
    "⚠️ POLL HEALTH ALERT",
    `Error rate: ${(errorRate * 100).toFixed(0)}% (${errors.length}/${recent.length} polls)`,
    `Last 30 minutes`,
    "",
    "Top errors by course:",
    topErrors,
    "",
    "Check: https://teetimehawk.com/admin",
  ].join("\n");

  // Send iMessage to admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", ADMIN_USER_ID)
    .single();

  if (profile?.phone) {
    try {
      await sendPlainIMessage(profile.phone, message);
    } catch (err) {
      console.error("Failed to send health alert iMessage:", err);
    }
  }

  // Send email to admin
  const { data: authUser } = await supabase.auth.admin.getUserById(ADMIN_USER_ID);
  if (authUser?.user?.email) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Tee Time Hawk <alerts@teetimehawk.com>",
        to: authUser.user.email,
        subject: `⚠️ Poll Health Alert — ${(errorRate * 100).toFixed(0)}% error rate`,
        text: message,
      });
    } catch (err) {
      console.error("Failed to send health alert email:", err);
    }
  }

  // Mark that we sent an alert (to avoid spam)
  await supabase.from("poll_results").insert({
    course_id: null,
    course_name: "__health_alert__",
    target_date: new Date().toISOString().split("T")[0],
    platform: "system",
    status: "success",
    duration_ms: 0,
  });
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
        .update({ target_date: nextDate })
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

  // Check recent poll health and alert admin if error rate is high
  try {
    await checkPollHealthAndAlert(supabase);
  } catch (err) {
    console.error("Health check failed:", err);
  }

  return Response.json({
    polled: courses.length,
    dispatched: messages.length,
    courses: messages.map((m) => `${m.courseName} (${m.date})`),
  });
}

export const POST = verifySignatureAppRouter(handler);
