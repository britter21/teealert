import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";

const ADMIN_USER_ID = "3cefdaf3-2f71-4c83-88c3-dfe2f080ebe1";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== ADMIN_USER_ID) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const svc = createServiceClient();

  // Last 1 hour of poll results
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: recent } = await svc
    .from("poll_results")
    .select("*")
    .gte("created_at", oneHourAgo)
    .order("created_at", { ascending: false });

  const results = recent || [];
  const successes = results.filter((r) => r.status === "success");
  const errors = results.filter((r) => r.status === "error");

  // Group errors by course
  const errorsByCourse: Record<string, { count: number; lastError: string; lastAt: string }> = {};
  for (const e of errors) {
    const key = e.course_name;
    if (!errorsByCourse[key]) {
      errorsByCourse[key] = { count: 0, lastError: "", lastAt: "" };
    }
    errorsByCourse[key].count++;
    if (!errorsByCourse[key].lastAt || e.created_at > errorsByCourse[key].lastAt) {
      errorsByCourse[key].lastError = e.error_message || "Unknown";
      errorsByCourse[key].lastAt = e.created_at;
    }
  }

  // Platform breakdown
  const byPlatform: Record<string, { total: number; errors: number; avgMs: number }> = {};
  for (const r of results) {
    if (!byPlatform[r.platform]) {
      byPlatform[r.platform] = { total: 0, errors: 0, avgMs: 0 };
    }
    byPlatform[r.platform].total++;
    if (r.status === "error") byPlatform[r.platform].errors++;
    byPlatform[r.platform].avgMs += r.duration_ms || 0;
  }
  for (const p of Object.values(byPlatform)) {
    p.avgMs = p.total > 0 ? Math.round(p.avgMs / p.total) : 0;
  }

  // Avg response time for successes
  const avgDuration = successes.length > 0
    ? Math.round(successes.reduce((sum, r) => sum + (r.duration_ms || 0), 0) / successes.length)
    : 0;

  return Response.json({
    period: "last 1 hour",
    totalPolls: results.length,
    successes: successes.length,
    errors: errors.length,
    errorRate: results.length > 0
      ? `${((errors.length / results.length) * 100).toFixed(1)}%`
      : "N/A",
    avgDurationMs: avgDuration,
    byPlatform,
    errorsByCourse,
    recentErrors: errors.slice(0, 10).map((e) => ({
      course: e.course_name,
      date: e.target_date,
      error: e.error_message,
      at: e.created_at,
    })),
  });
}
