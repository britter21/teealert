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
    specials_only: "0",
    api_key: "no_limits",
  });

  if (course.platform_booking_class) {
    params.set("booking_class", course.platform_booking_class);
  }
  if (course.platform_schedule_id) {
    params.set("schedule_id", course.platform_schedule_id);
    params.set("schedule_ids[]", course.platform_schedule_id);
  }

  let resp = await fetch(`${FOREUP_BASE}?${params}`, {
    headers: { "User-Agent": course.ua_override || IPHONE_UA },
    cache: "no-store",
  });

  // If a booking class returns 401 (restricted/auth-required), retry without it
  if (resp.status === 401 && course.platform_booking_class) {
    console.warn(
      `ForeUp 401 for booking_class ${course.platform_booking_class} on ${course.name} -- retrying without booking class`
    );
    params.delete("booking_class");
    resp = await fetch(`${FOREUP_BASE}?${params}`, {
      headers: { "User-Agent": course.ua_override || IPHONE_UA },
      cache: "no-store",
    });
  }

  if (!resp.ok) {
    throw new Error(`ForeUp ${resp.status}: ${await resp.text()}`);
  }

  const data = await resp.json();

  // ForeUp returns an array of tee time objects
  if (!Array.isArray(data)) return [];

  return data.map((slot: Record<string, unknown>) => ({
    time: String(slot.time || "").split(" ").pop()?.slice(0, 5) || "", // "2026-03-01 07:10" → "07:10"
    holes: Number(slot.holes) || 18,
    availableSpots: Number(slot.available_spots) || 0,
    greenFee: Number(slot.green_fee) || 0,
    cartFee: Number(slot.cart_fee) || 0,
    raw: { ...slot, date: String(slot.time || "").split(" ")[0] },
  }));
}
