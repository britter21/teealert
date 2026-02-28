import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-8 px-4 py-24 text-center md:py-32">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          Never miss a tee time again
        </h1>
        <p className="max-w-lg text-lg text-muted-foreground">
          TeeAlert monitors golf courses in Southern Utah and sends you instant
          alerts when tee times open up. Set your preferences and we handle the
          rest.
        </p>
        <div className="flex gap-3">
          <Button asChild size="lg">
            <Link href="/courses">Browse Courses</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">Get Started</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/40">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 py-16 sm:grid-cols-3 md:py-24">
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold">Real-time Monitoring</h3>
            <p className="text-sm text-muted-foreground">
              We poll booking platforms every few minutes so you know the moment
              a tee time opens up.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold">Smart Filters</h3>
            <p className="text-sm text-muted-foreground">
              Set alerts for specific dates, time windows, group sizes, price
              limits, and hole preferences.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold">Instant Notifications</h3>
            <p className="text-sm text-muted-foreground">
              Get notified via iMessage the second a matching tee time appears.
              Book before anyone else.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-4 py-16 md:py-24">
        <h2 className="mb-12 text-center text-2xl font-bold">How it works</h2>
        <div className="grid gap-8 sm:grid-cols-3">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
              1
            </div>
            <h3 className="font-semibold">Pick a course</h3>
            <p className="text-sm text-muted-foreground">
              Browse available courses and check live tee time availability.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
              2
            </div>
            <h3 className="font-semibold">Set an alert</h3>
            <p className="text-sm text-muted-foreground">
              Choose your date, time window, and group size. We start monitoring
              immediately.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
              3
            </div>
            <h3 className="font-semibold">Get notified</h3>
            <p className="text-sm text-muted-foreground">
              Receive an instant iMessage when a matching tee time opens up.
              Book it fast!
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-muted/40">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-16 text-center">
          <h2 className="text-2xl font-bold">Ready to tee off?</h2>
          <p className="text-muted-foreground">
            Sign up for free and create your first alert in under a minute.
          </p>
          <Button asChild size="lg">
            <Link href="/login">Get Started</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
