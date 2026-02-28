import { createServiceClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("course_booking_classes")
    .select("platform_booking_class_id, name, is_default, is_protected")
    .eq("course_id", id)
    .order("is_default", { ascending: false })
    .order("name");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ bookingClasses: data || [] });
}
