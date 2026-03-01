import { createServiceClient } from "./supabase/server";
import { sendIMessage } from "./notifications/imessage";
import { sendAlertEmail } from "./notifications/email";
import { getBookingUrl } from "./booking-url";
import type { TeeTime } from "./pollers/types";

function getNextOccurrence(days: number[]): string | null {
  if (days.length === 0) return null;
  const now = new Date();
  // Start from tomorrow and find the next matching day of week
  for (let i = 1; i <= 7; i++) {
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + i);
    if (days.includes(candidate.getDay())) {
      return candidate.toISOString().split("T")[0];
    }
  }
  return null;
}

interface Alert {
  id: string;
  user_id: string;
  course_id: string;
  target_date: string;
  earliest_time: string | null;
  latest_time: string | null;
  min_players: number;
  max_price: number | null;
  holes: number[] | null;
  notify_sms: boolean;
  notify_email: boolean;
  is_recurring: boolean;
  recurrence_days: number[] | null;
  user_profiles: { phone: string | null } | null;
}

function matchesAlert(t: TeeTime, alert: Alert): boolean {
  if (alert.earliest_time && t.time < alert.earliest_time) return false;
  if (alert.latest_time && t.time > alert.latest_time) return false;
  // -1 means available but count unknown (Chronogolf) — treat as matching
  if (t.availableSpots >= 0 && t.availableSpots < alert.min_players) return false;
  if (alert.max_price && t.greenFee > alert.max_price) return false;
  if (alert.holes && alert.holes.length > 0 && !alert.holes.includes(t.holes))
    return false;
  return true;
}

export async function matchAndNotify(
  courseId: string,
  courseName: string,
  targetDate: string,
  newTimes: TeeTime[],
  platform?: string,
  platformCourseId?: string,
  bookingSlug?: string | null,
  platformScheduleId?: string | null
) {
  const supabase = createServiceClient();

  const today = new Date().toISOString().split("T")[0];

  const { data: alerts, error: alertError } = await supabase
    .from("alerts")
    .select("*, user_profiles!alerts_user_profiles_fkey(phone)")
    .eq("course_id", courseId)
    .eq("target_date", targetDate)
    .eq("is_active", true)
    .is("triggered_at", null)
    .lte("start_monitoring_date", today);

  if (alertError) {
    console.error("Alert query error:", alertError.message);
    return [];
  }

  if (!alerts || alerts.length === 0) return [];

  const results = [];

  for (const alert of alerts as Alert[]) {
    const matching = newTimes.filter((t) => matchesAlert(t, alert));
    if (matching.length === 0) continue;

    const bookingLink =
      platform && platformCourseId
        ? getBookingUrl(platform, platformCourseId, targetDate, bookingSlug, platformScheduleId)
        : undefined;

    const notifications: Array<{
      promise: Promise<unknown>;
      channel: string;
      recipient: string;
    }> = [];

    const phone = alert.user_profiles?.phone;
    if (alert.notify_sms && phone) {
      notifications.push({
        promise: sendIMessage(phone, courseName, matching, bookingLink),
        channel: "imessage",
        recipient: phone,
      });
    }

    if (alert.notify_email) {
      // Fetch user email from auth.users via admin API
      const { data: userData } = await supabase.auth.admin.getUserById(
        alert.user_id
      );
      const email = userData?.user?.email;
      if (email) {
        notifications.push({
          promise: sendAlertEmail(email, courseName, matching, bookingLink),
          channel: "email",
          recipient: email,
        });
      }
    }

    const settled = await Promise.allSettled(
      notifications.map((n) => n.promise)
    );

    // Mark alert as triggered
    await supabase
      .from("alerts")
      .update({ triggered_at: new Date().toISOString() })
      .eq("id", alert.id);

    // Advance recurring alerts to next occurrence
    if (alert.is_recurring) {
      const days = alert.recurrence_days;
      if (days && days.length > 0) {
        const nextDate = getNextOccurrence(days);
        if (nextDate) {
          await supabase
            .from("alerts")
            .update({
              target_date: nextDate,
              triggered_at: null,
              is_active: true,
            })
            .eq("id", alert.id);
        }
      }
    }

    // Log notifications
    for (let i = 0; i < settled.length; i++) {
      const result = settled[i];
      const notif = notifications[i];
      await supabase.from("notification_log").insert({
        alert_id: alert.id,
        channel: notif.channel,
        recipient: notif.recipient,
        payload: { course: courseName, times: matching },
        status: result.status === "fulfilled" ? "sent" : "failed",
      });
    }

    results.push({ alertId: alert.id, matched: matching.length });
  }

  return results;
}
