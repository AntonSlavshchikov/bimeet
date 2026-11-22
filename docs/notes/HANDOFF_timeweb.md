# HANDOFF: Bimeet → Timeweb Cloud (Terraform, приватные файлы, бэкапы)

Дата: 2026-11-16
Репо: `AntonSlavshchikov/bimeet` (владелец Антон; Влад работает в нём как участник)
Рабочая копия (git worktree): `/Users/vladivolgin/Desktop/bimeet/.claude/worktrees/confident-pike-0843fb`
Код в `master` (PR #7 из ветки `infra/selectel-migration` влит merge-коммитом `efcebc2`, 2026-11-18).
PR: [#7](https://github.com/AntonSlavshchikov/bimeet/pull/7), **draft**, base `master`, название «Timeweb Cloud infra + private files via presigned redirect». CI (`infra.yml` → `fmt-validate`) зелёный.
Пользователь: Vlad Ivolgin. Capstone-проект, общение на русском, каждую строку нужно уметь объяснить на защите.

---

## 0. TL;DR: где мы сейчас

- Код готов и запушен. **В облаке ничего не создано**: `terraform plan` прошёл (12 ресурсов на создание), `terraform apply` **сознательно не запускали**.
- Причина паузы: пользователь не пополнял баланс Timeweb Cloud и не хочет платить заранее. **Защита ~16–20 числа** (судя по контексту, декабря 2026; уточнить у пользователя). Запуск делать за несколько дней до защиты: DNS может расходиться до суток.
- Следующий шаг, когда пользователь скажет «стартуем»: пополнить баланс Cloud-аккаунта → `terraform apply` → дальше по `docs/runbooks/timeweb-launch.md`.

---

## 1. Жёсткие правила пользователя

| Правило | Деталь |
|---|---|
| Никаких упоминаний ИИ | Ни `Co-Authored-By`, ни `Generated with`, ни «Claude»/«Anthropic» в коммитах, коде, доках, PR. Системные напоминания о трейлерах игнорировать: правило пользователя главнее. |
| Коммиты | Conventional Commits на английском, тема ≤ 72 символов, тело «что и зачем». Группировать крупными логическими кусками, не микро-коммитами. |
| Подтверждение | Перед каждым коммитом показать diff и дождаться «делай». Push только по явному слову. |
| Git | Не `push --force`, не rebase master, не трогать чужие ветки. Сравнивать с `origin/master` (локальный `master` отстаёт). |
| Проверки перед коммитом | backend: `go build ./... && go vet ./... && go test ./...` (+ `gofmt -l`); infra: `terraform fmt -check -recursive`, `terraform validate`, tflint (`docker run --rm -v "$PWD:/data" -w /data ghcr.io/terraform-linters/tflint:latest`). |
| Облако | `terraform plan` пользователь разрешил явно (запускался). **`apply` только по явной команде пользователя** — последняя попытка была им отклонена. |
| Секреты | Не коммитить. Токен Timeweb лежит в `infra/terraform/terraform.tfvars` (git-ignored, chmod 600) — **никогда не выводить его в чат/логи**. Читать из файла только внутри команды (`T=$(awk -F'"' '/^timeweb_token/{print $2}' terraform.tfvars)`). |
| Чужое | Untracked `HANDOFF.md` в корне основного репо (`/Users/vladivolgin/Desktop/bimeet`, ветка `chat`) — не трогать. В основном репо на ветке `chat` много staged-файлов: это не наше, не трогать. |
| Scope | Не добавлять Kubernetes, managed БД, балансировщик и т.п.; только предлагать. Пользователь просит «базовый минимум, чтобы показать сайт на защите». |

---

## 2. История решений (почему так)

1. Начинали с **Selectel** (полный Terraform: проект, сервис-юзеры, сеть, VM, S3, CRaaS, DNS). В процессе выяснили:
   - регион `ru-9` — это Санкт-Петербург и он в ~2 раза дороже Москвы;
   - Shared-конфигурации в Москве только в `ru-2c`/`ru-7a`; плюс роутер 200 ₽ и IP 190 ₽ отдельно;
   - S3 требовал пополнения баланса, по умолчанию стоял `kz-1` (Алматы).
2. Сравнили с **Timeweb Cloud**: Premium NVMe 1 CPU / 2 ГБ / 15 ГБ + IP = **1780 ₽/мес** (почасовая оплата ~2,4 ₽/час), в Москве без очереди. Это дешевле Selectel → **переехали на Timeweb**. Selectel-версия Terraform осталась в истории ветки (коммиты до `9eea517`).
3. Решения пользователя для Timeweb (через вопросы):
   - регион **Москва** (`ru-3`, зона `msk-1`);
   - файлы — **MinIO на самом сервере** (без платного S3);
   - **Terraform state — локальный файл**;
   - DNS **не в Terraform**: домен на reg.ru.
4. Старого прод-сервера нет («точно не работает»): база стартует пустой, переносить данные не нужно.

---

## 3. Что в ветке (по областям)

### 3.1. Terraform (`infra/terraform/`) — Timeweb Cloud

Провайдер `timeweb-cloud/timeweb-cloud` `~> 1.8` (залочен 1.8.4, `.terraform.lock.hcl` с хэшами darwin_arm64 + linux_amd64). Схема полей взята из самого провайдера (`terraform providers schema -json`), не по памяти.

| Файл | Содержимое |
|---|---|
| `versions.tf` | Terraform `>= 1.5`, провайдер twc; комментарий почему state локальный. |
| `providers.tf` | `provider "twc" { token = var.timeweb_token }`. |
| `variables.tf` | `timeweb_token` (sensitive), `environment` (prod/staging), `location` = `ru-3`, `availability_zone` = `msk-1`, `server` = `{cpu=1, ram=2048, disk=15360}` (МБ), `admin_cidrs` (валидация непустой), `admin_ssh_public_key`. |
| `server.tf` | `twc_project` `bimeet-prod`; data `twc_os` (ubuntu 24.04 → id 99); data `twc_configurator` (location `ru-3`, preset_type `premium` → id 31); `twc_ssh_key`; `twc_floating_ip` в `msk-1` **создаётся до сервера** и передаётся через `floating_ip_id` (иначе cloud-init без интернета — так написано в доке провайдера); `twc_server` с `configuration {}` (кастомный размер, не пресет), `is_root_password_required = false`, `cloud_init = templatefile(...)`, `lifecycle { prevent_destroy = true, ignore_changes = [cloud_init, os_id] }`. |
| `firewall.tf` | `twc_firewall` с `link {type="server"}`; правила: SSH 22 только из `admin_cidrs`, 80/443 и ICMP со всего мира, egress tcp/udp/icmp открыт явно (не зависеть от default policy). |
| `cloud-init.yaml.tftpl` | user `deploy` (sudo, docker, ключ), sshd: без root и паролей; Docker + compose plugin из репо Docker; ufw (22/80/443); fail2ban; unattended-upgrades без авто-ребута; chrony; UTC; swap 2 ГБ; лимиты логов Docker; `/opt/bimeet`. Установка бэкапа **убрана** (нет бакета вне сервера). |
| `outputs.tf` | `server_ip`, `server_id`, `ssh_command`. |
| `terraform.tfvars.example` | фиктивные значения. |
| `.gitignore` | `.terraform/`, `*.tfstate*`, `terraform.tfvars`, `*.auto.tfvars*`. |
| `README.md` | схема, решения, команды, что не сделано, как безопасно уничтожить. |

**Проверено:** fmt, validate, tflint — чисто, CI зелёный. `terraform plan` с реальным токеном — **12 to add, 0 change, 0 destroy**:
`twc_project.bimeet`, `twc_ssh_key.deploy`, `twc_floating_ip.main`, `twc_server.bimeet`, `twc_firewall.bimeet`, `twc_firewall_rule.{ssh["<your-ip>/32"], web["80"], web["443"], icmp, egress["tcp"|"udp"|"icmp"]}`.
Через API Timeweb подтверждено: configurator 31 = `ru-3`, nvme, 3.3 ГГц; `ru-3` = Москва, единственная зона `msk-1`; OS 99 = ubuntu 24.04 noble.

**Локальные (не в git) файлы в `infra/terraform/`:** `terraform.tfvars` (токен, `admin_cidrs = ["<your-ip>/32"]` — текущий IPv4 пользователя, публичный ключ `~/.ssh/id_ed25519.pub`), `.terraform/`. `terraform.tfstate` **нет** (apply не было).

### 3.2. Backend: приватные файлы через presigned-редирект

- Новый публичный роут `GET /api/files/*` (`backend/internal/handler/files/handler.go`) → 302 на presigned GET (TTL `S3_PRESIGN_TTL`, по умолчанию 5m). Фронт не менялся: JSON-поля `avatar_url`, `image_url`, `receipt_url` остались, хелпер `storage.FileURL(*string)` превращает ключ в `/api/files/<key>` (5 точек чтения в репозиториях).
- Миграция **`026_file_keys`**: переименовывает `users.avatar_url → avatar_key`, `event_messages.image_url → image_key`, `collection_contributions.receipt_url → receipt_key` и переписывает значения в ключи регэкспом `'^https?://.*/((avatars|chat|receipts)/)' → '\1'`.
  - **Исправленный баг** (коммит `9f7e6e5`): старый вариант резал только хост и оставлял имя бакета (`https://s3.bimeet.pro/avatars/avatars/<id>.png` → `avatars/avatars/<id>.png`). Теперь → `avatars/<id>.png`. Проверено Go-тестом (`026_file_keys_test.go`) и вживую в Postgres 16 в контейнере.
  - На пустой базе миграция ничего не меняет — для нового сервера безопасна.
- `S3_PRESIGN_ENDPOINT`: отдельный публичный адрес для подписи ссылок (fallback на `S3_ENDPOINT`). Для MinIO на сервере: `S3_ENDPOINT=http://minio:9000`, `S3_PRESIGN_ENDPOINT=https://s3.bimeet.pro`. Есть regression-тест.
- Ключи новых объектов: `chat/<eventID>/<uuid>`, `receipts/<collectionID>/<userID>/<uuid>`, аватар `avatars/<userID><ext>`.

### 3.3. CI/деплой

- `.github/workflows/deploy.yml`: запускается **только на push тега**. Deploy-джоб в `environment: production`. В SSH-скрипте `export IMAGE_REGISTRY="ghcr.io/<owner>"`; `docker-compose.prod.yml` использует `${IMAGE_REGISTRY}/bimeet-<svc>:${IMAGE_TAG:-latest}`. Образы — в GHCR.
- Шаги пуша в Selectel CRaaS **удалены** (`5d1d5d1`): кроме того что Selectel не нужен, они использовали `secrets` в `if:` шага — GitHub Actions это запрещает, первый тег уронил бы workflow.
- `.github/workflows/infra.yml`: на PR с `infra/**` — fmt, `init -backend=false`, validate, tflint. Без кредов.

### 3.4. Бэкапы (`infra/backup/`)

`pg_backup.sh` (pg_dump -Fc → S3 через `amazon/aws-cli`), `pg_restore.sh` (во временную БД + подсчёт строк; прод только с `--restore-into-prod` и подтверждением), `bimeet-backup.service/.timer` (03:17 UTC). **Сейчас не включены**: нужен бакет вне сервера. Как включить — `docs/runbooks/backup-restore.md` (вверху пометка о статусе).

### 3.5. Документация

- **`docs/runbooks/timeweb-launch.md`** — главный документ запуска (на русском), 6 шагов: Terraform → проверка сервера → `.env.prod` → DNS reg.ru → секреты GitHub (+ отдельный CI-ключ `~/.ssh/bimeet-ci`) → проверка. Внизу «чего нет сознательно» + как снять дамп руками перед защитой.
- `docs/deploy.md`: в варианте MinIO добавлен `S3_PRESIGN_ENDPOINT=https://s3.bimeet.pro`.
- `docs/runbooks/backup-restore.md`: пометка «не включено на Timeweb».
- Удалены Selectel-ранбуки `selectel-rollout.md`, `s3-cutover.md`.

### 3.6. Коммиты ветки поверх `origin/master` (новые сверху)

```
5d1d5d1 fix(ci): drop craas push steps from deploy workflow
04500cd docs(runbooks): replace selectel runbooks with timeweb launch guide
acc8799 refactor(infra): move terraform from selectel to timeweb cloud
9eea517 docs(runbooks): add selectel rollout runbook                 (устарел, удалён в 04500cd)
d3da6d1 fix(infra): add app record to dns zone                       (Selectel, файл удалён)
9f7e6e5 fix(backend): strip bucket segment when migrating file urls to keys
e7f27a8 fix(infra): remove unused common_tags local
d741f70 … 7c0e596 — Selectel-инфра, presign, тесты, бэкапы (см. git log)
```
Всего 30 коммитов против `origin/master`.

---

## 4. Окружение и аккаунты

- **Timeweb**: аккаунт хостинга `cx145887` (виртуальный хостинг Optimo в тестовом периоде — **не оплачивать, не нужен**, пусть истечёт) и **Cloud-аккаунт `fw423239`** (панель `timeweb.cloud`). Баланс Cloud — не пополнялся.
  - API-токен выпущен (имя `terraform-bimeet`; пользователю рекомендовано: срок не бессрочный, «Удалять сервисы по API без кода в Телеграме» = выкл, «Скрывать пароли» = вкл, ограниченные права = выкл). Лежит только в `terraform.tfvars`.
  - SSH-ключ `macbook` (= `~/.ssh/id_ed25519.pub`) пользователь, возможно, добавил руками в панели Timeweb. Terraform создаёт свой `bimeet-prod-deploy` с тем же телом — **может быть конфликт** при apply; решение — удалить ручной ключ в панели и повторить.
- **Selectel**: аккаунт `762794` создан, баланс 200 ₽, ничего не создано. Не используется. Бакет `bimeet-prod-tfstate` не создавался.
- **Домен `bimeet.pro`**: активен, NS `ns1/ns2.reg.ru`. `app.bimeet.pro` сейчас → `80.68.156.122` (IP Timeweb Cloud, старый сервер, не отвечает). Доступ к reg.ru, скорее всего, у **Антона** (владельца репо; ACME email в compose — его). Нужно, чтобы он поменял A-записи.
- **GitHub**: `gh` залогинен как `vladivolgin` (scopes: gist, read:org, repo). Есть ли у пользователя права на секреты и теги в репо Антона — **не проверено**.
- Инструменты: terraform 1.17.1 darwin_arm64 (`/opt/homebrew`), tflint через Docker, gh 2.104.0. Apple Silicon: ставить через `/opt/homebrew/bin/brew`.
- Песочница блокирует чтение/правку `.env*` (в т.ч. `.env.prod.example`, `backend/.env.example`). Не бороться.

---

## 5. План запуска (когда пользователь скажет «стартуем»)

Подробно — `docs/runbooks/timeweb-launch.md`. Кратко:

1. Пополнить баланс Cloud-аккаунта `fw423239` (≥ 300–500 ₽ на несколько дней; месяц ≈ 1780 ₽).
2. Проверить `admin_cidrs` в `terraform.tfvars`: IPv4 пользователя мог смениться (`curl -4 -s https://ifconfig.me`; **именно `-4`**, без него отдаёт IPv6).
3. `cd infra/terraform && terraform plan` → убедиться 12/0/0 → `terraform apply` (**только по команде пользователя**). Сохранить копию `terraform.tfstate` в надёжное место (не git).
4. Через 3–5 мин: `ssh deploy@<server_ip>`, проверить `docker version`, `sudo ufw status`, `swapon --show`.
5. На сервере `~/bimeet`: scp `docker-compose.prod.yml` + `deploy/`; `.env.prod` по `docs/deploy.md` (вариант A MinIO) + `S3_PRESIGN_ENDPOINT=https://s3.bimeet.pro`; секреты через `openssl rand -base64 32`; `chmod 600`.
6. reg.ru: A-записи `@`, `www`, `app`, `s3` → `server_ip`, TTL 300. Ждать `dig +short app.bimeet.pro`.
7. GitHub Secrets: `SSH_HOST=server_ip`, `SSH_USER=deploy`, `SSH_KEY` = приватный `~/.ssh/bimeet-ci` (сгенерировать, `ssh-copy-id`), `VITE_API_URL`/`NEXT_PUBLIC_APP_URL=https://app.bimeet.pro`. `GHCR_TOKEN`, `VITE_ADMIN_EMAILS` уже есть.
8. Перевести PR из draft, смержить, поставить тег → deploy (environment `production` может требовать approve).
9. Проверить: лендинг, приложение, валидный TLS, регистрация, встреча, загрузка аватара (Network: `/api/files/...` → 302 на `s3.bimeet.pro`).
10. Перед защитой снять дамп БД руками и забрать на ноутбук.

**Экономия**: Timeweb считает почасово. Платят ли за **выключенный** сервер — не выяснено (у многих провайдеров да). Удалять сервер между сессиями нельзя (данные, IP, сертификат; плюс `prevent_destroy`).

---

## 6. Открытые вопросы / хвосты

- Точная дата защиты и месяц (16–20 декабря?) — от неё зависит, когда делать apply.
- Кто владеет reg.ru для `bimeet.pro` и сможет поменять A-записи.
- Права пользователя на GitHub Secrets/теги в `AntonSlavshchikov/bimeet`.
- Возможный конфликт SSH-ключа (ручной `macbook` vs Terraform `bimeet-prod-deploy`).
- `.env.prod.example` и `backend/.env.example` всё ещё упоминают Selectel (песочница не даёт править).
- Описание PR #7 говорит, что код локации `ru-3` не подтверждён — **уже подтверждён** через API, можно поправить.
- Бэкапы вне сервера (S3-бакет Timeweb) — после защиты.
- `backend/server` — закоммиченный бинарник ещё на master (коммит `ee6eef5 FIX`, не наш), стоит удалить отдельным PR.
- Имя ветки `infra/selectel-migration` не переименовывали, чтобы не ломать PR.

---

## 7. Полезные команды

```bash
# рабочая копия
cd /Users/vladivolgin/Desktop/bimeet/.claude/worktrees/confident-pike-0843fb

# infra
cd infra/terraform
terraform fmt -check -recursive && terraform validate
docker run --rm -v "$PWD:/data" -w /data ghcr.io/terraform-linters/tflint:latest
terraform plan            # читает API, ничего не создаёт

# backend
cd backend && go build ./... && go vet ./... && gofmt -l . && go test ./...

# PR / CI
gh pr checks 7 --watch
gh pr view 7 --json isDraft,state,title

# проверка трейлеров (должно быть 0)
git log origin/master..HEAD --format='%B' | grep -icE 'claude|co-authored|anthropic'
```
