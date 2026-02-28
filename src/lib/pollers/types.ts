export interface TeeTime {
  time: string; // "08:30"
  holes: number; // 9 | 18
  availableSpots: number;
  greenFee: number;
  cartFee?: number;
  raw: Record<string, unknown>;
}

// Matches Supabase snake_case column names
export interface Course {
  id: string;
  name: string;
  platform: "foreup" | "chronogolf";
  platform_course_id: string;
  platform_schedule_id: string | null;
  platform_booking_class: string | null;
  timezone: string;
  ua_override: string | null;
  poll_interval_seconds: number;
  booking_slug: string | null;
}
