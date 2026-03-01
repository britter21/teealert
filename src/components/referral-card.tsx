"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface ReferralData {
  referral_code: string | null;
  referral_link: string | null;
  total_referrals: number;
  rewarded_months: number;
}

export function ReferralCard() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referrals")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data?.referral_link) return null;

  async function handleCopy() {
    if (!data?.referral_link) return;
    await navigator.clipboard.writeText(data.referral_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (!data?.referral_link) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Tee Time Hawk",
          text: "Get instant alerts when tee times open up at your favorite golf courses!",
          url: data.referral_link,
        });
      } catch {}
    } else {
      handleCopy();
    }
  }

  return (
    <div className="rounded-xl border border-[var(--color-sand)]/8 bg-[var(--color-surface)] p-6">
      <h2 className="mb-1 font-[family-name:var(--font-display)] text-lg text-[var(--color-sand-bright)]">
        Share with your foursome
      </h2>
      <p className="mb-4 text-sm text-[var(--color-sand-muted)]">
        When a friend subscribes, you both get a free month.
      </p>

      <div className="mb-4 flex items-center gap-2">
        <div className="flex-1 overflow-hidden rounded-lg bg-[var(--color-surface-raised)] px-3 py-2">
          <p className="truncate text-sm text-[var(--color-sand)]">
            {data.referral_link}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCopy}
          className="shrink-0 border-[var(--color-sand)]/10 text-xs text-[var(--color-sand)] hover:bg-[var(--color-surface-raised)]"
        >
          {copied ? "Copied!" : "Copy"}
        </Button>
        {"share" in navigator && (
          <Button
            size="sm"
            onClick={handleShare}
            className="shrink-0 bg-[var(--color-terracotta)] text-xs text-white hover:bg-[var(--color-terracotta-glow)]"
          >
            Share
          </Button>
        )}
      </div>

      {data.total_referrals > 0 && (
        <p className="text-xs text-[var(--color-sand-muted)]">
          {data.total_referrals} friend{data.total_referrals !== 1 ? "s" : ""}{" "}
          referred
          {data.rewarded_months > 0 &&
            ` · ${data.rewarded_months} free month${data.rewarded_months !== 1 ? "s" : ""} earned`}
        </p>
      )}
    </div>
  );
}
