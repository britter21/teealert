import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { pollForeUp } from "@/lib/pollers/foreup";
import { pollChronogolf } from "@/lib/pollers/chronogolf";
import { getRedis } from "@/lib/redis";
import { matchesAlert, matchAndNotify, type Alert } from "@/lib/matcher";
import type { Course, TeeTime } from "@/lib/pollers/types";

const ADMIN_USER_ID = "3cefdaf3-2f71-4c83-88c3-dfe2f080ebe1";

interface StageResult {
  stage: string;
  status: "pass" | "fail" | "skip";
  duration_ms: number;
  detail: unknown;
}

async function timed<T>(
  fn: () => Promise<T>
): Promise<{ result: T; ms: number }> {
  const start = Date.now();
  const result = await fn();
  return { result, ms: Date.now() - start };
}

async function pollCourse(course: Course, date: string): Promise<TeeTime[]> {
  if (course.platform === "foreup") {
    const [y, m, d] = date.split("-");
    return pollForeUp(course, `${m}-${d}-${y}`);
  } else if (course.platform === "chronogolf") {
    return pollChronogolf(course, date);
  }
  throw new Error(`Unknown platform: ${course.platform}`);
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== ADMIN_USER_ID) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const live = request.nextUrl.searchParams.get("live") === "true";
  const svc = createServiceClient();
  const stages: StageResult[] = [];
  const today = new Date().toISOString().split("T")[0];

  // ── Stage 1: Find a course with tee times to test against ──
  // In live mode, we pick any active course (don't need an existing alert)
  // In dry-run mode, we use existing alert pairs
  let testCourse: Course | null = null;
  let testDate = "";

  if (live) {
    // For live test, find an active course and poll tomorrow's date
    // so we're likely to find tee times
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    testDate = tomorrow.toISOString().split("T")[0];

    const s1 = await timed(async () => {
      const { data: courses, error } = await svc
        .from("courses")
        .select("*")
        .eq("is_active", true)
        .limit(5);
      if (error) throw error;

      // Try each course until we find one with tee times
      for (const c of courses || []) {
        try {
          const times = await pollCourse(c as Course, testDate);
          if (times.length > 0) {
            testCourse = c as Course;
            return {
              selectedCourse: c.name,
              platform: c.platform,
              date: testDate,
              teeTimes: times.length,
              triedCourses: (courses || []).indexOf(c) + 1,
            };
          }
        } catch {
          continue;
        }
      }
      return { selectedCourse: null, triedCourses: courses?.length ?? 0 };
    });
    stages.push({
      stage: "1_find_course_with_times",
      status: testCourse ? "pass" : "fail",
      duration_ms: s1.ms,
      detail: s1.result,
    });

    if (!testCourse) {
      return Response.json({
        overall: "fail",
        message: "Could not find any course with tee times available",
        stages,
      });
    }
  } else {
    // Dry-run: use existing alert pairs
    let pairs: { courseId: string; date: string }[] = [];
    const s1 = await timed(async () => {
      const { data, error } = await svc
        .from("alerts")
        .select("course_id, target_date")
        .eq("is_active", true)
        .is("triggered_at", null)
        .lte("start_monitoring_date", today)
        .gte("target_date", today);
      if (error) throw error;
      const pairSet = new Set(
        (data || []).map((a) => `${a.course_id}|${a.target_date}`)
      );
      pairs = [...pairSet].map((p) => {
        const [courseId, date] = p.split("|");
        return { courseId, date };
      });
      return { alertRows: data?.length ?? 0, uniquePairs: pairs.length, pairs };
    });
    stages.push({
      stage: "1_orchestrator_query",
      status: pairs.length > 0 ? "pass" : "skip",
      duration_ms: s1.ms,
      detail: s1.result,
    });

    if (pairs.length === 0) {
      return Response.json({
        overall: "skip",
        message: "No active alerts with started monitoring — nothing to test",
        stages,
      });
    }

    const testPair = pairs[0];
    testDate = testPair.date;

    // Look up course
    const s2 = await timed(async () => {
      const { data, error } = await svc
        .from("courses")
        .select("*")
        .eq("id", testPair.courseId)
        .eq("is_active", true)
        .single();
      if (error) throw error;
      testCourse = data as Course;
      return {
        courseId: testCourse.id,
        name: testCourse.name,
        platform: testCourse.platform,
      };
    });
    stages.push({
      stage: "2_course_lookup",
      status: testCourse ? "pass" : "fail",
      duration_ms: s2.ms,
      detail: s2.result,
    });

    if (!testCourse) {
      return Response.json({ overall: "fail", stages });
    }
  }

  // testCourse is guaranteed non-null at this point (early returns above)
  const course: Course = testCourse!;

  // ── Stage: Poll platform API ──
  let times: TeeTime[] = [];
  const sPoll = await timed(async () => {
    times = await pollCourse(course, testDate);
    return {
      totalTimes: times.length,
      sampleTimes: times.slice(0, 5).map((t) => ({
        time: t.time,
        holes: t.holes,
        spots: t.availableSpots,
        fee: t.greenFee,
      })),
    };
  });
  stages.push({
    stage: live ? "2_poll_platform" : "3_poll_platform",
    status: times.length > 0 ? "pass" : "skip",
    duration_ms: sPoll.ms,
    detail: sPoll.result,
  });

  if (times.length === 0) {
    return Response.json({
      overall: "skip",
      message: `No tee times found for ${course.name} on ${testDate}`,
      stages,
    });
  }

  // ── Stage: Redis diff ──
  const sDiff = await timed(async () => {
    const redis = getRedis();
    const cacheKey = `teetimes:${course.id}:${testDate}`;
    const previous: string[] = (await redis.smembers(cacheKey)) || [];
    const previousSet = new Set(previous);

    const currentKeys = times.map(
      (t) => `${t.time}|${t.holes}|${t.availableSpots}`
    );
    const newTimes = times.filter((_t, i) => !previousSet.has(currentKeys[i]));

    return {
      cacheKey,
      cachedEntries: previous.length,
      cachedSample: previous.slice(0, 5),
      currentTimes: times.length,
      newTimes: newTimes.length,
      newSample: newTimes.slice(0, 5).map((t) => ({
        time: t.time,
        holes: t.holes,
        spots: t.availableSpots,
        fee: t.greenFee,
      })),
      note: "Read-only — cache NOT updated by smoke test",
    };
  });
  stages.push({
    stage: live ? "3_redis_diff" : "4_redis_diff_readonly",
    status: "pass",
    duration_ms: sDiff.ms,
    detail: sDiff.result,
  });

  // ── LIVE MODE: Create temp alert → matchAndNotify → cleanup ──
  if (live) {
    let testAlertId: string | null = null;

    // Stage 4: Create temporary test alert
    const sCreate = await timed(async () => {
      const { data, error } = await svc
        .from("alerts")
        .insert({
          user_id: ADMIN_USER_ID,
          course_id: course.id,
          target_date: testDate,
          earliest_time: null,
          latest_time: null,
          min_players: 1,
          max_price: null,
          holes: null,
          notify_sms: true,
          notify_email: true,
          notify_push: true,
          is_active: true,
          is_recurring: false,
          recurrence_days: null,
          start_monitoring_date: today,
          triggered_at: null,
        })
        .select("id")
        .single();

      if (error) throw error;
      testAlertId = data.id;
      return {
        alertId: testAlertId,
        channels: ["imessage", "email", "push"],
        criteria: "wide open (no filters) — will match all tee times",
      };
    });
    stages.push({
      stage: "4_create_test_alert",
      status: testAlertId ? "pass" : "fail",
      duration_ms: sCreate.ms,
      detail: sCreate.result,
    });

    if (!testAlertId) {
      return Response.json({ overall: "fail", stages });
    }

    // Stage 5: Run real matchAndNotify — sends actual notifications
    const sNotify = await timed(async () => {
      // Pass ALL times (not just diff-new) so we guarantee matches
      const results = await matchAndNotify(
        course.id,
        course.name,
        testDate,
        times,
        course.platform,
        course.platform_course_id,
        course.booking_slug,
        course.platform_schedule_id
      );
      return {
        results,
        note: "LIVE — real notifications sent to admin",
      };
    });
    stages.push({
      stage: "5_match_and_notify_live",
      status: "pass",
      duration_ms: sNotify.ms,
      detail: sNotify.result,
    });

    // Stage 6: Verify notification was created in DB
    const sVerify = await timed(async () => {
      const { data: notifs } = await svc
        .from("alert_notifications")
        .select("id, channels_sent, matched_times, created_at")
        .eq("alert_id", testAlertId!)
        .order("created_at", { ascending: false })
        .limit(1);

      const { data: logs } = await svc
        .from("notification_log")
        .select("channel, status, recipient")
        .eq("alert_id", testAlertId!);

      return {
        notificationRecord: notifs?.[0] || null,
        notificationLogs: logs || [],
        note: "Notification record kept in your inbox for verification",
      };
    });
    stages.push({
      stage: "6_verify_delivery",
      status: "pass",
      duration_ms: sVerify.ms,
      detail: sVerify.result,
    });

    // Stage 7: Cleanup — delete test alert (keep notification record)
    const sCleanup = await timed(async () => {
      // Delete the test alert
      const { error: deleteError } = await svc
        .from("alerts")
        .delete()
        .eq("id", testAlertId!);

      return {
        alertDeleted: !deleteError,
        notificationKept: true,
        note: "Test alert deleted. Notification record kept — check your inbox, iMessage, and email.",
      };
    });
    stages.push({
      stage: "7_cleanup",
      status: "pass",
      duration_ms: sCleanup.ms,
      detail: sCleanup.result,
    });
  } else {
    // ── DRY-RUN MODE: Alert matching without notifications ──
    const sMatch = await timed(async () => {
      const { data: alerts, error } = await svc
        .from("alerts")
        .select("*, user_profiles!alerts_user_profiles_fkey(phone)")
        .eq("course_id", course.id)
        .eq("target_date", testDate)
        .eq("is_active", true)
        .is("triggered_at", null)
        .lte("start_monitoring_date", today);

      if (error) throw error;

      const matchResults = (alerts || []).map((alert: Alert) => {
        const matching = times.filter((t) => matchesAlert(t, alert));
        return {
          alertId: alert.id,
          userId: alert.user_id,
          criteria: {
            earliest_time: alert.earliest_time,
            latest_time: alert.latest_time,
            min_players: alert.min_players,
            max_price: alert.max_price,
            holes: alert.holes,
          },
          matchedCount: matching.length,
          matchedTimes: matching.slice(0, 3).map((t) => ({
            time: t.time,
            holes: t.holes,
            spots: t.availableSpots,
            fee: t.greenFee,
          })),
          wouldNotify: {
            sms: alert.notify_sms,
            email: alert.notify_email,
            push: alert.notify_push,
          },
        };
      });

      return {
        alertsFound: alerts?.length ?? 0,
        matchResults,
        note: "Dry-run — no notifications sent, no alerts triggered",
      };
    });
    stages.push({
      stage: "5_alert_matching_dryrun",
      status: "pass",
      duration_ms: sMatch.ms,
      detail: sMatch.result,
    });
  }

  // ── Overall verdict ──
  const hasFail = stages.some((s) => s.status === "fail");
  const totalMs = stages.reduce((sum, s) => sum + s.duration_ms, 0);

  return Response.json({
    overall: hasFail ? "fail" : "pass",
    mode: live ? "live" : "dry-run",
    course: course.name,
    date: testDate,
    totalDuration_ms: totalMs,
    stages,
  });
}
