-- Seed courses for development
INSERT INTO courses (id, name, platform, platform_course_id, platform_schedule_id, platform_booking_class, location_city, location_state, timezone, booking_window_days, poll_interval_seconds, is_active)
VALUES
  ('9de4c8c8-0f60-423f-873e-613263f8e190', 'Black Desert Resort', 'chronogolf', '19226', '23960', '124509', 'Ivins', 'UT', 'America/Denver', 30, 60, true),
  ('e51a4e57-ae84-4556-bd6c-b0b6fef501d5', 'Sand Hollow Resort', 'chronogolf', '14225', '16313', '57722', 'Hurricane', 'UT', 'America/Denver', 180, 60, true),
  ('2f7336aa-082b-4444-a90e-68648b20feee', 'Coral Canyon Golf Course', 'chronogolf', '14168', '16251', '57494', 'Washington', 'UT', 'America/Denver', 14, 60, false),
  -- ForeUp courses
  (gen_random_uuid(), 'Southgate Golf Course', 'foreup', '19240', '1321', '81', 'St. George', 'UT', 'America/Denver', 15, 60, true),
  (gen_random_uuid(), 'St. George Golf Club', 'foreup', '19242', '1323', '81', 'St. George', 'UT', 'America/Denver', 15, 60, true),
  (gen_random_uuid(), 'Sunbrook Golf Club', 'foreup', '19239', '1320', '81', 'St. George', 'UT', 'America/Denver', 15, 60, true),
  (gen_random_uuid(), 'Dixie Red Hills Golf Club', 'foreup', '19241', '1322', '81', 'St. George', 'UT', 'America/Denver', 15, 60, true),
  (gen_random_uuid(), 'Sky Mountain Golf Course', 'foreup', '22750', '11805', '50871', 'Hurricane', 'UT', 'America/Denver', 45, 60, true),
  (gen_random_uuid(), 'Copper Rock Golf Course', 'foreup', '20266', '4154', '6142', 'Hurricane', 'UT', 'America/Denver', 90, 60, true)
ON CONFLICT (platform, platform_course_id) DO NOTHING;
