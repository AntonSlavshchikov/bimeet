DROP INDEX IF EXISTS events_public_city_date_idx;
ALTER TABLE events DROP COLUMN IF EXISTS city_id;
DROP TABLE IF EXISTS cities;
