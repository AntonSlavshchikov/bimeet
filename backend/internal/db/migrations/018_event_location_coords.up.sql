-- Optional geocoordinates for the event location (picked via map / search).
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION;
