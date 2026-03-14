-- Remove booking_window_days from search_courses_nearby return type
-- Must drop first because return type is changing
DROP FUNCTION IF EXISTS search_courses_nearby(double precision, double precision, double precision, double precision, text, int, int);

CREATE OR REPLACE FUNCTION search_courses_nearby(
  search_lat double precision,
  search_lng double precision,
  radius_miles double precision DEFAULT 50,
  deg_range double precision DEFAULT 0.72,
  text_filter text DEFAULT '',
  result_limit int DEFAULT 24,
  result_offset int DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  name text,
  platform text,
  location_city text,
  location_state text,
  timezone text,
  is_active boolean,
  latitude double precision,
  longitude double precision,
  distance_miles double precision,
  total_count bigint
)
LANGUAGE sql STABLE
AS $$
  WITH nearby AS (
    SELECT
      c.id, c.name, c.platform, c.location_city, c.location_state,
      c.timezone, c.is_active, c.latitude, c.longitude,
      3959 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(search_lat)) * cos(radians(c.latitude)) *
          cos(radians(c.longitude) - radians(search_lng))
          + sin(radians(search_lat)) * sin(radians(c.latitude))
        ))
      ) AS distance_miles
    FROM courses c
    WHERE c.is_active = true
      AND c.latitude IS NOT NULL
      AND c.longitude IS NOT NULL
      AND c.latitude BETWEEN search_lat - deg_range AND search_lat + deg_range
      AND c.longitude BETWEEN search_lng - deg_range AND search_lng + deg_range
      AND (text_filter = '' OR c.name ILIKE '%' || text_filter || '%')
  ),
  filtered AS (
    SELECT * FROM nearby WHERE distance_miles <= radius_miles
  )
  SELECT f.*, (SELECT count(*) FROM filtered)::bigint AS total_count
  FROM filtered f
  ORDER BY f.distance_miles
  LIMIT result_limit
  OFFSET result_offset;
$$;
