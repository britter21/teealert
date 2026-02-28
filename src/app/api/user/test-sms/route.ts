import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendIMessage } from "@/lib/notifications/imessage";

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
    // Send a simple confirmation — reuse sendIMessage's underlying osascript approach
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);

    const message =
      "TeeAlert: Your phone number has been saved. You'll receive tee time alerts here.";
    const escaped = message.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

    const script = `tell application "Messages"
  set targetService to 1st account whose service type = iMessage
  set targetBuddy to participant "${profile.phone}" of targetService
  send "${escaped}" to targetBuddy
end tell`;

    await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, {
      timeout: 10000,
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Test iMessage failed:", err);
    return Response.json(
      { error: "Failed to send test message. Make sure your number supports iMessage." },
      { status: 500 }
    );
  }
}
