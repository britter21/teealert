"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const plans = [
  {
    key: "starter",
    name: "Starter",
    price: "$2.99",
    period: "/month",
    description: "For casual golfers who want a heads-up on tee times.",
    features: [
      "2 active alerts",
      "SMS & Email notifications",
      "60-second polling",
      "All courses & booking classes",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    key: "unlimited",
    name: "Unlimited",
    price: "$4.99",
    period: "/month",
    description: "Unlimited alerts with real-time monitoring.",
    features: [
      "Unlimited active alerts",
      "SMS & Email notifications",
      "Real-time polling (15s)",
      "All courses & booking classes",
      "Priority notifications",
    ],
    cta: "Go Unlimited",
    highlighted: true,
  },
];

export default function PricingPage() {
  const [userTier, setUserTier] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data && data.tier) {
          setLoggedIn(true);
          setUserTier(data.tier);
        }
      })
      .catch(() => {});
  }, []);

  function getCta(planKey: string) {
    if (!loggedIn) {
      return { label: planKey === "unlimited" ? "Go Unlimited" : "Get Started", href: "/login" };
    }

    if (userTier === planKey) {
      return { label: "Current Plan", href: "/api/portal", isCurrentPlan: true };
    }

    if (planKey === "unlimited" && userTier === "starter") {
      return { label: "Upgrade", href: "/api/portal" };
    }

    if (planKey === "starter" && userTier === "unlimited") {
      return { label: "Manage Plan", href: "/api/portal" };
    }

    return { label: "Get Started", href: "/login" };
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 md:py-16">
      <div className="mb-12 text-center">
        <div className="accent-line mx-auto mb-6" />
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--color-cream)] sm:text-4xl">
          Simple, honest pricing
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[var(--color-sand-muted)]">
          Start with a free 14-day trial. No credit card required.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {plans.map((plan) => {
          const cta = getCta(plan.key);
          const isCurrent = loggedIn && userTier === plan.key;

          return (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-xl border p-8 ${
                isCurrent
                  ? "border-[var(--color-sage)]/40 bg-[var(--color-surface)] shadow-lg shadow-[var(--color-sage)]/5"
                  : plan.highlighted
                    ? "border-[var(--color-terracotta)]/40 bg-[var(--color-surface)] shadow-lg shadow-[var(--color-terracotta)]/5"
                    : "border-[var(--color-sand)]/8 bg-[var(--color-surface)]"
              }`}
            >
              {isCurrent ? (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-[var(--color-sage)] px-3 py-1 text-xs font-medium tracking-wider uppercase text-white">
                    Current plan
                  </span>
                </div>
              ) : plan.highlighted && !loggedIn ? (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-[var(--color-terracotta)] px-3 py-1 text-xs font-medium tracking-wider uppercase text-white">
                    Best value
                  </span>
                </div>
              ) : null}

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

              {cta.isCurrentPlan ? (
                <Button
                  asChild
                  variant="outline"
                  className="w-full border-[var(--color-sage)]/30 text-[var(--color-sage)] hover:bg-[var(--color-sage)]/5 hover:text-[var(--color-sage)]"
                >
                  <a href={cta.href}>{cta.label}</a>
                </Button>
              ) : (
                <Button
                  asChild
                  className={`w-full ${
                    plan.highlighted && !(loggedIn && userTier === "unlimited")
                      ? "bg-[var(--color-terracotta)] text-white hover:bg-[var(--color-terracotta-glow)]"
                      : "border-[var(--color-sand)]/10 text-[var(--color-sand)] hover:bg-[var(--color-surface-raised)]"
                  }`}
                  variant={plan.highlighted && !(loggedIn && userTier === "unlimited") ? "default" : "outline"}
                >
                  {cta.href.startsWith("/api") ? (
                    <a href={cta.href}>{cta.label}</a>
                  ) : (
                    <Link href={cta.href}>{cta.label}</Link>
                  )}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm text-[var(--color-sand-muted)]">
          All plans include a 14-day free trial with full Unlimited access.
          <br />
          Cancel anytime. No questions asked.
        </p>
      </div>
    </div>
  );
}
