CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('foreup', 'chronogolf')),
    platform_course_id TEXT NOT NULL,
    platform_schedule_id TEXT,
    platform_booking_class TEXT,
    location_city TEXT,
    location_state TEXT,
    timezone TEXT NOT NULL DEFAULT 'America/Denver',
    booking_window_days INT,
    poll_interval_seconds INT DEFAULT 60,
    ua_override TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_courses_platform ON courses (platform, platform_course_id);
