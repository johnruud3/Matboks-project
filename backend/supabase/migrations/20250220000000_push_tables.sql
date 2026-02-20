-- Push subscriptions: one row per device (Expo push token)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expo_push_token TEXT NOT NULL UNIQUE,
  favorite_stores JSONB NOT NULL DEFAULT '[]',
  last_push_sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pending batches: send one push per token after 10 min
CREATE TABLE IF NOT EXISTS pending_push_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expo_push_token TEXT NOT NULL,
  stores_in_batch JSONB NOT NULL DEFAULT '[]',
  send_after TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_push_batches_send_after ON pending_push_batches(send_after);
