import { createServiceClient } from "./supabase/server";
import { sendIMessage } from "./notifications/imessage";
import { sendAlertEmail } from "./notifications/email";
import { sendPushNotifications } from "./notifications/push";
import { getBookingUrl } from "./booking-url";
import type { TeeTime } from "./pollers/types";

export function getNextOccurrence(days: number[]): string | null {
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

interface NotifyChannels {
  imessage?: boolean;
  email?: boolean;
  push?: boolean;
}

export interface Alert {
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
  notify_push: boolean;
  is_recurring: boolean;
  recurrence_days: number[] | null;
  user_profiles: { phone: string | null; notify_channels: NotifyChannels | null } | null;
}

export function matchesAlert(t: TeeTime, alert: Alert): boolean {
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
    .select("*, user_profiles!alerts_user_profiles_fkey(phone, notify_channels)")
    .eq("course_id", courseId)
    .eq("target_date", targetDate)
    .eq("is_active", true)
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

    // Query course for location info
    const { data: courseData } = await supabase
      .from("courses")
      .select("location_city, location_state")
      .eq("id", courseId)
      .single();

    // Insert alert_notification record
    let notificationId: string | null = null;
    const matchedTimesJson = matching.map((t) => ({
      time: t.time,
      holes: t.holes,
      availableSpots: t.availableSpots,
      greenFee: t.greenFee,
    }));

    const { data: notifRow } = await supabase
      .from("alert_notifications")
      .insert({
        user_id: alert.user_id,
        alert_id: alert.id,
        course_id: courseId,
        target_date: targetDate,
        matched_times: matchedTimesJson,
        booking_url: bookingLink || null,
        course_name: courseName,
        location_city: courseData?.location_city || null,
        location_state: courseData?.location_state || null,
        channels_sent: [],
      })
      .select("id")
      .single();

    notificationId = notifRow?.id ?? null;

    // Build in-app URL for push notifications
    const pushUrl = notificationId
      ? `https://teetimehawk.com/notifications/${notificationId}`
      : bookingLink;

    const notifications: Array<{
      promise: Promise<unknown>;
      channel: string;
      recipient: string;
    }> = [];

    // Account-level channel preferences (default all on)
    const channels = alert.user_profiles?.notify_channels || { imessage: true, email: true, push: true };

    const phone = alert.user_profiles?.phone;
    if (alert.notify_sms && channels.imessage !== false && phone) {
      notifications.push({
        promise: sendIMessage(phone, courseName, matching, bookingLink, targetDate),
        channel: "imessage",
        recipient: phone,
      });
    }

    if (alert.notify_email && channels.email !== false) {
      const { data: userData } = await supabase.auth.admin.getUserById(
        alert.user_id
      );
      const email = userData?.user?.email;
      if (email) {
        notifications.push({
          promise: sendAlertEmail(email, courseName, matching, bookingLink, targetDate),
          channel: "email",
          recipient: email,
        });
      }
    }

    if (alert.notify_push && channels.push !== false) {
      notifications.push({
        promise: sendPushNotifications(
          alert.user_id,
          courseName,
          matching,
          pushUrl,
          targetDate
        ),
        channel: "push",
        recipient: alert.user_id,
      });
    }

    const settled = await Promise.allSettled(
      notifications.map((n) => n.promise)
    );

    // Update channels_sent on the notification record
    if (notificationId) {
      const channelsSent = settled
        .map((r, i) => (r.status === "fulfilled" ? notifications[i].channel : null))
        .filter(Boolean) as string[];
      await supabase
        .from("alert_notifications")
        .update({ channels_sent: channelsSent })
        .eq("id", notificationId);
    }

    // Recurring alerts: advance to next occurrence after trigger
    // Non-recurring alerts: keep monitoring — new tee times will come
    // through via Redis diff, and the alert expires when the date passes
    if (alert.is_recurring) {
      const days = alert.recurrence_days;
      if (days && days.length > 0) {
        const nextDate = getNextOccurrence(days);
        if (nextDate) {
          await supabase
            .from("alerts")
            .update({
              target_date: nextDate,
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
