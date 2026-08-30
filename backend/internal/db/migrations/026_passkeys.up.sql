CREATE TABLE IF NOT EXISTS webauthn_users (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rp_id      TEXT NOT NULL,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    handle     BYTEA NOT NULL CHECK (octet_length(handle) = 32),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (rp_id, user_id),
    UNIQUE (rp_id, handle)
);

CREATE TABLE IF NOT EXISTS passkey_credentials (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rp_id           TEXT NOT NULL,
    credential_id   BYTEA NOT NULL CHECK (octet_length(credential_id) > 0),
    name            TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 64),
    credential_data BYTEA NOT NULL CHECK (octet_length(credential_data) > 0),
    sign_count      BIGINT NOT NULL DEFAULT 0 CHECK (sign_count >= 0),
    clone_warning   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at    TIMESTAMPTZ,
    UNIQUE (rp_id, credential_id),
    FOREIGN KEY (rp_id, user_id) REFERENCES webauthn_users(rp_id, user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_passkey_credentials_user
    ON passkey_credentials(user_id, created_at);

CREATE TABLE IF NOT EXISTS passkey_ceremonies (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind         TEXT NOT NULL CHECK (kind IN ('registration', 'authentication')),
    user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
    session_data BYTEA NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at   TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_passkey_ceremonies_expires
    ON passkey_ceremonies(expires_at);
