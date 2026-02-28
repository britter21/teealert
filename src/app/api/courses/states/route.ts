import { createServiceClient } from "@/lib/supabase/server";
import { publicRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const rl = await publicRateLimit.limit(ip);
  if (!rl.success) return rateLimitResponse(rl.reset);
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("courses")
    .select("location_state")
    .eq("is_active", true)
    .not("location_state", "is", null)
    .not("location_state", "eq", "");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Deduplicate and sort
  const states = [...new Set((data || []).map((r) => r.location_state as string))]
    .filter(Boolean)
    .sort();

  return Response.json(states);
}
