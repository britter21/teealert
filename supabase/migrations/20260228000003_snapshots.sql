CREATE TABLE tee_time_snapshots (
    id BIGSERIAL PRIMARY KEY,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time TIME NOT NULL,
    available_spots INT,
    green_fee NUMERIC,
    cart_fee NUMERIC,
    holes INT,
    raw_json JSONB,
    polled_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_snapshots_course_date ON tee_time_snapshots (course_id, date, time);
CREATE INDEX idx_snapshots_polled_at ON tee_time_snapshots (polled_at);
