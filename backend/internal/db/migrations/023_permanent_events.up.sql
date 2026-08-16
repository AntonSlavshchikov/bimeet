-- Permanent events (chat-hub, variant B): an event can now exist without a
-- date range — a standing group chat rather than a scheduled meetup. Dates
-- become optional; the existing events_date_range_check (021) already
-- tolerates NULLs (CHECK is vacuously true when either side is NULL), and
-- ListForReminder already excludes rows via `date_end > NOW()`, so no
-- reminder-side change is needed.
ALTER TABLE events ALTER COLUMN date_start DROP NOT NULL;
ALTER TABLE events ALTER COLUMN date_end DROP NOT NULL;

-- Drives sort order for permanent events (and, later, the cross-event chat
-- list) — "most recently active" rather than "soonest upcoming".
ALTER TABLE events ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE events e
SET last_activity_at = COALESCE(
    (SELECT MAX(m.created_at) FROM event_messages m WHERE m.event_id = e.id),
    e.created_at
);

CREATE OR REPLACE FUNCTION bump_event_last_activity() RETURNS TRIGGER AS $$
BEGIN
    UPDATE events SET last_activity_at = NEW.created_at WHERE id = NEW.event_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bump_event_last_activity
    AFTER INSERT ON event_messages
    FOR EACH ROW
    EXECUTE FUNCTION bump_event_last_activity();

CREATE INDEX IF NOT EXISTS idx_events_last_activity ON events (last_activity_at DESC);

-- Partial index for listing/filtering permanent (dateless) events.
CREATE INDEX IF NOT EXISTS idx_events_permanent ON events (organizer_id) WHERE date_start IS NULL;
