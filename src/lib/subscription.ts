import { createServiceClient } from "@/lib/supabase/server";
import type { TierName } from "@/lib/polar";
import { getTierLimits } from "@/lib/polar";

export async function getUserTier(userId: string): Promise<TierName> {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("subscriptions")
    .select("tier")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return (data?.tier as TierName) || "free";
}

export async function getUserAlertCount(userId: string): Promise<number> {
  const supabase = createServiceClient();

  const { count } = await supabase
    .from("alerts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_active", true);

  return count || 0;
}

export async function canCreateAlert(userId: string): Promise<{
  allowed: boolean;
  tier: TierName;
  current: number;
  limit: number;
}> {
  const tier = await getUserTier(userId);
  const current = await getUserAlertCount(userId);
  const limits = getTierLimits(tier);

  return {
    allowed: current < limits.maxAlerts,
    tier,
    current,
    limit: limits.maxAlerts,
  };
}

export async function canUseChannel(
  userId: string,
  channel: string
): Promise<boolean> {
  const tier = await getUserTier(userId);
  const limits = getTierLimits(tier);
  return (limits.channels as readonly string[]).includes(channel);
}
