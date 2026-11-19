# Deployment

For a first launch on Timeweb Cloud from scratch, follow [runbooks/timeweb-launch.md](runbooks/timeweb-launch.md); this page is the general reference.

## Overview

| Service | Image | Access |
|---|---|---|
| Traefik (reverse proxy) | `traefik:v3.6` | :80, :443 |
| Backend (Go API) | `bimeet-backend` | internal :8080 |
| Frontend (React SPA) | `bimeet-frontend` | `app.bimeet.pro` |
| Landing (Next.js static) | `bimeet-landing` | `bimeet.pro`, `www.bimeet.pro` |
| PostgreSQL | `postgres:16-alpine` | internal |
| MinIO (S3-compatible storage) | `minio/minio` | `s3.bimeet.pro` |
| coturn (STUN/TURN for calls) | `coturn/coturn:4.6.3` | host network: 3478 udp/tcp, 49160–49200 udp |

Images are stored in GitHub Container Registry (GHCR). The full pipeline runs automatically when a Git tag is pushed. Every image gets an immutable tag with the commit SHA, and production runs exactly the images that passed the checks.

---

## Routing

Traefik accepts all incoming traffic on ports 80 and 443 and routes by domain:

| Domain | Service | Description |
|---|---|---|
| `bimeet.pro`, `www.bimeet.pro` | landing | Landing page |
| `app.bimeet.pro` | frontend | SPA, `/api/*` → backend (through nginx) |
| `s3.bimeet.pro` | minio | Uploaded files, reached through presigned links from `GET /api/files/<key>` |

HTTP is redirected to HTTPS automatically. TLS certificates are issued by Let's Encrypt (HTTP challenge) and stored in the `acme_data` Docker volume.

---

## Initial setup

### 1. DNS

Add A records at the domain's DNS provider pointing to the server IP:

```
bimeet.pro      → <server-ip>
www.bimeet.pro  → <server-ip>
app.bimeet.pro  → <server-ip>
s3.bimeet.pro   → <server-ip>
```

### 2. Prepare the server

On a server created by `infra/terraform`, cloud-init already installs Docker, ufw and the `deploy` user; skip to step 3. On any other server, install Docker and Docker Compose:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

Open the firewall ports (needed by Traefik and Let's Encrypt):

```bash
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22
sudo ufw enable
```

Create the working directory:

```bash
mkdir ~/bimeet && cd ~/bimeet
```

Copy from the repository to the server:
- `docker-compose.prod.yml`
- the `deploy/` directory

### 3. Create `.env.prod`

```bash
nano .env.prod
chmod 600 .env.prod
```

Required values:

```env
# Database
DSN=postgres://bimeet:<password>@postgres:5432/bimeet?sslmode=disable
POSTGRES_PASSWORD=<same password>

# JWT
JWT_SECRET=<random string, 32+ characters>
JWT_EXP_HOURS=72

# Application URL
FRONTEND_URL=https://app.bimeet.pro
```

Generate secrets with `openssl rand -base64 32`. `IMAGE_TAG` and `IMAGE_REGISTRY` don't belong in `.env.prod`: GitHub Actions passes the tested commit SHA and the registry prefix at deploy time.

For S3, pick one of two options:

**Option A — MinIO (built in, recommended):**
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=<strong password>
S3_BUCKET=avatars
S3_ENDPOINT=http://minio:9000
# The browser gets files through GET /api/files/<key> → 302 to a presigned
# URL. The link must be signed with an address the browser can reach, not
# the internal minio:9000.
S3_PRESIGN_ENDPOINT=https://s3.bimeet.pro
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=<same password>
```

**Option B — external S3 (AWS or a provider's S3):**
```env
AWS_REGION=<region>
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
S3_BUCKET=<bucket>
S3_ENDPOINT=<provider endpoint, omit for AWS>
```

**1:1 calls (coturn):**
```env
# Shared secret between the backend (mints TURN credentials) and coturn.
TURN_SECRET=<openssl rand -hex 32>
# What browsers connect to for STUN/TURN (port 3478). The server IP works;
# a hostname needs its own A record.
TURN_HOST=<server-ip>
# The server's public IP, announced by coturn in relay candidates.
TURN_EXTERNAL_IP=<server-ip>
```
`TURN_SECRET` and `TURN_EXTERNAL_IP` are required: `docker compose` stops with an error if they are missing. Without `TURN_HOST` the backend offers no STUN/TURN and calls work only inside one network. Ports to open: 3478/udp, 3478/tcp, 49160–49200/udp (already in `infra/terraform/firewall.tf` and cloud-init). Checking calls after a deploy: [runbooks/calls-check.md](runbooks/calls-check.md).

`S3_PRESIGN_TTL` (Go duration, default `5m`) controls how long a presigned link lives. `S3_PUBLIC_BASE_URL` is no longer used for user-facing links.

### 4. GitHub Secrets

In the repository: **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Value |
|---|---|
| `SSH_HOST` | server IP or domain |
| `SSH_USER` | user on the server (`deploy` on a Terraform-created server) |
| `SSH_KEY` | private SSH key for CI (see step 5) |
| `VITE_API_URL` | `https://app.bimeet.pro` |
| `NEXT_PUBLIC_APP_URL` | `https://app.bimeet.pro` |

### 5. SSH key for CI

Use a dedicated key for CI so your personal key never ends up in GitHub. On your machine:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/bimeet-ci -N "" -C bimeet-ci
ssh-copy-id -i ~/.ssh/bimeet-ci.pub deploy@<server-ip>
```

Add the contents of `~/.ssh/bimeet-ci` (the private key) to GitHub Secrets as `SSH_KEY`.

---

## Automatic deployment (CI/CD)

Once the secrets are set, the pipeline runs on every pushed Git tag:

1. Lints the backend and frontend.
2. Builds three Docker images and pushes them to GHCR tagged `<commit-sha>`.
3. Runs backend/frontend unit tests and smoke tests of the built containers.
4. Deploys the same `<commit-sha>` images to the server over SSH (environment `prod`).

Each stage depends on the previous one: deploy doesn't start if lint, build or test failed.

Deployment status: the **Actions** tab of the GitHub repository.

---

## Manual deployment

To redeploy a commit SHA that has already been built and tested:

```bash
# On the server
cd ~/bimeet
echo "<GITHUB_TOKEN>" | docker login ghcr.io -u <username> --password-stdin
export IMAGE_REGISTRY=ghcr.io/<owner-in-lowercase>
export IMAGE_TAG=<commit-sha>
docker compose --env-file .env.prod -f docker-compose.prod.yml pull
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

---

## Updating the application

Create and push a Git tag; CI/CD does the rest:

```bash
git tag v1.2.3
git push origin v1.2.3
```

---

## Rollback

To roll back, set the SHA of a previously tested image and bring the services up again:

```bash
cd ~/bimeet
export IMAGE_REGISTRY=ghcr.io/<owner-in-lowercase>
export IMAGE_TAG=<previous-commit-sha>
docker compose --env-file .env.prod -f docker-compose.prod.yml pull
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

A rollback across a database migration (e.g. `026_file_keys`) also needs the database restored from a dump taken before the deploy; see [runbooks/backup-restore.md](runbooks/backup-restore.md).

---

## Monitoring

```bash
# Status of all services
docker compose -f docker-compose.prod.yml ps

# Traefik logs (TLS certificates, routing)
docker compose -f docker-compose.prod.yml logs -f traefik

# Backend logs (live)
docker compose -f docker-compose.prod.yml logs -f backend

# Logs of all services
docker compose -f docker-compose.prod.yml logs -f

# Resource usage
docker stats
```

---

## Local development

Local runs use a separate `backend/docker-compose.yml` (infrastructure only: postgres, mailhog, minio):

```bash
cd backend
docker compose up -d

# Backend
go run ./cmd/server

# Frontend
cd ../frontend
npm run dev
```

Environment variables for local development live in `backend/.env` (copy from `backend/.env.example`).
