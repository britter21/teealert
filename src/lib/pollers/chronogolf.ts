import type { Course, TeeTime } from "./types";

const CHRONOGOLF_BASE =
  "https://www.chronogolf.com/marketplace/v2/teetimes";

export async function pollChronogolf(
  course: Course,
  targetDate: string
): Promise<TeeTime[]> {
  const params = new URLSearchParams({
    start_date: targetDate, // YYYY-MM-DD
    course_ids: course.platformCourseId,
    holes: "9,18",
    page: "1",
  });

  const resp = await fetch(`${CHRONOGOLF_BASE}?${params}`, {
    cache: "no-store",
  });

  if (!resp.ok) {
    throw new Error(`Chronogolf ${resp.status}: ${await resp.text()}`);
  }

  const data = await resp.json();
  const teetimes = data.teetimes || [];

  return teetimes.map((slot: Record<string, unknown>) => ({
    time: String(slot.start_time || "").slice(11, 16), // ISO → "08:30"
    holes: Number(slot.holes) || 18,
    availableSpots: Number(slot.available_spots) || 0,
    greenFee: Number(slot.green_fee) || 0,
    raw: slot,
  }));
}
