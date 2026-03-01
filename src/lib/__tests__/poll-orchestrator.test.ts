import { describe, it, expect } from "vitest";

/**
 * These tests validate the polling date selection logic.
 * The actual orchestrator queries alert target_dates from the DB
 * and deduplicates to unique course+date pairs. We test that logic here.
 */

interface AlertRow {
  course_id: string;
  target_date: string;
}

// This mirrors the dedup logic in /api/cron/poll/route.ts
function deduplicateAlertPairs(alerts: AlertRow[]): { courseId: string; date: string }[] {
  const pairSet = new Set(alerts.map((a) => `${a.course_id}|${a.target_date}`));
  return [...pairSet].map((p) => {
    const [courseId, date] = p.split("|");
    return { courseId, date };
  });
}

describe("poll orchestrator date deduplication", () => {
  it("produces one message per unique course+date pair", () => {
    const alerts: AlertRow[] = [
      { course_id: "course-A", target_date: "2026-03-07" },
      { course_id: "course-A", target_date: "2026-03-07" }, // duplicate user
      { course_id: "course-A", target_date: "2026-03-07" }, // another duplicate
    ];

    const pairs = deduplicateAlertPairs(alerts);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toEqual({ courseId: "course-A", date: "2026-03-07" });
  });

  it("keeps separate pairs for different dates on same course", () => {
    const alerts: AlertRow[] = [
      { course_id: "course-A", target_date: "2026-03-02" },
      { course_id: "course-A", target_date: "2026-03-07" },
      { course_id: "course-A", target_date: "2026-03-14" },
    ];

    const pairs = deduplicateAlertPairs(alerts);
    expect(pairs).toHaveLength(3);
    const dates = pairs.map((p) => p.date).sort();
    expect(dates).toEqual(["2026-03-02", "2026-03-07", "2026-03-14"]);
  });

  it("keeps separate pairs for different courses on same date", () => {
    const alerts: AlertRow[] = [
      { course_id: "course-A", target_date: "2026-03-07" },
      { course_id: "course-B", target_date: "2026-03-07" },
    ];

    const pairs = deduplicateAlertPairs(alerts);
    expect(pairs).toHaveLength(2);
  });

  it("handles complex multi-user multi-course scenario", () => {
    // 3 users, 2 courses, various dates — simulates real-world
    const alerts: AlertRow[] = [
      // User 1: Hermitage Sat + Sun
      { course_id: "hermitage", target_date: "2026-03-07" },
      { course_id: "hermitage", target_date: "2026-03-08" },
      // User 2: Hermitage Sat (same as user 1) + Black Desert Sat
      { course_id: "hermitage", target_date: "2026-03-07" },
      { course_id: "black-desert", target_date: "2026-03-07" },
      // User 3: Black Desert next Friday
      { course_id: "black-desert", target_date: "2026-03-13" },
    ];

    const pairs = deduplicateAlertPairs(alerts);

    // Should be 4 unique pairs:
    // hermitage/03-07, hermitage/03-08, black-desert/03-07, black-desert/03-13
    expect(pairs).toHaveLength(4);

    const pairStrings = pairs.map((p) => `${p.courseId}/${p.date}`).sort();
    expect(pairStrings).toEqual([
      "black-desert/2026-03-07",
      "black-desert/2026-03-13",
      "hermitage/2026-03-07",
      "hermitage/2026-03-08",
    ]);
  });

  it("returns empty array for no alerts", () => {
    expect(deduplicateAlertPairs([])).toHaveLength(0);
  });
});

describe("start_monitoring_date gating logic", () => {
  // This tests the SQL filter logic conceptually:
  // Only alerts where start_monitoring_date <= today should be included

  interface AlertWithMonitoring extends AlertRow {
    start_monitoring_date: string;
    is_active: boolean;
    triggered_at: string | null;
  }

  function filterEligibleAlerts(alerts: AlertWithMonitoring[], today: string): AlertRow[] {
    return alerts
      .filter((a) => a.is_active)
      .filter((a) => a.triggered_at === null)
      .filter((a) => a.start_monitoring_date <= today)
      .filter((a) => a.target_date >= today);
  }

  it("excludes alerts that have not started monitoring yet", () => {
    const alerts: AlertWithMonitoring[] = [
      {
        course_id: "course-A",
        target_date: "2026-03-15",
        start_monitoring_date: "2026-03-10", // 5 days before
        is_active: true,
        triggered_at: null,
      },
    ];

    // Today is March 7 — monitoring hasn't started
    expect(filterEligibleAlerts(alerts, "2026-03-07")).toHaveLength(0);

    // Today is March 10 — monitoring starts
    expect(filterEligibleAlerts(alerts, "2026-03-10")).toHaveLength(1);

    // Today is March 14 — still monitoring
    expect(filterEligibleAlerts(alerts, "2026-03-14")).toHaveLength(1);
  });

  it("excludes already-triggered alerts", () => {
    const alerts: AlertWithMonitoring[] = [
      {
        course_id: "course-A",
        target_date: "2026-03-07",
        start_monitoring_date: "2026-03-01",
        is_active: true,
        triggered_at: "2026-03-05T12:00:00Z", // already fired
      },
    ];

    expect(filterEligibleAlerts(alerts, "2026-03-06")).toHaveLength(0);
  });

  it("excludes paused alerts", () => {
    const alerts: AlertWithMonitoring[] = [
      {
        course_id: "course-A",
        target_date: "2026-03-07",
        start_monitoring_date: "2026-03-01",
        is_active: false,
        triggered_at: null,
      },
    ];

    expect(filterEligibleAlerts(alerts, "2026-03-06")).toHaveLength(0);
  });

  it("excludes alerts whose target_date has passed", () => {
    const alerts: AlertWithMonitoring[] = [
      {
        course_id: "course-A",
        target_date: "2026-03-05",
        start_monitoring_date: "2026-03-01",
        is_active: true,
        triggered_at: null,
      },
    ];

    expect(filterEligibleAlerts(alerts, "2026-03-06")).toHaveLength(0);
  });

  it("recurring Saturday alert with 5-day lead: only polls in window", () => {
    // User wants Saturday alerts, 5 days early monitoring
    // Next Saturday is March 14. start_monitoring_date = March 9.
    const alerts: AlertWithMonitoring[] = [
      {
        course_id: "hermitage",
        target_date: "2026-03-14",
        start_monitoring_date: "2026-03-09",
        is_active: true,
        triggered_at: null,
      },
    ];

    // March 7 — too early
    expect(filterEligibleAlerts(alerts, "2026-03-07")).toHaveLength(0);
    // March 8 — still too early
    expect(filterEligibleAlerts(alerts, "2026-03-08")).toHaveLength(0);
    // March 9 — monitoring starts!
    expect(filterEligibleAlerts(alerts, "2026-03-09")).toHaveLength(1);
    // March 13 — still monitoring
    expect(filterEligibleAlerts(alerts, "2026-03-13")).toHaveLength(1);
    // March 14 — game day, still monitoring
    expect(filterEligibleAlerts(alerts, "2026-03-14")).toHaveLength(1);
  });
});
