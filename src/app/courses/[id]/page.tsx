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

  // Default to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split("T")[0];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{course.name}</h1>
            <p className="mt-1 text-muted-foreground">
              {[course.location_city, course.location_state]
                .filter(Boolean)
                .join(", ")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary">{course.platform}</Badge>
              {course.booking_window_days && (
                <Badge variant="outline">
                  {course.booking_window_days}-day booking window
                </Badge>
              )}
              <Badge variant="outline">{course.timezone}</Badge>
            </div>
          </div>
          <CreateAlertButton courseId={course.id} courseName={course.name} />
        </div>
      </div>

      <TeeTimeTable courseId={course.id} defaultDate={defaultDate} />
    </div>
  );
}
