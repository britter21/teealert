import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export const revalidate = 60; // ISR: revalidate every 60s

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
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
        <p className="mt-2 text-muted-foreground">
          Browse golf courses we monitor. Click a course to view live tee time
          availability.
        </p>
      </div>

      {!courses || courses.length === 0 ? (
        <p className="text-muted-foreground">No courses available yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(courses as CourseRow[]).map((course) => (
            <Link key={course.id} href={`/courses/${course.id}`}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{course.name}</CardTitle>
                  <CardDescription>
                    {[course.location_city, course.location_state]
                      .filter(Boolean)
                      .join(", ")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{course.platform}</Badge>
                    {course.booking_window_days && (
                      <Badge variant="outline">
                        {course.booking_window_days}-day window
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
