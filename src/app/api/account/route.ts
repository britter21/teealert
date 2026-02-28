import { createClient } from "@/lib/supabase/server";
import { getUserTier, getUserAlertCount, getTrialInfo } from "@/lib/subscription";
import { getTierLimits } from "@/lib/polar";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = await getUserTier(user.id);
  const alertCount = await getUserAlertCount(user.id);
  const limits = getTierLimits(tier);
  const trial = await getTrialInfo(user.id);

  return Response.json({
    tier,
    alertCount,
    maxAlerts: limits.maxAlerts === Infinity ? null : limits.maxAlerts,
    channels: limits.channels,
    pollIntervalSeconds: limits.pollIntervalSeconds,
    isTrial: trial.isTrial,
    trialDaysRemaining: trial.daysRemaining,
  });
}
