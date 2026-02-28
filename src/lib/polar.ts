import { Polar } from "@polar-sh/sdk";

export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: (process.env.POLAR_MODE as "sandbox" | "production") || "sandbox",
});

// Subscription tier definitions
export const TIERS = {
  free: {
    name: "Free",
    maxAlerts: 1,
    channels: ["email"] as const,
    pollIntervalSeconds: 60,
  },
  pro: {
    name: "Pro",
    maxAlerts: 10,
    channels: ["email", "sms"] as const,
    pollIntervalSeconds: 30,
  },
  birdie: {
    name: "Birdie",
    maxAlerts: Infinity,
    channels: ["email", "sms", "push"] as const,
    pollIntervalSeconds: 15,
  },
} as const;

export type TierName = keyof typeof TIERS;

export function getTierLimits(tier: TierName) {
  return TIERS[tier];
}
