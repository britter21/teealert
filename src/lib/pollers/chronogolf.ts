import type { Course, TeeTime } from "./types";

const CHRONOGOLF_DIRECT = "https://www.chronogolf.com/marketplace/clubs";
const RELAY_URL = process.env.CHRONOGOLF_RELAY_URL; // e.g. "http://your-mac:3456"
const RELAY_SECRET = process.env.CHRONOGOLF_RELAY_SECRET;

const DEFAULT_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

interface ChronogolfSlot {
  start_time: string; // "07:09"
  date: string; // "2026-03-01"
  course_id: number;
  out_of_capacity: boolean;
  frozen: boolean;
  green_fees: { green_fee: number; affiliation_type_id: number }[];
  restrictions: unknown[];
}

async function fetchTeetimes(
  course: Course,
  clubId: string,
  params: URLSearchParams
): Promise<Response> {
  // Use relay if configured (bypasses Cloudflare IP blocks on cloud providers)
  if (RELAY_URL && RELAY_SECRET) {
    const relayParams = new URLSearchParams(params);
    relayParams.set("club_id", clubId);
    return fetch(`${RELAY_URL}/teetimes?${relayParams}`, {
      headers: { "X-Relay-Secret": RELAY_SECRET },
      cache: "no-store",
    });
  }

  // Direct (works from residential IPs, blocked from cloud IPs)
  return fetch(`${CHRONOGOLF_DIRECT}/${clubId}/teetimes?${params}`, {
    headers: {
      "User-Agent": course.ua_override || DEFAULT_UA,
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: "https://www.chronogolf.com/",
      Origin: "https://www.chronogolf.com",
    },
    cache: "no-store",
  });
}

export async function pollChronogolf(
  course: Course,
  targetDate: string
): Promise<TeeTime[]> {
  const clubId = course.platform_course_id; // club_id stored here

  const params = new URLSearchParams({
    date: targetDate, // YYYY-MM-DD
    holes: "18",
  });

  if (course.platform_booking_class) {
    params.set("affiliation_type_ids", course.platform_booking_class);
  }

  const resp = await fetchTeetimes(course, clubId, params);

  if (!resp.ok) {
    throw new Error(`Chronogolf ${resp.status}: ${await resp.text()}`);
  }

  const slots: ChronogolfSlot[] = await resp.json();

  // Filter by specific course_id if platform_schedule_id is set
  const courseIdFilter = course.platform_schedule_id
    ? Number(course.platform_schedule_id)
    : null;

  return slots
    .filter((slot) => {
      if (courseIdFilter && slot.course_id !== courseIdFilter) return false;
      if (slot.frozen) return false;
      // Skip slots with no green fee data — they have restrictions
      // that make them unbookable for public users
      if (!slot.green_fees || slot.green_fees.length === 0) return false;
      return true;
    })
    .map((slot) => ({
      time: slot.start_time, // Already "HH:MM" format
      holes: 18,
      availableSpots: slot.out_of_capacity ? 0 : 4,
      greenFee: slot.green_fees[0].green_fee,
      raw: slot as unknown as Record<string, unknown>,
    }));
}
