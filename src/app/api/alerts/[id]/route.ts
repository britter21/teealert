import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Input validation
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

  if (body.target_date !== undefined && !DATE_RE.test(body.target_date)) {
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

  // Only allow updating specific fields
  const allowed: Record<string, unknown> = {};
  if (body.target_date !== undefined) allowed.target_date = body.target_date;
  if (body.earliest_time !== undefined)
    allowed.earliest_time = body.earliest_time || null;
  if (body.latest_time !== undefined)
    allowed.latest_time = body.latest_time || null;
  if (body.min_players !== undefined)
    allowed.min_players = Number(body.min_players) || 1;
  if (body.max_price !== undefined)
    allowed.max_price = body.max_price ? Number(body.max_price) : null;
  if (body.start_monitoring_date !== undefined)
    allowed.start_monitoring_date = body.start_monitoring_date || null;
  if (body.is_recurring !== undefined) allowed.is_recurring = body.is_recurring;
  if (body.recurrence_days !== undefined)
    allowed.recurrence_days = body.recurrence_days;
  if (body.recurrence_window_days !== undefined)
    allowed.recurrence_window_days = body.recurrence_window_days;
  if (body.is_active !== undefined) allowed.is_active = !!body.is_active;

  if (Object.keys(allowed).length === 0) {
    return Response.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("alerts")
    .update(allowed)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: RouteContext
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("alerts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
