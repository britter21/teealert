import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", user.id);

  if (error || !subs || subs.length === 0) {
    return NextResponse.json(
      { error: "No push subscriptions found. Enable push notifications first." },
      { status: 404 }
    );
  }

  webpush.setVapidDetails(
    "mailto:alerts@teetimehawk.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const payload = JSON.stringify({
    title: "Tee Time Hawk",
    body: "Push notifications are working! You'll receive alerts here when tee times match.",
    url: "/dashboard",
    tag: "test-push",
  });

  let sent = 0;
  const expiredIds: string[] = [];

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      );
      sent++;
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        expiredIds.push(sub.id);
      }
    }
  }

  if (expiredIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", expiredIds);
  }

  if (sent === 0) {
    return NextResponse.json(
      { error: "Push subscription expired. Please re-enable push notifications." },
      { status: 410 }
    );
  }

  return NextResponse.json({ ok: true, sent });
}
