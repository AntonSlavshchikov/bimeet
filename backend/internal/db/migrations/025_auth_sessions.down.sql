DROP INDEX IF EXISTS idx_refresh_tokens_active_user;

ALTER TABLE refresh_tokens
    DROP COLUMN IF EXISTS revoked_at,
    DROP COLUMN IF EXISTS expires_at,
    DROP COLUMN IF EXISTS last_seen_at,
    DROP COLUMN IF EXISTS user_agent;
