import { createClient } from "@/lib/supabase/server";

const ADMIN_USER_ID = "3cefdaf3-2f71-4c83-88c3-dfe2f080ebe1";
const QSTASH_API = "https://qstash.upstash.io/v2";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== ADMIN_USER_ID) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = process.env.QSTASH_TOKEN;
  if (!token) {
    return Response.json({ error: "QSTASH_TOKEN not configured" }, { status: 500 });
  }

  const headers = { Authorization: `Bearer ${token}` };

  try {
    const [schedulesRes, eventsRes] = await Promise.all([
      fetch(`${QSTASH_API}/schedules`, { headers, cache: "no-store" }),
      fetch(`${QSTASH_API}/events?count=20`, { headers, cache: "no-store" }),
    ]);

    const schedules = schedulesRes.ok ? await schedulesRes.json() : [];
    const eventsData = eventsRes.ok ? await eventsRes.json() : [];
    const events = Array.isArray(eventsData) ? eventsData : eventsData.events || [];

    // Find the poll schedule
    const pollSchedule = Array.isArray(schedules)
      ? schedules.find((s: { destination?: string }) =>
          s.destination?.includes("/api/cron/poll")
        )
      : null;

    // Summarize events by state
    const stateCounts: Record<string, number> = {};
    for (const e of events) {
      const state = e.state || "unknown";
      stateCounts[state] = (stateCounts[state] || 0) + 1;
    }

    return Response.json({
      schedule: pollSchedule
        ? {
            id: pollSchedule.scheduleId,
            cron: pollSchedule.cron,
            destination: pollSchedule.destination,
            isPaused: pollSchedule.isPaused,
            retries: pollSchedule.retries,
            lastRun: pollSchedule.lastScheduleTime
              ? new Date(pollSchedule.lastScheduleTime).toISOString()
              : null,
            nextRun: pollSchedule.nextScheduleTime
              ? new Date(pollSchedule.nextScheduleTime).toISOString()
              : null,
            lastStates: pollSchedule.lastScheduleStates || {},
          }
        : null,
      totalSchedules: Array.isArray(schedules) ? schedules.length : 0,
      recentEvents: events.slice(0, 20).map((e: Record<string, unknown>) => ({
        time: e.time ? new Date(e.time as number).toISOString() : null,
        state: e.state,
        url: e.url,
        messageId: (e.messageId as string)?.slice(0, 20),
      })),
      eventSummary: stateCounts,
    });
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 502 }
    );
  }
}
