-- Seed courses for development
INSERT INTO courses (name, platform, platform_course_id, platform_schedule_id, platform_booking_class, location_city, location_state, timezone, booking_window_days, poll_interval_seconds)
VALUES
  ('Black Desert Resort', 'foreup', '18747', '356', '156', 'Ivins', 'UT', 'America/Denver', 30, 60),
  ('Sand Hollow Resort', 'foreup', '19198', '2788', '9498', 'Hurricane', 'UT', 'America/Denver', 14, 60),
  ('Coral Canyon Golf Course', 'foreup', '16572', '296', '115', 'Washington', 'UT', 'America/Denver', 7, 60)
ON CONFLICT (platform, platform_course_id) DO NOTHING;
