import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { Nav } from "@/components/nav";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PostHogProvider } from "@/components/posthog-provider";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tee Time Hawk — Instant Tee Time Alerts",
  description:
    "Get instant alerts when tee times open up at your favorite golf courses. Set your preferences and never miss a tee time again.",
  manifest: "/manifest.json",
  themeColor: "#4a9e6a",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Tee Time Hawk",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${playfair.variable} ${dmSans.variable} antialiased`}
      >
        <Suspense>
        <PostHogProvider>
        <TooltipProvider>
        <Nav />
        <main>{children}</main>

        {/* Footer */}
        <footer className="border-t border-white/5 bg-[var(--color-surface)]">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-10 text-center text-sm text-[var(--color-sand-muted)] sm:flex-row sm:justify-between sm:text-left">
            <p className="font-[family-name:var(--font-display)] text-base tracking-wide text-[var(--color-sand)]">
              Tee Time Hawk
            </p>
            <div className="flex items-center gap-4">
              <Link href="/faq" className="hover:text-[var(--color-sand)]">FAQ</Link>
              <Link href="/support" className="hover:text-[var(--color-sand)]">Support</Link>
              <Link href="/privacy" className="hover:text-[var(--color-sand)]">Privacy</Link>
              <Link href="/terms" className="hover:text-[var(--color-sand)]">Terms</Link>
            </div>
          </div>
        </footer>
        </TooltipProvider>
        </PostHogProvider>
        </Suspense>
      </body>
    </html>
  );
}
