export interface TeeTime {
  time: string; // "08:30"
  holes: number; // 9 | 18
  availableSpots: number;
  greenFee: number;
  cartFee?: number;
  raw: Record<string, unknown>;
}

export interface Course {
  id: string;
  name: string;
  platform: "foreup" | "chronogolf";
  platformCourseId: string;
  platformScheduleId: string | null;
  platformBookingClass: string | null;
  timezone: string;
  uaOverride: string | null;
  pollIntervalSeconds: number;
}
