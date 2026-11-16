# Postgres backup & restore

> **Status: not enabled on the Timeweb server.** The scripts need an S3
> bucket that lives outside the server, and the current minimal setup has
> none (uploads stay in MinIO on the server's own disk). To turn backups on:
> create a private bucket in Timeweb Cloud (`twc_s3_bucket`), put its keys
> and endpoint into `/opt/bimeet/backup/backup.env`, and install the units
> by hand as described in "Installing it" below. Mentions of Selectel and
> `storage.tf` further down describe the earlier Selectel design.

## How it works

`infra/backup/pg_backup.sh` runs `pg_dump -Fc` inside the running `postgres`
container (via `docker compose exec`, so it never needs direct DB
credentials beyond what the container already has), uploads the dump to
the `bimeet-prod-backups` Object Storage bucket using the official
`amazon/aws-cli` Docker image (nothing is installed on the host besides
Docker, which it already has), and deletes the local copy. It runs daily
at 03:17 UTC via the `bimeet-backup.timer`/`.service` systemd units.
`infra/terraform/storage.tf` already expires objects in that bucket after
14 days, so backups don't accumulate forever.

`infra/backup/pg_restore.sh` downloads a dump (the latest one, by default)
and restores it into a throwaway database, `bimeet_restore_check`, runs a
row-count sanity check against a few key tables, then drops it. It
**never touches the real `bimeet` database** unless you pass
`--restore-into-prod` and then re-type the dump's filename to confirm —
see "Restoring prod for real" below.

**RPO ~24h / RTO: a few minutes to restore the dump itself**, plus however
long it takes to notice there's an incident and decide to restore — this
runbook doesn't cover detection, only the mechanical steps.

## Installing it

If the VM was created (or recreated) after this runbook was added to
`infra/terraform/cloud-init.yaml.tftpl`, it's already installed and the
timer is already running — nothing to do.

If the VM already existed before that (the common case — `user_data` only
runs on first boot, and the VM's `prevent_destroy` blocks Terraform from
quietly recreating it to pick up a cloud-init change), install by hand:

```bash
# On the VM, as a sudo-capable user:
sudo mkdir -p /opt/bimeet/backup
sudo cp pg_backup.sh pg_restore.sh /opt/bimeet/backup/
sudo chmod 755 /opt/bimeet/backup/*.sh
sudo cp bimeet-backup.service bimeet-backup.timer /etc/systemd/system/

# backup.env holds the *backup* S3 credentials (terraform output
# backup_s3_access_key / backup_s3_secret_key) — NOT the app's own
# S3 credentials. Copy infra/backup/backup.env.example, fill it in:
sudo cp backup.env.example /opt/bimeet/backup/backup.env
sudo chmod 600 /opt/bimeet/backup/backup.env
sudo $EDITOR /opt/bimeet/backup/backup.env

sudo systemctl daemon-reload
sudo systemctl enable --now bimeet-backup.timer
```

## How to make a backup manually

```bash
cd ~/bimeet   # or wherever docker-compose.prod.yml + .env.prod live
sudo systemctl start bimeet-backup.service   # runs it once, right now
# or, without systemd:
set -a && source /opt/bimeet/backup/backup.env && set +a
/opt/bimeet/backup/pg_backup.sh
```

## How to check backups are actually running

```bash
systemctl status bimeet-backup.timer        # next/last scheduled run
systemctl list-timers bimeet-backup.timer
journalctl -u bimeet-backup.service --since "2 days ago"
```

A failed run shows a non-zero exit in `journalctl` (the script uses
`set -euo pipefail`, so any failure — dump, upload, anything — aborts
loudly rather than silently producing a partial/empty backup).

## Restoring prod at an outage

1. **Stop writes first if you can** — stop the `backend` service
   (`docker compose -f docker-compose.prod.yml stop backend`) so nothing
   writes to the database while you work.
2. Pick the dump: `docker run --rm -e AWS_ACCESS_KEY_ID -e
   AWS_SECRET_ACCESS_KEY --env-file /opt/bimeet/backup/backup.env
   amazon/aws-cli --endpoint-url "$S3_ENDPOINT" s3 ls
   s3://bimeet-prod-backups/` to see what's available, or just use the
   latest (the script's default).
3. **Verify it restores cleanly first**, into the throwaway DB:
   ```bash
   set -a && source /opt/bimeet/backup/backup.env && set +a
   /opt/bimeet/backup/pg_restore.sh bimeet_<timestamp>.dump
   ```
   Check the row counts it prints look sane before going further.
4. Only then, restore into the real database:
   ```bash
   /opt/bimeet/backup/pg_restore.sh --restore-into-prod bimeet_<timestamp>.dump
   # it will ask you to re-type the dump filename to confirm
   ```
5. Restart the backend: `docker compose -f docker-compose.prod.yml start backend`.

## Local verification (proof this actually works)

Run against dev-compose with MinIO standing in for S3 — this is exactly
what was done once to confirm the scripts work before relying on them:

```bash
docker compose up -d postgres minio
# create a "backups" bucket in MinIO (mc mb), insert some test rows,
# then:
COMPOSE_FILE=docker-compose.yml ENV_FILE=/dev/null \
BACKUP_S3_BUCKET=backups S3_ENDPOINT=http://minio:9000 \
AWS_ACCESS_KEY_ID=minioadmin AWS_SECRET_ACCESS_KEY=minioadmin \
AWS_DEFAULT_REGION=us-east-1 AWS_CLI_DOCKER_NETWORK=bimeet-dev_default \
./infra/backup/pg_backup.sh
# ...then the same env vars with pg_restore.sh, no dump name
# (picks the latest automatically).
```

`AWS_CLI_DOCKER_NETWORK` is a local-testing-only knob (the aws-cli
container needs to join the compose network to resolve the `minio`
hostname) — it's not needed in prod, where the VM reaches Selectel's
real internet-facing S3 endpoint directly.
