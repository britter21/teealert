import { describe, it, expect, vi } from "vitest";

// Mock all external dependencies that matcher.ts imports at module level
vi.mock("../supabase/server", () => ({
  createServiceClient: () => ({}),
}));
vi.mock("../notifications/imessage", () => ({
  sendIMessage: vi.fn(),
}));
vi.mock("../notifications/email", () => ({
  sendAlertEmail: vi.fn(),
}));
vi.mock("../notifications/push", () => ({
  sendPushNotifications: vi.fn(),
}));

import { matchesAlert, type Alert } from "../matcher";
import type { TeeTime } from "../pollers/types";

// Helper to build a TeeTime with defaults
function teeTime(overrides: Partial<TeeTime> = {}): TeeTime {
  return {
    time: "08:30",
    holes: 18,
    availableSpots: 4,
    greenFee: 45,
    raw: {},
    ...overrides,
  };
}

// Helper to build an Alert with defaults
function alert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: "alert-1",
    user_id: "user-1",
    course_id: "course-1",
    target_date: "2026-03-07",
    earliest_time: null,
    latest_time: null,
    min_players: 1,
    max_price: null,
    holes: null,
    notify_sms: false,
    notify_email: true,
    notify_push: true,
    is_recurring: false,
    recurrence_days: null,
    user_profiles: null,
    ...overrides,
  };
}

describe("matchesAlert", () => {
  describe("time range filtering", () => {
    it("matches when no time constraints set", () => {
      expect(matchesAlert(teeTime({ time: "06:00" }), alert())).toBe(true);
      expect(matchesAlert(teeTime({ time: "18:00" }), alert())).toBe(true);
    });

    it("filters out times before earliest_time", () => {
      const a = alert({ earliest_time: "08:00" });
      expect(matchesAlert(teeTime({ time: "07:59" }), a)).toBe(false);
      expect(matchesAlert(teeTime({ time: "08:00" }), a)).toBe(true);
      expect(matchesAlert(teeTime({ time: "08:01" }), a)).toBe(true);
    });

    it("filters out times after latest_time", () => {
      const a = alert({ latest_time: "14:00" });
      expect(matchesAlert(teeTime({ time: "13:59" }), a)).toBe(true);
      expect(matchesAlert(teeTime({ time: "14:00" }), a)).toBe(true);
      expect(matchesAlert(teeTime({ time: "14:01" }), a)).toBe(false);
    });

    it("handles both earliest and latest together", () => {
      const a = alert({ earliest_time: "07:00", latest_time: "10:00" });
      expect(matchesAlert(teeTime({ time: "06:59" }), a)).toBe(false);
      expect(matchesAlert(teeTime({ time: "07:00" }), a)).toBe(true);
      expect(matchesAlert(teeTime({ time: "08:30" }), a)).toBe(true);
      expect(matchesAlert(teeTime({ time: "10:00" }), a)).toBe(true);
      expect(matchesAlert(teeTime({ time: "10:01" }), a)).toBe(false);
    });

    it("uses lexicographic comparison (HH:MM format)", () => {
      const a = alert({ earliest_time: "09:00", latest_time: "15:00" });
      expect(matchesAlert(teeTime({ time: "09:00" }), a)).toBe(true);
      expect(matchesAlert(teeTime({ time: "12:30" }), a)).toBe(true);
      expect(matchesAlert(teeTime({ time: "15:00" }), a)).toBe(true);
    });
  });

  describe("available spots filtering", () => {
    it("matches when spots >= min_players", () => {
      const a = alert({ min_players: 2 });
      expect(matchesAlert(teeTime({ availableSpots: 2 }), a)).toBe(true);
      expect(matchesAlert(teeTime({ availableSpots: 4 }), a)).toBe(true);
    });

    it("rejects when spots < min_players", () => {
      const a = alert({ min_players: 3 });
      expect(matchesAlert(teeTime({ availableSpots: 2 }), a)).toBe(false);
      expect(matchesAlert(teeTime({ availableSpots: 0 }), a)).toBe(false);
    });

    it("treats -1 (unknown spots from Chronogolf) as matching", () => {
      const a = alert({ min_players: 4 });
      expect(matchesAlert(teeTime({ availableSpots: -1 }), a)).toBe(true);
    });

    it("rejects 0 spots even for min_players=1", () => {
      const a = alert({ min_players: 1 });
      expect(matchesAlert(teeTime({ availableSpots: 0 }), a)).toBe(false);
    });
  });

  describe("price filtering", () => {
    it("matches when no max_price set", () => {
      expect(matchesAlert(teeTime({ greenFee: 500 }), alert())).toBe(true);
    });

    it("matches when fee <= max_price", () => {
      const a = alert({ max_price: 50 });
      expect(matchesAlert(teeTime({ greenFee: 45 }), a)).toBe(true);
      expect(matchesAlert(teeTime({ greenFee: 50 }), a)).toBe(true);
    });

    it("rejects when fee > max_price", () => {
      const a = alert({ max_price: 50 });
      expect(matchesAlert(teeTime({ greenFee: 51 }), a)).toBe(false);
      expect(matchesAlert(teeTime({ greenFee: 100 }), a)).toBe(false);
    });

    it("matches $0 green fee against any max_price", () => {
      const a = alert({ max_price: 50 });
      expect(matchesAlert(teeTime({ greenFee: 0 }), a)).toBe(true);
    });
  });

  describe("holes filtering", () => {
    it("matches when no holes constraint", () => {
      expect(matchesAlert(teeTime({ holes: 9 }), alert())).toBe(true);
      expect(matchesAlert(teeTime({ holes: 18 }), alert())).toBe(true);
    });

    it("matches when holes is empty array", () => {
      const a = alert({ holes: [] });
      expect(matchesAlert(teeTime({ holes: 9 }), a)).toBe(true);
    });

    it("matches when tee time holes is in allowed list", () => {
      const a = alert({ holes: [18] });
      expect(matchesAlert(teeTime({ holes: 18 }), a)).toBe(true);
    });

    it("rejects when tee time holes is not in allowed list", () => {
      const a = alert({ holes: [18] });
      expect(matchesAlert(teeTime({ holes: 9 }), a)).toBe(false);
    });

    it("handles multiple allowed hole values", () => {
      const a = alert({ holes: [9, 18] });
      expect(matchesAlert(teeTime({ holes: 9 }), a)).toBe(true);
      expect(matchesAlert(teeTime({ holes: 18 }), a)).toBe(true);
    });
  });

  describe("combined criteria — ALL must match", () => {
    const strictAlert = alert({
      earliest_time: "07:00",
      latest_time: "10:00",
      min_players: 2,
      max_price: 60,
      holes: [18],
    });

    it("passes when all criteria match", () => {
      expect(
        matchesAlert(
          teeTime({ time: "08:00", availableSpots: 4, greenFee: 45, holes: 18 }),
          strictAlert
        )
      ).toBe(true);
    });

    it("fails on time alone", () => {
      expect(
        matchesAlert(
          teeTime({ time: "06:00", availableSpots: 4, greenFee: 45, holes: 18 }),
          strictAlert
        )
      ).toBe(false);
    });

    it("fails on spots alone", () => {
      expect(
        matchesAlert(
          teeTime({ time: "08:00", availableSpots: 1, greenFee: 45, holes: 18 }),
          strictAlert
        )
      ).toBe(false);
    });

    it("fails on price alone", () => {
      expect(
        matchesAlert(
          teeTime({ time: "08:00", availableSpots: 4, greenFee: 61, holes: 18 }),
          strictAlert
        )
      ).toBe(false);
    });

    it("fails on holes alone", () => {
      expect(
        matchesAlert(
          teeTime({ time: "08:00", availableSpots: 4, greenFee: 45, holes: 9 }),
          strictAlert
        )
      ).toBe(false);
    });
  });
});

