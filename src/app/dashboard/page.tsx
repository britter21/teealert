"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Alert {
  id: string;
  course_id: string;
  target_date: string;
  earliest_time: string | null;
  latest_time: string | null;
  min_players: number;
  max_price: number | null;
  holes: number[] | null;
  is_active: boolean;
  triggered_at: string | null;
  created_at: string;
  courses: {
    name: string;
    platform: string;
    location_city: string | null;
    location_state: string | null;
  };
}

export default function DashboardPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  async function handleDelete(id: string) {
    await fetch(`/api/alerts/${id}`, { method: "DELETE" });
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  const activeAlerts = alerts.filter((a) => a.is_active && !a.triggered_at);
  const triggeredAlerts = alerts.filter((a) => a.triggered_at);
  const inactiveAlerts = alerts.filter((a) => !a.is_active && !a.triggered_at);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-muted-foreground">Loading alerts...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your tee time alerts.
          </p>
        </div>
        <Button asChild>
          <Link href="/courses">Create Alert</Link>
        </Button>
      </div>

      {alerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <p className="text-muted-foreground">No alerts yet.</p>
            <Button asChild>
              <Link href="/courses">Browse courses to create your first alert</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {activeAlerts.length > 0 && (
            <AlertSection
              title="Active Alerts"
              description="Monitoring for new tee times"
              alerts={activeAlerts}
              onDelete={handleDelete}
            />
          )}
          {triggeredAlerts.length > 0 && (
            <AlertSection
              title="Triggered"
              description="Alerts that found matching tee times"
              alerts={triggeredAlerts}
              onDelete={handleDelete}
            />
          )}
          {inactiveAlerts.length > 0 && (
            <AlertSection
              title="Inactive"
              description="Paused or expired alerts"
              alerts={inactiveAlerts}
              onDelete={handleDelete}
            />
          )}
        </div>
      )}
    </div>
  );
}

function AlertSection({
  title,
  description,
  alerts,
  onDelete,
}: {
  title: string;
  description: string;
  alerts: Alert[];
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold">{title}</h2>
      <p className="mb-4 text-sm text-muted-foreground">{description}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {alerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

function AlertCard({
  alert,
  onDelete,
}: {
  alert: Alert;
  onDelete: (id: string) => void;
}) {
  const course = alert.courses;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">
              <Link
                href={`/courses/${alert.course_id}`}
                className="hover:underline"
              >
                {course?.name || "Unknown Course"}
              </Link>
            </CardTitle>
            <CardDescription>
              {course?.location_city}, {course?.location_state}
            </CardDescription>
          </div>
          {alert.triggered_at ? (
            <Badge className="bg-green-600 text-white hover:bg-green-600">
              Triggered
            </Badge>
          ) : alert.is_active ? (
            <Badge>Active</Badge>
          ) : (
            <Badge variant="secondary">Inactive</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Date: </span>
            {alert.target_date}
          </div>
          <div>
            <span className="text-muted-foreground">Players: </span>
            {alert.min_players}+
          </div>
          <div>
            <span className="text-muted-foreground">Time: </span>
            {alert.earliest_time || "Any"} - {alert.latest_time || "Any"}
          </div>
          <div>
            <span className="text-muted-foreground">Max price: </span>
            {alert.max_price ? `$${alert.max_price}` : "Any"}
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(alert.id)}
          >
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
