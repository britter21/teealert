"use client";

import { useState } from "react";
import Link from "next/link";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: { category: string; items: FAQItem[] }[] = [
  {
    category: "Getting Started",
    items: [
      {
        question: "What is Tee Time Hawk?",
        answer:
          "Tee Time Hawk monitors golf course booking systems and sends you instant notifications when tee times matching your preferences become available. Set your course, date, time window, and player count\u2014we handle the rest.",
      },
      {
        question: "How do I create an alert?",
        answer:
          "Browse our course directory, select a course, and tap \"Create Alert.\" Choose your target date, time window, number of players, and notification preferences. Once saved, we start monitoring automatically.",
      },
      {
        question: "Which courses are supported?",
        answer:
          "We currently support courses on ForeUp and Chronogolf booking platforms, covering thousands of courses across the US. If your course isn't listed, you can request it from the courses page and we'll look into adding it.",
      },
      {
        question: "Is there a free trial?",
        answer:
          "Yes! Every new account gets a 14-day free trial with full Unlimited access\u2014no credit card required. After the trial, you can choose the Starter or Unlimited plan.",
      },
    ],
  },
  {
    category: "Alerts & Notifications",
    items: [
      {
        question: "How quickly will I be notified?",
        answer:
          "Unlimited plan users get 15-second polling\u2014we check for new tee times every 15 seconds. Starter plan users get 60-second polling. As soon as a matching tee time appears, you'll receive a notification within seconds.",
      },
      {
        question: "What notification channels are available?",
        answer:
          "We support iMessage, email, and push notifications. You can enable or disable each channel in Settings. iMessage requires a US phone number and an Apple device. Push notifications require installing the app to your home screen.",
      },
      {
        question: "What is a recurring alert?",
        answer:
          "A recurring alert repeats every week on the days you choose. For example, if you play every Saturday morning, set a recurring alert for Saturdays and it will automatically monitor each upcoming Saturday for you\u2014no need to create a new alert each week. After we find tee times and notify you for this Saturday, the alert moves to next Saturday and keeps going. Recurring alerts are available on the Unlimited plan.",
      },
      {
        question: "What does \"Start monitoring\" mean?",
        answer:
          "This lets you control when we start checking for tee times. \"Immediately\" means we start looking right away. Other options delay monitoring until closer to your tee time date. For example, if your target date is March 15 and you choose \"1 week,\" we won't start checking until March 8. This is useful if you're a last-minute planner and don't want alerts weeks in advance, or if you'd rather not commit to a booking too far ahead\u2014maybe you're not sure if you can play until closer to the date, or you don't want to get charged for a round you might not make.",
      },
      {
        question: "What happens after an alert is triggered?",
        answer:
          "For one-time alerts, we send your notification and keep monitoring\u2014if more tee times open up later, you'll get another alert. The alert stays active until the date passes. For recurring alerts, we send the notification and automatically advance to the next matching day. You can view your full notification history from the dashboard.",
      },
    ],
  },
  {
    category: "Plans & Billing",
    items: [
      {
        question: "What's the difference between Starter and Unlimited?",
        answer:
          "Starter ($2.99/mo) gives you 2 active alerts with 60-second polling. Unlimited ($4.99/mo) gives you unlimited alerts, recurring weekly alerts, 15-second real-time polling, and priority notifications. Both plans include all notification channels and all courses.",
      },
      {
        question: "How do I upgrade or downgrade my plan?",
        answer:
          "Go to Settings and click \"Manage Plan\" next to your current plan, or visit the Pricing page. You'll be taken to our billing portal where you can change your subscription at any time.",
      },
      {
        question: "Can I cancel anytime?",
        answer:
          "Yes. You can cancel your subscription at any time from the billing portal. Your access continues through the end of your current billing period. No questions asked.",
      },
    ],
  },
  {
    category: "App & Technical",
    items: [
      {
        question: "How do I install the app on my phone?",
        answer:
          "On iPhone (iOS 26+): open teetimehawk.com in Safari, tap the \u2022\u2022\u2022 menu in the address bar, tap the Share icon, then \"Add to Home Screen.\" On Android: tap the browser menu and select \"Install app\" or \"Add to Home Screen.\"",
      },
      {
        question: "Why aren't push notifications working?",
        answer:
          "Push notifications require installing the app to your home screen first. After installing, go to Settings and enable push notifications under Notification Channels. Make sure notifications are also allowed in your device settings.",
      },
      {
        question: "What does the live tee times view show?",
        answer:
          "The live view shows real-time availability for a course on a specific date. It refreshes every 15 seconds and lets you filter by player count. Tee times shown as \"Open\" have availability but the exact count isn't known. You can click \"Book tee time\" to go directly to the booking page.",
      },
      {
        question: "My course shows \"No tee times available.\" Why?",
        answer:
          "This usually means the course hasn't released tee times for that date yet, or all times are booked. Try a different date. Some courses only release times a few days in advance\u2014that's exactly what alerts are for!",
      },
    ],
  },
];

function FAQAccordionItem({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-[var(--color-sand)]/8 last:border-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-sm font-medium text-[var(--color-sand-bright)]">
          {item.question}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-[var(--color-sand-muted)] transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      <div
        className={`grid transition-all duration-200 ${
          open ? "grid-rows-[1fr] pb-4" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <p className="text-sm leading-relaxed text-[var(--color-sand-muted)]">
            {item.answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10 md:py-16">
      <div className="mb-12 text-center">
        <div className="accent-line mx-auto mb-6" />
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--color-cream)] sm:text-4xl">
          Frequently Asked Questions
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[var(--color-sand-muted)]">
          Everything you need to know about Tee Time Hawk.
        </p>
      </div>

      <div className="space-y-8">
        {faqs.map((section) => (
          <div key={section.category}>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg text-[var(--color-sand-bright)]">
              {section.category}
            </h2>
            <div className="rounded-xl border border-[var(--color-sand)]/8 bg-[var(--color-surface)] px-5">
              {section.items.map((item) => (
                <FAQAccordionItem key={item.question} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-xl border border-[var(--color-sand)]/8 bg-[var(--color-surface)] px-6 py-8 text-center">
        <p className="mb-1 text-sm font-medium text-[var(--color-sand-bright)]">
          Still have questions?
        </p>
        <p className="mb-4 text-sm text-[var(--color-sand-muted)]">
          We&apos;re here to help.
        </p>
        <Link
          href="/support"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-terracotta)] hover:text-[var(--color-terracotta-glow)]"
        >
          Contact Support
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
