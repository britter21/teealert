-- TEE-10: Subscriptions table for Polar.sh integration

CREATE TABLE subscriptions (
  id text PRIMARY KEY,                    -- Polar subscription ID
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  polar_customer_id text,
  polar_product_id text,
  tier text NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'birdie')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'revoked', 'incomplete')),
  cancel_at_period_end boolean DEFAULT false,
  current_period_start timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_subscriptions_user ON subscriptions (user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions (user_id, status);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Add tier column to user_profiles for quick access (denormalized)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'free';
