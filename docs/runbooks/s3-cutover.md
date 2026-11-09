# MinIO → Selectel S3 cutover

The backend already speaks the private-bucket + presigned-redirect protocol
(`infra/selectel-migration` branch) — this is the runbook for actually
switching prod from MinIO to Selectel Object Storage without downtime or
data loss.

**Do not deploy the new backend image against the still-MinIO prod
`.env.prod` and leave it running that way.** The presigned-redirect code
works correctly against MinIO too (that's what the local dev-compose
proof in `backup-restore.md` uses), but it depends on `S3_ENDPOINT` (or
`S3_PRESIGN_ENDPOINT`, if set) already being a host the browser can
resolve — and today's prod `.env.prod` points `S3_ENDPOINT` at the
internal `http://minio:9000`. Ship the new image and the Selectel
`.env.prod` together, step (d) below, not as two separate deploys.

## Steps

**a) `terraform apply`** (you run this yourself, with real credentials —
see `infra/terraform/README.md`). Creates the project, VM, buckets,
registry, DNS; outputs the S3 keys you'll need below.

**b) Manual `pg_dump` of the prod database into the `backups` bucket,
right now, before touching anything else:**
```bash
cd ~/bimeet
set -a && source /opt/bimeet/backup/backup.env && set +a   # or the values from `terraform output backup_s3_*`
./infra/backup/pg_backup.sh
```
This is your rollback point for step (f) — do not skip it, even though the
timer will also back up tonight.

**c) Mirror MinIO → `bimeet-prod-uploads`, then verify the object count
matches before relying on it:**
```bash
# from the VM, or anywhere with network access to both:
docker run --rm --network bimeet_app-net \
  -e AWS_ACCESS_KEY_ID=minioadmin -e AWS_SECRET_ACCESS_KEY=minioadmin \
  rclone/rclone:latest \
  copy :s3,endpoint=http://minio:9000,provider=Minio:avatars \
       :s3,endpoint=https://s3.ru-9.storage.selcloud.ru,provider=Other,access_key_id=<app_s3_access_key>,secret_access_key=<app_s3_secret_key>:bimeet-prod-uploads \
  --progress

# verify counts match:
mc ls --recursive local/avatars | wc -l                       # MinIO side
docker run --rm amazon/aws-cli --endpoint-url https://s3.ru-9.storage.selcloud.ru \
  s3 ls --recursive s3://bimeet-prod-uploads/ | wc -l          # Selectel side
```
Both numbers must match before step (d). If they don't, find out why
before cutting over — a missing object means a broken image for some
user, not a crash you'd notice.

**d) One deploy, both changes together:** the new backend image (this
branch) *and* the new `.env.prod` (Selectel S3 — `AWS_REGION`,
`AWS_ACCESS_KEY_ID`/`SECRET` from `app_s3_access_key`/`secret_key`,
`S3_BUCKET=bimeet-prod-uploads`, `S3_ENDPOINT=https://s3.ru-9.storage.selcloud.ru`)
land in the same `docker compose up -d`. Migration 026 (URL → key) runs
automatically on backend startup, same as any other migration — nothing
manual needed for that part.

**e) Verify it actually worked**, logged in as a real user:
- Avatar shows up in the navbar/profile.
- A collection's uploaded receipt opens.
- A chat image opens.
All three should load through `GET /api/files/...` redirecting to a
Selectel presigned URL — check the Network tab for a 302 landing on
`s3.ru-9.storage.selcloud.ru`, not `minio`.

**f) Rollback, if (e) fails:** redeploy the previous image tag with the
previous (MinIO) `.env.prod` — MinIO is still running, untouched, so this
is a plain redeploy, not a restore. If the database migration itself is
suspected (it shouldn't be — 026 only renames columns and rewrites
existing values, it doesn't touch anything the old code reads
differently... except the old code reads `avatar_url` etc., which no
longer exist post-026, so **rolling back the image also requires
restoring the pre-026 database** from the dump made in step (b):
```bash
./infra/backup/pg_restore.sh --restore-into-prod bimeet_<timestamp-from-step-b>.dump
```

**g) Only after a full day with no S3-related errors**, remove MinIO from
`docker-compose.prod.yml` (the `minio`/`minio-init` services, the
`minio_data` volume, and the `s3.bimeet.pro` Traefik router) — see
`infra/terraform/README.md` "MinIO → Selectel Object Storage" for the
exact lines.
