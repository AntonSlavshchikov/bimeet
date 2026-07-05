---
name: new-migration
description: Create a new PostgreSQL migration pair (up/down) for the bimeet backend with the correct sequential number and naming convention. Use when adding/altering DB tables or columns ("новая миграция", "добавь колонку в таблицу", "add migration", "alter table"). Migrations live in backend/internal/db/migrations and run automatically at server startup.
---

# New migration

Migrations are embedded `*.up.sql` files run in order at startup by `db.Migrate()`, tracked in the `schema_migrations` table. Each migration has a matching `.down.sql`.

## Steps

1. **Find next number**: list `backend/internal/db/migrations/`, take the **highest** `NNN` prefix and add 1, zero-padded to 3 digits. Do **not** assume the sequence is gapless (there is already a gap — it jumps 008 → 010). Always use `max + 1`.

2. **Create two files** in `backend/internal/db/migrations/`:
   - `NNN_short_snake_name.up.sql` — the change.
   - `NNN_short_snake_name.down.sql` — the exact reverse.

3. **Write idempotent SQL** following existing style:
   - Add column: `ALTER TABLE t ADD COLUMN IF NOT EXISTS col TYPE NOT NULL DEFAULT ...;`
   - Enum-like: `CHECK (col IN (...))`.
   - New table: `CREATE TABLE IF NOT EXISTS ...;` with `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, FKs `REFERENCES ... ON DELETE CASCADE`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`.
   - `.down.sql` reverses it: `ALTER TABLE t DROP COLUMN IF EXISTS col;` or `DROP TABLE IF EXISTS ...;`.

4. **Wire data**: if the migration backs a new domain, also update the relevant repository SELECT/INSERT/Scan in `backend/internal/repository/...` and the structs in `backend/internal/model/model.go`.

5. **Verify**: `cd backend && go build ./cmd/server`; on next start `db.Migrate` applies it. Inspect existing files like `005_user_profile.up.sql` or `008_public_events.up.sql` for exact conventions before writing.
