"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Props {
  courseId: string;
  courseName: string;
}

export function CreateAlertButton({ courseId, courseName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split("T")[0];

  const [form, setForm] = useState({
    target_date: defaultDate,
    earliest_time: "06:00",
    latest_time: "18:00",
    min_players: "1",
    max_price: "",
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: courseId,
          target_date: form.target_date,
          earliest_time: form.earliest_time || null,
          latest_time: form.latest_time || null,
          min_players: Number(form.min_players) || 1,
          max_price: form.max_price ? Number(form.max_price) : null,
          holes: [9, 18],
          notify_sms: true,
          notify_email: false,
        }),
      });

      if (res.status === 401) {
        router.push("/login?redirect=/courses/" + courseId);
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create alert");

      setOpen(false);
      router.push("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[var(--color-terracotta)] text-white hover:bg-[var(--color-terracotta-glow)]">
          <svg
            className="mr-2 h-4 w-4"
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
          Create Alert
        </Button>
      </DialogTrigger>
      <DialogContent className="border-[var(--color-sand)]/10 bg-[var(--color-surface)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-display)] text-xl text-[var(--color-cream)]">
            Create Alert
          </DialogTitle>
          <DialogDescription className="text-[var(--color-sand-muted)]">
            Get notified when tee times open up at {courseName}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-5 pt-2">
          <div className="grid gap-2">
            <Label
              htmlFor="target_date"
              className="text-xs uppercase tracking-wider text-[var(--color-sand-muted)]"
            >
              Date
            </Label>
            <Input
              id="target_date"
              type="date"
              value={form.target_date}
              onChange={(e) => update("target_date", e.target.value)}
              required
              className="border-[var(--color-sand)]/10 bg-[var(--color-surface-raised)] text-[var(--color-charcoal-text)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label
                htmlFor="earliest_time"
                className="text-xs uppercase tracking-wider text-[var(--color-sand-muted)]"
              >
                Earliest time
              </Label>
              <Input
                id="earliest_time"
                type="time"
                value={form.earliest_time}
                onChange={(e) => update("earliest_time", e.target.value)}
                className="border-[var(--color-sand)]/10 bg-[var(--color-surface-raised)] text-[var(--color-charcoal-text)]"
              />
            </div>
            <div className="grid gap-2">
              <Label
                htmlFor="latest_time"
                className="text-xs uppercase tracking-wider text-[var(--color-sand-muted)]"
              >
                Latest time
              </Label>
              <Input
                id="latest_time"
                type="time"
                value={form.latest_time}
                onChange={(e) => update("latest_time", e.target.value)}
                className="border-[var(--color-sand)]/10 bg-[var(--color-surface-raised)] text-[var(--color-charcoal-text)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label
                htmlFor="min_players"
                className="text-xs uppercase tracking-wider text-[var(--color-sand-muted)]"
              >
                Min players
              </Label>
              <Input
                id="min_players"
                type="number"
                min="1"
                max="4"
                value={form.min_players}
                onChange={(e) => update("min_players", e.target.value)}
                className="border-[var(--color-sand)]/10 bg-[var(--color-surface-raised)] text-[var(--color-charcoal-text)]"
              />
            </div>
            <div className="grid gap-2">
              <Label
                htmlFor="max_price"
                className="text-xs uppercase tracking-wider text-[var(--color-sand-muted)]"
              >
                Max green fee ($)
              </Label>
              <Input
                id="max_price"
                type="number"
                min="0"
                placeholder="Any"
                value={form.max_price}
                onChange={(e) => update("max_price", e.target.value)}
                className="border-[var(--color-sand)]/10 bg-[var(--color-surface-raised)] text-[var(--color-charcoal-text)] placeholder:text-[var(--color-sand-muted)]/50"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-[var(--color-terracotta)]/20 bg-[var(--color-terracotta)]/5 px-4 py-3">
              <p className="text-sm text-[var(--color-terracotta)]">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="bg-[var(--color-terracotta)] text-white hover:bg-[var(--color-terracotta-glow)] disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Alert"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
