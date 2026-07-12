ALTER TABLE events
    ADD COLUMN IF NOT EXISTS invite_token_expires_at TIMESTAMPTZ NOT NULL
    DEFAULT (NOW() + INTERVAL '24 hours');
