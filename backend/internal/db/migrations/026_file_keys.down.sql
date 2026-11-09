-- Reverses the rename. Does NOT restore the original full URLs (the host
-- prefix stripped by the up migration is not recoverable) — rolling back
-- leaves these columns holding bare keys under their old "_url" names,
-- which is wrong for the pre-migration code that expects full URLs. Treat
-- this as an emergency escape hatch, not a safe rollback of running prod.

ALTER TABLE users RENAME COLUMN avatar_key TO avatar_url;
ALTER TABLE event_messages RENAME COLUMN image_key TO image_url;
ALTER TABLE collection_contributions RENAME COLUMN receipt_key TO receipt_url;
