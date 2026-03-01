import webpush from "web-push";
import { createServiceClient } from "../supabase/server";
import type { TeeTime } from "../pollers/types";

let vapidConfigured = false;
function ensureVapid() {
  if (vapidConfigured) return;
  webpush.setVapidDetails(
    "mailto:alerts@teetimehawk.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  vapidConfigured = true;
}

function formatTime12h(time24: string): string {
  const [h, m] = time24.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${m} ${ampm}`;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[d.getDay()]}, ${months[month - 1]} ${day}`;
}

function buildBody(times: TeeTime[]): string {
  return times
    .slice(0, 3)
    .map((t) => {
      const spots = t.availableSpots < 0 ? "open" : `${t.availableSpots} spot${t.availableSpots !== 1 ? "s" : ""}`;
      return `${formatTime12h(t.time)} · ${spots} · ${t.holes} holes · $${t.greenFee}`;
    })
    .join("\n");
}

export async function sendPushNotifications(
  userId: string,
  courseName: string,
  times: TeeTime[],
  bookingUrl?: string,
  targetDate?: string
): Promise<{ sent: number; failed: number }> {
  const supabase = createServiceClient();

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error || !subs || subs.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const dateLabel = targetDate ? ` · ${formatDate(targetDate)}` : "";
  const extra = times.length > 3 ? `\n+${times.length - 3} more` : "";

  const payload = JSON.stringify({
    title: `${courseName}${dateLabel}`,
    body: `${buildBody(times)}${extra}`,
    url: bookingUrl || "/dashboard",
    tag: `alert-${courseName.toLowerCase().replace(/\s+/g, "-")}`,
  });

  let sent = 0;
  let failed = 0;
  const expiredIds: string[] = [];

  ensureVapid();

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      );
      sent++;
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        // Subscription expired or unsubscribed — clean up
        expiredIds.push(sub.id);
      }
      failed++;
    }
  }

  // Remove expired subscriptions
  if (expiredIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", expiredIds);
  }

  return { sent, failed };
}
