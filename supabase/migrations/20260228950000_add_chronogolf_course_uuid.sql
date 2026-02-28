ALTER TABLE courses ADD COLUMN IF NOT EXISTS platform_course_uuid text;

-- Black Desert Resort (course_id 23960)
UPDATE courses SET platform_course_uuid = 'ec40e1b2-7ac1-443b-a515-35176712f97b'
WHERE platform = 'chronogolf' AND platform_schedule_id = '23960';

-- Sand Hollow Championship (course_id 16313)
UPDATE courses SET platform_course_uuid = '156b2e8d-85e7-41e5-8bc8-107cca3666bd'
WHERE platform = 'chronogolf' AND platform_schedule_id = '16313';

-- Coral Canyon (course_id 16251)
UPDATE courses SET platform_course_uuid = 'd4852b70-e9a2-42da-bd1e-6c252e3af872'
WHERE platform = 'chronogolf' AND platform_schedule_id = '16251';
