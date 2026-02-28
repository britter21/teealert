-- Add ForeUp southern Utah golf courses.
-- platform_course_id = ForeUp course_id
-- platform_schedule_id = ForeUp schedule_id (teesheet_id)
-- platform_booking_class = ForeUp booking_class_id

INSERT INTO courses (name, platform, platform_course_id, platform_schedule_id, platform_booking_class, location_city, location_state, timezone, booking_window_days, poll_interval_seconds, is_active)
VALUES
  -- City of St. George Golf Division (4 courses, all booking_class 81)
  ('Southgate Golf Course', 'foreup', '19240', '1321', '81', 'St. George', 'UT', 'America/Denver', 15, 60, true),
  ('St. George Golf Club', 'foreup', '19242', '1323', '81', 'St. George', 'UT', 'America/Denver', 15, 60, true),
  ('Sunbrook Golf Club', 'foreup', '19239', '1320', '81', 'St. George', 'UT', 'America/Denver', 15, 60, true),
  ('Dixie Red Hills Golf Club', 'foreup', '19241', '1322', '81', 'St. George', 'UT', 'America/Denver', 15, 60, true),

  -- Hurricane area
  ('Sky Mountain Golf Course', 'foreup', '22750', '11805', '50871', 'Hurricane', 'UT', 'America/Denver', 45, 60, true),
  ('Copper Rock Golf Course', 'foreup', '20266', '4154', '6142', 'Hurricane', 'UT', 'America/Denver', 90, 60, true)

ON CONFLICT (platform, platform_course_id) DO NOTHING;
