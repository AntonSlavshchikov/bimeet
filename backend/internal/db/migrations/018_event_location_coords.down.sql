ALTER TABLE events
    DROP COLUMN IF EXISTS location_lng,
    DROP COLUMN IF EXISTS location_lat;
