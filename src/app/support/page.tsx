"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES = [
  { value: "missing_course", label: "Request a Course", description: "Tell us about a course you'd like us to add." },
  { value: "bug", label: "Report a Bug", description: "Something not working right? Let us know." },
  { value: "feature_request", label: "Feature Request", description: "Have an idea to make TeeAlert better?" },
  { value: "billing", label: "Billing Question", description: "Questions about your subscription or charges." },
  { value: "other", label: "Other", description: "Anything else we can help with." },
];

export default function SupportPage() {
  return (
    <Suspense>
      <SupportPageInner />
    </Suspense>
  );
}

function SupportPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const initialCategory = searchParams.get("category") || "";
  const [category, setCategory] = useState(
    CATEGORIES.some((c) => c.value === initialCategory) ? initialCategory : ""
  );
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseLocation, setCourseLocation] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");

  useEffect(() => {
    fetch("/api/user/profile")
      .then((res) => {
        if (res.status === 401) {
          setAuthed(false);
        } else {
          setAuthed(true);
        }
      })
      .catch(() => setAuthed(false));
  }, []);

  if (authed === null) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-sand)]/20 border-t-[var(--color-terracotta)]" />
          <span className="text-[var(--color-sand-muted)]">Loading...</span>
        </div>
      </div>
    );
  }

  if (authed === false) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10 md:py-16">
        <div className="mb-10">
          <div className="accent-line mb-6" />
          <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--color-cream)] sm:text-4xl">
            Support
          </h1>
          <p className="mt-3 text-[var(--color-sand-muted)]">
            Please log in to submit a support request.
          </p>
        </div>
        <Button
          onClick={() => router.push("/login?redirect=/support")}
          className="bg-[var(--color-terracotta)] text-white hover:bg-[var(--color-terracotta-glow)]"
        >
          Log In
        </Button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10 md:py-16">
        <div className="mb-10">
          <div className="accent-line mb-6" />
          <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--color-cream)] sm:text-4xl">
            Request Submitted
          </h1>
          <p className="mt-3 text-[var(--color-sand-muted)]">
            Thanks for reaching out! We'll look into this and get back to you.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => {
              setSubmitted(false);
              setCategory("");
              setSubject("");
              setMessage("");
              setCourseName("");
              setCourseLocation("");
              setBookingUrl("");
              setError("");
            }}
            variant="outline"
            className="border-[var(--color-sand)]/10 text-[var(--color-sand-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-sand)]"
          >
            Submit Another
          </Button>
          <Button
            onClick={() => router.push("/dashboard")}
            className="bg-[var(--color-terracotta)] text-white hover:bg-[var(--color-terracotta-glow)]"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const selectedCategory = CATEGORIES.find((c) => c.value === category);
  const isMissingCourse = category === "missing_course";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload: Record<string, string> = {
        category,
        subject,
        message,
      };
      if (isMissingCourse) {
        if (courseName) payload.course_name = courseName;
        if (courseLocation) payload.course_location = courseLocation;
        if (bookingUrl) payload.booking_url = bookingUrl;
      }

      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        router.push("/login?redirect=/support");
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");

      setSubmitted(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 md:py-16">
      <div className="mb-10">
        <div className="accent-line mb-6" />
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--color-cream)] sm:text-4xl">
          Support
        </h1>
        <p className="mt-3 text-[var(--color-sand-muted)]">
          Have a question, found a bug, or want us to add a course? Let us know.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-[var(--color-sand)]/8 bg-[var(--color-surface)] p-6"
      >
        {/* Category */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-[var(--color-sand-muted)]">
            What can we help with?
          </Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="border-[var(--color-sand)]/10 bg-[var(--color-surface-raised)] text-[var(--color-charcoal-text)]">
              <SelectValue placeholder="Select a category..." />
            </SelectTrigger>
            <SelectContent className="border-[var(--color-sand)]/10 bg-[var(--color-surface)] text-[var(--color-charcoal-text)]">
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedCategory && (
            <p className="text-xs text-[var(--color-sand-muted)]">
              {selectedCategory.description}
            </p>
          )}
        </div>

        {/* Missing course extra fields */}
        {isMissingCourse && (
          <div className="space-y-4 rounded-lg border border-[var(--color-sand)]/5 bg-[var(--color-surface-raised)]/50 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-sand-muted)]">
              Course Details
            </p>
            <div className="space-y-2">
              <Label
                htmlFor="course_name"
                className="text-sm text-[var(--color-sand-muted)]"
              >
                Course Name
              </Label>
              <Input
                id="course_name"
                placeholder="e.g. Pebble Beach Golf Links"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className="border-[var(--color-sand)]/10 bg-[var(--color-surface-raised)] text-[var(--color-charcoal-text)] placeholder:text-[var(--color-sand-muted)]/50"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="course_location"
                className="text-sm text-[var(--color-sand-muted)]"
              >
                Location
              </Label>
              <Input
                id="course_location"
                placeholder="e.g. Pebble Beach, CA"
                value={courseLocation}
                onChange={(e) => setCourseLocation(e.target.value)}
                className="border-[var(--color-sand)]/10 bg-[var(--color-surface-raised)] text-[var(--color-charcoal-text)] placeholder:text-[var(--color-sand-muted)]/50"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="booking_url"
                className="text-sm text-[var(--color-sand-muted)]"
              >
                Booking Website
              </Label>
              <Input
                id="booking_url"
                type="url"
                placeholder="e.g. https://www.pebblebeach.com/golf/booking"
                value={bookingUrl}
                onChange={(e) => setBookingUrl(e.target.value)}
                className="border-[var(--color-sand)]/10 bg-[var(--color-surface-raised)] text-[var(--color-charcoal-text)] placeholder:text-[var(--color-sand-muted)]/50"
              />
              <p className="text-xs text-[var(--color-sand-muted)]">
                If you know the course's online booking page, paste it here. This helps us add it faster.
              </p>
            </div>
          </div>
        )}

        {/* Subject */}
        <div className="space-y-2">
          <Label
            htmlFor="subject"
            className="text-xs uppercase tracking-wider text-[var(--color-sand-muted)]"
          >
            Subject
          </Label>
          <Input
            id="subject"
            required
            maxLength={200}
            placeholder={
              isMissingCourse
                ? "e.g. Please add Pebble Beach"
                : "Brief summary"
            }
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="border-[var(--color-sand)]/10 bg-[var(--color-surface-raised)] text-[var(--color-charcoal-text)] placeholder:text-[var(--color-sand-muted)]/50"
          />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <Label
            htmlFor="message"
            className="text-xs uppercase tracking-wider text-[var(--color-sand-muted)]"
          >
            Message
          </Label>
          <textarea
            id="message"
            required
            maxLength={5000}
            rows={4}
            placeholder={
              isMissingCourse
                ? "Any extra details — what platform they use, member vs public access, etc."
                : "Tell us more..."
            }
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex w-full rounded-md border border-[var(--color-sand)]/10 bg-[var(--color-surface-raised)] px-3 py-2 text-sm text-[var(--color-charcoal-text)] placeholder:text-[var(--color-sand-muted)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-terracotta)]/40"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-[var(--color-terracotta)]/20 bg-[var(--color-terracotta)]/5 px-4 py-3">
            <p className="text-sm text-[var(--color-terracotta)]">{error}</p>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={loading || !category}
            className="bg-[var(--color-terracotta)] text-white hover:bg-[var(--color-terracotta-glow)] disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      </form>
    </div>
  );
}
