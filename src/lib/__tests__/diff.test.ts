import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TeeTime } from "../pollers/types";

// Mock Redis before importing diff module
const mockSmembers = vi.fn();
const mockPipeline = vi.fn();
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

const { diffAndDetectNew } = await import("../diff");

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

beforeEach(() => {
  vi.clearAllMocks();
  mockSmembers.mockResolvedValue([]);
  mockExec.mockResolvedValue([]);
});

describe("diffAndDetectNew", () => {
  it("treats all times as new when cache is empty", async () => {
    mockSmembers.mockResolvedValue([]);
    const times = [
      teeTime({ time: "07:00" }),
      teeTime({ time: "08:00" }),
    ];

    const result = await diffAndDetectNew("course-1", "2026-03-07", times);
    expect(result).toHaveLength(2);
  });

  it("filters out previously seen times", async () => {
    mockSmembers.mockResolvedValue(["07:00|18|4"]);
    const times = [
      teeTime({ time: "07:00", holes: 18, availableSpots: 4 }),
      teeTime({ time: "08:00", holes: 18, availableSpots: 4 }),
    ];

    const result = await diffAndDetectNew("course-1", "2026-03-07", times);
    expect(result).toHaveLength(1);
    expect(result[0].time).toBe("08:00");
  });

  it("treats changed availableSpots as new (same time, different spots)", async () => {
    // Previously had 3 spots, now has 4 → treated as new
    mockSmembers.mockResolvedValue(["08:30|18|3"]);
    const times = [teeTime({ time: "08:30", holes: 18, availableSpots: 4 })];

    const result = await diffAndDetectNew("course-1", "2026-03-07", times);
    expect(result).toHaveLength(1);
  });

  it("does NOT update cache when current times are empty", async () => {
    mockSmembers.mockResolvedValue(["08:30|18|4"]);

    const result = await diffAndDetectNew("course-1", "2026-03-07", []);
    expect(result).toHaveLength(0);
    // Pipeline should NOT be created — cache preserved
    expect(mockDel).not.toHaveBeenCalled();
  });

  it("replaces cache atomically with current times", async () => {
    mockSmembers.mockResolvedValue([]);
    const times = [
      teeTime({ time: "07:00", holes: 18, availableSpots: 2 }),
      teeTime({ time: "08:00", holes: 9, availableSpots: 4 }),
    ];

    await diffAndDetectNew("course-1", "2026-03-07", times);

    expect(mockDel).toHaveBeenCalledWith("teetimes:course-1:2026-03-07");
    expect(mockSadd).toHaveBeenCalledWith(
      "teetimes:course-1:2026-03-07",
      "07:00|18|2",
      "08:00|9|4"
    );
    expect(mockExpire).toHaveBeenCalledWith("teetimes:course-1:2026-03-07", 600);
    expect(mockExec).toHaveBeenCalled();
  });

  it("uses correct cache key with courseId and date", async () => {
    mockSmembers.mockResolvedValue([]);
    await diffAndDetectNew("abc-123", "2026-04-15", [teeTime()]);
    expect(mockSmembers).toHaveBeenCalledWith("teetimes:abc-123:2026-04-15");
  });

  it("dedup key format is time|holes|availableSpots", async () => {
    mockSmembers.mockResolvedValue(["08:30|18|4"]);
    const times = [teeTime({ time: "08:30", holes: 18, availableSpots: 4 })];

    const result = await diffAndDetectNew("course-1", "2026-03-07", times);
    expect(result).toHaveLength(0); // exact match → not new
  });

  it("handles Chronogolf unknown spots (-1)", async () => {
    mockSmembers.mockResolvedValue([]);
    const times = [teeTime({ availableSpots: -1 })];

    const result = await diffAndDetectNew("course-1", "2026-03-07", times);
    expect(result).toHaveLength(1);

    // Verify the key includes -1
    expect(mockSadd).toHaveBeenCalledWith(
      expect.any(String),
      "08:30|18|-1"
    );
  });
});
