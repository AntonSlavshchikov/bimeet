-- Switch from storing a full file URL to storing just the S3 object key.
--
-- Old rows hold "<S3_PUBLIC_BASE_URL>/<key>", and in prod (and dev) the base
-- URL was path-style MinIO including the bucket name, e.g.
-- "https://s3.bimeet.pro/avatars/avatars/<user>.png" for key
-- "avatars/<user>.png". Stripping only the host would leave the bucket name
-- glued onto the key, so instead we cut everything before the key itself.
-- Every key the app has ever written starts with "avatars/", "chat/" or
-- "receipts/"; the greedy ".*" makes the match land on the last such
-- segment, i.e. the real key, not the bucket called "avatars".
-- Values that are already bare keys don't start with "http" and stay as is.

ALTER TABLE users RENAME COLUMN avatar_url TO avatar_key;
UPDATE users
   SET avatar_key = regexp_replace(avatar_key, '^https?://.*/((avatars|chat|receipts)/)', '\1')
 WHERE avatar_key IS NOT NULL;

ALTER TABLE event_messages RENAME COLUMN image_url TO image_key;
UPDATE event_messages
   SET image_key = regexp_replace(image_key, '^https?://.*/((avatars|chat|receipts)/)', '\1')
 WHERE image_key IS NOT NULL;

ALTER TABLE collection_contributions RENAME COLUMN receipt_url TO receipt_key;
UPDATE collection_contributions
   SET receipt_key = regexp_replace(receipt_key, '^https?://.*/((avatars|chat|receipts)/)', '\1')
 WHERE receipt_key IS NOT NULL;
