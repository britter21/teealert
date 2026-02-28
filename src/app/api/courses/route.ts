import { createServiceClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim() || "";
  const state = searchParams.get("state")?.trim() || "";
  const limit = Math.min(Number(searchParams.get("limit")) || 24, 100);
  const offset = Number(searchParams.get("offset")) || 0;

  const supabase = createServiceClient();

  let query = supabase
    .from("courses")
    .select("id, name, platform, location_city, location_state, timezone, booking_window_days, is_active", { count: "exact" })
    .eq("is_active", true);

  if (q) {
    // Search by name or city using ilike (trigram index speeds this up)
    query = query.or(`name.ilike.%${q}%,location_city.ilike.%${q}%`);
  }

  if (state) {
    query = query.eq("location_state", state.toUpperCase());
  }

  query = query.order("name").range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ courses: data, total: count });
}
