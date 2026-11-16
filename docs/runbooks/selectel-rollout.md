# Rollout: moving prod to Selectel

The whole move, in order. Terraform creates a **new** VM, so this is a
server move (database + files + DNS), not an in-place switch:
`s3-cutover.md` describes the in-place variant and is only needed if prod
ever stays on its current host.

The old server stays untouched until the very end. Until stage 6 the
rollback is always "start the old backend again"; nothing below deletes
data on it.

| Stage | Who | Downtime |
|---|---|---|
| 1. Selectel account, state bucket | you, control panel | no |
| 2. `terraform apply` | you | no |
| 3. GitHub secrets, merge PR | you | no |
| 4. Prepare the new VM | you | no |
| 5. Move the data | you | **yes, ~30–60 min** |
| 6. DNS switch | you, registrar | short, while NS propagate |
| 7. Clean-up after a day | you | no |

---

## 1. Selectel account and state bucket

1. Register, create a project, and create a service user with account
   admin rights. Terraform authenticates as this user.
2. Create a private Object Storage bucket `bimeet-prod-tfstate` in `ru-9`
   and an S3 key for it.
3. In the panel, check every `# TODO verify` in `infra/terraform/`:
   Ubuntu 24.04 image name, volume type `fast.<az>`, the `ru-9` S3 endpoint,
   the external network name. Fix the `.tf` files if anything differs.

## 2. `terraform apply`

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars   # fill in; admin_cidrs = your IP
# backend.tfvars: state bucket keys from stage 1 (see README.md)
terraform init -backend-config=backend.tfvars
terraform plan -out=tfplan                      # read it: creates only, no destroys
terraform apply tfplan
terraform output
```

Check:
```bash
ssh deploy@<floating_ip>
docker ps                                       # Docker is installed
systemctl list-timers | grep bimeet-backup      # backup timer is there
```
On a VM created by this Terraform, cloud-init installs the backup units;
the manual install in `backup-restore.md` is not needed.

## 3. GitHub secrets, merge

1. Add `CRAAS_REGISTRY`, `CRAAS_USERNAME`, `CRAAS_PASSWORD` from
   `terraform output` (see `infra/terraform/README.md`).
   **Do not change `SSH_HOST` yet**, it still points at the old server.
2. Settings → Environments → `production` → required reviewers: on.
3. Merge the PR, then push a release tag. `deploy.yml` runs only on tags:
   the `build` job pushes images to GHCR and CRaaS, then `deploy` waits
   for approval.

**Reject that `deploy` job**: it would go to the old server (`SSH_HOST`).
The new backend runs migration 026 on start, and against the old MinIO
setup that breaks every file link. Note the image tag the build produced
(the tagged commit's full SHA); stage 4 uses it.

## 4. Prepare the new VM (no downtime)

On the **old** server, check what the stored file URLs look like:
```bash
cd ~/bimeet
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T postgres \
  psql -U bimeet -d bimeet -c "SELECT avatar_url FROM users WHERE avatar_url IS NOT NULL LIMIT 3;"
```
Expected: `https://s3.bimeet.pro/avatars/avatars/<uuid>.<ext>`. Migration
026 turns that into `avatars/<uuid>.<ext>`. If the URLs look different
(another host layout, a key that doesn't start with `avatars/`, `chat/` or
`receipts/`), stop and fix the migration before going further.

On the **new** VM, as `deploy`:
```bash
mkdir -p ~/bimeet && cd ~/bimeet
```
1. Copy `docker-compose.prod.yml` and the `deploy/` directory from the repo
   (`scp` from your laptop; later deploys copy them automatically).
2. Copy `.env.prod` from the old server and change only the S3 part:
   ```
   AWS_REGION=ru-9
   AWS_ACCESS_KEY_ID=<terraform output -raw app_s3_access_key>
   AWS_SECRET_ACCESS_KEY=<terraform output -raw app_s3_secret_key>
   S3_BUCKET=bimeet-prod-uploads
   S3_ENDPOINT=https://s3.ru-9.storage.selcloud.ru
   ```
   Everything else stays as it was. In particular `JWT_SECRET` (otherwise
   every user is logged out), the VAPID keys (otherwise push subscriptions
   stop working) and `POSTGRES_PASSWORD`.
3. `chmod 600 .env.prod`.
4. Fill `/opt/bimeet/backup/backup.env` from `backup_s3_*` outputs
   (`infra/backup/backup.env.example`), `chmod 600`.
5. Log in to the registry and pull, but start **only Postgres**:
   ```bash
   echo "<GHCR_TOKEN>" | docker login ghcr.io -u antonslavshchikov --password-stdin
   export IMAGE_REGISTRY=ghcr.io/antonslavshchikov IMAGE_TAG=<sha from stage 3>
   docker compose --env-file .env.prod -f docker-compose.prod.yml pull
   docker compose --env-file .env.prod -f docker-compose.prod.yml up -d postgres
   ```
   The backend must not start on an empty database before stage 5: it
   would create a fresh schema that the restore then has to fight with.

## 5. Move the data (downtime)

**On the old server:**

1. Stop writes. Landing and Traefik keep running; the app shows an error
   page:
   ```bash
   cd ~/bimeet
   docker compose --env-file .env.prod -f docker-compose.prod.yml stop backend frontend
   ```
2. Dump the database into the Selectel backups bucket. Copy
   `infra/backup/pg_backup.sh` and a `backup.env` with the `backup_s3_*`
   keys to the old server (delete both afterwards):
   ```bash
   set -a && source ./backup.env && set +a
   ./pg_backup.sh                 # prints the dump name: bimeet_<timestamp>.dump
   ```
   This dump is also the rollback point; it holds the pre-026 schema.
3. Copy the files from MinIO into `bimeet-prod-uploads`. Object keys stay
   the same (`avatars/...`, `chat/...`, `receipts/...`):
   ```bash
   docker run --rm --network bimeet_app-net rclone/rclone:latest copy \
     ":s3,provider=Minio,endpoint=http://minio:9000,access_key_id=<MINIO_ROOT_USER>,secret_access_key=<MINIO_ROOT_PASSWORD>:avatars" \
     ":s3,provider=Other,endpoint=https://s3.ru-9.storage.selcloud.ru,access_key_id=<app_s3_access_key>,secret_access_key=<app_s3_secret_key>:bimeet-prod-uploads" \
     --progress
   ```
4. Compare object counts; they must match:
   ```bash
   docker run --rm --network bimeet_app-net rclone/rclone:latest size \
     ":s3,provider=Minio,endpoint=http://minio:9000,access_key_id=<MINIO_ROOT_USER>,secret_access_key=<MINIO_ROOT_PASSWORD>:avatars"
   docker run --rm rclone/rclone:latest size \
     ":s3,provider=Other,endpoint=https://s3.ru-9.storage.selcloud.ru,access_key_id=<app_s3_access_key>,secret_access_key=<app_s3_secret_key>:bimeet-prod-uploads"
   ```

**On the new VM:**

5. Restore the dump into the real database:
   ```bash
   cd ~/bimeet
   set -a && source /opt/bimeet/backup/backup.env && set +a
   /opt/bimeet/backup/pg_restore.sh --restore-into-prod bimeet_<timestamp>.dump
   ```
   The row counts it prints must match the old server.
6. Start everything. Migration 026 runs on backend start:
   ```bash
   docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
   docker compose --env-file .env.prod -f docker-compose.prod.yml logs backend | grep -i migrat
   ```
7. Check through the new IP before DNS points there. On your laptop add
   `<floating_ip> app.bimeet.pro bimeet.pro` to `/etc/hosts`, accept the
   browser's certificate warning (Let's Encrypt can't issue before stage 6),
   log in as a real user and check: avatar, a collection receipt, a chat
   image. In DevTools → Network, `/api/files/...` must answer 302 to
   `s3.ru-9.storage.selcloud.ru`. Remove the `/etc/hosts` line afterwards.

**Rollback at this point:** on the old server
`docker compose ... start backend frontend`. Its database and MinIO were
never modified. Anything users wrote on the new VM in the meantime is lost,
which is why DNS is switched only after this check.

## 6. DNS switch

1. Write down every record the current DNS hosting serves for
   `bimeet.pro`: MX, TXT (SPF, DKIM, verifications). Terraform creates only
   A (`@`, `www`, `app`, `api`, `staging`) and CAA. Add anything missing to
   `dns.tf` and apply **before** the switch.
2. Take the NS servers of the zone from the Selectel panel (Terraform
   can't output them) and set them at the registrar.
3. Wait until `dig +short app.bimeet.pro @8.8.8.8` returns the floating IP.
   Traefik then gets certificates by itself; check `https://app.bimeet.pro`.
4. Set GitHub secret `SSH_HOST` to the floating IP and `SSH_USER` to
   `deploy`. From now on deploys go to the new VM; approve the next one and
   confirm it goes through.
5. On the old server, leave backend/frontend stopped. Don't delete
   anything yet.

**Rollback after this point:** NS back at the registrar, then start the
old server's backend. Data written on the new VM after the switch would
have to be carried back by hand, so decide quickly.

## 7. After a day without errors

1. The nightly backup reached the bucket:
   ```bash
   set -a && source /opt/bimeet/backup/backup.env && set +a
   docker run --rm -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION \
     amazon/aws-cli --endpoint-url "$S3_ENDPOINT" s3 ls "s3://$BACKUP_S3_BUCKET/"
   ```
2. A test restore works: `/opt/bimeet/backup/pg_restore.sh` (no flags,
   throwaway database).
3. Remove MinIO from `docker-compose.prod.yml` (step g in `s3-cutover.md`).
4. Switch deploys to CRaaS (`infra/terraform/README.md`, "GHCR → Selectel
   Container Registry").
5. Turn off the old server.
