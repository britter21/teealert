import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendPlainIMessage } from "@/lib/notifications/imessage";

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  const { data: profile } = await service
    .from("user_profiles")
    .select("phone")
    .eq("id", user.id)
    .single();

  if (!profile?.phone) {
    return Response.json(
      { error: "No phone number on file" },
      { status: 400 }
    );
  }

  try {
    await sendPlainIMessage(
      profile.phone,
      "Tee Time Hawk: Your phone number has been saved. You'll receive tee time alerts here."
    );
    return Response.json({ ok: true });
  } catch (err) {
    console.error("Test iMessage failed:", err);
    return Response.json(
      { error: "Failed to send test message." },
      { status: 500 }
    );
  }
}
