# Bimeet infrastructure (Timeweb Cloud)

One server in Moscow runs the whole `docker-compose.prod.yml` stack (Traefik,
Postgres, MinIO, backend, frontend, landing). Terraform creates the server and
everything around it; the app itself is deployed by `.github/workflows/deploy.yml`.

Step-by-step first launch: [`docs/runbooks/timeweb-launch.md`](../../docs/runbooks/timeweb-launch.md).

## What gets created

| File | Resources |
|---|---|
| `server.tf` | project `bimeet-prod`, SSH key, public IP, server (Ubuntu 24.04, 1 CPU / 2 GB / 15 GB NVMe, Ultra line, configurator 159) |
| `firewall.tf` | cloud firewall: SSH from `admin_cidrs` (open by default, key-only auth), 80/443 from anywhere, coturn 3478 udp/tcp and 49160–49200/udp from anywhere, ICMP, all outbound |
| `cloud-init.yaml.tftpl` | first boot: `deploy` user, key-only SSH, Docker + compose plugin, ufw, fail2ban, security-only unattended upgrades, chrony, 2 GB swap, Docker log rotation |
| `outputs.tf` | `server_ip`, `server_id`, `ssh_command` |

```
Internet ──► Timeweb firewall (22 key-only / 80 / 443 / 3478 / 49160-49200 udp)
                │
          public IP (floating, created first)
                │
          server bimeet-prod ── ufw ── Traefik ─┬─ landing   (bimeet.pro, www)
                                                ├─ frontend  (app.bimeet.pro) ─► backend ─► Postgres
                                                └─ MinIO     (s3.bimeet.pro, presigned file links)
```

## Design decisions

- **Custom size, not a preset.** 1 CPU / 2 GB / 15 GB is not one of the fixed
  presets; it is built on a configurator. The stack is light (two static nginx
  images, one Go binary), 2 GB plus swap is enough for a demo.
- **Ultra line, pinned configurator ID.** Premium in Moscow is pre-order only;
  Ultra can be ordered. Provider 1.8.4 has no `ultra` value for
  `twc_configurator.preset_type`, so `server.tf` pins configurator `159` from
  the API (see the comment there). If Timeweb changes the ID, `apply` fails
  with an unknown configurator; look it up again with
  `GET /api/v1/configurator/servers` (location `ru-3`, tag `ultra_msk_nvme`).
- **IP before server.** cloud-init installs Docker on first boot and needs the
  internet right away, so the floating IP is created first and handed to the
  server through `floating_ip_id` (the provider's documented way).
- **`prevent_destroy` on the server.** Its disk holds Postgres and the uploaded
  files. Destroying it is a deliberate manual step, not something a plan does.
- **`ignore_changes = [cloud_init, os_id]`.** cloud-init runs only once;
  changing the template later would do nothing on the live server.
- **Local state.** One person runs Terraform; a remote backend would be another
  paid bucket. The state file is git-ignored and backed up by hand.
- **DNS is not managed here.** `bimeet.pro` is served by reg.ru; four A records
  (`@`, `www`, `app`, `s3`) point at `server_ip`, set by hand once.
- **Files in MinIO on the same server.** Cheapest option. The backend already
  serves files through `/api/files/<key>` with presigned links, so moving to a
  Timeweb S3 bucket later is an `.env.prod` change, not a code change.

## Commands

```bash
terraform init
terraform fmt -check -recursive && terraform validate
terraform plan
terraform apply
terraform output
```

CI (`.github/workflows/infra.yml`) runs fmt, validate and tflint on every PR
that touches `infra/**`. It never runs plan or apply and has no credentials.

## Not done yet

- Postgres backups to a bucket outside the server (scripts ready in
  `infra/backup/`, see `docs/runbooks/backup-restore.md`).
- Monitoring and alerts beyond `docker compose logs`.

## Destroying the stack

1. Dump the database and copy it off the server (see the runbook).
2. Remove `prevent_destroy` from `server.tf` in a local, uncommitted edit.
3. `terraform destroy`.
