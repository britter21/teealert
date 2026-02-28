import { createServiceClient } from "./supabase/server";
import { sendIMessage } from "./notifications/imessage";
import type { TeeTime } from "./pollers/types";

interface Alert {
  id: string;
  course_id: string;
  target_date: string;
  earliest_time: string | null;
  latest_time: string | null;
  min_players: number;
  max_price: number | null;
  holes: number[] | null;
  notify_sms: boolean;
  notify_email: boolean;
  users: { phone: string | null; email: string | null };
}

function matchesAlert(t: TeeTime, alert: Alert): boolean {
  if (alert.earliest_time && t.time < alert.earliest_time) return false;
  if (alert.latest_time && t.time > alert.latest_time) return false;
  if (t.availableSpots < alert.min_players) return false;
  if (alert.max_price && t.greenFee > alert.max_price) return false;
  if (alert.holes && alert.holes.length > 0 && !alert.holes.includes(t.holes))
    return false;
  return true;
}

export async function matchAndNotify(
  courseId: string,
  courseName: string,
  targetDate: string,
  newTimes: TeeTime[]
) {
  const supabase = createServiceClient();

  const { data: alerts } = await supabase
    .from("alerts")
    .select("*, users:user_id(phone, email)")
    .eq("course_id", courseId)
    .eq("target_date", targetDate)
    .eq("is_active", true)
    .is("triggered_at", null);

  if (!alerts || alerts.length === 0) return [];

  const results = [];

  for (const alert of alerts as Alert[]) {
    const matching = newTimes.filter((t) => matchesAlert(t, alert));
    if (matching.length === 0) continue;

    const promises = [];
    if (alert.notify_sms && alert.users?.phone) {
      promises.push(sendIMessage(alert.users.phone, courseName, matching));
    }

    const settled = await Promise.allSettled(promises);

    // Mark alert as triggered
    await supabase
      .from("alerts")
      .update({ triggered_at: new Date().toISOString() })
      .eq("id", alert.id);

    // Log notification
    for (const result of settled) {
      await supabase.from("notification_log").insert({
        alert_id: alert.id,
        channel: "imessage",
        recipient: alert.users?.phone || "",
        payload: { course: courseName, times: matching },
        status: result.status === "fulfilled" ? "sent" : "failed",
      });
    }

    results.push({ alertId: alert.id, matched: matching.length });
  }

  return results;
}
