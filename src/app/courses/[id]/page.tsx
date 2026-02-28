import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { TeeTimeTable } from "./tee-time-table";
import { CreateAlertButton } from "./create-alert-button";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CourseDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .single();

  if (!course) notFound();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split("T")[0];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:py-16">
      <div className="mb-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="accent-line mb-5" />
            <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--color-cream)] sm:text-4xl">
              {course.name}
            </h1>
            <p className="mt-2 text-[var(--color-sand-muted)]">
              {[course.location_city, course.location_state]
                .filter(Boolean)
                .join(", ")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
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
                  {course.booking_window_days}-day booking window
                </Badge>
              )}
              <Badge
                variant="outline"
                className="border-[var(--color-sand)]/10 text-xs text-[var(--color-sand-muted)]"
              >
                {course.timezone}
              </Badge>
            </div>
          </div>
          <CreateAlertButton courseId={course.id} courseName={course.name} bookingWindowDays={course.booking_window_days} />
        </div>
      </div>

      <TeeTimeTable
        courseId={course.id}
        defaultDate={defaultDate}
        platform={course.platform}
        platformCourseId={course.platform_course_id}
        bookingSlug={course.booking_slug}
      />
    </div>
  );
}
