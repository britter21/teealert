import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";

interface CourseRow {
  id: string;
  name: string;
  platform: string;
  location_city: string | null;
  location_state: string | null;
  timezone: string;
  booking_window_days: number | null;
  is_active: boolean;
}

export const revalidate = 60;

export default async function CoursesPage() {
  const supabase = createServiceClient();

  const { data: courses } = await supabase
    .from("courses")
    .select(
      "id, name, platform, location_city, location_state, timezone, booking_window_days, is_active"
    )
    .eq("is_active", true)
    .order("name");

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:py-16">
      <div className="mb-10">
        <div className="accent-line mb-6" />
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--color-cream)] sm:text-4xl">
          Courses
        </h1>
        <p className="mt-3 max-w-lg text-[var(--color-sand-muted)]">
          Browse the courses we monitor. Click any course to view live tee
          time availability.
        </p>
      </div>

      {!courses || courses.length === 0 ? (
        <p className="text-[var(--color-sand-muted)]">
          No courses available yet.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(courses as CourseRow[]).map((course) => (
            <Link key={course.id} href={`/courses/${course.id}`}>
              <div className="course-card group flex h-full flex-col rounded-xl border border-[var(--color-sand)]/8 bg-[var(--color-surface)] p-6">
                <div className="mb-4 flex items-start justify-between">
                  <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-sand-bright)] transition-colors group-hover:text-[var(--color-cream)]">
                    {course.name}
                  </h2>
                  <div className="pulse-available ml-2 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[var(--color-sage)]" />
                </div>

                <p className="mb-5 text-sm text-[var(--color-sand-muted)]">
                  {[course.location_city, course.location_state]
                    .filter(Boolean)
                    .join(", ")}
                </p>

                <div className="mt-auto flex flex-wrap gap-2">
                  <Badge
                    variant="secondary"
                    className="border-0 bg-[var(--color-surface-raised)] text-xs text-[var(--color-sand-muted)]"
                  >
                    {course.platform}
                  </Badge>
                  {course.booking_window_days && (
                    <Badge
                      variant="outline"
                      className="border-[var(--color-sand)]/10 text-xs text-[var(--color-sand-muted)]"
                    >
                      {course.booking_window_days}-day window
                    </Badge>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
