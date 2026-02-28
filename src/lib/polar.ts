import { Polar } from "@polar-sh/sdk";

export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: (process.env.POLAR_MODE as "sandbox" | "production") || "sandbox",
});

// Subscription tier definitions
export const TIERS = {
  starter: {
    name: "Starter",
    maxAlerts: 2,
    channels: ["email", "sms"] as const,
    pollIntervalSeconds: 60,
  },
  unlimited: {
    name: "Unlimited",
    maxAlerts: Infinity,
    channels: ["email", "sms"] as const,
    pollIntervalSeconds: 15,
  },
} as const;

export type TierName = keyof typeof TIERS;

// Free trial duration in days
export const FREE_TRIAL_DAYS = 14;

export function getTierLimits(tier: string) {
  if (tier in TIERS) {
    return TIERS[tier as TierName];
  }
  // Legacy tiers map to new ones
  if (tier === "free") return TIERS.starter;
  if (tier === "pro") return TIERS.unlimited;
  if (tier === "birdie") return TIERS.unlimited;
  return TIERS.starter;
}
