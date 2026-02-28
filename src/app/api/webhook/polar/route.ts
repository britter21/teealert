import { Webhooks } from "@polar-sh/nextjs";
import { createServiceClient } from "@/lib/supabase/server";

function tierFromProductName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("unlimited") || lower.includes("birdie")) return "unlimited";
  if (lower.includes("starter") || lower.includes("pro")) return "starter";
  return "starter";
}

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,

  onSubscriptionCreated: async (payload) => {
    const sub = payload.data;
    const userId = sub.customer?.externalId;
    if (!userId) return;

    const supabase = createServiceClient();
    const tier = tierFromProductName(sub.product?.name || "");

    await supabase.from("subscriptions").upsert({
      id: sub.id,
      user_id: userId,
      polar_customer_id: sub.customer?.id,
      polar_product_id: sub.product?.id,
      tier,
      status: "active",
      current_period_start: sub.currentPeriodStart,
      current_period_end: sub.currentPeriodEnd,
    });

    await supabase
      .from("user_profiles")
      .update({ tier })
      .eq("id", userId);
  },

  onSubscriptionActive: async (payload) => {
    const sub = payload.data;
    const userId = sub.customer?.externalId;
    if (!userId) return;

    const supabase = createServiceClient();
    const tier = tierFromProductName(sub.product?.name || "");

    await supabase
      .from("subscriptions")
      .update({
        status: "active",
        tier,
        current_period_start: sub.currentPeriodStart,
        current_period_end: sub.currentPeriodEnd,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sub.id);

    await supabase
      .from("user_profiles")
      .update({ tier })
      .eq("id", userId);
  },

  onSubscriptionCanceled: async (payload) => {
    const sub = payload.data;
    const supabase = createServiceClient();

    await supabase
      .from("subscriptions")
      .update({
        status: "canceled",
        cancel_at_period_end: true,
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sub.id);
  },

  onSubscriptionRevoked: async (payload) => {
    const sub = payload.data;
    const userId = sub.customer?.externalId;
    const supabase = createServiceClient();

    await supabase
      .from("subscriptions")
      .update({
        status: "revoked",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sub.id);

    // Downgrade user to starter tier
    if (userId) {
      await supabase
        .from("user_profiles")
        .update({ tier: "starter" })
        .eq("id", userId);
    }
  },

  onSubscriptionUncanceled: async (payload) => {
    const sub = payload.data;
    const supabase = createServiceClient();

    await supabase
      .from("subscriptions")
      .update({
        status: "active",
        cancel_at_period_end: false,
        canceled_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sub.id);
  },
});
