import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getPostHogServer } from "@/lib/posthog";
import { sendWelcomeEmail } from "@/lib/notifications/lifecycle-emails";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const isNew =
          Date.now() - new Date(user.created_at).getTime() < 60_000;
        getPostHogServer()?.capture({
          distinctId: user.id,
          event: isNew ? "user_signed_up" : "user_logged_in",
        });
        if (isNew && user.email) {
          sendWelcomeEmail(user.email).catch(console.error);

          // Track referral if user signed up via referral link
          const refCode = request.cookies.get("ref")?.value;
          if (refCode) {
            const service = createServiceClient();
            const { data: referrer } = await service
              .from("user_profiles")
              .select("id")
              .eq("referral_code", refCode)
              .single();

            if (referrer && referrer.id !== user.id) {
              await service
                .from("user_profiles")
                .update({ referred_by: referrer.id })
                .eq("id", user.id);

              await service.from("referrals").insert({
                referrer_id: referrer.id,
                referee_id: user.id,
                status: "signed_up",
              });

              getPostHogServer()?.capture({
                distinctId: user.id,
                event: "referral_signup",
                properties: { referrer_id: referrer.id },
              });
            }
          }
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
