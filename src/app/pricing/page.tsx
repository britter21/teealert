import Link from "next/link";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with basic tee time alerts.",
    features: [
      "1 active alert",
      "Email notifications",
      "2,300+ courses",
      "Standard polling (60s)",
    ],
    cta: "Get Started",
    href: "/login",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$9.99",
    period: "/month",
    description: "For the dedicated golfer who plays every week.",
    features: [
      "10 active alerts",
      "SMS + Email notifications",
      "Faster polling (30s)",
      "All booking classes",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
    productId: process.env.POLAR_PRO_PRODUCT_ID,
    highlighted: true,
  },
  {
    name: "Birdie",
    price: "$19.99",
    period: "/month",
    description: "Unlimited alerts for the serious golfer.",
    features: [
      "Unlimited alerts",
      "SMS + Email + Push",
      "Fastest polling (15s)",
      "All booking classes",
      "Priority notifications",
      "Booking window countdown",
    ],
    cta: "Go Birdie",
    productId: process.env.POLAR_BIRDIE_PRODUCT_ID,
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:py-16">
      <div className="mb-12 text-center">
        <div className="accent-line mx-auto mb-6" />
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--color-cream)] sm:text-4xl">
          Simple pricing for every golfer
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[var(--color-sand-muted)]">
          Start free. Upgrade when you need more alerts, faster polling, or SMS
          notifications.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative flex flex-col rounded-xl border p-8 ${
              plan.highlighted
                ? "border-[var(--color-terracotta)]/40 bg-[var(--color-surface)] shadow-lg shadow-[var(--color-terracotta)]/5"
                : "border-[var(--color-sand)]/8 bg-[var(--color-surface)]"
            }`}
          >
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-[var(--color-terracotta)] px-3 py-1 text-xs font-medium tracking-wider uppercase text-white">
                  Most popular
                </span>
              </div>
            )}

            <div className="mb-6">
              <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--color-sand-bright)]">
                {plan.name}
              </h2>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-[family-name:var(--font-display)] text-4xl text-[var(--color-cream)]">
                  {plan.price}
                </span>
                <span className="text-sm text-[var(--color-sand-muted)]">
                  {plan.period}
                </span>
              </div>
              <p className="mt-3 text-sm text-[var(--color-sand-muted)]">
                {plan.description}
              </p>
            </div>

            <ul className="mb-8 flex-1 space-y-3">
              {plan.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-2.5 text-sm text-[var(--color-charcoal-text)]"
                >
                  <svg
                    className="h-4 w-4 flex-shrink-0 text-[var(--color-sage)]"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m4.5 12.75 6 6 9-13.5"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            {plan.productId ? (
              <Link href={`/api/checkout?products=${plan.productId}`}>
                <Button
                  className={`w-full ${
                    plan.highlighted
                      ? "bg-[var(--color-terracotta)] text-white hover:bg-[var(--color-terracotta-glow)]"
                      : "border-[var(--color-sand)]/10 text-[var(--color-sand)] hover:bg-[var(--color-surface-raised)]"
                  }`}
                  variant={plan.highlighted ? "default" : "outline"}
                >
                  {plan.cta}
                </Button>
              </Link>
            ) : (
              <Link href={plan.href || "/login"}>
                <Button
                  variant="outline"
                  className="w-full border-[var(--color-sand)]/10 text-[var(--color-sand)] hover:bg-[var(--color-surface-raised)]"
                >
                  {plan.cta}
                </Button>
              </Link>
            )}
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm text-[var(--color-sand-muted)]">
          All plans include access to 2,300+ golf courses across the country.
          <br />
          Cancel anytime. No questions asked.
        </p>
      </div>
    </div>
  );
}
