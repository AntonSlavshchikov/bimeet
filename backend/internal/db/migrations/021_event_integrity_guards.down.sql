ALTER TABLE events DROP CONSTRAINT IF EXISTS events_max_guests_positive_check;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_date_range_check;

ALTER TABLE poll_votes DROP CONSTRAINT IF EXISTS poll_votes_option_poll_fkey;
ALTER TABLE poll_votes DROP CONSTRAINT IF EXISTS poll_votes_pkey;
ALTER TABLE poll_votes DROP CONSTRAINT IF EXISTS poll_votes_poll_id_fkey;
ALTER TABLE poll_votes DROP COLUMN IF EXISTS poll_id;
ALTER TABLE poll_options DROP CONSTRAINT IF EXISTS poll_options_id_poll_id_key;

ALTER TABLE poll_votes ADD CONSTRAINT poll_votes_pkey PRIMARY KEY (poll_option_id, user_id);
