-- Collapse repeated chat notifications into a single per-event row carrying a
-- count, instead of inserting a new notification per message (which flooded the
-- notification panel).
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS count INTEGER NOT NULL DEFAULT 1;

-- Remove pre-existing duplicate chat notifications, keeping the newest per
-- (user, event), so the unique index below can be created.
DELETE FROM notifications a
USING notifications b
WHERE a.type = 'chat_message'
  AND b.type = 'chat_message'
  AND a.user_id = b.user_id
  AND a.event_id = b.event_id
  AND (a.created_at < b.created_at OR (a.created_at = b.created_at AND a.id < b.id));

-- One chat notification per (user, event); enables the upsert collapse.
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_chat_collapse
    ON notifications (user_id, event_id, type)
    WHERE type = 'chat_message';
