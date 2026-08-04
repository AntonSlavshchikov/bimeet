ALTER TABLE refresh_tokens
    ADD COLUMN IF NOT EXISTS user_agent TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '400 days'),
    ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active_user
    ON refresh_tokens(user_id, last_seen_at DESC)
    WHERE revoked_at IS NULL;
