# План разработки приложения для организации встреч

## Стек технологий

| Слой | Технология |
|---|---|
| Backend | Go |
| Frontend | React |
| UI | Chakra UI |
| Data fetching / State | TanStack Query, TanStack Table |

---

## Архитектура

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                  │
│         Chakra UI + TanStack Query/Table             │
└───────────────────────┬─────────────────────────────┘
                        │ REST API / WebSocket
┌───────────────────────▼─────────────────────────────┐
│                    Backend (Go)                      │
│            REST API + WebSocket (уведомления)        │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│                   База данных                        │
│                  PostgreSQL                          │
└─────────────────────────────────────────────────────┘
```

---

## Доменные сущности

### Event (Событие)
- id, title, description, date_start, date_end, location, organizer_id, created_at, updated_at

### EventParticipant (Участник события)
- id, event_id, user_id, status (invited / confirmed / declined)

### Collection (Сбор)
- id, event_id, title, target_amount, created_by, created_at

> Сбор — это целевой сбор средств на конкретную нужду (например, «Торт — 3000 ₽»). Сумма делится поровну между всеми подтверждёнными участниками события. Доля на человека пересчитывается автоматически при изменении числа участников.

### CollectionContribution (Взнос участника)
- id, collection_id, user_id, paid (bool), paid_at

> Участник сам отмечает «я скинулся». Организатор видит кто оплатил, кто нет.

### Poll (Опрос)
- id, event_id, question, created_by

### PollOption (Вариант ответа)
- id, poll_id, label

### PollVote (Голос)
- id, poll_option_id, user_id

### ItemList (Список вещей)
- id, event_id, item_name, assigned_to (user_id, nullable)

### Carpool (Совместная поездка)
- id, event_id, driver_id, seats_available, departure_point

### CarpoolPassenger (Пассажир)
- id, carpool_id, user_id

### EventChangeLog (История изменений)
- id, event_id, changed_by, field_name, old_value, new_value, changed_at

### Notification (Уведомление)
- id, user_id, event_id, type, message, is_read, created_at

---

## Этапы разработки

### Этап 1 — Фундамент

**Backend**
- [ ] Инициализация Go-проекта (модули, структура папок)
- [ ] Подключение к PostgreSQL, настройка миграций
- [ ] Аутентификация: регистрация, логин, JWT
- [ ] Базовые middleware: auth, CORS, logging

**Frontend**
- [ ] Инициализация React-проекта (Vite)
- [ ] Настройка Chakra UI
- [ ] Настройка TanStack Query
- [ ] Роутинг (React Router)
- [ ] Страницы: логин, регистрация

---

### Этап 2 — Управление событиями

**Backend**
- [ ] CRUD для событий (создание, чтение, редактирование, удаление)
- [ ] Управление участниками: приглашение, подтверждение, отказ
- [ ] Приглашение по ссылке (invite token)
- [ ] История изменений события (EventChangeLog)

**Frontend**
- [ ] Список событий пользователя
- [ ] Страница создания/редактирования события
- [ ] Карточка события (детали, участники)
- [ ] Управление статусом участия

---

### Этап 3 — Сборы

**Backend**
- [ ] CRUD сборов (Collection)
- [ ] Автоматический расчёт доли: `ceil(target_amount / confirmed_participants_count)`
- [ ] Отметка взноса участником (CollectionContribution.paid)
- [ ] API сводки по всем сборам события (итого, собрано, остаток)

**Frontend**
- [ ] Список сборов на странице события
- [ ] Создание сбора (название + целевая сумма)
- [ ] Карточка сбора: цель, сумма с каждого, прогресс-бар
- [ ] Кнопка «Я скинулся» / «Отменить» для участника
- [ ] Отображение кто скинулся, кто нет (аватары)

---

### Этап 4 — Координация участников

**Backend**
- [ ] CRUD опросов и вариантов ответов
- [ ] Голосование, результаты в реальном времени (WebSocket или polling)
- [ ] CRUD списка "кто что берет" (ItemList)
- [ ] CRUD карпулинга (Carpool + CarpoolPassenger)

**Frontend**
- [ ] Блок опросов: создание, голосование, результаты
- [ ] Список обязанностей: запись, редактирование
- [ ] Блок карпулинга: предложить место, найти водителя

---

### Этап 5 — Уведомления

**Backend**
- [ ] Уведомления при изменении события
- [ ] Уведомления при новых сборах и взносах участников
- [ ] Напоминания (за день до события)
- [ ] WebSocket или SSE для realtime-доставки уведомлений

**Frontend**
- [ ] Колокольчик с непрочитанными уведомлениями
- [ ] Список уведомлений
- [ ] Отметка "прочитано"

---

### Этап 6 — Финальная сводка и дополнения

**Backend**
- [ ] API финальной сводки события (статистика участников, итого по сборам)
- [ ] Интеграция прогноза погоды (внешний API по дате и геолокации)

**Frontend**
- [ ] Страница сводки накануне события
- [ ] Геолокация места (ссылка на карту)
- [ ] Отображение прогноза погоды

---

## Структура проекта

```
ai-project/
├── backend/
│   ├── cmd/server/          # точка входа
│   ├── internal/
│   │   ├── handler/         # HTTP handlers
│   │   ├── service/         # бизнес-логика
│   │   ├── repository/      # работа с БД
│   │   ├── model/           # доменные модели
│   │   └── middleware/      # auth, logging, cors
│   ├── migrations/          # SQL миграции
│   └── config/
├── frontend/
│   ├── src/
│   │   ├── api/             # TanStack Query хуки
│   │   ├── components/      # переиспользуемые компоненты
│   │   ├── pages/           # страницы
│   │   ├── store/           # глобальный стейт (если нужен)
│   │   └── types/           # TypeScript типы
│   └── public/
└── docs/
    ├── requirements.md
    └── plan.md
```

---

## API (основные эндпоинты)

```
POST   /api/auth/register
POST   /api/auth/login

GET    /api/events
POST   /api/events
GET    /api/events/:id
PUT    /api/events/:id
DELETE /api/events/:id

POST   /api/events/:id/participants
PATCH  /api/events/:id/participants/:userId  # статус участника

GET    /api/events/:id/collections
POST   /api/events/:id/collections
DELETE /api/events/:id/collections/:collectionId
PATCH  /api/events/:id/collections/:collectionId/contribute   # участник отмечает взнос
GET    /api/events/:id/collections/summary                    # итого, собрано, остаток

GET    /api/events/:id/polls
POST   /api/events/:id/polls
POST   /api/events/:id/polls/:pollId/vote

GET    /api/events/:id/items
POST   /api/events/:id/items
PATCH  /api/events/:id/items/:itemId

GET    /api/events/:id/carpools
POST   /api/events/:id/carpools
POST   /api/events/:id/carpools/:carpoolId/join

GET    /api/notifications
PATCH  /api/notifications/:id/read
```

---

## Приоритет разработки

1. Этап 1 — Фундамент (аутентификация, инфраструктура)
2. Этап 2 — Управление событиями (ядро приложения)
3. Этап 3 — Финансы (ключевая фича)
4. Этап 4 — Координация участников
5. Этап 5 — Уведомления
6. Этап 6 — Финальная сводка и дополнения
7. Этап 7 — Категории встреч и дресс-код
8. Этап 8 — Редизайн (Web-first)

---

## Этап 7 — Категории встреч и дресс-код

### Идея

Каждое событие получает **категорию**, которая определяет его тип и набор доступных вкладок.
Две категории:

| Категория | Описание | Примеры |
|---|---|---|
| `ordinary` | Обычная встреча — досуг, праздники, выезды | День рождения, пикник, вечеринка |
| `business` | Деловая встреча — рабочий контекст | Совещание, онлайн-созвон, переговоры |

Категория выбирается при создании события и влияет на отображаемые вкладки.

---

### Вкладки по категориям

| Вкладка | Обычная | Деловая |
|---|---|---|
| Участники | ✅ | ✅ |
| Сбор средств | ✅ | ❌ |
| Опросы | ✅ | ✅ |
| Вещи | ✅ | ❌ |
| Попутчики | ✅ | ❌ |
| Ссылки | ❌ | ✅ |

**Вкладка «Ссылки»** (только для деловых встреч) — список ссылок, относящихся к встрече. Каждая ссылка имеет название и URL. Можно добавлять несколько: ссылка на онлайн-звонок, повестка, презентация, полезные материалы и т.д. Организатор управляет списком, участники видят и переходят по ссылкам.

---

### Дресс-код

Для обеих категорий можно опционально указать дресс-код.
Поле необязательное — если не заполнено, не отображается.

Примеры значений: `Деловой`, `Smart casual`, `Свободный`, `Белый верх — чёрный низ` и т.д.
Свободный текст (без enum) — организатор пишет сам.

---

### Доменные изменения

#### Event (расширение существующей модели)
- `category` — `enum('ordinary', 'business')`, обязательное, по умолчанию `ordinary`
- `dress_code` — `string`, необязательное, nullable

#### EventLink (новая сущность, только для деловых встреч)
- `id`
- `event_id`
- `title` — название ссылки (например: «Zoom-звонок», «Повестка встречи»)
- `url` — сама ссылка
- `created_by`
- `created_at`

---

### Backend

- [ ] Добавить поля `category` и `dress_code` в модель Event и миграцию
- [ ] Добавить сущность EventLink: модель, миграция
- [ ] CRUD для EventLink: `GET/POST /api/events/:id/links`, `DELETE /api/events/:id/links/:linkId`
- [ ] Валидация: EventLink можно создавать только для события с `category = business`

### Frontend

- [ ] Добавить выбор категории в форму создания/редактирования события (radio или select: Обычная / Деловая)
- [ ] Добавить поле «Дресс-код» в форму (необязательное, текстовое)
- [ ] Отображать дресс-код в карточке события (если указан)
- [ ] Фильтровать вкладки на странице события в зависимости от `category`
- [ ] Реализовать вкладку «Ссылки»: список ссылок с названием и URL, кнопка добавления (только для организатора), кликабельные ссылки для всех участников

---

## Этап 8 — Редизайн (Web-first)

### Контекст

Приложение должно быть полноценным web-приложением с хорошим использованием широкого экрана. Приоритет — desktop; mobile остаётся работоспособным через адаптивные паттерны. Data layer (API, query hooks, entity types) и backend не меняются.

---

### Layout Shell

Текущий layout (sticky navbar + `Container maxW`) заменяется на flex-shell с боковой панелью.

**Новая структура:**
```
<Box minH="100vh" display="flex">
  <Sidebar />               ← 240px, только lg+, фиксированный
  <Box flex={1}>
    <TopBar />              ← 48px: гамбургер (mobile) + переключатель темы
    <Box as="main" p={6}>
      {children}
    </Box>
  </Box>
</Box>
```

| Элемент | Desktop (lg+) | Mobile (base/md) |
|---|---|---|
| Sidebar | Фиксированная боковая панель 240px | Скрыта |
| Drawer | — | Открывается гамбургером, содержимое = Sidebar |
| BottomNav | Скрыта | `position="fixed" bottom={0}`, иконки маршрутов |
| TopBar | Только переключатель темы | Гамбургер + переключатель темы |

**Sidebar содержит:**
- Логотип + название приложения
- Навигация: «Встречи» (FiCalendar) → `/events`
- Снизу: аватар пользователя + имя + email + кнопка «Выйти» (пользовательское меню уходит из navbar)

---

### Theme — новые semantic tokens

Добавить в `app/styles/theme.ts`:

```ts
sidebarBg:     { default: '#FFFFFF',                   _dark: '#13141F' }
sidebarBorder: { default: 'rgba(15,23,42,0.08)',        _dark: 'rgba(255,255,255,0.07)' }
navActiveBg:   { default: '#EEF2FF',                   _dark: 'rgba(99,102,241,0.15)' }
navActiveText: { default: '#3730A3',                   _dark: '#A5B4FC' }
```

---

### Страница: Список событий

**Новый header:**
```
[Встречи]  ←→  [🔍 Поиск... (lg+)]  [⊞⊟ Вид]  [+ Создать]
```

- **Поиск**: локальный `useState<string>('')`, фильтр по title + location. На mobile — сворачиваемая строка под заголовком (`Collapse`).
- **View toggle** (`useState<'grid'|'list'>`): переключает между сеткой карточек и компактным списком.
- **EventListRow** (новый компонент): строка 64px — цветная точка + название + категория + дата + место + аватары + стрелка.

---

### Страница: Детальная страница события

Двухпанельный layout:

```tsx
<Grid templateColumns={{ base: '1fr', lg: '320px 1fr' }} gap={6} alignItems="flex-start">
  {/* Левая панель — sticky */}
  <Box position={{ lg: 'sticky' }} top="80px">
    <EventInfoPanel />          {/* заголовок, мета, меню организатора */}
    <ParticipantsSummaryPanel mt={4} />   {/* счётчики + AvatarGroup */}
  </Box>
  {/* Правая панель — вкладки */}
  <EventTabsPanel />
</Grid>
```

**EventInfoPanel** — вынести из hero-card: заголовок + описание (3 строки + «Подробнее») + мета-данные (дата, место, тип, дресс-код) + меню организатора.

**ParticipantsSummaryPanel** — мини-виджет: бейджи confirmed/invited/declined + AvatarGroup (max 6). Быстрый обзор без перехода во вкладку.

Кнопка «Назад» убирается — навигация через sidebar.

---

### Страница: Форма события

- `maxW`: `600px` → `860px`
- Два столбца на `md+` (`SimpleGrid columns={{ base: 1, md: 2 }}`):
  - Левый: Тип встречи + Название + Описание
  - Правый: Начало + Конец + Место + Дресс-код
- Sticky submit bar снизу карточки

---

### Новые файлы

| Файл | Назначение |
|---|---|
| `widgets/layout/Sidebar.tsx` | Sidebar (desktop) + содержимое Drawer (mobile) |
| `widgets/layout/BottomNav.tsx` | Нижняя навигация для mobile |
| `widgets/event-detail/EventInfoPanel.tsx` | Левая панель на странице события |
| `widgets/event-detail/ParticipantsSummaryPanel.tsx` | Мини-виджет участников |
| `widgets/event-card/EventListRow.tsx` | Строка в list-режиме |

### Изменяемые файлы

| Файл | Изменение |
|---|---|
| `app/styles/theme.ts` | +4 semantic token |
| `widgets/layout/index.tsx` | Полная переработка shell |
| `pages/events-list/index.tsx` | Поиск + view toggle + EventListRow |
| `pages/event-detail/index.tsx` | Grid двухпанельный layout |
| `pages/event-form/index.tsx` | Wider maxW, two-col, sticky footer |

### Не меняется

Все feature-компоненты вкладок (ParticipantsTab, CollectionsTab, PollsTab, ItemsTab, CarpoolTab, LinksTab), router, entities, queries, API hooks, backend.

---

### Чеклист реализации

**Layout:**
- [ ] Добавить 4 semantic token в `theme.ts`
- [ ] Создать `widgets/layout/Sidebar.tsx`
- [ ] Создать `widgets/layout/BottomNav.tsx`
- [ ] Переписать `widgets/layout/index.tsx` (flex shell, TopBar, Drawer)

**Events List:**
- [ ] Поиск (desktop input + mobile Collapse)
- [ ] View toggle (`grid` / `list`)
- [ ] Создать `widgets/event-card/EventListRow.tsx`

**Event Detail:**
- [ ] Создать `widgets/event-detail/EventInfoPanel.tsx`
- [ ] Создать `widgets/event-detail/ParticipantsSummaryPanel.tsx`
- [ ] Переписать `pages/event-detail/index.tsx` на двухпанельный Grid

**Event Form:**
- [ ] Расширить `maxW` до 860px
- [ ] Два столбца на `md+`
- [ ] Sticky submit bar

---

## Этап 9 — Уведомления

### Что уже есть

| Слой | Готово |
|---|---|
| Таблица `notifications` в БД | ✅ |
| `GET /api/notifications` | ✅ |
| `PATCH /api/notifications/{id}/read` | ✅ |
| Создание уведомлений при инвайте и изменении события | ✅ |
| `Notification` тип на фронтенде | ✅ |
| `notificationsApi.list()` и `markRead()` | ✅ |

### Что нужно добавить

#### Backend

Три новых эндпоинта:

| Метод | Путь | Действие |
|---|---|---|
| `POST` | `/api/notifications/read-all` | Отметить все как прочитанные |
| `DELETE` | `/api/notifications/{id}` | Удалить одно уведомление |
| `DELETE` | `/api/notifications` | Удалить все уведомления |

- [ ] Добавить методы в `backend/internal/repository/notification.go`: `MarkAllRead(userID)`, `Delete(id, userID)`, `DeleteAll(userID)`
- [ ] Добавить методы в `backend/internal/service/notification.go`
- [ ] Добавить хендлеры в `backend/internal/handler/notification.go`
- [ ] Зарегистрировать маршруты в `backend/internal/handler/router.go`

#### Frontend

**Новые файлы:**

| Файл | Назначение |
|---|---|
| `entities/notification/queries/index.ts` | `useNotifications()` — TanStack Query хук с polling (30s) |
| `features/notifications/model/hooks.ts` | Mutation хуки: `useMarkRead`, `useMarkAllRead`, `useDeleteNotification`, `useDeleteAllNotifications` |
| `features/notifications/ui/NotificationCenter.tsx` | Колокольчик + Popover с панелью уведомлений |

**Изменяемые файлы:**

| Файл | Изменение |
|---|---|
| `entities/notification/api/index.ts` | Добавить `markAllRead()`, `deleteOne(id)`, `deleteAll()` |
| `widgets/layout/index.tsx` | Добавить `<NotificationCenter />` в TopBar |

#### Поведение NotificationCenter

- Иконка `FiBell` в топбаре
- Badge с числом непрочитанных (скрыт если 0, показывает `99+` при переполнении)
- Клик → Popover с панелью:
  - Заголовок «Уведомления» + кнопки «Прочитать все» / «Удалить все»
  - Список уведомлений: текст + время + dot-индикатор непрочитанного
  - Кнопки на каждом элементе: ✓ (прочитать) + ✕ (удалить)
  - Empty state: «Нет уведомлений»
- Polling каждые 30 секунд через `refetchInterval`

### Чеклист реализации

**Backend:**
- [ ] `MarkAllRead(ctx, userID)` в репозитории
- [ ] `Delete(ctx, id, userID)` в репозитории
- [ ] `DeleteAll(ctx, userID)` в репозитории
- [ ] Сервисные методы + хендлеры + роуты

**Frontend:**
- [ ] `entities/notification/queries/index.ts` — `notificationKeys`, `useNotifications()`
- [ ] `entities/notification/api/index.ts` — дополнить 3 методами
- [ ] `features/notifications/model/hooks.ts` — 4 mutation хука
- [ ] `features/notifications/ui/NotificationCenter.tsx` — компонент
- [ ] `widgets/layout/index.tsx` — встроить в TopBar

---

## Этап 10 — Завершение и удаление встречи

### Контекст

Сейчас жизненный цикл встречи никак явно не прослеживается — единственный индикатор завершённости это дата. Нужно дать организатору возможность явно завершить встречу и удалить её. Удаление на бэкенде уже реализовано (`DELETE /api/events/:id`), но не подключено в UI.

### Backend

#### Миграция `004_event_status`
Добавить колонку `status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed'))` в таблицу `events`.

#### Изменения в коде

| Файл | Изменение |
|---|---|
| `internal/model/model.go` | Добавить `Status string \`json:"status"\`` в `Event`, `EventDetail`, `EventListItem` |
| `internal/repository/event.go` | Добавить `e.status` в SELECT; новый метод `Complete(ctx, id)` |
| `internal/service/event.go` | Новый метод `Complete(ctx, id, userID)`: проверка организатора + UPDATE + async уведомления участникам |
| `internal/handler/event.go` | Новый хендлер `Complete` → `204 No Content` |
| `internal/handler/router.go` | Маршрут `POST /api/events/{id}/complete` |

### Frontend

| Файл | Изменение |
|---|---|
| `entities/event/model/types.ts` | `status: 'active' \| 'completed'` в `Event` и `EventListItem` |
| `features/event-manage/api/index.ts` | Метод `complete(id)` → `POST /api/events/{id}/complete` |
| `features/event-manage/model/hooks.ts` | Хук `useCompleteEvent(id)` |
| `widgets/event-detail/EventInfoPanel.tsx` | Меню организатора: «Завершить» (только если `active`) + «Удалить» — оба с `AlertDialog`; badge «Завершена» под заголовком |
| `widgets/event-card` | Визуальный индикатор завершённости (badge/приглушённый стиль) |

### Чеклист реализации

**Backend:**
- [ ] Создать `004_event_status.up.sql` и `004_event_status.down.sql`
- [ ] Добавить `Status` в модели `Event`, `EventDetail`, `EventListItem`
- [ ] Добавить `e.status` в SELECT-запросы репозитория
- [ ] Метод `EventRepository.Complete(ctx, id)`
- [ ] Метод `EventService.Complete(ctx, id, userID)` + уведомления
- [ ] Хендлер `EventHandler.Complete`
- [ ] Маршрут `POST /api/events/{id}/complete`

**Frontend:**
- [ ] Добавить `status` в типы
- [ ] API-метод `complete`
- [ ] Хук `useCompleteEvent`
- [ ] `EventInfoPanel`: пункты «Завершить» и «Удалить» + badge статуса
- [ ] `event-card`: индикатор завершённости в списке

---

## Этап 11 — Рефакторинг архитектуры backend

### Что сделано

Полный рефакторинг структуры backend для улучшения тестируемости и соответствия идиоматическому Go.

#### Разбивка по папкам

Каждый домен вынесен в отдельный подпакет:

| Уровень | Было | Стало |
|---|---|---|
| Handler | `internal/handler/event.go` | `internal/handler/event/handler.go` |
| Service | `internal/service/event.go` | `internal/service/event/service.go` |
| Repository | `internal/repository/event.go` | `internal/repository/event/repository.go` |

Пакеты именуются с суффиксом (`eventhandler`, `eventsvc`, `eventrepo`), чтобы не было конфликтов при импорте.

`router.go` остался в `internal/handler/` (пакет `handler`) как центральное звено.

#### Интерфейсы в потребляющем пакете (идиоматичный Go)

Каждый пакет определяет **только те методы**, которые он реально использует:

```
handler/event/interfaces.go   → EventService { List, Create, GetByID, ... }
service/event/interfaces.go   → EventRepo, UserRepo, NotificationRepo, Mailer
```

Конкретный `*eventrepo.Repository` удовлетворяет 7 разным `EventRepo`-интерфейсам одновременно.

#### Тесты с go.uber.org/mock

- Добавлен `go.uber.org/mock` (fork `golang/mock`)
- `//go:generate mockgen ...` директивы в каждом `interfaces.go`
- Моки генерируются в `mock/mock.go` рядом с интерфейсом: `go generate ./...`
- Покрытие: `service/event` (11 тестов) + `handler/event` (11 тестов)

### Чеклист

- [x] Разбить handlers по подпапкам
- [x] Разбить services по подпапкам
- [x] Разбить repositories по подпапкам
- [x] Все зависимости через интерфейсы
- [x] Обновить `cmd/server/main.go`
- [x] Удалить старые flat-файлы
- [x] Добавить `go.uber.org/mock` + `//go:generate` директивы
- [x] Написать unit-тесты для `service/event`
- [x] Написать unit-тесты для `handler/event`

---

## Этап 12 — Локализация (RU / EN)

### Контекст

Весь текст в приложении был захардкожен на русском языке. Цель — добавить поддержку двух языков (русский и английский) с переключением прямо в UI, без изменений бэкенда.

---

### Библиотека

`i18next` + `react-i18next`

---

### Новые файлы

| Файл | Назначение |
|---|---|
| `src/shared/i18n/index.ts` | Инициализация i18next, язык из `localStorage` |
| `src/shared/i18n/locales/ru.json` | Русские строки (~130 ключей) |
| `src/shared/i18n/locales/en.json` | Английские строки (~130 ключей) |

Ключи организованы по доменным секциям: `common`, `auth`, `nav`, `layout`, `events`, `eventCard`, `eventForm`, `eventInfo`, `participantsSummary`, `notifications`, `invite`, `tabs`, `participants`, `collections`, `polls`, `items`, `carpools`, `links`.

---

### Переключатель языка

Компонент `LanguageToggle` (inline в `widgets/layout/index.tsx`) — кнопка `RU ↔ EN` в TopBar рядом с переключателем темы. Язык сохраняется в `localStorage`.

---

### Чеклист

- [x] Установить `i18next` + `react-i18next`
- [x] Создать `src/shared/i18n/index.ts`
- [x] Создать `ru.json` и `en.json`
- [x] Инициализировать i18n в `app/providers/index.tsx`
- [x] Добавить `LanguageToggle` в `widgets/layout/index.tsx`
- [x] Локализовать все 22 компонента (pages, widgets, features)

---

## Этап 13 — Профиль пользователя

### Контекст

Страница профиля с редактированием личных данных и статистикой участия во встречах.

### Backend

- [x] Миграция `005_user_profile`: добавить `last_name`, `birth_date`, `city` в таблицу `users`
- [x] Расширить модель `User` новыми полями; добавить `UpdateProfileRequest`, `ProfileStats`
- [x] Обновить `repository/user`: методы `UpdateProfile`, `GetStats` + новые поля в SELECT
- [x] Новый сервис `service/profile`: `GetMe`, `UpdateMe`, `GetStats`
- [x] Новый хендлер `handler/profile`: `GET /api/auth/me`, `PUT /api/auth/me`, `GET /api/auth/me/stats`
- [x] Обновить `router.go` и `main.go`

### Frontend

- [x] Расширить тип `User` (`entities/user/model/types.ts`): `last_name`, `birth_date`, `city`, `created_at`; добавить `ProfileStats`
- [x] Добавить API методы в `features/auth/api`: `getMe`, `updateProfile`, `getStats`
- [x] Добавить `updateUser()` в `AuthContext`
- [x] Создать `pages/profile/index.tsx`: двухпанельный layout, таб «Редактировать» + таб «Статистика»
- [x] Добавить маршрут `/profile` в роутер
- [x] Добавить `NavItem` «Профиль» в `Sidebar` и `BottomNav`
- [x] Аватар пользователя в сайдбаре — кликабельная ссылка на `/profile`
- [x] Добавить секцию `profile` в `ru.json` и `en.json`

---

## Этап 14 — Напоминания о встречах

### Контекст

Автоматические уведомления всем участникам (включая организатора) за 3 дня и за 1 день до окончания встречи (`date_end`). Фоновый тикер в бэкенде, доставка через существующую систему уведомлений. Фронтенд не меняется.

### Backend

- [x] Миграция `006_event_reminders`: добавить `reminder_3d_sent BOOLEAN DEFAULT FALSE` и `reminder_1d_sent BOOLEAN DEFAULT FALSE` в `events`
- [x] Добавить тип `ReminderEvent` в `model.go`
- [x] Добавить методы в `repository/event/repository.go`: `ListForReminder`, `MarkReminder3dSent`, `MarkReminder1dSent`
- [x] Создать `internal/reminder/interfaces.go` — минимальные интерфейсы `EventRepo`, `NotificationRepo`
- [x] Создать `internal/reminder/runner.go` — тикер (1 час), отправка уведомлений, дедупликация через флаги
- [x] Обновить `main.go`: запустить `reminderRunner.Start(ctx)` в горутине
