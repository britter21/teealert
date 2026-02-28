import { createServiceClient } from "@/lib/supabase/server";
import { pollForeUp } from "@/lib/pollers/foreup";
import { pollChronogolf } from "@/lib/pollers/chronogolf";
import { publicRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getRedis } from "@/lib/redis";
import type { Course, TeeTime } from "@/lib/pollers/types";
import { NextRequest } from "next/server";

const CACHE_TTL = 15; // seconds — matches client-side refresh interval

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchFromUpstream(course: any, date: string): Promise<TeeTime[]> {
  switch (course.platform) {
    case "foreup": {
      const [y, m, d] = date.split("-");
      return pollForeUp(course as Course, `${m}-${d}-${y}`);
    }
    case "chronogolf":
      return pollChronogolf(course as Course, date);
    default:
      throw new Error("Unknown platform");
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const rl = await publicRateLimit.limit(ip);
  if (!rl.success) return rateLimitResponse(rl.reset);
  const { id } = await params;
  const date = request.nextUrl.searchParams.get("date");
  const bookingClassOverride = request.nextUrl.searchParams.get("booking_class");

  if (!date) {
    return Response.json({ error: "date parameter required (YYYY-MM-DD)" }, { status: 400 });
  }

  // Check Redis cache first — all users share the same cached result
  const cacheKey = `avail:${id}:${date}:${bookingClassOverride || "default"}`;
  const redis = getRedis();

  try {
    const cached = await redis.get<string>(cacheKey);
    if (cached) {
      const data = typeof cached === "string" ? JSON.parse(cached) : cached;
      return Response.json(data, {
        headers: { "X-Cache": "HIT" },
      });
    }
  } catch {
    // Redis failure is non-fatal — fall through to upstream
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
    const times = await fetchFromUpstream(course, date);

    const payload = {
      course: course.name,
      date,
      times,
      count: times.length,
    };

    // Cache for 15 seconds — subsequent requests from other users get this instantly
    try {
      await redis.set(cacheKey, JSON.stringify(payload), { ex: CACHE_TTL });
    } catch {
      // Redis failure is non-fatal
    }

    return Response.json(payload, {
      headers: { "X-Cache": "MISS" },
    });
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 502 }
    );
  }
}
