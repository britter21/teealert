import { createClient } from "@/lib/supabase/server";
import { canCreateAlert, canUseChannel } from "@/lib/subscription";
import { alertRateLimit, rateLimitResponse } from "@/lib/rate-limit";
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
    .select("*, courses(name, platform, location_city, location_state)")
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
        error: `Alert limit reached (${quota.current}/${quota.limit}). Upgrade to ${quota.tier === "free" ? "Pro" : "Birdie"} for more alerts.`,
        code: "ALERT_LIMIT",
        tier: quota.tier,
        current: quota.current,
        limit: quota.limit,
      },
      { status: 403 }
    );
  }

  const body = await request.json();

  // Validate notification channels against tier
  if (body.notify_sms && !(await canUseChannel(user.id, "sms"))) {
    return Response.json(
      {
        error: "SMS notifications require a Pro or Birdie plan.",
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
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data, { status: 201 });
}
