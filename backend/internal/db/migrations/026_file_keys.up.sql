-- Switch from storing a full file URL to storing just the S3 object key.
-- The API strips the "<S3_PUBLIC_BASE_URL>/" (or any "http(s)://.../") prefix
-- so existing rows keep pointing at the same object, now by key instead of
-- by URL; new rows are written as keys directly by the application.

ALTER TABLE users RENAME COLUMN avatar_url TO avatar_key;
UPDATE users
   SET avatar_key = regexp_replace(avatar_key, '^https?://[^/]+/', '')
 WHERE avatar_key IS NOT NULL;

ALTER TABLE event_messages RENAME COLUMN image_url TO image_key;
UPDATE event_messages
   SET image_key = regexp_replace(image_key, '^https?://[^/]+/', '')
 WHERE image_key IS NOT NULL;

ALTER TABLE collection_contributions RENAME COLUMN receipt_url TO receipt_key;
UPDATE collection_contributions
   SET receipt_key = regexp_replace(receipt_key, '^https?://[^/]+/', '')
 WHERE receipt_key IS NOT NULL;
