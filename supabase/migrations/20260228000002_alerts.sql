CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    target_date DATE NOT NULL,
    earliest_time TIME,
    latest_time TIME,
    min_players INT DEFAULT 1,
    max_price NUMERIC,
    holes INT[],
    notify_sms BOOLEAN DEFAULT false,
    notify_email BOOLEAN DEFAULT true,
    notify_push BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_alerts_active ON alerts (course_id, target_date)
    WHERE is_active = true AND triggered_at IS NULL;

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts"
    ON alerts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own alerts"
    ON alerts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
    ON alerts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts"
    ON alerts FOR DELETE
    USING (auth.uid() = user_id);
