import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

const CATEGORIES = ["missing_course", "bug", "feature_request", "billing", "other"];

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.category || !CATEGORIES.includes(body.category)) {
    return Response.json(
      { error: "Invalid category" },
      { status: 400 }
    );
  }
  if (!body.subject || typeof body.subject !== "string" || body.subject.trim().length === 0) {
    return Response.json(
      { error: "Subject is required" },
      { status: 400 }
    );
  }
  if (!body.message || typeof body.message !== "string" || body.message.trim().length === 0) {
    return Response.json(
      { error: "Message is required" },
      { status: 400 }
    );
  }

  const metadata: Record<string, string> = {};
  if (body.booking_url) metadata.booking_url = String(body.booking_url).slice(0, 500);
  if (body.course_name) metadata.course_name = String(body.course_name).slice(0, 200);
  if (body.course_location) metadata.course_location = String(body.course_location).slice(0, 200);

  const { data, error } = await supabase
    .from("support_requests")
    .insert({
      user_id: user.id,
      category: body.category,
      subject: body.subject.trim().slice(0, 200),
      message: body.message.trim().slice(0, 5000),
      metadata,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data, { status: 201 });
}
