import type { Course, TeeTime } from "./types";

const CHRONOGOLF_V2 = "https://www.chronogolf.com/marketplace/v2/teetimes";
const CHRONOGOLF_V1 = "https://www.chronogolf.com/marketplace/clubs";
const RELAY_URL = process.env.CHRONOGOLF_RELAY_URL;
const RELAY_SECRET = process.env.CHRONOGOLF_RELAY_SECRET;

const DEFAULT_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

const HEADERS = (ua?: string | null) => ({
  "User-Agent": ua || DEFAULT_UA,
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.chronogolf.com/",
  Origin: "https://www.chronogolf.com",
});

// v2 API response shape
interface ChronogolfV2Response {
  status: string;
  teetimes: ChronogolfV2Slot[];
}

interface ChronogolfV2Slot {
  id: number;
  start_time: string;
  date: string;
  min_player_size: number;
  max_player_size: number;
  has_cart: boolean;
  default_price: {
    green_fee: number;
    half_cart: number | null;
    one_person_cart: number | null;
    subtotal: number;
    affiliation_type: string;
  };
  course: {
    id: number;
    uuid: string;
    name: string;
    holes: number;
  };
  format: string;
}

// v1 API response shape (fallback)
interface ChronogolfV1Slot {
  start_time: string;
  date: string;
  course_id: number;
  out_of_capacity: boolean;
  frozen: boolean;
  green_fees: { green_fee: number; affiliation_type_id: number }[];
  restrictions: unknown[];
}

async function fetchV2(
  course: Course,
  targetDate: string
): Promise<TeeTime[] | null> {
  const courseUuid = course.platform_course_uuid;
  if (!courseUuid) return null;

  const params = new URLSearchParams({
    start_date: targetDate,
    course_ids: courseUuid,
    holes: "9,18",
    page: "1",
  });

  if (RELAY_URL && RELAY_SECRET) {
    const relayParams = new URLSearchParams(params);
    relayParams.set("version", "v2");
    const resp = await fetch(`${RELAY_URL}/teetimes?${relayParams}`, {
      headers: { "X-Relay-Secret": RELAY_SECRET },
      cache: "no-store",
    });
    if (!resp.ok) return null;
    const data: ChronogolfV2Response = await resp.json();
    return mapV2(data);
  }

  const resp = await fetch(`${CHRONOGOLF_V2}?${params}`, {
    headers: HEADERS(course.ua_override),
    cache: "no-store",
  });

  if (!resp.ok) return null;
  const data: ChronogolfV2Response = await resp.json();
  return mapV2(data);
}

function mapV2(data: ChronogolfV2Response): TeeTime[] {
  if (!data.teetimes) return [];
  return data.teetimes.map((slot) => ({
    time: slot.start_time,
    holes: slot.course?.holes || 18,
    availableSpots: slot.max_player_size,
    minPlayers: slot.min_player_size,
    greenFee: slot.default_price.green_fee,
    raw: slot as unknown as Record<string, unknown>,
  }));
}

async function fetchV1(
  course: Course,
  targetDate: string
): Promise<TeeTime[]> {
  const clubId = course.platform_course_id;
  const params = new URLSearchParams({
    date: targetDate,
    holes: "18",
  });

  if (course.platform_booking_class) {
    params.set("affiliation_type_ids", course.platform_booking_class);
  }

  let resp: Response;
  if (RELAY_URL && RELAY_SECRET) {
    const relayParams = new URLSearchParams(params);
    relayParams.set("club_id", clubId);
    resp = await fetch(`${RELAY_URL}/teetimes?${relayParams}`, {
      headers: { "X-Relay-Secret": RELAY_SECRET },
      cache: "no-store",
    });
  } else {
    resp = await fetch(`${CHRONOGOLF_V1}/${clubId}/teetimes?${params}`, {
      headers: HEADERS(course.ua_override),
      cache: "no-store",
    });
  }

  if (!resp.ok) {
    throw new Error(`Chronogolf ${resp.status}: ${await resp.text()}`);
  }

  const slots: ChronogolfV1Slot[] = await resp.json();

  const courseIdFilter = course.platform_schedule_id
    ? Number(course.platform_schedule_id)
    : null;

  return slots
    .filter((slot) => {
      if (courseIdFilter && slot.course_id !== courseIdFilter) return false;
      if (slot.frozen) return false;
      if (!slot.green_fees || slot.green_fees.length === 0) return false;
      return true;
    })
    .map((slot) => ({
      time: slot.start_time,
      holes: 18,
      availableSpots: slot.out_of_capacity ? 0 : -1,
      greenFee: slot.green_fees[0].green_fee,
      raw: slot as unknown as Record<string, unknown>,
    }));
}

export async function pollChronogolf(
  course: Course,
  targetDate: string
): Promise<TeeTime[]> {
  // Try v2 first (has player capacity data), fall back to v1
  const v2Result = await fetchV2(course, targetDate);
  if (v2Result !== null) return v2Result;
  return fetchV1(course, targetDate);
}
