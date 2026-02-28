import { createServiceClient } from "@/lib/supabase/server";
import { pollForeUp } from "@/lib/pollers/foreup";
import { pollChronogolf } from "@/lib/pollers/chronogolf";
import type { Course } from "@/lib/pollers/types";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const date = request.nextUrl.searchParams.get("date");
  const bookingClassOverride = request.nextUrl.searchParams.get("booking_class");

  if (!date) {
    return Response.json({ error: "date parameter required (YYYY-MM-DD)" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: course, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !course) {
    return Response.json({ error: "Course not found" }, { status: 404 });
  }

  // Allow overriding the booking class if it exists for this course
  if (bookingClassOverride) {
    const { count } = await supabase
      .from("course_booking_classes")
      .select("*", { count: "exact", head: true })
      .eq("course_id", id)
      .eq("platform_booking_class_id", bookingClassOverride);

    if (!count) {
      return Response.json({ error: "Invalid booking class" }, { status: 400 });
    }
    course.platform_booking_class = bookingClassOverride;
  }

  try {
    let times;
    switch (course.platform) {
      case "foreup": {
        const [y, m, d] = date.split("-");
        times = await pollForeUp(course as Course, `${m}-${d}-${y}`);
        break;
      }
      case "chronogolf":
        times = await pollChronogolf(course as Course, date);
        break;
      default:
        return Response.json({ error: "Unknown platform" }, { status: 400 });
    }

    return Response.json({
      course: course.name,
      date,
      times,
      count: times.length,
    });
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 502 }
    );
  }
}
