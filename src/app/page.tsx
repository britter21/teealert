import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="hero-glow relative overflow-hidden">
        {/* Subtle decorative elements */}
        <div className="pointer-events-none absolute right-0 top-0 h-[500px] w-[500px] -translate-y-1/4 translate-x-1/4 rounded-full bg-[var(--color-terracotta)]/8 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-[400px] w-[400px] translate-y-1/4 -translate-x-1/4 rounded-full bg-[var(--color-sage)]/5 blur-[100px]" />

        <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-6 py-28 text-center md:py-40">
          <div className="animate-fade-up">
            <span className="mb-4 inline-block rounded-full border border-[var(--color-sand)]/20 bg-[var(--color-surface-raised)]/60 px-4 py-1.5 text-xs font-medium tracking-widest uppercase text-[var(--color-sand-muted)]">
              Real-time tee time alerts
            </span>
          </div>

          <h1 className="animate-fade-up delay-100 max-w-3xl font-[family-name:var(--font-display)] text-4xl leading-tight tracking-tight text-[var(--color-cream)] sm:text-5xl md:text-6xl">
            Never miss a{" "}
            <span className="bg-gradient-to-r from-[var(--color-terracotta)] to-[var(--color-sand)] bg-clip-text text-transparent">
              tee time
            </span>{" "}
            again
          </h1>

          <p className="animate-fade-up delay-200 max-w-lg text-lg leading-relaxed text-[var(--color-sand-muted)]">
            TeeAlert monitors your favorite courses and sends instant
            alerts when tee times open up. Set your preferences once and
            we handle the rest.
          </p>

          <div className="animate-fade-up delay-300 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="bg-[var(--color-terracotta)] px-8 text-white hover:bg-[var(--color-terracotta-glow)]"
            >
              <Link href="/courses">Browse Courses</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-[var(--color-sand)]/20 px-8 text-[var(--color-sand)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-sand-bright)]"
            >
              <Link href="/login">Get Started</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-white/5 bg-[var(--color-surface)]">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="mb-14 text-center">
            <div className="accent-line mx-auto mb-6" />
            <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--color-bone)] sm:text-3xl">
              How it works
            </h2>
          </div>

          <div className="grid gap-10 sm:grid-cols-3 sm:gap-8">
            {[
              {
                step: "01",
                title: "Pick a course",
                desc: "Browse golf courses and check live tee time availability across multiple booking platforms.",
              },
              {
                step: "02",
                title: "Set an alert",
                desc: "Choose your date, time window, and group size. We start monitoring the course immediately.",
              },
              {
                step: "03",
                title: "Get notified",
                desc: "Receive an instant notification the moment a matching tee time opens up. Book it before anyone else.",
              },
            ].map((item, i) => (
              <div
                key={item.step}
                className={`animate-fade-up delay-${(i + 1) * 100} flex flex-col gap-4`}
              >
                <span className="font-[family-name:var(--font-display)] text-4xl font-light text-[var(--color-terracotta)]/40">
                  {item.step}
                </span>
                <h3 className="text-lg font-medium text-[var(--color-sand-bright)]">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--color-sand-muted)]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features detail */}
      <section className="border-t border-white/5">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 sm:grid-cols-3 sm:gap-8 md:py-28">
          {[
            {
              icon: (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
              ),
              title: "Real-time Monitoring",
              desc: "We poll booking platforms every few minutes so you know the moment a tee time opens up.",
            },
            {
              icon: (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"
                  />
                </svg>
              ),
              title: "Smart Filters",
              desc: "Set alerts for specific dates, time windows, group sizes, price limits, and hole preferences.",
            },
            {
              icon: (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                  />
                </svg>
              ),
              title: "Instant Notifications",
              desc: "Get notified the second a matching tee time appears. Book before anyone else.",
            },
          ].map((feature) => (
            <div key={feature.title} className="flex flex-col gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--color-sand)]/10 bg-[var(--color-surface-raised)] text-[var(--color-terracotta)]">
                {feature.icon}
              </div>
              <h3 className="font-medium text-[var(--color-sand-bright)]">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--color-sand-muted)]">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/5 bg-[var(--color-surface)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-20 text-center md:py-28">
          <div className="accent-line mx-auto" />
          <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--color-bone)] sm:text-3xl">
            Ready to tee off?
          </h2>
          <p className="max-w-md text-[var(--color-sand-muted)]">
            Start your free trial and create your first alert in under a minute.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-[var(--color-terracotta)] px-10 text-white hover:bg-[var(--color-terracotta-glow)]"
          >
            <Link href="/login">Get Started</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
