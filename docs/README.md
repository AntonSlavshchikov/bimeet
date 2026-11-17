# Документация Bimeet

## Архитектура и решения

- [architecture.md](architecture.md): контейнеры прода, деплой, поток файлов, инфраструктура в Terraform (диаграммы Mermaid).
- Architecture Decision Records ([adr/](adr/)), формат MADR:
  - [0001 — Хостинг-провайдер: Timeweb Cloud](adr/0001-hosting-provider.md)
  - [0002 — Файлы: ключи в БД и presigned-редирект](adr/0002-file-storage-private-presigned.md)
  - [0003 — MinIO на той же ВМ](adr/0003-minio-on-server.md)
  - [0004 — CI/CD: GitHub Actions + GHCR, деплой по тегу](adr/0004-ci-cd-and-registry.md)

## Инфраструктура и эксплуатация

- [infra/terraform/README.md](../infra/terraform/README.md): что создаёт Terraform, решения, команды.
- Runbooks ([runbooks/](runbooks/)):
  - [timeweb-launch.md](runbooks/timeweb-launch.md): первый запуск прода с нуля.
  - [backup-restore.md](runbooks/backup-restore.md): бэкап и восстановление Postgres (пока не включено).
- [deploy.md](deploy.md): деплой, `.env.prod`, секреты GitHub, ручной деплой, откат.

## Продукт и разработка

- [requirements.md](requirements.md), [features.md](features.md), [plan.md](plan.md): требования, функциональность, план этапов.
- [security.md](security.md), [report-security.md](report-security.md): безопасность.
- [swagger.md](swagger.md): API.
