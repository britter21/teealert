"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import posthog from "posthog-js";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CourseRow {
  id: string;
  name: string;
  platform: string;
  location_city: string | null;
  location_state: string | null;
  timezone: string;
  is_active: boolean;
  distance_miles?: number;
}

const PAGE_SIZE = 24;

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [query, setQuery] = useState("");
  const [state, setState] = useState("");
  const [states, setStates] = useState<string[]>([]);
  const [offset, setOffset] = useState(0);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoActive, setGeoActive] = useState(false);
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Fetch states for dropdown
  useEffect(() => {
    fetch("/api/courses/states")
      .then((r) => r.json())
      .then((data) => setStates(data))
      .catch(() => {});
  }, []);

  const fetchCourses = useCallback(
    async (
      q: string,
      st: string,
      off: number,
      append: boolean,
      coords?: { lat: number; lng: number } | null
    ) => {
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(off),
        });
        if (q) params.set("q", q);
        if (st) params.set("state", st);
        if (coords) {
          params.set("lat", String(coords.lat));
          params.set("lng", String(coords.lng));
          params.set("radius", "50");
        }

        const res = await fetch(`/api/courses?${params}`);
        const data = await res.json();

        if (append) {
          setCourses((prev) => [...prev, ...(data.courses || [])]);
        } else {
          setCourses(data.courses || []);
        }
        setTotal(data.total || 0);
        setOffset(off + PAGE_SIZE);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  // Initial load
  useEffect(() => {
    fetchCourses("", "", 0, false, null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // On state filter change
  useEffect(() => {
    if (geoActive) return; // Don't override geo search with state change
    fetchCourses(query, state, 0, false, null);
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  function handleSearchChange(value: string) {
    setQuery(value);
    setGeoActive(false);
    setUserCoords(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchCourses(value, state, 0, false, null);
      if (value) posthog.capture("courses_searched", { query: value });
    }, 300);
  }

  function handleStateChange(value: string) {
    setState(value);
    setGeoActive(false);
    setUserCoords(null);
    setQuery("");
    fetchCourses("", value, 0, false, null);
    if (value) posthog.capture("courses_filtered_by_state", { state: value });
  }

  function handleNearMe() {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        setGeoActive(true);
        setQuery("");
        setState("");
        setGeoLoading(false);
        fetchCourses("", "", 0, false, coords);
        posthog.capture("courses_filtered_near_me");
      },
      () => {
        setGeoLoading(false);
      }
    );
  }

  function clearGeo() {
    setGeoActive(false);
    setUserCoords(null);
    setQuery("");
    setState("");
    fetchCourses("", "", 0, false, null);
  }

  function loadMore() {
    fetchCourses(query, state, offset, true, geoActive ? userCoords : null);
  }

  const hasMore = courses.length < total;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:py-16">
      <div className="mb-8">
        <div className="accent-line mb-6" />
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--color-cream)] sm:text-4xl">
          Courses
        </h1>
        <p className="mt-3 max-w-lg text-[var(--color-sand-muted)]">
          Search{" "}
          {total > 0 ? `${total.toLocaleString()} courses` : "courses"}{" "}
          across the country. Click any course to view live tee time
          availability.
        </p>
      </div>

      {/* Search & Filters */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-sand-muted)]"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <Input
            type="text"
            placeholder="Search by name, city, or region..."
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="border-[var(--color-sand)]/10 bg-[var(--color-surface-raised)] pl-10 text-[var(--color-charcoal-text)] placeholder:text-[var(--color-sand-muted)]/50"
          />
        </div>

        <select
          value={state}
          onChange={(e) => handleStateChange(e.target.value)}
          className="h-9 rounded-md border border-[var(--color-sand)]/10 bg-[var(--color-surface-raised)] px-3 text-sm text-[var(--color-charcoal-text)] outline-none focus:ring-1 focus:ring-[var(--color-sand)]/30"
        >
          <option value="">All states</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {geoActive ? (
          <Button
            onClick={clearGeo}
            variant="outline"
            size="sm"
            className="border-[var(--color-sage)]/30 bg-[var(--color-sage)]/10 text-[var(--color-sage)] hover:bg-[var(--color-sage)]/20"
          >
            <svg
              className="mr-1.5 h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
              />
            </svg>
            Near me
            <svg
              className="ml-1.5 h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </Button>
        ) : (
          <Button
            onClick={handleNearMe}
            disabled={geoLoading}
            variant="outline"
            size="sm"
            className="border-[var(--color-sand)]/10 text-[var(--color-sand-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-sand)]"
          >
            {geoLoading ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--color-sand)]/20 border-t-[var(--color-terracotta)]" />
                Locating...
              </span>
            ) : (
              <>
                <svg
                  className="mr-1.5 h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                  />
                </svg>
                Near me
              </>
            )}
          </Button>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center gap-3 py-12">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-sand)]/20 border-t-[var(--color-terracotta)]" />
          <span className="text-[var(--color-sand-muted)]">
            Searching courses...
          </span>
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-sand)]/8 bg-[var(--color-surface)] px-6 py-12 text-center">
          <p className="text-[var(--color-sand-muted)]">
            No courses found
            {query ? ` for "${query}"` : ""}
            {state ? ` in ${state}` : ""}
            {geoActive ? " nearby" : ""}.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <span className="text-sm text-[var(--color-sand-muted)]">
              Showing {courses.length} of {total.toLocaleString()} courses
              {geoActive ? " nearby" : ""}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
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
                    {course.distance_miles != null && (
                      <span className="ml-2 text-[var(--color-terracotta)]">
                        {course.distance_miles} mi
                      </span>
                    )}
                  </p>

                </div>
              </Link>
            ))}
          </div>

          {hasMore && (
            <div className="mt-8 flex justify-center">
              <Button
                onClick={loadMore}
                disabled={loadingMore}
                variant="outline"
                className="border-[var(--color-sand)]/10 px-8 text-[var(--color-sand)] hover:bg-[var(--color-surface-raised)]"
              >
                {loadingMore ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--color-sand)]/20 border-t-[var(--color-terracotta)]" />
                    Loading...
                  </span>
                ) : (
                  `Load more (${(total - courses.length).toLocaleString()} remaining)`
                )}
              </Button>
            </div>
          )}

          {/* Don't see your course? */}
          <div className="mt-10 rounded-xl border border-dashed border-[var(--color-sand)]/10 bg-[var(--color-surface)]/50 px-6 py-8 text-center">
            <p className="mb-1 text-sm font-medium text-[var(--color-sand)]">
              Don&apos;t see your course?
            </p>
            <p className="mb-4 text-sm text-[var(--color-sand-muted)]">
              Let us know and we&apos;ll work on adding it.
            </p>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-[var(--color-terracotta)]/30 text-[var(--color-terracotta)] hover:bg-[var(--color-terracotta)]/5 hover:text-[var(--color-terracotta)]"
            >
              <Link href="/support?category=missing_course">Request a Course</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
