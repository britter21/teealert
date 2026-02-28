import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
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
