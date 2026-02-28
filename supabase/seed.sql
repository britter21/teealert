-- Seed courses for development
INSERT INTO courses (id, name, platform, platform_course_id, platform_schedule_id, platform_booking_class, location_city, location_state, timezone, booking_window_days, poll_interval_seconds, is_active)
VALUES
  ('9de4c8c8-0f60-423f-873e-613263f8e190', 'Black Desert Resort', 'chronogolf', '19226', '23960', '124509', 'Ivins', 'UT', 'America/Denver', 30, 60, true),
  ('e51a4e57-ae84-4556-bd6c-b0b6fef501d5', 'Sand Hollow Resort', 'chronogolf', '14225', '16313', '57722', 'Hurricane', 'UT', 'America/Denver', 180, 60, true),
  ('2f7336aa-082b-4444-a90e-68648b20feee', 'Coral Canyon Golf Course', 'chronogolf', '14168', '16251', '57494', 'Washington', 'UT', 'America/Denver', 14, 60, false)
ON CONFLICT (platform, platform_course_id) DO NOTHING;
