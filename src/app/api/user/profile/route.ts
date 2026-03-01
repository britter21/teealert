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

  // Ensure profile exists
  await service
    .from("user_profiles")
    .upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true });

  // Fetch profile separately (upsert with ignoreDuplicates doesn't return data)
  const { data, error } = await service
    .from("user_profiles")
    .select("phone, notification_phone, tier, alert_defaults, onboarding_completed_at")
    .eq("id", user.id)
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    email: user.email,
    phone: data.phone,
    notification_phone: data.notification_phone,
    tier: data.tier,
    alert_defaults: data.alert_defaults || {},
    onboarding_completed_at: data.onboarding_completed_at,
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Validate phone number format (E.164 or common US formats)
  const PHONE_RE = /^\+?1?\d{10,15}$/;
  if (body.phone !== undefined && body.phone !== null && body.phone !== "") {
    const cleaned = body.phone.replace(/[\s\-()]/g, "");
    if (!PHONE_RE.test(cleaned)) {
      return Response.json(
        { error: "Invalid phone number. Use format: +15551234567" },
        { status: 400 }
      );
    }
  }

  const allowed: Record<string, unknown> = {};
  if (body.phone !== undefined) {
    if (body.phone === "" || body.phone === null) {
      allowed.phone = null;
    } else {
      // Normalize to digits only, then prepend +1 if needed
      let cleaned = body.phone.replace(/[\s\-()]/g, "");
      if (!cleaned.startsWith("+")) {
        cleaned = cleaned.startsWith("1") ? `+${cleaned}` : `+1${cleaned}`;
      }
      allowed.phone = cleaned;
    }
  }

  if (body.alert_defaults !== undefined) {
    allowed.alert_defaults = body.alert_defaults;
  }

  if (body.onboarding_completed_at !== undefined) {
    allowed.onboarding_completed_at = body.onboarding_completed_at;
  }

  if (Object.keys(allowed).length === 0) {
    return Response.json({ error: "No fields to update" }, { status: 400 });
  }

  allowed.updated_at = new Date().toISOString();

  const service = createServiceClient();

  // Ensure profile exists
  await service
    .from("user_profiles")
    .upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true });

  const { data, error } = await service
    .from("user_profiles")
    .update(allowed)
    .eq("id", user.id)
    .select("phone, notification_phone, tier, alert_defaults, onboarding_completed_at")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    email: user.email,
    phone: data.phone,
    notification_phone: data.notification_phone,
    tier: data.tier,
    alert_defaults: data.alert_defaults || {},
    onboarding_completed_at: data.onboarding_completed_at,
  });
}
