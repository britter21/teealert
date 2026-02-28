ALTER TABLE courses ADD COLUMN IF NOT EXISTS booking_slug text;

UPDATE courses SET booking_slug = 'black-desert-resort' WHERE platform_course_id = '19226' AND platform = 'chronogolf';
UPDATE courses SET booking_slug = 'sand-hollow-resort' WHERE platform_course_id = '14225' AND platform = 'chronogolf';
UPDATE courses SET booking_slug = 'coral-canyon-golf-course' WHERE platform_course_id = '14168' AND platform = 'chronogolf';
