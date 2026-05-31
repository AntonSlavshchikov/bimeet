-- Passwordless auth: password storage is no longer needed.
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
DROP TABLE IF EXISTS password_reset_tokens;
