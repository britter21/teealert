import { createServiceClient } from "@/lib/supabase/server";
import { getTierLimits, FREE_TRIAL_DAYS } from "@/lib/polar";

export async function getUserTier(userId: string): Promise<string> {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("subscriptions")
    .select("tier")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (data?.tier) return data.tier;

  // Check if user is within free trial period
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("created_at, tier")
    .eq("id", userId)
    .single();

  // Legacy hardcoded tier (e.g. birdie for the admin user)
  if (profile?.tier && profile.tier !== "free") return profile.tier;

  // Free trial: all users get unlimited tier for FREE_TRIAL_DAYS
  if (profile?.created_at) {
    const createdAt = new Date(profile.created_at);
    const trialEnd = new Date(createdAt);
    trialEnd.setDate(trialEnd.getDate() + FREE_TRIAL_DAYS);
    if (new Date() < trialEnd) return "unlimited";
  }

  return "starter";
}

export async function getTrialInfo(userId: string): Promise<{
  isTrial: boolean;
  daysRemaining: number;
}> {
  const supabase = createServiceClient();

  // Check for active subscription first
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .single();

  if (sub) return { isTrial: false, daysRemaining: 0 };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("created_at, tier")
    .eq("id", userId)
    .single();

  // Legacy hardcoded tier
  if (profile?.tier && profile.tier !== "free") {
    return { isTrial: false, daysRemaining: 0 };
  }

  if (profile?.created_at) {
    const createdAt = new Date(profile.created_at);
    const trialEnd = new Date(createdAt);
    trialEnd.setDate(trialEnd.getDate() + FREE_TRIAL_DAYS);
    const remaining = Math.max(
      0,
      Math.ceil((trialEnd.getTime() - Date.now()) / 86400000)
    );
    if (remaining > 0) return { isTrial: true, daysRemaining: remaining };
  }

  return { isTrial: false, daysRemaining: 0 };
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
  tier: string;
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
