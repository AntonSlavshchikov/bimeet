-- Per-event chat: messages + per-user last-read marker for the unread badge.
CREATE TABLE IF NOT EXISTS event_messages (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ -- soft-delete (moderation): NULL = visible
);

CREATE INDEX IF NOT EXISTS idx_event_messages_event_created
    ON event_messages(event_id, created_at DESC);

CREATE TABLE IF NOT EXISTS event_chat_reads (
    event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (event_id, user_id)
);
