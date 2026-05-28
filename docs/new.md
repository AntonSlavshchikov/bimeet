# Bimeet → разделение на B2C (app) и B2B (company) продукты

## Context

Сейчас Bimeet — single-tenant приложение, где `events.category` ∈ {ordinary, business} различает два типа встреч в одной БД, под одним фронтом и доменом. Идея: вывести деловые встречи в отдельный multi-tenant SaaS-продукт под wildcard поддоменом `{company}.bimeet.pro`, где каждая компания получает изолированное пространство со своим брендом, владельцем и сотрудниками. B2C-приложение (`app.bimeet.pro`) остаётся только для обычных встреч.

**Решения, принятые с пользователем:**
- B2C и B2B полностью изолированы: своя БД, свой бэк, свой фронт.
- Существующий прод трогаем минимально — только убираем UI создания business-встреч.
- Пользователи изолированы по компаниям (email уникален в рамках company, не глобально).
- Wildcard `{slug}.bimeet.pro`, плюс `company.bimeet.pro` для landing/signup.
- Новые проекты живут в этом же репо: `backend-company/`, `frontend-company/`.
- MVP features: events, participants+статусы, links, polls, change log, in-app notifications.
- Self-serve онбординг (владелец сам выбирает slug).
- Роли: owner + member.

## Scope

**В скоупе:**
1. Новый backend-company с multi-tenant моделью на свежей БД.
2. Новый frontend-company с резолвом тенанта по `Host`, брендингом, ролями.
3. Минимальная зачистка существующего B2C (`backend/`, `frontend/`): убрать выбор category=business в форме, в навигации/фильтрах не показывать business как доступный новый тип.
4. Wildcard DNS + wildcard TLS-сертификат (`*.bimeet.pro`).

**Вне скоупа:**
- Биллинг и платежи (включая trial-логику — self-serve открыт всем; платная модель — отдельная итерация).
- Перенос существующих business-событий в новое приложение — они **удаляются** разовой миграцией в старой БД (см. ниже), а не мигрируют.
- SSO / SAML / OAuth.
- Audit log глубже встроенного change log событий.
- Календарные интеграции (Google/Outlook).

## Архитектура

### Tenant identity
Tenant = компания. Идентификатор тенанта — `companies.slug` (он же поддомен). При каждом запросе на API backend-company:
1. Из `Host` заголовка вычленяется `slug` (поддомен).
2. Резолвится `company` (один SQL по `slug`); если не найден — 404.
3. Дальше во всех queries обязателен `WHERE company_id = $tenant`. На `company.bimeet.pro` (без slug) работают только публичные эндпоинты: signup и landing.

### Изоляция данных
- Один PostgreSQL для backend-company со всеми тенантами (shared DB, shared schema), `company_id UUID NOT NULL` на каждой таблице.
- На все relations к `events` через `event_id` company_id выводится через JOIN; в сервисах проверка вручную (организатор события принадлежит той же компании, что и сессия).
- `users.email` уникален в пределах company (`UNIQUE (company_id, email)`), не глобально.

### Auth
- Регистрация на `company.bimeet.pro`: email + пароль + название компании + slug. Создаётся `company` + `user` с role=owner. Редирект на `{slug}.bimeet.pro/login`.
- Логин на `{slug}.bimeet.pro/login`: email + пароль. Backend проверяет, что user принадлежит company с этим slug.
- JWT claims: `sub=user_id`, `cid=company_id`, `role=owner|member`. Middleware проверяет, что `cid` совпадает с резолвленным тенантом из Host.

### Branding
Поля компании (в `companies`): `name`, `slug`, `logo_url`, `primary_color` (hex). На клиенте читаются один раз через `GET /api/tenant/info` (публично, без auth, только slug → бренд) и применяются к Chakra-теме через runtime override `brand.500/600/700` оттенков от `primary_color`. Лого — в navbar. Загрузка логотипа — multipart на `/api/company/logo` (только owner).

## Repository layout

```
ai-app/
  backend/                  # существующий B2C — минимальные правки
  frontend/                 # существующий B2C — минимальные правки
  backend-company/          # НОВЫЙ Go-сервис, та же структура слоёв
    cmd/server/
    internal/
      config/, db/, middleware/, model/, repository/, service/, handler/, storage/
  frontend-company/         # НОВЫЙ Vite+React+Chakra, FSD
    src/
      app/, pages/, widgets/, features/, entities/, shared/
```

Это два полностью независимых проекта (отдельные `go.mod`, `package.json`, `Dockerfile`, миграции). Шаблон скопировать со старых, но **не делиться кодом** — иначе вернёмся к скрытой связности.

## Database schema (backend-company)

Новая БД `bimeet_company`. Миграции в `backend-company/internal/db/migrations/`.

```sql
-- 001_init.up.sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE companies (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug          TEXT NOT NULL UNIQUE,           -- поддомен; lowercase, [a-z0-9-]
    name          TEXT NOT NULL,
    logo_url      TEXT,
    primary_color TEXT NOT NULL DEFAULT '#4F46E5',
    owner_id      UUID,                            -- FK добавим после users
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email         TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    name          TEXT NOT NULL,
    last_name     TEXT NOT NULL DEFAULT '',
    role          TEXT NOT NULL CHECK (role IN ('owner','member')),
    avatar_url    TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, email)
);

ALTER TABLE companies
    ADD CONSTRAINT companies_owner_fk FOREIGN KEY (owner_id) REFERENCES users(id);

CREATE TABLE events (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    date_start    TIMESTAMPTZ NOT NULL,
    date_end      TIMESTAMPTZ NOT NULL,
    location      TEXT NOT NULL DEFAULT '',
    dress_code    TEXT,
    status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed')),
    organizer_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invite_token  UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_events_company ON events(company_id);

CREATE TABLE event_participants (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id  UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status    TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','confirmed','declined')),
    UNIQUE (event_id, user_id)
);

CREATE TABLE event_links (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id  UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    title     TEXT NOT NULL,
    url       TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE polls (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id  UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    question  TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE poll_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    label TEXT NOT NULL
);
CREATE TABLE poll_votes (
    poll_option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (poll_option_id, user_id)
);

CREATE TABLE event_change_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    old_value TEXT NOT NULL DEFAULT '',
    new_value TEXT NOT NULL DEFAULT '',
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE password_reset_tokens (
    token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

> Намеренно нет: collections, items, carpools, public events (всё это специфика B2C).

## Backend-company: ключевые компоненты

Аналогично существующему `backend/` (структура handler→service→repository, `pgxpool`, `chi`, JWT-middleware, embed-миграции). Шаблонизировать копированием, дальше адаптировать.

**Новые/изменённые сущности:**

| Слой | Что нового |
|---|---|
| `internal/middleware/tenant.go` | Резолв `slug` из `Host`. Кладёт `Company` в context. Используется на **всех** API-роутах кроме `/api/auth/signup`, `/api/auth/login`, `/api/tenant/info`. |
| `internal/middleware/auth.go` | JWT claims: `sub`, `cid`, `role`. Проверка `cid == tenant.id`. |
| `internal/middleware/role.go` | `RequireOwner` для owner-only ручек (создание users, branding, удаление company). |
| `internal/service/company` | Signup (создание company+owner+валидация slug), branding (PUT name/color, POST logo), список members, создание member. |
| `internal/service/auth` | Регистрация **только** через signup; для members учётку создаёт owner (без пароля → email с reset-token; reuse существующего password_reset flow). |
| `internal/service/event` | Тот же CRUD, но без category/public/maxGuests; везде scope по `company_id`. |
| `internal/service/eventlink`, `poll`, `notification`, `changelog` | Перенос-копия из старого backend, с обязательным проверкой `event.company_id == ctx.companyID`. |
| `internal/handler/router.go` | Маршруты: `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/tenant/info`, под `r.Use(tenant)` + `r.Use(auth)` всё остальное: `/api/company/*` (owner), `/api/users/*` (owner), `/api/events/*`, `/api/notifications/*`, `/api/auth/me`. |

**Что переиспользовать копипастом:**
- Структура `cmd/server/main.go` (`backend/cmd/server/main.go`).
- `internal/db/db.go` + `Migrate()`.
- `internal/handler/response/*` (JSON helpers).
- Существующий `password_reset_tokens` flow из `backend/internal/db/migrations/012_password_reset_tokens.up.sql` — он подходит для invite-by-email.
- Структура event-сервиса из `backend/internal/service/event/` (с правкой под новую модель).

## Frontend-company: ключевые компоненты

Шаблонизируется копированием `frontend/`, далее правки.

**Что отличается:**

| Файл | Изменения |
|---|---|
| `src/shared/api/tenant.ts` (новый) | На старте читает `window.location.hostname`, парсит slug. Если slug — делает `GET /api/tenant/info` → company { name, logo_url, primary_color }. Если хост `company.bimeet.pro` без slug → режим signup-landing. |
| `src/shared/api/client.ts` | Базовый URL — не env, а вычисляется: `https://api-company.bimeet.pro` (single API endpoint), Host-резолв тенанта на бэке через заголовок `X-Tenant-Slug`, который ставится фронтом из location. |
| `src/app/providers/index.tsx` | Оборачивает в `TenantProvider`. Внутри — Chakra `ChakraProvider` с `theme` сгенерированным из `primary_color` (`extendTheme({ colors: { brand: shadesFromHex(color) } })`). |
| `src/app/router/index.tsx` | Если режим signup-landing — только `/` (signup-форма) и `/login` (редирект на конкретный slug). Если slug-режим — `/login`, `/events`, `/events/new`, `/events/:id`, `/events/:id/edit`, `/profile`, `/settings/company` (owner-only), `/settings/members` (owner-only). |
| `src/pages/event-form/` | Убрать выбор category, isPublic, maxGuests. Описание — те же поля + dress_code. |
| `src/pages/event-detail/` | Виджеты: участники, links, polls, change log. Без collections/items/carpools. |
| `src/pages/settings/company/` (новое) | Форма name + color picker + загрузка лого. Только owner. |
| `src/pages/settings/members/` (новое) | Список сотрудников + создание (email+name → отправка invite-email с reset-token). Только owner. |
| `src/widgets/layout/Sidebar.tsx` | Лого компании сверху (`company.logo_url`), пункты меню: События, Профиль, и для owner — Настройки компании, Сотрудники. |
| `src/features/auth/` | Signup-форма (slug + название + email + пароль), login (email + пароль; компания резолвится из домена). |

## Cleanup существующего B2C (`backend/`, `frontend/`)

В B2C-приложении полностью выпиливается понятие business: код, UI и данные.

**Frontend:**
1. `frontend/src/pages/event-form/index.tsx:170-192` — удалить секцию выбора Category (RadioGroup ordinary/business). В payload `category` больше не отправляется.
2. `frontend/src/entities/event/model/types.ts` — убрать тип `EventCategory` (или сузить до `'ordinary'`), удалить поле `category` из DTO/запросов.
3. `frontend/src/features/links/`, виджеты деталей события, отвечающие за links, — удалить (links были business-only).
4. `frontend/src/pages/events-list/` и другие места, где есть фильтр/badge по category, — убрать упоминания business.

**Backend:**
1. `backend/internal/handler/event/` — в Create/Update игнорировать поле `category` и не валидировать его.
2. `backend/internal/handler/eventlink/`, `backend/internal/service/eventlink/`, `backend/internal/repository/eventlink/` (или эквивалент) — удалить полностью.
3. Из `internal/handler/router.go` убрать все `/links` маршруты.
4. `backend/internal/model/model.go` — удалить структуры `EventLink`, `EventLinkInfo`, `CreateEventLinkRequest`, поле `Category` из `Event`/DTO, поле `Links` из `EventDetail`.

**База данных** (новая миграция в `backend/internal/db/migrations/013_remove_business.up.sql`):
```sql
-- Удалить все business-события (CASCADE подчистит участников, polls, change_logs, notifications, links)
DELETE FROM events WHERE category = 'business';

-- Удалить таблицу ссылок (была business-only)
DROP TABLE IF EXISTS event_links;

-- Удалить колонку category — больше не нужна
ALTER TABLE events DROP COLUMN IF EXISTS category;
```
Down-миграция: восстановить колонку с дефолтом `ordinary`, пересоздать таблицу `event_links` по схеме из миграции 002. Восстановить сами удалённые события невозможно — в down-миграции это явно зафиксировать комментарием.

**Порядок выполнения важен:** сначала выкатываем backend (без category/links) + миграция, потом frontend. Иначе фронт может прислать `category: 'business'`, который бэк уже не понимает, или попытаться вызвать удалённые `/links` ручки.

## Инфра

- DNS: A-запись `*.bimeet.pro` → IP nginx/ingress. Отдельная для `app.bimeet.pro` (старый прод) и `company.bimeet.pro` (новый landing) — обе попадают под wildcard, можно одной wildcard-записью.
- TLS: wildcard-сертификат `*.bimeet.pro` через Let's Encrypt с DNS-01 challenge (acme.sh / cert-manager).
- Reverse-proxy: nginx роутит:
  - `Host: app.bimeet.pro` → существующий `backend/` + `frontend/`.
  - `Host: company.bimeet.pro` → новый `frontend-company/` (signup-landing).
  - `Host: api-company.bimeet.pro` → `backend-company/` (с проброшенным `Host`/`X-Forwarded-Host` для резолва slug).
  - `Host: *.bimeet.pro` (любой другой) → `frontend-company/` (фронт сам определит slug из location).
- Список зарезервированных slug на бэке: `app`, `api`, `api-company`, `company`, `www`, `admin`, `mail` — не дать зарегистрировать.

## Фазы реализации

1. **Фаза 1 — Каркас backend-company.** Скопировать структуру, поднять БД, миграция 001, signup + login + tenant middleware + `GET /api/tenant/info`. Health-check на `{slug}.localhost:8080`. Никакого UI ещё нет.
2. **Фаза 2 — Каркас frontend-company.** Скопировать структуру, signup-страница на `company.localhost:5173`, login + список событий (пустой) на `{slug}.localhost:5173`. Брендинг (цвет, лого) применяется.
3. **Фаза 3 — События MVP.** CRUD событий, участники (+приглашение by email с reset-token onboarding), links.
4. **Фаза 4 — Polls + change log + notifications.**
5. **Фаза 5 — Настройки компании.** Branding (логотип/цвет/название), управление сотрудниками (создание/блокировка member-ов).
6. **Фаза 6 — Cleanup B2C.** Удалить из B2C весь business-функционал: feature `links`, поле `category`, существующие business-события (миграция). Подробности — в разделе Cleanup.
7. **Фаза 7 — Деплой.** wildcard DNS, wildcard TLS, nginx-роутинг, ENV-переменные (`DSN`, `JWT_SECRET`, `BASE_DOMAIN=bimeet.pro`, `RESERVED_SLUGS=...`).

## Критические файлы

**Создаются:**
- `backend-company/` — весь новый сервис.
- `frontend-company/` — весь новый клиент.

**Источники для копирования (структура, не общая зависимость):**
- `backend/cmd/server/main.go` — точка входа.
- `backend/internal/db/db.go`, `backend/internal/db/migrations/001_init.up.sql` — миграционный механизм.
- `backend/internal/middleware/auth.go:17-66` — JWT-проверка, адаптировать под `cid`+`role`.
- `backend/internal/handler/router.go:21-138` — структура wiring'а.
- `backend/internal/handler/auth/handler.go` — Register/Login/Forgot/Reset, адаптировать.
- `backend/internal/service/event/` (полный пакет) — основа CRUD событий.
- `frontend/src/app/router/index.tsx:1-89` — каркас роутов.
- `frontend/src/shared/api/client.ts` — расширить заголовком `X-Tenant-Slug`.
- `frontend/src/app/styles/theme.ts:14-99` — тема; добавить runtime-генерацию `brand` shades из `primary_color`.
- `frontend/src/pages/event-form/index.tsx` — основа формы, без category/isPublic/maxGuests.
- `frontend/src/widgets/layout/Sidebar.tsx` — навигация, добавить лого + раздел Settings.

**Точечно правятся в B2C (детали см. в разделе Cleanup):**
- `frontend/src/pages/event-form/index.tsx:170-192` — удалить секцию выбора category.
- `frontend/src/entities/event/model/types.ts` — убрать поле `category` и всё с ним связанное.
- `frontend/src/features/links/` — удалить (links — business-only фича).
- `backend/internal/handler/eventlink/`, `service/eventlink/`, `repository/eventlink/`, `model.go` (EventLink-структуры) — удалить.
- `backend/internal/handler/router.go` — выпилить `/links` маршруты.
- Новая миграция `backend/internal/db/migrations/013_remove_business.up.sql` — `DELETE FROM events WHERE category='business'`, `DROP TABLE event_links`, `DROP COLUMN category`.

## Verification

После каждой фазы:
1. `cd backend-company && go vet ./... && go build ./cmd/server` — компилируется.
2. `cd frontend-company && npm run lint && npm run build` — компилируется и проходит eslint.
3. Через `/etc/hosts` локально маппим `acme.localhost`, `company.localhost`, `api-company.localhost` на `127.0.0.1` и проходим сценарии:
   - `company.localhost:5173/signup` → создание ACME → редирект на `acme.localhost:5173/login`.
   - Логин под owner → видны Settings → загружаем лого + меняем цвет → перезагрузка → бренд применился.
   - Owner создаёт member через Settings/Members → letter с reset-link → member ставит пароль → логинится под `acme.localhost:5173/login`.
   - Owner создаёт событие → добавляет link, poll, инвайтит member → member видит уведомление → подтверждает участие → голосует → owner видит change log.
   - На `other.localhost:5173/login` — owner с ACME не пускается (`cid != tenant.id` → 401).
4. Прод-проверка после Фазы 7: `app.bimeet.pro` работает как раньше (создание ordinary OK, business-кнопки нет), `company.bimeet.pro` отдаёт signup, реальная компания получает `{slug}.bimeet.pro` с валидным TLS.
5. Безопасность: руками от имени user-A компании ACME сделать `GET /api/events/{event_id_from_other_company}` → 404. Создать event через JSON-инъекцию `company_id` чужой компании → backend игнорирует поле, ставит из контекста.
