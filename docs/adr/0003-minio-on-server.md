# ADR 0003: MinIO on the same VM instead of provider S3

- Status: accepted (deliberate trade-off)
- Date: 2026-11-16
- Related: [0001](0001-hosting-provider.md), [0002](0002-file-storage-private-presigned.md)

## Context

Uploaded files need S3-compatible storage. MinIO is already part of `docker-compose.prod.yml`, and Timeweb Cloud offers paid S3 (`twc_s3_bucket`). The goal of this stage is to show a working product at the defense at the lowest cost.

## Decision drivers

- Price: don't pay for one more service.
- Scope: the bare minimum needed to show the site; fewer resources and keys mean fewer risks before the defense.
- Easy reversal: the code must not depend on this choice.

## Considered options

1. **MinIO on the same VM** (as in compose today).
2. **A Timeweb Cloud S3 bucket.** Separate charge (TODO: price of the smallest plan not recorded), separate keys, one more Terraform resource.

## Decision

Option 1. MinIO runs on the server and Traefik exposes it as `s3.bimeet.pro`. The backend talks to MinIO at `http://minio:9000` and signs presigned links with the public address via `S3_PRESIGN_ENDPOINT=https://s3.bimeet.pro`.

Moving to provider S3 means replacing the S3 variables in `.env.prod` and copying the objects. The code already supports it (ADR 0002).

## Consequences

**Positive**
- Zero extra cost and no extra Terraform resources.
- Same stack as local development (`docker-compose.yml`).

**Negative**
- **No backup off the server.** Files and Postgres live on one disk of one VM. The backup scripts (`infra/backup/`) are ready but need a bucket off the server, so they are not enabled. Losing the VM means losing the data. Before the defense a dump is taken by hand (runbook `timeweb-launch.md`).
- **Shared disk and RAM.** MinIO shares 15 GB of disk and 2 GB of RAM with Postgres and the app. Enough for a demo (two static nginx images, one Go binary), not for real load.
- The MinIO bucket is currently public because of `minio-init` (see the debt in ADR 0002).
- TODO: there is no disk usage monitoring.
