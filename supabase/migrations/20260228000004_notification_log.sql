CREATE TABLE notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID REFERENCES alerts(id) ON DELETE SET NULL,
    channel TEXT NOT NULL CHECK (channel IN ('imessage', 'email', 'push')),
    recipient TEXT NOT NULL,
    payload JSONB,
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed')),
    sent_at TIMESTAMPTZ DEFAULT now(),
    latency_ms INT
);

CREATE INDEX idx_notification_log_alert ON notification_log (alert_id);
