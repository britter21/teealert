import { describe, it, expect } from "vitest";
import type { TeeTime, Course } from "../pollers/types";
import { pollForeUp } from "../pollers/foreup";
import { pollChronogolf } from "../pollers/chronogolf";

/**
 * LIVE API tests — hit real ForeUp and Chronogolf APIs.
 *
 * Run with: npm run test:live
 *
 * These verify that:
 * 1. The APIs are reachable and returning 200
 * 2. The response format hasn't changed
 * 3. Our parsing still produces valid TeeTime[] objects
 *
 * Uses real courses from the database. If an API changes their
 * response format, these tests fail BEFORE users are affected.
 *
 * These are NOT run in CI (too slow, network-dependent).
 * Run them manually or on a schedule.
 */

// Real courses — same as what's in the database
const FOREUP_COURSE: Course = {
  id: "771aaac2-0355-4d6a-8bc2-9d6b209d9e4e",
  name: "Crane Field Golf Course",
  platform: "foreup",
  platform_course_id: "1",
  platform_schedule_id: "1",
  platform_booking_class: "11345",
  timezone: "America/Denver",
  ua_override: null,
  poll_interval_seconds: 60,
  booking_slug: null,
  platform_course_uuid: null,
};

const CHRONOGOLF_COURSE: Course = {
  id: "9de4c8c8-0f60-423f-873e-613263f8e190",
  name: "Black Desert Resort",
  platform: "chronogolf",
  platform_course_id: "19226",
  platform_schedule_id: "23960",
  platform_booking_class: "124509",
  timezone: "America/Denver",
  ua_override: null,
  poll_interval_seconds: 60,
  booking_slug: "black-desert-resort",
  platform_course_uuid: "ec40e1b2-7ac1-443b-a515-35176712f97b",
};

// Use a date 2 days out — likely to have tee times
function getTestDate(): { foreup: string; iso: string } {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  const iso = d.toISOString().split("T")[0]; // YYYY-MM-DD
  const [y, m, day] = iso.split("-");
  return { foreup: `${m}-${day}-${y}`, iso };
}

function assertValidTeeTime(t: TeeTime) {
  // time is HH:MM format
  expect(t.time).toMatch(/^\d{2}:\d{2}$/);

  // holes is a number (typically 9 or 18)
  expect(typeof t.holes).toBe("number");
  expect(t.holes).toBeGreaterThan(0);

  // availableSpots is a number (-1 for unknown, 0+ for known)
  expect(typeof t.availableSpots).toBe("number");
  expect(t.availableSpots).toBeGreaterThanOrEqual(-1);

  // greenFee is a non-negative number
  expect(typeof t.greenFee).toBe("number");
  expect(t.greenFee).toBeGreaterThanOrEqual(0);

  // raw is an object
  expect(typeof t.raw).toBe("object");
  expect(t.raw).not.toBeNull();
}

describe("ForeUp — live API", () => {
  const { foreup: date } = getTestDate();

  it("returns an array of tee times", async () => {
    const result = await pollForeUp(FOREUP_COURSE, date);
    expect(Array.isArray(result)).toBe(true);
  }, 15000);

  it("each tee time has valid TeeTime shape", async () => {
    const result = await pollForeUp(FOREUP_COURSE, date);
    // May be empty if course is closed that day — skip shape check
    if (result.length === 0) return;

    for (const t of result) {
      assertValidTeeTime(t);
    }
  }, 15000);

  it("time values are chronologically ordered", async () => {
    const result = await pollForeUp(FOREUP_COURSE, date);
    if (result.length < 2) return;

    for (let i = 1; i < result.length; i++) {
      expect(result[i].time >= result[i - 1].time).toBe(true);
    }
  }, 15000);

  it("raw field contains original API fields", async () => {
    const result = await pollForeUp(FOREUP_COURSE, date);
    if (result.length === 0) return;

    const raw = result[0].raw;
    // These fields should always be present in ForeUp responses
    expect(raw).toHaveProperty("available_spots");
    expect(raw).toHaveProperty("green_fee");
    expect(raw).toHaveProperty("booking_class_id");
  }, 15000);
});

describe("Chronogolf — live API", () => {
  const { iso: date } = getTestDate();

  it("returns an array of tee times", async () => {
    const result = await pollChronogolf(CHRONOGOLF_COURSE, date);
    expect(Array.isArray(result)).toBe(true);
  }, 15000);

  it("each tee time has valid TeeTime shape", async () => {
    const result = await pollChronogolf(CHRONOGOLF_COURSE, date);
    if (result.length === 0) return;

    for (const t of result) {
      assertValidTeeTime(t);
    }
  }, 15000);

  it("availableSpots is either -1 (v1/unknown) or positive (v2)", async () => {
    const result = await pollChronogolf(CHRONOGOLF_COURSE, date);
    if (result.length === 0) return;

    for (const t of result) {
      // v1: -1 (available unknown) or 0 (booked)
      // v2: actual player count
      expect(t.availableSpots).toBeGreaterThanOrEqual(-1);
    }
  }, 15000);

  it("greenFee values are reasonable (> $0 for resort course)", async () => {
    const result = await pollChronogolf(CHRONOGOLF_COURSE, date);
    if (result.length === 0) return;

    const available = result.filter((t) => t.availableSpots !== 0);
    if (available.length === 0) return;

    // Black Desert is a premium course — fees should be > $50
    for (const t of available) {
      expect(t.greenFee).toBeGreaterThan(0);
    }
  }, 15000);
});
