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
