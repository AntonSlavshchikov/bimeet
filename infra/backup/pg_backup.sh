#!/usr/bin/env bash
# Dumps the bimeet Postgres database and uploads it to the backups bucket.
# Runs on the prod VM via the bimeet-backup.service/.timer units in this
# same directory (see docs/runbooks/backup-restore.md), or by hand for a
# one-off backup. Must be run from the directory holding
# docker-compose.prod.yml and .env.prod (normally ~/bimeet on the VM).
set -euo pipefail

: "${POSTGRES_DB:=bimeet}"
: "${POSTGRES_USER:=bimeet}"
: "${BACKUP_S3_BUCKET:?BACKUP_S3_BUCKET must be set (see backup.env.example)}"
: "${S3_ENDPOINT:?S3_ENDPOINT must be set (see backup.env.example)}"
: "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID must be set (see backup.env.example)}"
: "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY must be set (see backup.env.example)}"
: "${AWS_DEFAULT_REGION:=ru-9}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.prod}"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
dump_name="bimeet_${timestamp}.dump"
local_path="/tmp/${dump_name}"

echo "[pg_backup] $(date -u -Iseconds) dumping ${POSTGRES_DB} -> ${local_path}"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -Fc -U "$POSTGRES_USER" -d "$POSTGRES_DB" >"$local_path"
# -Fc is already compressed (pg_dump's custom format); gzip on top would
# barely shrink it further and only adds a step that can itself fail.

size=$(stat -c%s "$local_path" 2>/dev/null || stat -f%z "$local_path")
if [ "$size" -eq 0 ]; then
  echo "[pg_backup] dump is empty, aborting" >&2
  rm -f "$local_path"
  exit 1
fi
echo "[pg_backup] dump size: ${size} bytes"

echo "[pg_backup] uploading to s3://${BACKUP_S3_BUCKET}/${dump_name}"
# Run the AWS CLI from its own official image rather than installing it on
# the host — the host only needs Docker, which it already has.
docker run --rm \
  ${AWS_CLI_DOCKER_NETWORK:+--network "$AWS_CLI_DOCKER_NETWORK"} \
  -e AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY \
  -e AWS_DEFAULT_REGION \
  -v "${local_path}:/dump/${dump_name}:ro" \
  amazon/aws-cli --endpoint-url "$S3_ENDPOINT" \
  s3 cp "/dump/${dump_name}" "s3://${BACKUP_S3_BUCKET}/${dump_name}"

rm -f "$local_path"
echo "[pg_backup] $(date -u -Iseconds) done: ${dump_name}"
