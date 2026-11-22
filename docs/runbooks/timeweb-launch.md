# First launch on Timeweb Cloud

Minimal production: one VM in Moscow, the whole app in `docker-compose.prod.yml`
(Traefik, Postgres, MinIO, backend, frontend, landing). The database starts
empty, nothing to migrate. Order matters: DNS changes last, once the server
already responds.

## 0. Prerequisites

- A Timeweb Cloud account with a positive balance (1 CPU / 2 GB / 15 GB
  on the Ultra line plus a public IP, billed hourly; current price in the panel).
- An API token: panel → "API и Terraform" → create a token.
- Access to reg.ru, which hosts DNS for `bimeet.pro` (`ns1/ns2.reg.ru`). If the
  domain isn't yours, you need its owner: they change four A records in step 4.
- Permissions in the GitHub repository for secrets and tags.

## 1. Terraform

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars   # token, your IP, your SSH key
terraform init
terraform plan        # read it: creates only, no destroys
terraform apply
terraform output
```

Creates: project, SSH key, public IP, server, firewall (22 only from your IP,
80/443 from anywhere).

After `apply`, copy `terraform.tfstate` somewhere safe (not git): without it
Terraform no longer knows what it created.

Use your IPv4 for `admin_cidrs` (`curl -4 -s https://ifconfig.me`): the server
has no IPv6, and without `-4` the service may return an IPv6 address.

If `plan` fails on the OS, the Moscow location code differs: fix `location`
in `terraform.tfvars` and retry. The configurator ID (Ultra, `159`) is pinned
in `server.tf`; if `apply` rejects it, see "Ultra line" in
`infra/terraform/README.md`.

If the API complains that this SSH key already exists, delete the key added
by hand in the panel ("SSH keys") and run `apply` again.

## 2. Server is ready

cloud-init installs Docker, ufw, fail2ban and 2 GB of swap; this takes 3–5 minutes.

```bash
ssh deploy@<server_ip>
docker version && sudo ufw status && swapon --show
```

## 3. Application

On the server:

```bash
mkdir -p ~/bimeet && cd ~/bimeet
```

1. Copy `docker-compose.prod.yml` and the `deploy/` directory from your laptop
   (CI copies them itself afterwards):
   ```bash
   scp -r docker-compose.prod.yml deploy deploy@<server_ip>:~/bimeet/
   ```
2. Create `~/bimeet/.env.prod` following `docs/deploy.md`, "Create `.env.prod`",
   option A (MinIO). Make sure to:
   - set `S3_PRESIGN_ENDPOINT=https://s3.bimeet.pro`: without it file links
     point to the internal `minio:9000`;
   - set the call variables (coturn won't start, and `docker compose` refuses
     to run, without the first and last one):
     `TURN_SECRET=<openssl rand -hex 32>`, `TURN_HOST=<server_ip>`,
     `TURN_EXTERNAL_IP=<server_ip>`;
   - generate secrets instead of keeping the examples:
     ```bash
     openssl rand -base64 32   # JWT_SECRET, POSTGRES_PASSWORD, MINIO_ROOT_PASSWORD
     openssl rand -hex 32      # TURN_SECRET
     ```
   - `chmod 600 .env.prod`.

## 4. DNS (reg.ru)

In the `bimeet.pro` DNS zone on reg.ru, point A records to `server_ip`:

| Name | Purpose |
|---|---|
| `@` | landing |
| `www` | landing |
| `app` | application |
| `s3` | MinIO; the browser fetches files through it |

TTL 300. Check: `dig +short app.bimeet.pro` returns `server_ip`. Let's Encrypt
won't issue certificates until DNS has updated.

## 5. Deploy

A separate key for CI, so your personal key doesn't live in GitHub:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/bimeet-ci -N "" -C bimeet-ci
ssh-copy-id -i ~/.ssh/bimeet-ci.pub deploy@<server_ip>
```

GitHub → Settings → Secrets → Actions:

| Secret | Value |
|---|---|
| `SSH_HOST` | `server_ip` |
| `SSH_USER` | `deploy` |
| `SSH_KEY` | contents of `~/.ssh/bimeet-ci` (private) |
| `VITE_API_URL`, `NEXT_PUBLIC_APP_URL` | `https://app.bimeet.pro` |

The others (`GHCR_TOKEN`, `VITE_ADMIN_EMAILS`) already exist. Then merge the PR
and push a tag: `deploy.yml` builds the images and rolls them out to the server.

## 6. Verification

- `https://bimeet.pro` opens the landing page, `https://app.bimeet.pro` the app,
  with a valid certificate.
- Sign up, create an event.
- Upload an avatar: in DevTools → Network, `/api/files/...` answers 302 to
  `s3.bimeet.pro`, and the image shows up.

Logs: `docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f backend traefik`.

## Deliberately not here

- **Database backups**: the scripts are ready (`infra/backup/`) but need a
  bucket off the server; see `backup-restore.md`. Before the defense, take at
  least one dump by hand:
  `docker compose ... exec -T postgres pg_dump -Fc -U bimeet bimeet > bimeet.dump`
  and copy it to your laptop with `scp`.
- **Files off the server**: MinIO lives on the VM's disk. Moving to a Timeweb
  S3 bucket means changing the S3 variables in `.env.prod`; the code already
  supports it.
