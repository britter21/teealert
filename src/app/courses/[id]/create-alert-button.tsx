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

  // Default to tomorrow
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
        <Button>Create Alert</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Alert</DialogTitle>
          <DialogDescription>
            Get notified when tee times open up at {courseName}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="target_date">Date</Label>
            <Input
              id="target_date"
              type="date"
              value={form.target_date}
              onChange={(e) => update("target_date", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="earliest_time">Earliest time</Label>
              <Input
                id="earliest_time"
                type="time"
                value={form.earliest_time}
                onChange={(e) => update("earliest_time", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="latest_time">Latest time</Label>
              <Input
                id="latest_time"
                type="time"
                value={form.latest_time}
                onChange={(e) => update("latest_time", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="min_players">Min players</Label>
              <Input
                id="min_players"
                type="number"
                min="1"
                max="4"
                value={form.min_players}
                onChange={(e) => update("min_players", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="max_price">Max green fee ($)</Label>
              <Input
                id="max_price"
                type="number"
                min="0"
                placeholder="Any"
                value={form.max_price}
                onChange={(e) => update("max_price", e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Alert"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
