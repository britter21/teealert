-- Fix course data: all 3 courses use Chronogolf, not ForeUp.
-- Store club_id in platform_course_id, course_id in platform_schedule_id,
-- affiliation_type_id in platform_booking_class.

-- Black Desert Resort
UPDATE courses SET
  platform = 'chronogolf',
  platform_course_id = '19226',
  platform_schedule_id = '23960',
  platform_booking_class = '124509',
  booking_window_days = 30
WHERE id = '9de4c8c8-0f60-423f-873e-613263f8e190';

-- Sand Hollow Resort (Championship course)
UPDATE courses SET
  platform = 'chronogolf',
  platform_course_id = '14225',
  platform_schedule_id = '16313',
  platform_booking_class = '57722',
  booking_window_days = 180
WHERE id = 'e51a4e57-ae84-4556-bd6c-b0b6fef501d5';

-- Coral Canyon Golf Course (online booking disabled — mark inactive)
UPDATE courses SET
  platform = 'chronogolf',
  platform_course_id = '14168',
  platform_schedule_id = '16251',
  platform_booking_class = '57494',
  is_active = false,
  booking_window_days = 14
WHERE id = '2f7336aa-082b-4444-a90e-68648b20feee';
