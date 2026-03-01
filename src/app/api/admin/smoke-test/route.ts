import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { pollForeUp } from "@/lib/pollers/foreup";
import { pollChronogolf } from "@/lib/pollers/chronogolf";
import { getRedis } from "@/lib/redis";
import { matchesAlert, type Alert } from "@/lib/matcher";
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

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== ADMIN_USER_ID) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const svc = createServiceClient();
  const stages: StageResult[] = [];
  const today = new Date().toISOString().split("T")[0];

  // ── Stage 1: Orchestrator query — find active alert pairs ──
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

  // Pick first pair for smoke test
  const testPair = pairs[0];

  // ── Stage 2: Course lookup ──
  let course: Course | null = null;
  const s2 = await timed(async () => {
    const { data, error } = await svc
      .from("courses")
      .select("*")
      .eq("id", testPair.courseId)
      .eq("is_active", true)
      .single();
    if (error) throw error;
    course = data as Course;
    return {
      courseId: course.id,
      name: course.name,
      platform: course.platform,
    };
  });
  stages.push({
    stage: "2_course_lookup",
    status: course ? "pass" : "fail",
    duration_ms: s2.ms,
    detail: s2.result,
  });

  if (!course) {
    return Response.json({ overall: "fail", stages });
  }

  // ── Stage 3: Poll platform API ──
  let times: TeeTime[] = [];
  const s3 = await timed(async () => {
    const c = course!;
    if (c.platform === "foreup") {
      const [y, m, d] = testPair.date.split("-");
      times = await pollForeUp(c, `${m}-${d}-${y}`);
    } else if (c.platform === "chronogolf") {
      times = await pollChronogolf(c, testPair.date);
    } else {
      throw new Error(`Unknown platform: ${c.platform}`);
    }
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
    stage: "3_poll_platform",
    status: times.length > 0 ? "pass" : "skip",
    duration_ms: s3.ms,
    detail: s3.result,
  });

  // ── Stage 4: Redis diff (read-only — don't update cache) ──
  const s4 = await timed(async () => {
    const redis = getRedis();
    const cacheKey = `teetimes:${testPair.courseId}:${testPair.date}`;
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
    stage: "4_redis_diff_readonly",
    status: "pass",
    duration_ms: s4.ms,
    detail: s4.result,
  });

  // ── Stage 5: Alert matching (dry-run — no notifications) ──
  const s5 = await timed(async () => {
    const { data: alerts, error } = await svc
      .from("alerts")
      .select("*, user_profiles!alerts_user_profiles_fkey(phone)")
      .eq("course_id", testPair.courseId)
      .eq("target_date", testPair.date)
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
    duration_ms: s5.ms,
    detail: s5.result,
  });

  // ── Overall verdict ──
  const hasFail = stages.some((s) => s.status === "fail");
  const totalMs = stages.reduce((sum, s) => sum + s.duration_ms, 0);

  return Response.json({
    overall: hasFail ? "fail" : "pass",
    testPair,
    totalDuration_ms: totalMs,
    stages,
  });
}
