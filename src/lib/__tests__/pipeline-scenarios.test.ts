import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TeeTime } from "../pollers/types";

/**
 * Pipeline scenario tests.
 *
 * These exercise the REAL production code — matchesAlert (from matcher.ts)
 * and diffAndDetectNew (from diff.ts) — chained together to simulate
 * the full poll → diff → match pipeline.
 *
 * Redis is mocked so we can simulate cache state (empty, fully booked,
 * partial availability). Everything else is the real code path.
 *
 * If the matcher or diff logic changes, these tests verify the
 * end-to-end scenarios still work correctly.
 */

// ── Mock Redis (same pattern as diff.test.ts) ──
// We track what gets written to the "cache" so later calls can read it back.
let cacheStore: Map<string, Set<string>>;

const mockSmembers = vi.fn();
const mockDel = vi.fn();
const mockSadd = vi.fn();
const mockExpire = vi.fn();
const mockExec = vi.fn();

vi.mock("../redis", () => ({
  getRedis: () => ({
    smembers: mockSmembers,
    pipeline: () => ({
      del: mockDel,
      sadd: mockSadd,
      expire: mockExpire,
      exec: mockExec,
    }),
  }),
}));

// Mock notification modules so importing matcher doesn't blow up
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

// Import REAL production code
const { diffAndDetectNew } = await import("../diff");
const { matchesAlert } = await import("../matcher");
import type { Alert } from "../matcher";

// ── Helpers ──

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

/**
 * Simulate the pipeline: poll → diff → match.
 *
 * This mirrors what poll-course/route.ts does:
 *   1. Poll platform API → returns tee times (we pass these in)
 *   2. diffAndDetectNew → filters to only new/changed times
 *   3. matchesAlert → checks each new time against each alert's criteria
 *
 * Returns the list of new times that match the alert (would trigger notification).
 */
async function simulatePipeline(
  courseId: string,
  date: string,
  polledTimes: TeeTime[],
  userAlert: Alert
): Promise<TeeTime[]> {
  // Step 1: diff against Redis cache (uses real diffAndDetectNew)
  const { newTimes } = await diffAndDetectNew(courseId, date, polledTimes);

  // Step 2: match against alert criteria (uses real matchesAlert)
  return newTimes.filter((t) => matchesAlert(t, userAlert));
}

/**
 * Simulate what Redis would contain after a diff call.
 * This lets us set up "previous poll" state for subsequent calls.
 */
function cacheKeyForTimes(times: TeeTime[]): string[] {
  return times.map((t) => `${t.time}|${t.holes}|${t.availableSpots}`);
}

// ── Setup ──

beforeEach(() => {
  vi.clearAllMocks();
  cacheStore = new Map();

  // Make mockSmembers read from our simulated cache
  mockSmembers.mockImplementation((key: string) => {
    return Promise.resolve([...(cacheStore.get(key) || [])]);
  });

  // Make mockSadd write to our simulated cache
  mockSadd.mockImplementation((key: string, ...values: string[]) => {
    const set = cacheStore.get(key) || new Set();
    for (const v of values) set.add(v);
    cacheStore.set(key, set);
  });

  // mockDel clears cache key
  mockDel.mockImplementation((key: string) => {
    cacheStore.delete(key);
  });

  mockExec.mockResolvedValue([]);
  mockExpire.mockReturnValue(undefined);
});

// ═══════════════════════════════════════════════════════════
// SCENARIO TESTS
// ═══════════════════════════════════════════════════════════

describe("Scenario: New tee times appear in my time range → I get alerted", () => {
  const myAlert = alert({
    earliest_time: "07:00",
    latest_time: "10:00",
    min_players: 2,
  });

  it("alerts when tee times appear in my window on an empty cache", async () => {
    const polled = [
      teeTime({ time: "07:30", availableSpots: 4 }),
      teeTime({ time: "08:00", availableSpots: 3 }),
      teeTime({ time: "09:15", availableSpots: 2 }),
    ];

    const matches = await simulatePipeline("course-1", "2026-03-07", polled, myAlert);
    expect(matches).toHaveLength(3);
  });

  it("alerts when tee times appear in my window with price and holes filters", async () => {
    const strictAlert = alert({
      earliest_time: "07:00",
      latest_time: "10:00",
      min_players: 2,
      max_price: 60,
      holes: [18],
    });

    const polled = [
      teeTime({ time: "08:00", availableSpots: 4, greenFee: 45, holes: 18 }),
      teeTime({ time: "09:00", availableSpots: 3, greenFee: 55, holes: 18 }),
      teeTime({ time: "09:30", availableSpots: 2, greenFee: 70, holes: 18 }), // too expensive
      teeTime({ time: "08:30", availableSpots: 4, greenFee: 40, holes: 9 }),  // wrong holes
    ];

    const matches = await simulatePipeline("course-1", "2026-03-07", polled, strictAlert);
    expect(matches).toHaveLength(2);
    expect(matches.map((m) => m.time)).toEqual(["08:00", "09:00"]);
  });
});

describe("Scenario: Everything is booked, then a time opens up → I get alerted", () => {
  const myAlert = alert({
    earliest_time: "07:00",
    latest_time: "10:00",
    min_players: 2,
  });

  it("detects new availability after a fully-booked poll", async () => {
    // Poll 1: Three times available — all go into cache
    const poll1 = [
      teeTime({ time: "07:30", availableSpots: 4 }),
      teeTime({ time: "08:00", availableSpots: 3 }),
      teeTime({ time: "09:00", availableSpots: 2 }),
    ];
    await simulatePipeline("course-1", "2026-03-07", poll1, myAlert);

    // Poll 2: Everything is booked (empty result from platform)
    // diffAndDetectNew returns [] and preserves cache when times are empty
    const matches2 = await simulatePipeline("course-1", "2026-03-07", [], myAlert);
    expect(matches2).toHaveLength(0);

    // Poll 3: A new time opens up at 08:30!
    // Since cache was preserved (not cleared by empty poll), and 08:30 wasn't
    // in the previous cache, it shows up as new
    const poll3 = [
      teeTime({ time: "08:30", availableSpots: 2 }),
    ];
    const matches3 = await simulatePipeline("course-1", "2026-03-07", poll3, myAlert);
    expect(matches3).toHaveLength(1);
    expect(matches3[0].time).toBe("08:30");
  });

  it("detects when spots increase on a previously-seen time", async () => {
    // Poll 1: 08:00 has 1 spot (below my min_players of 2)
    const poll1 = [
      teeTime({ time: "08:00", availableSpots: 1 }),
    ];
    const matches1 = await simulatePipeline("course-1", "2026-03-07", poll1, myAlert);
    // It's "new" to diff (empty cache) but doesn't match alert (1 < min_players 2)
    expect(matches1).toHaveLength(0);

    // Poll 2: Now 08:00 has 3 spots — spots changed so diff treats it as new
    const poll2 = [
      teeTime({ time: "08:00", availableSpots: 3 }),
    ];
    const matches2 = await simulatePipeline("course-1", "2026-03-07", poll2, myAlert);
    expect(matches2).toHaveLength(1);
    expect(matches2[0].availableSpots).toBe(3);
  });
});

describe("Scenario: Tee time outside my range → I do NOT get alerted", () => {
  const myAlert = alert({
    earliest_time: "07:00",
    latest_time: "10:00",
    min_players: 2,
  });

  it("does not alert for times before my earliest_time", async () => {
    const polled = [
      teeTime({ time: "06:30", availableSpots: 4 }),
      teeTime({ time: "06:45", availableSpots: 4 }),
    ];

    const matches = await simulatePipeline("course-1", "2026-03-07", polled, myAlert);
    expect(matches).toHaveLength(0);
  });

  it("does not alert for times after my latest_time", async () => {
    const polled = [
      teeTime({ time: "10:30", availableSpots: 4 }),
      teeTime({ time: "14:00", availableSpots: 4 }),
    ];

    const matches = await simulatePipeline("course-1", "2026-03-07", polled, myAlert);
    expect(matches).toHaveLength(0);
  });

  it("only alerts for times within range when mixed results come back", async () => {
    const polled = [
      teeTime({ time: "06:30", availableSpots: 4 }), // too early
      teeTime({ time: "08:00", availableSpots: 4 }), // in range
      teeTime({ time: "09:30", availableSpots: 3 }), // in range
      teeTime({ time: "11:00", availableSpots: 4 }), // too late
      teeTime({ time: "14:00", availableSpots: 2 }), // too late
    ];

    const matches = await simulatePipeline("course-1", "2026-03-07", polled, myAlert);
    expect(matches).toHaveLength(2);
    expect(matches.map((m) => m.time)).toEqual(["08:00", "09:30"]);
  });

  it("does not alert when spots are below min_players even if time is in range", async () => {
    const polled = [
      teeTime({ time: "08:00", availableSpots: 1 }), // in range but only 1 spot
    ];

    const matches = await simulatePipeline("course-1", "2026-03-07", polled, myAlert);
    expect(matches).toHaveLength(0);
  });
});

describe("Scenario: Same times polled again → no duplicate alert", () => {
  const myAlert = alert({
    earliest_time: "07:00",
    latest_time: "10:00",
  });

  it("does not re-alert for times already in Redis cache", async () => {
    const polled = [
      teeTime({ time: "08:00", availableSpots: 4 }),
      teeTime({ time: "09:00", availableSpots: 3 }),
    ];

    // First poll: should alert
    const matches1 = await simulatePipeline("course-1", "2026-03-07", polled, myAlert);
    expect(matches1).toHaveLength(2);

    // Second poll: same data — diff returns empty, no alert
    const matches2 = await simulatePipeline("course-1", "2026-03-07", polled, myAlert);
    expect(matches2).toHaveLength(0);
  });

  it("re-alerts only for genuinely new times in subsequent poll", async () => {
    const poll1 = [
      teeTime({ time: "08:00", availableSpots: 4 }),
    ];

    // First poll
    await simulatePipeline("course-1", "2026-03-07", poll1, myAlert);

    // Second poll: 08:00 still there + new 09:00
    const poll2 = [
      teeTime({ time: "08:00", availableSpots: 4 }),
      teeTime({ time: "09:00", availableSpots: 3 }),
    ];
    const matches2 = await simulatePipeline("course-1", "2026-03-07", poll2, myAlert);
    expect(matches2).toHaveLength(1);
    expect(matches2[0].time).toBe("09:00");
  });
});

describe("Scenario: Multiple alerts on same course+date (multi-user isolation)", () => {
  it("each alert only matches tee times fitting its own criteria", async () => {
    const polled = [
      teeTime({ time: "06:30", availableSpots: 4, greenFee: 45 }),
      teeTime({ time: "08:00", availableSpots: 2, greenFee: 55 }),
      teeTime({ time: "09:30", availableSpots: 4, greenFee: 80 }),
      teeTime({ time: "14:00", availableSpots: 4, greenFee: 35 }),
    ];

    // User A: early bird, budget-conscious
    const userA = alert({
      id: "alert-A",
      user_id: "user-A",
      earliest_time: "06:00",
      latest_time: "09:00",
      max_price: 60,
    });

    // User B: afternoon player, needs 4 spots
    const userB = alert({
      id: "alert-B",
      user_id: "user-B",
      earliest_time: "12:00",
      latest_time: "16:00",
      min_players: 4,
    });

    // User C: flexible but needs cheap
    const userC = alert({
      id: "alert-C",
      user_id: "user-C",
      max_price: 40,
    });

    // Diff is shared (same course+date) — all times are "new"
    const { newTimes } = await diffAndDetectNew("course-1", "2026-03-07", polled);
    expect(newTimes).toHaveLength(4);

    // But each user's alert only matches their criteria
    const matchesA = newTimes.filter((t) => matchesAlert(t, userA));
    expect(matchesA.map((t) => t.time)).toEqual(["06:30", "08:00"]);

    const matchesB = newTimes.filter((t) => matchesAlert(t, userB));
    expect(matchesB.map((t) => t.time)).toEqual(["14:00"]);

    const matchesC = newTimes.filter((t) => matchesAlert(t, userC));
    expect(matchesC.map((t) => t.time)).toEqual(["14:00"]);
  });
});

describe("Scenario: Chronogolf unknown spots (-1)", () => {
  it("treats -1 spots as available and matches alert", async () => {
    const myAlert = alert({ min_players: 4 });
    const polled = [
      teeTime({ time: "08:00", availableSpots: -1, greenFee: 60 }),
    ];

    const matches = await simulatePipeline("course-1", "2026-03-07", polled, myAlert);
    expect(matches).toHaveLength(1);
  });
});

describe("Scenario: Price filter edge cases", () => {
  it("alerts when green fee is exactly at max_price", async () => {
    const myAlert = alert({ max_price: 50 });
    const polled = [teeTime({ time: "08:00", greenFee: 50 })];
    const matches = await simulatePipeline("course-1", "2026-03-07", polled, myAlert);
    expect(matches).toHaveLength(1);
  });

  it("does not alert when green fee is $1 over max_price", async () => {
    const myAlert = alert({ max_price: 50 });
    const polled = [teeTime({ time: "08:00", greenFee: 51 })];
    const matches = await simulatePipeline("course-1", "2026-03-07", polled, myAlert);
    expect(matches).toHaveLength(0);
  });
});
