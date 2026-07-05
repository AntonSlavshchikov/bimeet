ALTER TABLE poll_votes ADD COLUMN IF NOT EXISTS poll_id UUID;

UPDATE poll_votes pv
SET poll_id = po.poll_id
FROM poll_options po
WHERE pv.poll_option_id = po.id
  AND pv.poll_id IS NULL;

DELETE FROM poll_votes pv
USING (
    SELECT ctid,
           ROW_NUMBER() OVER (PARTITION BY poll_id, user_id ORDER BY poll_option_id) AS rn
    FROM poll_votes
    WHERE poll_id IS NOT NULL
) d
WHERE pv.ctid = d.ctid
  AND d.rn > 1;

ALTER TABLE poll_votes DROP CONSTRAINT IF EXISTS poll_votes_pkey;
ALTER TABLE poll_votes ALTER COLUMN poll_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'poll_votes_poll_id_fkey'
    ) THEN
        ALTER TABLE poll_votes
            ADD CONSTRAINT poll_votes_poll_id_fkey
            FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'poll_votes_pkey'
    ) THEN
        ALTER TABLE poll_votes
            ADD CONSTRAINT poll_votes_pkey PRIMARY KEY (poll_id, user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'poll_options_id_poll_id_key'
    ) THEN
        ALTER TABLE poll_options
            ADD CONSTRAINT poll_options_id_poll_id_key UNIQUE (id, poll_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'poll_votes_option_poll_fkey'
    ) THEN
        ALTER TABLE poll_votes
            ADD CONSTRAINT poll_votes_option_poll_fkey
            FOREIGN KEY (poll_option_id, poll_id) REFERENCES poll_options(id, poll_id)
            ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'events_date_range_check'
    ) THEN
        ALTER TABLE events
            ADD CONSTRAINT events_date_range_check
            CHECK (date_end >= date_start) NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'events_max_guests_positive_check'
    ) THEN
        ALTER TABLE events
            ADD CONSTRAINT events_max_guests_positive_check
            CHECK (max_guests IS NULL OR max_guests > 0) NOT VALID;
    END IF;
END $$;
