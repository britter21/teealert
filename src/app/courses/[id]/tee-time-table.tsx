"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TeeTime {
  time: string;
  holes: number;
  availableSpots: number;
  greenFee: number;
  cartFee?: number;
}

interface Props {
  courseId: string;
  defaultDate: string;
}

export function TeeTimeTable({ courseId, defaultDate }: Props) {
  const [date, setDate] = useState(defaultDate);
  const [times, setTimes] = useState<TeeTime[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchTimes = useCallback(async (d: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/courses/${courseId}/availability?date=${d}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
      setTimes(data.times || []);
    } catch (err) {
      setError((err as Error).message);
      setTimes([]);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchTimes(date);
  }, [date, fetchTimes]);

  return (
    <div>
      <div className="mb-4 flex items-end gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
          />
        </div>
        {loading && (
          <p className="text-sm text-muted-foreground">Loading...</p>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {!loading && times.length === 0 && !error && (
        <p className="text-muted-foreground">
          No tee times available for this date.
        </p>
      )}

      {times.length > 0 && (
        <>
          <div className="mb-3 flex items-center gap-2">
            <Badge variant="secondary">{times.length} tee times</Badge>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Holes</TableHead>
                  <TableHead>Spots</TableHead>
                  <TableHead>Green Fee</TableHead>
                  <TableHead>Cart Fee</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {times.map((t, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{t.time}</TableCell>
                    <TableCell>{t.holes}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          t.availableSpots >= 4
                            ? "default"
                            : t.availableSpots > 0
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {t.availableSpots}
                      </Badge>
                    </TableCell>
                    <TableCell>${t.greenFee}</TableCell>
                    <TableCell>
                      {t.cartFee != null ? `$${t.cartFee}` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
