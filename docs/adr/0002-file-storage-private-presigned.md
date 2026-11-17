# ADR 0002: Files — keys in the database, served via a presigned redirect

- Status: accepted
- Date: 2026-11-16
- Related: [0003](0003-minio-on-server.md)

## Context

Users upload avatars, chat images and receipts for collections. Before:

- the backend put the object into the bucket and stored the **full public URL** in the database (`S3_PUBLIC_BASE_URL + "/" + key`, e.g. `https://s3.bimeet.pro/avatars/avatars/<id>.png`);
- the bucket was public (`minio-init` runs `mc anonymous set public`);
- anyone with the URL could see the file forever, and changing the storage or the domain broke every link in the database.

## Decision drivers

- A file must not be reachable through a permanent public link.
- Changing storage (MinIO ↔ provider S3) or domain must not require rewriting data.
- The frontend must not change: it already renders `avatar_url`, `image_url`, `receipt_url`.
- A tab left open must not break when a signed link expires.

## Considered options

1. **Keep full URLs and a public bucket.** Do nothing; the problems above remain.
2. **Return a presigned URL directly in the JSON.** The link expires within minutes, so an avatar in a long-open tab or an old chat image stops loading.
3. **Key in the database + a stable path `/api/files/{key}` that answers every request with a 302 to a fresh presigned URL.**

## Decision

Option 3.

- Migration `026_file_keys` renames the columns (`avatar_url → avatar_key`, `image_url → image_key`, `receipt_url → receipt_key`) and turns existing URLs into keys.
- `storage.FileURL()` turns a key into `/api/files/<key>` at the five read sites in the repositories. JSON fields and the frontend are unchanged.
- The public route `GET /api/files/*` (`backend/internal/handler/files`) answers `302` to a presigned GET valid for `S3_PRESIGN_TTL` (5 minutes by default).
- New keys: `chat/<eventID>/<uuid>`, `receipts/<collectionID>/<userID>/<uuid>`. The avatar stays `avatars/<userID><ext>`: one object per user, overwritten on re-upload, where an unpredictable name protects nothing.

### Bugs found and fixed

- **Presigning used the internal address** (commit `17ce954`). The presigned URL was built with the same client as uploads and inherited the host from `S3_ENDPOINT`. For MinIO that is the internal `http://minio:9000`, unreachable from the browser. Added a separate client on `S3_PRESIGN_ENDPOINT` (falls back to `S3_ENDPOINT`) and a regression test.
- **The bucket name leaked into the key** (commit `9f7e6e5`). The first version of the migration stripped only `https://host/`, so `https://s3.bimeet.pro/avatars/avatars/<id>.png` became the key `avatars/avatars/<id>.png`, which doesn't exist in storage. The regex `^https?://.*/((avatars|chat|receipts)/)` now keeps the key from a known prefix onward. Verified with a Go test and a run in Postgres 16.

## Consequences

**Positive**
- The database holds what is actually a key; storage and domain change through `.env.prod`, with no data migration.
- Frontend links are stable, while direct access to an object lives for minutes.
- No frontend changes.

**Negative**
- Every image view costs an extra backend request and a redirect.
- `/api/files/*` has no authorization: whoever knows the key gets the file. Access is no worse than before, but no better either. Checking event membership is a separate task.
- `026.down.sql` restores the column names but not the full URLs: rollback is only possible by restoring a dump.
- **Known debt:** `minio-init` in `docker-compose.prod.yml` still runs `mc anonymous set public`, so the MinIO bucket on the server stays public and files are reachable bypassing presign. TODO: remove that line (a code change, not done as part of the documentation).
- The project has no database integration tests; the migration is covered by a regex unit test and a manual run.
