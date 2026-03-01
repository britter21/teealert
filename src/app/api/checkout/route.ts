import { Checkout } from "@polar-sh/nextjs";
import { checkoutRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

const polarCheckout = Checkout({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  successUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://teetimehawk.com"}/confirmation?checkout_id={CHECKOUT_ID}`,
  server: (process.env.POLAR_MODE as "sandbox" | "production") || "sandbox",
});

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const rl = await checkoutRateLimit.limit(ip);
  if (!rl.success) return rateLimitResponse(rl.reset);

  return polarCheckout(request);
}
