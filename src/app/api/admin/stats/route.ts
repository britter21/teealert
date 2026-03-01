import { createClient, createServiceClient } from "@/lib/supabase/server";

const ADMIN_USER_ID = "3cefdaf3-2f71-4c83-88c3-dfe2f080ebe1";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== ADMIN_USER_ID) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = createServiceClient();

  // Run all queries in parallel
  const [
    coursesResult,
    alertsResult,
    activeAlertsResult,
    notificationsLast7dResult,
    usersResult,
    subscriptionsResult,
    notificationsResult,
    recentNotificationsResult,
    failedNotificationsResult,
    supportResult,
    alertsByCourseResult,
    alertsByTierResult,
    recentUsersResult,
  ] = await Promise.all([
    // Total courses
    service.from("courses").select("id, name, platform, is_active", { count: "exact", head: false }),
    // Total alerts
    service.from("alerts").select("id", { count: "exact", head: true }),
    // Active alerts
    service.from("alerts").select("id", { count: "exact", head: true }).eq("is_active", true),
    // Notifications sent (last 7 days)
    service.from("alert_notifications").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
    // Total users
    service.from("user_profiles").select("id", { count: "exact", head: true }),
    // Active subscriptions
    service.from("subscriptions").select("id, tier, status").eq("status", "active"),
    // Total notifications sent
    service.from("notification_log").select("id", { count: "exact", head: true }),
    // Recent notifications (last 24h)
    service.from("notification_log").select("id, alert_id, channel, recipient, status, sent_at, payload").gte("sent_at", new Date(Date.now() - 86400000).toISOString()).order("sent_at", { ascending: false }).limit(50),
    // Failed notifications
    service.from("notification_log").select("id", { count: "exact", head: true }).eq("status", "failed"),
    // Open support requests
    service.from("support_requests").select("id, category, subject, status, created_at, user_id").order("created_at", { ascending: false }).limit(20),
    // Alerts by course (top 10)
    service.from("alerts").select("course_id, courses(name)").eq("is_active", true),
    // Users by tier
    service.from("user_profiles").select("tier"),
    // Recent signups (last 7 days)
    service.from("user_profiles").select("id, created_at, tier").gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()).order("created_at", { ascending: false }),
  ]);

  // Aggregate alerts by course
  const alertsByCourse: Record<string, { name: string; count: number }> = {};
  if (alertsByCourseResult.data) {
    for (const a of alertsByCourseResult.data) {
      const name = (a.courses as unknown as { name: string })?.name || "Unknown";
      if (!alertsByCourse[a.course_id]) {
        alertsByCourse[a.course_id] = { name, count: 0 };
      }
      alertsByCourse[a.course_id].count++;
    }
  }
  const topCourses = Object.values(alertsByCourse)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Aggregate users by tier
  const tierCounts: Record<string, number> = {};
  if (alertsByTierResult.data) {
    for (const p of alertsByTierResult.data) {
      const t = p.tier || "starter";
      tierCounts[t] = (tierCounts[t] || 0) + 1;
    }
  }

  // Course platform breakdown
  const platformCounts: Record<string, number> = { foreup: 0, chronogolf: 0 };
  let activeCourses = 0;
  if (coursesResult.data) {
    for (const c of coursesResult.data) {
      if (c.platform in platformCounts) platformCounts[c.platform]++;
      if (c.is_active) activeCourses++;
    }
  }

  return Response.json({
    overview: {
      totalCourses: coursesResult.count || 0,
      activeCourses,
      totalAlerts: alertsResult.count || 0,
      activeAlerts: activeAlertsResult.count || 0,
      notificationsLast7d: notificationsLast7dResult.count || 0,
      totalUsers: usersResult.count || 0,
      activeSubscriptions: subscriptionsResult.data?.length || 0,
      totalNotifications: notificationsResult.count || 0,
      failedNotifications: failedNotificationsResult.count || 0,
    },
    platforms: platformCounts,
    tierBreakdown: tierCounts,
    topCourses,
    recentNotifications: recentNotificationsResult.data || [],
    supportRequests: supportResult.data || [],
    recentSignups: recentUsersResult.data || [],
  });
}
