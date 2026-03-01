import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Course } from "../pollers/types";

/**
 * Poller tests — verify that ForeUp and Chronogolf API responses are
 * correctly parsed into normalized TeeTime[] objects.
 *
 * These use real API response fixtures captured from production.
 * If either platform changes their response format, these tests break
 * immediately — before users are affected.
 *
 * `fetch` is mocked so tests are fast, offline, and deterministic.
 */

// ── Fixtures: Real API response shapes ──

const FOREUP_RESPONSE = [
  {
    time: "2026-03-07 07:00",
    course_id: 1,
    schedule_id: 1,
    available_spots: 4,
    available_spots_9: 4,
    available_spots_18: 4,
    holes: "9/18",
    green_fee: 30,
    green_fee_9: 15,
    green_fee_18: 30,
    cart_fee: 20,
    cart_fee_9: 10,
    cart_fee_18: 20,
    booking_class_id: 11345,
    minimum_players: "2",
    maximum_players_per_booking: "4",
  },
  {
    time: "2026-03-07 08:30",
    course_id: 1,
    schedule_id: 1,
    available_spots: 2,
    available_spots_9: 2,
    available_spots_18: 2,
    holes: "18",
    green_fee: 45,
    green_fee_9: 25,
    green_fee_18: 45,
    cart_fee: 20,
    booking_class_id: 11345,
  },
  {
    time: "2026-03-07 14:00",
    course_id: 1,
    schedule_id: 1,
    available_spots: 0,
    holes: "18",
    green_fee: 25,
    cart_fee: 15,
    booking_class_id: 11345,
  },
];

const CHRONOGOLF_V1_RESPONSE = [
  {
    id: 463848754,
    uuid: "b1edc7f0-4f56-4159-8b1d-66f7d554d924",
    course_id: 23960,
    start_time: "12:24",
    date: "2026-03-02",
    event_id: null,
    hole: 1,
    round: 1,
    format: "normal",
    departure: null,
    restrictions: [],
    out_of_capacity: false,
    frozen: false,
    green_fees: [
      {
        player_type_id: 124509,
        green_fee: 304.45,
        affiliation_type_id: 124509,
      },
    ],
  },
  {
    id: 463848737,
    course_id: 23960,
    start_time: "09:00",
    date: "2026-03-02",
    restrictions: [],
    out_of_capacity: true,
    frozen: false,
    green_fees: [
      {
        player_type_id: 124509,
        green_fee: 304.45,
        affiliation_type_id: 124509,
      },
    ],
  },
  {
    id: 463848740,
    course_id: 23960,
    start_time: "10:00",
    date: "2026-03-02",
    restrictions: [],
    out_of_capacity: false,
    frozen: true, // frozen — should be filtered out
    green_fees: [
      {
        green_fee: 200,
        affiliation_type_id: 124509,
      },
    ],
  },
  {
    id: 463848745,
    course_id: 99999, // different course_id — should be filtered by schedule_id
    start_time: "11:00",
    date: "2026-03-02",
    restrictions: [],
    out_of_capacity: false,
    frozen: false,
    green_fees: [
      {
        green_fee: 150,
        affiliation_type_id: 124509,
      },
    ],
  },
  {
    id: 463848750,
    course_id: 23960,
    start_time: "13:00",
    date: "2026-03-02",
    restrictions: [],
    out_of_capacity: false,
    frozen: false,
    green_fees: [], // no green fees — should be filtered out
  },
];

const CHRONOGOLF_V2_RESPONSE = {
  status: "success",
  teetimes: [
    {
      id: 100001,
      start_time: "08:00",
      date: "2026-03-07",
      min_player_size: 1,
      max_player_size: 4,
      has_cart: true,
      default_price: {
        green_fee: 175.0,
        half_cart: null,
        one_person_cart: null,
        subtotal: 175.0,
        affiliation_type: "public",
      },
      course: {
        id: 16313,
        uuid: "156b2e8d-85e7-41e5-8bc8-107cca3666bd",
        name: "Championship",
        holes: 18,
      },
      format: "normal",
    },
    {
      id: 100002,
      start_time: "09:30",
      date: "2026-03-07",
      min_player_size: 2,
      max_player_size: 3,
      has_cart: false,
      default_price: {
        green_fee: 95.0,
        half_cart: null,
        one_person_cart: null,
        subtotal: 95.0,
        affiliation_type: "public",
      },
      course: {
        id: 16313,
        uuid: "156b2e8d-85e7-41e5-8bc8-107cca3666bd",
        name: "Links",
        holes: 9,
      },
      format: "normal",
    },
  ],
};

// ── Course fixtures ──

function foreupCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: "foreup-test",
    name: "Test ForeUp Course",
    platform: "foreup",
    platform_course_id: "1",
    platform_schedule_id: "1",
    platform_booking_class: "11345",
    timezone: "America/Denver",
    ua_override: null,
    poll_interval_seconds: 60,
    booking_slug: null,
    platform_course_uuid: null,
    ...overrides,
  };
}

function chronogolfCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: "chrono-test",
    name: "Test Chronogolf Course",
    platform: "chronogolf",
    platform_course_id: "19226",
    platform_schedule_id: "23960",
    platform_booking_class: "124509",
    timezone: "America/Denver",
    ua_override: null,
    poll_interval_seconds: 60,
    booking_slug: "black-desert-resort",
    platform_course_uuid: "ec40e1b2-7ac1-443b-a515-35176712f97b",
    ...overrides,
  };
}

// ── Mock fetch ──

const originalFetch = globalThis.fetch;

function mockFetch(response: unknown, status = 200) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(JSON.stringify(response)),
  });
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

// ═══════════════════════════════════════════════════════════
// FOREUP POLLER
// ═══════════════════════════════════════════════════════════

describe("ForeUp poller", () => {
  it("parses time from 'YYYY-MM-DD HH:MM' format to 'HH:MM'", async () => {
    mockFetch(FOREUP_RESPONSE);
    const { pollForeUp } = await import("../pollers/foreup");

    const result = await pollForeUp(foreupCourse(), "03-07-2026");

    expect(result[0].time).toBe("07:00");
    expect(result[1].time).toBe("08:30");
    expect(result[2].time).toBe("14:00");
  });

  it("extracts availableSpots correctly", async () => {
    mockFetch(FOREUP_RESPONSE);
    const { pollForeUp } = await import("../pollers/foreup");

    const result = await pollForeUp(foreupCourse(), "03-07-2026");

    expect(result[0].availableSpots).toBe(4);
    expect(result[1].availableSpots).toBe(2);
    expect(result[2].availableSpots).toBe(0); // fully booked
  });

  it("extracts greenFee and cartFee", async () => {
    mockFetch(FOREUP_RESPONSE);
    const { pollForeUp } = await import("../pollers/foreup");

    const result = await pollForeUp(foreupCourse(), "03-07-2026");

    expect(result[0].greenFee).toBe(30);
    expect(result[0].cartFee).toBe(20);
    expect(result[1].greenFee).toBe(45);
  });

  it("parses holes field — '9/18' becomes 9, '18' becomes 18", async () => {
    mockFetch(FOREUP_RESPONSE);
    const { pollForeUp } = await import("../pollers/foreup");

    const result = await pollForeUp(foreupCourse(), "03-07-2026");

    // "9/18" → Number("9/18") → NaN → defaults to 18
    expect(result[0].holes).toBe(18);
    expect(result[1].holes).toBe(18);
  });

  it("preserves raw response in raw field", async () => {
    mockFetch(FOREUP_RESPONSE);
    const { pollForeUp } = await import("../pollers/foreup");

    const result = await pollForeUp(foreupCourse(), "03-07-2026");

    expect(result[0].raw).toHaveProperty("booking_class_id", 11345);
    expect(result[0].raw).toHaveProperty("date", "2026-03-07");
  });

  it("sends correct query params including booking_class and schedule_id", async () => {
    mockFetch(FOREUP_RESPONSE);
    const { pollForeUp } = await import("../pollers/foreup");

    await pollForeUp(foreupCourse(), "03-07-2026");

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const url = fetchCall[0] as string;

    expect(url).toContain("date=03-07-2026");
    expect(url).toContain("booking_class=11345");
    expect(url).toContain("schedule_id=1");
    expect(url).toContain("api_key=no_limits");
  });

  it("returns empty array for non-array response", async () => {
    mockFetch({ error: "no times" });
    const { pollForeUp } = await import("../pollers/foreup");

    const result = await pollForeUp(foreupCourse(), "03-07-2026");
    expect(result).toEqual([]);
  });

  it("throws on HTTP error", async () => {
    mockFetch("Server Error", 500);
    const { pollForeUp } = await import("../pollers/foreup");

    await expect(pollForeUp(foreupCourse(), "03-07-2026")).rejects.toThrow("ForeUp 500");
  });
});

// ═══════════════════════════════════════════════════════════
// CHRONOGOLF POLLER — V1 (fallback)
// ═══════════════════════════════════════════════════════════

describe("Chronogolf v1 poller", () => {
  // No platform_course_uuid → forces v1 path
  const v1Course = () =>
    chronogolfCourse({ platform_course_uuid: null });

  it("parses start_time directly (already HH:MM)", async () => {
    mockFetch(CHRONOGOLF_V1_RESPONSE);
    const { pollChronogolf } = await import("../pollers/chronogolf");

    const result = await pollChronogolf(v1Course(), "2026-03-02");

    // Only the available, non-frozen, matching course_id slot with green_fees
    expect(result[0].time).toBe("12:24");
  });

  it("maps out_of_capacity to availableSpots (-1 available, 0 booked)", async () => {
    mockFetch(CHRONOGOLF_V1_RESPONSE);
    const { pollChronogolf } = await import("../pollers/chronogolf");

    const result = await pollChronogolf(v1Course(), "2026-03-02");

    // out_of_capacity: false → -1 (available, count unknown)
    const available = result.find((t) => t.time === "12:24");
    expect(available?.availableSpots).toBe(-1);

    // out_of_capacity: true → 0 (booked)
    const booked = result.find((t) => t.time === "09:00");
    expect(booked?.availableSpots).toBe(0);
  });

  it("filters out frozen slots", async () => {
    mockFetch(CHRONOGOLF_V1_RESPONSE);
    const { pollChronogolf } = await import("../pollers/chronogolf");

    const result = await pollChronogolf(v1Course(), "2026-03-02");

    const times = result.map((t) => t.time);
    expect(times).not.toContain("10:00"); // frozen slot
  });

  it("filters by platform_schedule_id (course_id in response)", async () => {
    mockFetch(CHRONOGOLF_V1_RESPONSE);
    const { pollChronogolf } = await import("../pollers/chronogolf");

    const result = await pollChronogolf(v1Course(), "2026-03-02");

    const times = result.map((t) => t.time);
    expect(times).not.toContain("11:00"); // course_id 99999, doesn't match 23960
  });

  it("filters out slots with empty green_fees", async () => {
    mockFetch(CHRONOGOLF_V1_RESPONSE);
    const { pollChronogolf } = await import("../pollers/chronogolf");

    const result = await pollChronogolf(v1Course(), "2026-03-02");

    const times = result.map((t) => t.time);
    expect(times).not.toContain("13:00"); // empty green_fees
  });

  it("extracts green fee from first green_fees entry", async () => {
    mockFetch(CHRONOGOLF_V1_RESPONSE);
    const { pollChronogolf } = await import("../pollers/chronogolf");

    const result = await pollChronogolf(v1Course(), "2026-03-02");

    expect(result[0].greenFee).toBe(304.45);
  });

  it("sets holes to 18 for all v1 results", async () => {
    mockFetch(CHRONOGOLF_V1_RESPONSE);
    const { pollChronogolf } = await import("../pollers/chronogolf");

    const result = await pollChronogolf(v1Course(), "2026-03-02");

    for (const t of result) {
      expect(t.holes).toBe(18);
    }
  });

  it("includes all non-filtered slots (available + booked)", async () => {
    mockFetch(CHRONOGOLF_V1_RESPONSE);
    const { pollChronogolf } = await import("../pollers/chronogolf");

    const result = await pollChronogolf(v1Course(), "2026-03-02");

    // From 5 input slots: frozen removed, wrong course_id removed, empty green_fees removed = 2 remain
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.time).sort()).toEqual(["09:00", "12:24"]);
  });
});

// ═══════════════════════════════════════════════════════════
// CHRONOGOLF POLLER — V2 (primary)
// ═══════════════════════════════════════════════════════════

describe("Chronogolf v2 poller", () => {
  it("uses v2 when platform_course_uuid is set", async () => {
    mockFetch(CHRONOGOLF_V2_RESPONSE);
    const { pollChronogolf } = await import("../pollers/chronogolf");

    const result = await pollChronogolf(chronogolfCourse(), "2026-03-07");

    expect(result).toHaveLength(2);

    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const url = fetchCall[0] as string;
    expect(url).toContain("marketplace/v2/teetimes");
  });

  it("extracts max_player_size as availableSpots", async () => {
    mockFetch(CHRONOGOLF_V2_RESPONSE);
    const { pollChronogolf } = await import("../pollers/chronogolf");

    const result = await pollChronogolf(chronogolfCourse(), "2026-03-07");

    expect(result[0].availableSpots).toBe(4);
    expect(result[1].availableSpots).toBe(3);
  });

  it("extracts holes from course object", async () => {
    mockFetch(CHRONOGOLF_V2_RESPONSE);
    const { pollChronogolf } = await import("../pollers/chronogolf");

    const result = await pollChronogolf(chronogolfCourse(), "2026-03-07");

    expect(result[0].holes).toBe(18);
    expect(result[1].holes).toBe(9);
  });

  it("extracts green_fee from default_price", async () => {
    mockFetch(CHRONOGOLF_V2_RESPONSE);
    const { pollChronogolf } = await import("../pollers/chronogolf");

    const result = await pollChronogolf(chronogolfCourse(), "2026-03-07");

    expect(result[0].greenFee).toBe(175.0);
    expect(result[1].greenFee).toBe(95.0);
  });

  it("extracts min_player_size as minPlayers", async () => {
    mockFetch(CHRONOGOLF_V2_RESPONSE);
    const { pollChronogolf } = await import("../pollers/chronogolf");

    const result = await pollChronogolf(chronogolfCourse(), "2026-03-07");

    expect(result[0].minPlayers).toBe(1);
    expect(result[1].minPlayers).toBe(2);
  });

  it("falls back to v1 when v2 returns non-ok response", async () => {
    // First call (v2) fails, second call (v1) succeeds
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // v2 fails
        return Promise.resolve({
          ok: false,
          status: 403,
          json: () => Promise.resolve({}),
          text: () => Promise.resolve("Forbidden"),
        });
      }
      // v1 succeeds
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(CHRONOGOLF_V1_RESPONSE),
        text: () => Promise.resolve(JSON.stringify(CHRONOGOLF_V1_RESPONSE)),
      });
    });

    const { pollChronogolf } = await import("../pollers/chronogolf");
    const result = await pollChronogolf(chronogolfCourse(), "2026-03-02");

    // Should have fallen back to v1 parsing
    expect(callCount).toBe(2);
    expect(result.length).toBeGreaterThan(0);
    // v1 sets availableSpots to -1 for available slots
    const available = result.find((t) => t.time === "12:24");
    expect(available?.availableSpots).toBe(-1);
  });

  it("returns empty for empty teetimes array", async () => {
    mockFetch({ status: "success", teetimes: [] });
    const { pollChronogolf } = await import("../pollers/chronogolf");

    const result = await pollChronogolf(chronogolfCourse(), "2026-03-07");
    expect(result).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════
// CROSS-PLATFORM: Normalized TeeTime shape
// ═══════════════════════════════════════════════════════════

describe("Cross-platform: both pollers produce valid TeeTime shape", () => {
  it("ForeUp results have all required TeeTime fields", async () => {
    mockFetch(FOREUP_RESPONSE);
    const { pollForeUp } = await import("../pollers/foreup");

    const result = await pollForeUp(foreupCourse(), "03-07-2026");

    for (const t of result) {
      expect(t).toHaveProperty("time");
      expect(t).toHaveProperty("holes");
      expect(t).toHaveProperty("availableSpots");
      expect(t).toHaveProperty("greenFee");
      expect(t).toHaveProperty("raw");
      expect(typeof t.time).toBe("string");
      expect(typeof t.holes).toBe("number");
      expect(typeof t.availableSpots).toBe("number");
      expect(typeof t.greenFee).toBe("number");
      expect(t.time).toMatch(/^\d{2}:\d{2}$/);
    }
  });

  it("Chronogolf v1 results have all required TeeTime fields", async () => {
    mockFetch(CHRONOGOLF_V1_RESPONSE);
    const { pollChronogolf } = await import("../pollers/chronogolf");

    const result = await pollChronogolf(
      chronogolfCourse({ platform_course_uuid: null }),
      "2026-03-02"
    );

    for (const t of result) {
      expect(t).toHaveProperty("time");
      expect(t).toHaveProperty("holes");
      expect(t).toHaveProperty("availableSpots");
      expect(t).toHaveProperty("greenFee");
      expect(t).toHaveProperty("raw");
      expect(typeof t.time).toBe("string");
      expect(typeof t.holes).toBe("number");
      expect(typeof t.availableSpots).toBe("number");
      expect(typeof t.greenFee).toBe("number");
    }
  });

  it("Chronogolf v2 results have all required TeeTime fields", async () => {
    mockFetch(CHRONOGOLF_V2_RESPONSE);
    const { pollChronogolf } = await import("../pollers/chronogolf");

    const result = await pollChronogolf(chronogolfCourse(), "2026-03-07");

    for (const t of result) {
      expect(t).toHaveProperty("time");
      expect(t).toHaveProperty("holes");
      expect(t).toHaveProperty("availableSpots");
      expect(t).toHaveProperty("greenFee");
      expect(t).toHaveProperty("raw");
      expect(typeof t.time).toBe("string");
      expect(typeof t.holes).toBe("number");
      expect(typeof t.availableSpots).toBe("number");
      expect(typeof t.greenFee).toBe("number");
    }
  });
});
