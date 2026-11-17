# Bimeet documentation

## Architecture and decisions

- [architecture.md](architecture.md): production containers, deployment, file flow, Terraform infrastructure (Mermaid diagrams).
- Architecture Decision Records ([adr/](adr/)), MADR format:
  - [0001 — Hosting provider: Timeweb Cloud](adr/0001-hosting-provider.md)
  - [0002 — Files: keys in the database, presigned redirect](adr/0002-file-storage-private-presigned.md)
  - [0003 — MinIO on the same VM](adr/0003-minio-on-server.md)
  - [0004 — CI/CD: GitHub Actions + GHCR, tag-triggered deploy](adr/0004-ci-cd-and-registry.md)

## Infrastructure and operations

- [infra/terraform/README.md](../infra/terraform/README.md): what Terraform creates, design decisions, commands.
- Runbooks ([runbooks/](runbooks/)):
  - [timeweb-launch.md](runbooks/timeweb-launch.md): first production launch from scratch.
  - [backup-restore.md](runbooks/backup-restore.md): Postgres backup and restore (not enabled yet).
- [deploy.md](deploy.md): deployment, `.env.prod`, GitHub secrets, manual deploy, rollback.

## Product and development

- [requirements.md](requirements.md), [features.md](features.md), [plan.md](plan.md): requirements, features, roadmap.
- [security.md](security.md), [report-security.md](report-security.md): security.
- [swagger.md](swagger.md): API.
