# ADR 0004: CI/CD — GitHub Actions + GHCR, деплой по тегу через SSH

- Статус: принято
- Дата: 2026-11-16
- Связано: [0001](0001-hosting-provider.md)

## Context

Код в GitHub (`AntonSlavshchikov/bimeet`), CI уже на GitHub Actions, образы в GitHub Container Registry. При переезде на Selectel был добавлен второй пуш образов в Selectel Container Registry (CRaaS), но после выбора Timeweb ([0001](0001-hosting-provider.md)) он потерял смысл.

## Decision drivers

- Не ломать работающий пайплайн перед защитой.
- Минимум новых сервисов и секретов.
- Понимать риск зависимости от зарубежных сервисов и иметь путь отхода.

## Considered options

1. **GitHub Actions + GHCR (как есть).**
2. **GitHub Actions + Selectel CRaaS.** Реестр в РФ, но провайдер уже не используется.
3. **GitHub Actions + реестр Timeweb Cloud.** TODO: наличие и цена не изучались.
4. **Перенос репозитория и CI в российский сервис (например, GitVerse).**

## Decision

Вариант 1. Пайплайн `.github/workflows/deploy.yml` запускается **на push тега**:

1. `lint`: `make lint vet` (Go), `npm run lint` (фронт);
2. `build`: сборка трёх образов (backend, frontend, landing) и пуш в GHCR с тегом = SHA коммита;
3. `test`: юнит-тесты Go и фронта, затем smoke-проверка собранных образов (`deploy/ci/smoke-images.sh`);
4. `deploy` (environment `production`): `scp` `docker-compose.prod.yml` и `deploy/` на сервер, по SSH `docker compose pull && up -d` с `IMAGE_TAG` проверенного коммита.

Шаги пуша в CRaaS удалены (коммит `5d1d5d1`). Кроме ненужности, они использовали контекст `secrets` в `if:` шага, что GitHub Actions не допускает, и первый тег уронил бы workflow.

Отдельно `.github/workflows/infra.yml` на PR с изменениями `infra/**` выполняет `terraform fmt`, `validate` и tflint, без кредов и без `plan`/`apply`.

## Consequences

**Положительные**
- Ничего не нужно переносить и настраивать заново; пайплайн уже работал.
- Выкатывается ровно тот образ, который прошёл тесты (тег = SHA).
- Ручное подтверждение деплоя возможно через required reviewers в environment `production`.

**Отрицательные / риски**
- **Зависимость от зарубежных сервисов.** Runners GitHub и образы в GHCR находятся вне РФ. Это не данные пользователей (они в РФ, см. 0001), но доступность деплоя от этого зависит. Прецедент: в 2024 году Docker Hub ограничивал доступ пользователям из России. TODO: точная дата и масштаб в репозитории не задокументированы.
- **Порядок «build → test»:** образ попадает в GHCR до тестов. На сервер он уходит только после зелёных тестов, но в реестре могут оставаться непроверенные теги.
- Деплой по SSH с ключом в секретах GitHub: компрометация репозитория даёт доступ к серверу. Смягчение: отдельный CI-ключ и пользователь `deploy` (runbook `timeweb-launch.md`).

### Путь отхода

- Образы: собирать и пушить в российский реестр (реестр Timeweb или любой S3/registry в РФ) — замена `REGISTRY` и логина в `deploy.yml`, compose уже читает префикс из `IMAGE_REGISTRY`.
- CI: GitVerse заявляет совместимость с синтаксисом GitHub Actions, workflow можно перенести почти без изменений. TODO: совместимость не проверялась.
- Крайний вариант: собрать образы локально и выкатить по SSH вручную (`docs/deploy.md`, «Ручной деплой»).
