import { createServiceClient } from "@/lib/supabase/server";
import {
  sendTrialReminderEmail,
  sendTrialExpiredEmail,
} from "@/lib/notifications/lifecycle-emails";

const TRIAL_DAYS = 14;
const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: Request) {
  // Verify cron secret (QStash or simple secret)
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();

  // Find users whose trial started 11 days ago (3 days left)
  const reminderDate = new Date(now);
  reminderDate.setDate(reminderDate.getDate() - (TRIAL_DAYS - 3));
  const reminderDateStr = reminderDate.toISOString().split("T")[0];

  // Find users whose trial started 14 days ago (expired)
  const expiredDate = new Date(now);
  expiredDate.setDate(expiredDate.getDate() - TRIAL_DAYS);
  const expiredDateStr = expiredDate.toISOString().split("T")[0];

  const results = { reminder: 0, expired: 0, errors: 0 };

  // Trial reminder emails — users created ~11 days ago who haven't been sent this email
  const { data: reminderUsers } = await supabase
    .from("user_profiles")
    .select("id, created_at, lifecycle_emails_sent")
    .gte("created_at", `${reminderDateStr}T00:00:00Z`)
    .lt("created_at", `${reminderDateStr}T23:59:59Z`);

  for (const profile of reminderUsers || []) {
    const sent = (profile.lifecycle_emails_sent as Record<string, boolean>) || {};
    if (sent.trial_reminder) continue;

    // Check they don't have an active subscription
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", profile.id)
      .eq("status", "active")
      .limit(1);

    if (subs && subs.length > 0) continue;

    // Get user email
    const { data: userData } = await supabase.auth.admin.getUserById(profile.id);
    const email = userData?.user?.email;
    if (!email) continue;

    try {
      await sendTrialReminderEmail(email);
      await supabase
        .from("user_profiles")
        .update({
          lifecycle_emails_sent: { ...sent, trial_reminder: true },
        })
        .eq("id", profile.id);
      results.reminder++;
    } catch (err) {
      console.error("Trial reminder email failed:", err);
      results.errors++;
    }
  }

  // Trial expired emails — users created ~14 days ago
  const { data: expiredUsers } = await supabase
    .from("user_profiles")
    .select("id, created_at, lifecycle_emails_sent")
    .gte("created_at", `${expiredDateStr}T00:00:00Z`)
    .lt("created_at", `${expiredDateStr}T23:59:59Z`);

  for (const profile of expiredUsers || []) {
    const sent = (profile.lifecycle_emails_sent as Record<string, boolean>) || {};
    if (sent.trial_expired) continue;

    // Check they don't have an active subscription
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", profile.id)
      .eq("status", "active")
      .limit(1);

    if (subs && subs.length > 0) continue;

    const { data: userData } = await supabase.auth.admin.getUserById(profile.id);
    const email = userData?.user?.email;
    if (!email) continue;

    try {
      await sendTrialExpiredEmail(email);
      await supabase
        .from("user_profiles")
        .update({
          lifecycle_emails_sent: { ...sent, trial_expired: true },
        })
        .eq("id", profile.id);
      results.expired++;
    } catch (err) {
      console.error("Trial expired email failed:", err);
      results.errors++;
    }
  }

  return Response.json({ ok: true, ...results });
}
