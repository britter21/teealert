import type { Course, TeeTime } from "./types";

const FOREUP_BASE =
  "https://foreupsoftware.com/index.php/api/booking/times";

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

export async function pollForeUp(
  course: Course,
  targetDate: string
): Promise<TeeTime[]> {
  const params = new URLSearchParams({
    time: "all",
    date: targetDate, // MM-DD-YYYY
    holes: "all",
    players: "0",
    booking_class: course.platformBookingClass || "",
    schedule_id: course.platformScheduleId || "",
    "schedule_ids[]": course.platformScheduleId || "",
    specials_only: "0",
    api_key: "no_limits",
  });

  const resp = await fetch(`${FOREUP_BASE}?${params}`, {
    headers: { "User-Agent": course.uaOverride || IPHONE_UA },
    cache: "no-store",
  });

  if (!resp.ok) {
    throw new Error(`ForeUp ${resp.status}: ${await resp.text()}`);
  }

  const data = await resp.json();

  // ForeUp returns an array of tee time objects
  if (!Array.isArray(data)) return [];

  return data.map((slot: Record<string, unknown>) => ({
    time: String(slot.time || "").slice(0, 5), // "08:30:00" → "08:30"
    holes: Number(slot.holes) || 18,
    availableSpots: Number(slot.available_spots) || 0,
    greenFee: Number(slot.green_fee) || 0,
    cartFee: Number(slot.cart_fee) || 0,
    raw: slot,
  }));
}
