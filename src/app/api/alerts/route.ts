import { createClient } from "@/lib/supabase/server";
import { canCreateAlert, canUseChannel } from "@/lib/subscription";
import { alertRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getPostHogServer } from "@/lib/posthog";
import { NextRequest } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await alertRateLimit.limit(user.id);
  if (!rl.success) return rateLimitResponse(rl.reset);

  const { data, error } = await supabase
    .from("alerts")
    .select("*, courses(name, platform, platform_course_id, platform_schedule_id, booking_slug, location_city, location_state)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await alertRateLimit.limit(user.id);
  if (!rl.success) return rateLimitResponse(rl.reset);

  // Check alert quota
  const quota = await canCreateAlert(user.id);
  if (!quota.allowed) {
    return Response.json(
      {
        error: `Alert limit reached (${quota.current}/${quota.limit}). Upgrade to Unlimited for more alerts.`,
        code: "ALERT_LIMIT",
        tier: quota.tier,
        current: quota.current,
        limit: quota.limit,
      },
      { status: 403 }
    );
  }

  const body = await request.json();

  // Input validation
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!body.course_id || !UUID_RE.test(body.course_id)) {
    return Response.json({ error: "Invalid course_id" }, { status: 400 });
  }
  if (!body.target_date || !DATE_RE.test(body.target_date)) {
    return Response.json({ error: "Invalid target_date (YYYY-MM-DD)" }, { status: 400 });
  }
  if (body.earliest_time && !TIME_RE.test(body.earliest_time)) {
    return Response.json({ error: "Invalid earliest_time (HH:MM)" }, { status: 400 });
  }
  if (body.latest_time && !TIME_RE.test(body.latest_time)) {
    return Response.json({ error: "Invalid latest_time (HH:MM)" }, { status: 400 });
  }
  if (body.min_players != null && (body.min_players < 1 || body.min_players > 4)) {
    return Response.json({ error: "min_players must be 1-4" }, { status: 400 });
  }
  if (body.start_monitoring_date && !DATE_RE.test(body.start_monitoring_date)) {
    return Response.json({ error: "Invalid start_monitoring_date (YYYY-MM-DD)" }, { status: 400 });
  }

  if (body.recurrence_window_days != null && (body.recurrence_window_days < 1 || body.recurrence_window_days > 90)) {
    return Response.json({ error: "recurrence_window_days must be 1-90" }, { status: 400 });
  }

  // Recurring alerts require Unlimited plan
  if (body.is_recurring) {
    const tier = (await canCreateAlert(user.id)).tier;
    if (tier === "starter") {
      return Response.json(
        {
          error: "Recurring alerts require the Unlimited plan.",
          code: "RECURRING_RESTRICTED",
        },
        { status: 403 }
      );
    }
  }

  // Validate notification channels against tier
  if (body.notify_sms && !(await canUseChannel(user.id, "sms"))) {
    return Response.json(
      {
        error: "SMS notifications require an active subscription.",
        code: "CHANNEL_RESTRICTED",
      },
      { status: 403 }
    );
  }

  const { data, error } = await supabase
    .from("alerts")
    .insert({
      user_id: user.id,
      course_id: body.course_id,
      target_date: body.target_date,
      earliest_time: body.earliest_time || null,
      latest_time: body.latest_time || null,
      min_players: body.min_players || 1,
      max_price: body.max_price || null,
      holes: body.holes || null,
      notify_sms: body.notify_sms ?? false,
      notify_email: body.notify_email ?? true,
      start_monitoring_date: body.start_monitoring_date || body.target_date,
      is_recurring: body.is_recurring ?? false,
      recurrence_days: body.recurrence_days || null,
      recurrence_window_days: body.recurrence_window_days || 30,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  getPostHogServer()?.capture({
    distinctId: user.id,
    event: "alert_created",
    properties: {
      course_id: body.course_id,
      is_recurring: body.is_recurring ?? false,
      notify_email: body.notify_email ?? true,
      notify_push: body.notify_push ?? false,
    },
  });

  return Response.json(data, { status: 201 });
}
