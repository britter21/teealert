import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();

  // Get user's referral code
  const { data: profile } = await service
    .from("user_profiles")
    .select("referral_code")
    .eq("id", user.id)
    .single();

  // Get referral stats
  const { data: referrals } = await service
    .from("referrals")
    .select("id, status, rewarded_at, created_at")
    .eq("referrer_id", user.id)
    .order("created_at", { ascending: false });

  const total = referrals?.length || 0;
  const rewarded = referrals?.filter((r) => r.rewarded_at).length || 0;

  return Response.json({
    referral_code: profile?.referral_code || null,
    referral_link: profile?.referral_code
      ? `https://teetimehawk.com/r/${profile.referral_code}`
      : null,
    total_referrals: total,
    rewarded_months: rewarded,
    referrals: referrals || [],
  });
}
