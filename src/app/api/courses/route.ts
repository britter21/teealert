import { createServiceClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim() || "";
  const state = searchParams.get("state")?.trim() || "";
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radius = Number(searchParams.get("radius")) || 50; // miles
  const limit = Math.min(Number(searchParams.get("limit")) || 24, 100);
  const offset = Number(searchParams.get("offset")) || 0;

  const supabase = createServiceClient();

  // Location-based search: geocode a city name or use raw lat/lng
  if (lat && lng) {
    return locationSearch(supabase, Number(lat), Number(lng), radius, limit, offset, q);
  }

  // If the query looks like a city/place (not matching a course name well), try geo search
  if (q && !state) {
    const geoResult = await tryGeoSearch(supabase, q, radius, limit, offset);
    if (geoResult) return geoResult;
  }

  // Standard text search
  let query = supabase
    .from("courses")
    .select(
      "id, name, platform, location_city, location_state, timezone, booking_window_days, is_active, latitude, longitude",
      { count: "exact" }
    )
    .eq("is_active", true);

  if (q) {
    query = query.or(`name.ilike.%${q}%,location_city.ilike.%${q}%`);
  }

  if (state) {
    query = query.eq("location_state", state.toUpperCase());
  }

  query = query.order("name").range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ courses: data, total: count });
}

async function tryGeoSearch(
  supabase: ReturnType<typeof createServiceClient>,
  q: string,
  radius: number,
  limit: number,
  offset: number
) {
  // First check if this matches course names — if so, use text search
  const { count: nameMatches } = await supabase
    .from("courses")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .ilike("name", `%${q}%`);

  // If we have good name matches, don't geo-search
  if (nameMatches && nameMatches >= 3) return null;

  // Look up the city in our own data to get coordinates
  const { data: cityMatch } = await supabase
    .from("courses")
    .select("latitude, longitude")
    .eq("is_active", true)
    .ilike("location_city", `%${q}%`)
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .limit(1)
    .single();

  if (cityMatch?.latitude && cityMatch?.longitude) {
    return locationSearch(
      supabase,
      cityMatch.latitude,
      cityMatch.longitude,
      radius,
      limit,
      offset,
      "" // no text filter on top of geo
    );
  }

  return null;
}

async function locationSearch(
  supabase: ReturnType<typeof createServiceClient>,
  lat: number,
  lng: number,
  radiusMiles: number,
  limit: number,
  offset: number,
  textFilter: string
) {
  // Use Haversine formula in SQL for distance calculation
  // Bounding box pre-filter for performance (1 degree ≈ 69 miles)
  const degreeRange = radiusMiles / 69;

  const { data, error } = await supabase.rpc("search_courses_nearby", {
    search_lat: lat,
    search_lng: lng,
    radius_miles: radiusMiles,
    deg_range: degreeRange,
    text_filter: textFilter || "",
    result_limit: limit,
    result_offset: offset,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // The RPC returns rows with a total_count column
  const total = data?.[0]?.total_count ?? 0;
  const courses = (data || []).map(
    ({
      total_count: _tc,
      distance_miles,
      ...rest
    }: Record<string, unknown>) => ({
      ...rest,
      distance_miles: Number(Number(distance_miles).toFixed(1)),
    })
  );

  return Response.json({
    courses,
    total,
    center: { lat, lng },
    radius: radiusMiles,
  });
}
