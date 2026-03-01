import { createClient } from "@/lib/supabase/server";
import { getPostHogServer } from "@/lib/posthog";
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
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
