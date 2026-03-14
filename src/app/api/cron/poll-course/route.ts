import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { createServiceClient } from "@/lib/supabase/server";
import { pollForeUp } from "@/lib/pollers/foreup";
import { pollChronogolf } from "@/lib/pollers/chronogolf";
import { diffAndDetectNew } from "@/lib/diff";
import { matchAndNotify } from "@/lib/matcher";
import type { Course, TeeTime } from "@/lib/pollers/types";

async function pollCourse(
  course: Course,
  targetDate: string
): Promise<TeeTime[]> {
  switch (course.platform) {
    case "foreup": {
      const [y, m, d] = targetDate.split("-");
      return pollForeUp(course, `${m}-${d}-${y}`);
    }
    case "chronogolf":
      return pollChronogolf(course, targetDate);
    default:
      throw new Error(`Unknown platform: ${course.platform}`);
  }
}

interface PollCourseBody {
  courseId: string;
  courseName: string;
  date: string;
}

async function handler(request: Request) {
  const start = Date.now();
  const body: PollCourseBody = await request.json();
  const { courseId, date } = body;

  const supabase = createServiceClient();

  const { data: course, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .eq("is_active", true)
    .single();

  if (error || !course) {
    return Response.json({ error: "Course not found or inactive" }, { status: 404 });
  }

  try {
    const times = await pollCourse(course as Course, date);
    const { newTimes, changed } = await diffAndDetectNew(course.id, date, times);

    let notifications: { alertId: string; matched: number }[] = [];
    if (newTimes.length > 0) {
      notifications = await matchAndNotify(
        course.id,
        course.name,
        date,
        newTimes,
        course.platform,
        course.platform_course_id,
        course.booking_slug,
        course.platform_schedule_id
      );
    }

    // Log successful poll — include snapshot when availability changed (arrivals or departures)
    await supabase.from("poll_results").insert({
      course_id: course.id,
      course_name: course.name,
      target_date: date,
      platform: course.platform,
      status: "success",
      tee_times_found: times.length,
      new_times_found: newTimes.length,
      notifications_sent: notifications.length,
      duration_ms: Date.now() - start,
      tee_time_snapshot: changed ? times : null,
    });

    return Response.json({
      course: course.name,
      date,
      totalTimes: times.length,
      newTimes: newTimes.length,
      notifications: notifications.length,
    });
  } catch (err) {
    console.error(`Poll failed for ${course.name} on ${date}:`, err);

    // Log failed poll
    await supabase.from("poll_results").insert({
      course_id: course.id,
      course_name: course.name,
      target_date: date,
      platform: course.platform,
      status: "error",
      error_message: (err as Error).message,
      duration_ms: Date.now() - start,
    });

    return Response.json(
      { course: course.name, date, error: (err as Error).message },
      { status: 502 }
    );
  }
}

export const POST = verifySignatureAppRouter(handler);
