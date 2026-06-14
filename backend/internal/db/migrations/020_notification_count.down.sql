DROP INDEX IF EXISTS uq_notifications_chat_collapse;
ALTER TABLE notifications DROP COLUMN IF EXISTS count;
