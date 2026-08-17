-- Fails if any permanent (dateless) event exists — same as other blunt downs
-- in this repo, this rollback assumes the feature it undoes was never used.
DROP INDEX IF EXISTS idx_events_permanent;
DROP INDEX IF EXISTS idx_events_last_activity;
DROP TRIGGER IF EXISTS trg_bump_event_last_activity ON event_messages;
DROP FUNCTION IF EXISTS bump_event_last_activity();
ALTER TABLE events DROP COLUMN IF EXISTS last_activity_at;
ALTER TABLE events ALTER COLUMN date_end SET NOT NULL;
ALTER TABLE events ALTER COLUMN date_start SET NOT NULL;
