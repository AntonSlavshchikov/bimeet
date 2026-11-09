#!/usr/bin/env bash
# Downloads a backup (latest by default) and restores it into a throwaway
# database (bimeet_restore_check), runs a sanity check, then drops it.
# Never touches the real "bimeet" database unless --restore-into-prod is
# passed explicitly — see docs/runbooks/backup-restore.md before ever doing
# that for real.
#
# Usage:
#   ./pg_restore.sh                       # restore latest dump, check, drop
#   ./pg_restore.sh bimeet_20260101T...   # restore a specific dump
#   ./pg_restore.sh --restore-into-prod bimeet_20260101T...   # DANGER: real restore
set -euo pipefail

: "${POSTGRES_USER:=bimeet}"
: "${BACKUP_S3_BUCKET:?BACKUP_S3_BUCKET must be set (see backup.env.example)}"
: "${S3_ENDPOINT:?S3_ENDPOINT must be set (see backup.env.example)}"
: "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID must be set (see backup.env.example)}"
: "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY must be set (see backup.env.example)}"
: "${AWS_DEFAULT_REGION:=ru-9}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.prod}"

restore_into_prod=false
if [ "${1:-}" = "--restore-into-prod" ]; then
  restore_into_prod=true
  shift
fi
dump_name="${1:-}"

aws_cli() {
  docker run --rm \
    ${AWS_CLI_DOCKER_NETWORK:+--network "$AWS_CLI_DOCKER_NETWORK"} \
    -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION \
    -v /tmp:/tmp \
    amazon/aws-cli --endpoint-url "$S3_ENDPOINT" "$@"
}

if [ -z "$dump_name" ]; then
  echo "[pg_restore] no dump named, finding the latest in s3://${BACKUP_S3_BUCKET}"
  dump_name=$(aws_cli s3 ls "s3://${BACKUP_S3_BUCKET}/" | awk '{print $4}' | sort | tail -n1)
  if [ -z "$dump_name" ]; then
    echo "[pg_restore] no dumps found in bucket" >&2
    exit 1
  fi
fi
local_path="/tmp/${dump_name}"

echo "[pg_restore] downloading ${dump_name}"
aws_cli s3 cp "s3://${BACKUP_S3_BUCKET}/${dump_name}" "$local_path"

if [ "$restore_into_prod" = true ]; then
  echo "[pg_restore] !!! RESTORING INTO THE REAL bimeet DATABASE !!!"
  read -r -p "Type the dump name again to confirm (${dump_name}): " confirm
  if [ "$confirm" != "$dump_name" ]; then
    echo "[pg_restore] confirmation did not match, aborting" >&2
    rm -f "$local_path"
    exit 1
  fi
  target_db="bimeet"
else
  target_db="bimeet_restore_check"
  echo "[pg_restore] restoring into throwaway database ${target_db}"
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
    dropdb -U "$POSTGRES_USER" --if-exists "$target_db"
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
    createdb -U "$POSTGRES_USER" "$target_db"
fi

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  pg_restore -U "$POSTGRES_USER" -d "$target_db" --clean --if-exists <"$local_path"
rm -f "$local_path"

echo "[pg_restore] row counts in ${target_db}:"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$target_db" -c "
    SELECT 'users' AS table, count(*) FROM users
    UNION ALL SELECT 'events', count(*) FROM events
    UNION ALL SELECT 'event_messages', count(*) FROM event_messages
    UNION ALL SELECT 'collections', count(*) FROM collections;
  "

if [ "$restore_into_prod" = false ]; then
  echo "[pg_restore] dropping ${target_db}"
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
    dropdb -U "$POSTGRES_USER" "$target_db"
fi

echo "[pg_restore] $(date -u -Iseconds) done"
