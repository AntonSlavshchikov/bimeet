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

### Этап 7 — Восстановление пароля

**Backend**
- [ ] Миграция: таблица `password_reset_tokens` (token UUID, user_id, expires_at, used)
- [ ] Репозиторий токенов: `Create`, `GetByToken`, `MarkUsed`
- [ ] Метод `UpdatePassword` в репозитории пользователей
- [ ] Метод `SendPasswordReset` в mailer (по образцу `SendInvite`)
- [ ] Auth service: `ForgotPassword` (генерирует токен, отправляет письмо; 200 даже если email не найден) и `ResetPassword` (валидирует токен, меняет пароль)
- [ ] Auth handler: `POST /api/auth/forgot-password` и `POST /api/auth/reset-password` (публичные маршруты)

**Frontend**
- [ ] Страница `/forgot-password`: форма с email, после отправки — сообщение «Письмо отправлено»
- [ ] Страница `/reset-password`: читает `?token=` из URL, форма нового пароля, редирект на `/login`
- [ ] Ссылка «Забыли пароль?» на странице логина
- [ ] Методы `forgotPassword` и `resetPassword` в `features/auth/api/index.ts`
- [ ] i18n-ключи для обоих языков

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

---

## Этап 15 — Аватарка пользователя

### Контекст

Сейчас аватарка везде генерируется из инициалов (Chakra UI `<Avatar name=...>`). Нужно дать пользователю возможность загрузить собственное фото. Файлы хранятся в AWS S3; публичный URL сохраняется в БД.

### Backend

- [ ] Добавить env-переменные `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_PUBLIC_BASE_URL` в `.env.example`
- [ ] `go get github.com/aws/aws-sdk-go-v2/...`
- [ ] Миграция `007_user_avatar`: `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`
- [ ] `AvatarURL *string \`json:"avatar_url"\`` в модели `User`
- [ ] `avatar_url` в SELECT-запросах репозитория + метод `UpdateAvatar(ctx, userID, url)`
- [ ] Создать `internal/storage/s3.go` — обёртка `Upload(ctx, key, contentType, body) (url, err)`
- [ ] Сервисный метод `UploadAvatar(ctx, userID, file, header)` — валидация MIME+размер (5 MB), S3 upload, UpdateAvatar
- [ ] Хендлер `UploadAvatar`, интерфейсы, маршрут `POST /api/auth/me/avatar`
- [ ] Инициализация S3-клиента в `main.go`

### Frontend

- [ ] `avatar_url?: string` в типе `User` (`entities/user/model/types.ts`)
- [ ] `uploadAvatar(file: File): Promise<User>` в `features/auth/api` (FormData + fetch с JWT header)
- [ ] Хук `useUploadAvatar()` — мутация, `updateUser(data)` + инвалидация `['profile']`
- [ ] `pages/profile/index.tsx`: кликабельный аватар с оверлеем `FiCamera` и скрытым `<input type="file">`; Spinner во время загрузки
- [ ] `widgets/layout/Sidebar.tsx`: `<Avatar src={user.avatar_url} name={user.name}>`
- [ ] i18n ключи `profile.uploadAvatar`, `profile.uploadError` в `ru.json` и `en.json`

---

## Этап 16 — Docker + CI/CD деплой

### Контекст

Контейнеризация бэкенда и фронтенда, продакшн docker-compose с полным стеком сервисов, автоматический деплой через GitHub Actions при пуше в `master`.

---

### Новые файлы

| Файл | Назначение |
|---|---|
| `backend/Dockerfile` | Multi-stage сборка Go-бинарника |
| `frontend/Dockerfile` | Multi-stage сборка Vite → nginx |
| `frontend/nginx.conf` | SPA-роутинг + проксирование `/api` на бэкенд |
| `docker-compose.prod.yml` | Продакшн-конфиг: все сервисы + volumes + сеть |
| `.github/workflows/deploy.yml` | CI: build → push GHCR → SSH deploy |
| `.env.prod.example` | Шаблон продакшн-переменных |

---

### Детали реализации

#### `backend/Dockerfile` (multi-stage)
- Сборка: `golang:1.26-alpine`, `CGO_ENABLED=0 go build -o server ./cmd/server`
- Runtime: `alpine:3.20` + `ca-certificates` + `tzdata`, образ ~15 MB

#### `frontend/Dockerfile` (multi-stage)
- Сборка: `node:20-alpine`, `npm ci && npm run build`
- Runtime: `nginx:alpine`, раздаёт `/app/dist`

#### `frontend/nginx.conf`
- SPA fallback: `try_files $uri $uri/ /index.html`
- Прокси `/api/` → `http://backend:8080/api/`

#### `docker-compose.prod.yml` (в корне репозитория)
Сервисы: `backend`, `frontend`, `postgres:16-alpine`, `minio` (если не AWS S3).
Одна bridge-сеть `app-net`, named volumes для postgres и minio.

#### `.github/workflows/deploy.yml`
Триггер: `push` в `master`
1. Build + push образов в GHCR (`ghcr.io/<owner>/bimeet-backend:latest`, `bimeet-frontend:latest`)
2. SSH на VPS → `docker compose -f docker-compose.prod.yml pull && up -d`

Секреты: `SSH_HOST`, `SSH_USER`, `SSH_KEY`, `GITHUB_TOKEN` (встроенный, для GHCR).

#### `.env.prod.example`
- `DSN=postgres://bimeet:<password>@postgres:5432/bimeet?sslmode=disable` (хост `postgres`, не `localhost`)
- `JWT_SECRET=<strong-random-secret>`
- Реальный SMTP (SendGrid и др.)
- AWS S3 или MinIO-переменные

---

### Важные нюансы

- **DSN в проде**: хост `postgres` (имя сервиса в compose-сети), не `localhost`
- **VITE_API_URL**: передаётся как `--build-arg` при сборке фронтенд-образа
- **Миграции**: бэкенд запускает автоматически при старте — дополнительных шагов не нужно

---

### Чеклист реализации

- [ ] `backend/Dockerfile`
- [ ] `frontend/Dockerfile`
- [ ] `frontend/nginx.conf`
- [ ] `docker-compose.prod.yml`
- [ ] `.env.prod.example`
- [ ] `.github/workflows/deploy.yml`

---

## Этап 17 — Публичные и персональные встречи

> Описание добавлено на основе раздела «Требования: Публичные и персональные встречи» в `requirements.md`.

### Контекст

Сейчас все встречи де-факто персональные: `GET /api/events` возвращает только встречи, где пользователь — организатор или участник. Нет полей `is_public` / `max_guests`, нет публичного каталога, нет кнопки «Присоединиться». Нужно добавить тип встречи, публичный список, ограничение по гостям и соответствующий UI.

---

### Backend

#### Миграция `008_public_events`

- [ ] Создать `backend/internal/db/migrations/008_public_events.up.sql`:
  ```sql
  ALTER TABLE events ADD COLUMN IF NOT EXISTS is_public  BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS max_guests INTEGER;
  ```
- [ ] Создать `backend/internal/db/migrations/008_public_events.down.sql`

---

#### Доменные изменения (`internal/model/model.go`)

- [ ] `Event` — добавить `IsPublic bool`, `MaxGuests *int`
- [ ] `EventDetail` — те же поля + `ConfirmedCount int`
- [ ] `EventListItem` — те же поля + `ConfirmedCount int`
- [ ] `InviteEventInfo` — добавить `IsPublic bool`
- [ ] `CreateEventRequest` — добавить `IsPublic bool`, `MaxGuests *int`
- [ ] `UpdateEventRequest` — добавить `IsPublic *bool`, `MaxGuests *int`
- [ ] Новый тип `PublicEventListItem` — все поля `EventListItem` + `IsParticipant bool`

---

#### Repository (`internal/repository/event/repository.go`)

- [ ] `Create`: добавить `is_public`, `max_guests` в INSERT + RETURNING + Scan
- [ ] `Update`: добавить `is_public = COALESCE($N, is_public)`, `max_guests = COALESCE($M, max_guests)` + Scan
- [ ] `GetByID`, `GetDetail`, `ListForUserEnriched`: добавить новые поля в SELECT + Scan
- [ ] `GetDetail`: вычислить `confirmed_count` (COUNT confirmed + organizer)
- [ ] Новый метод `ListPublic(ctx, userID)` → `[]PublicEventListItem`: активные публичные встречи с confirmed_count и флагом is_participant
- [ ] Новый метод `JoinPublic(ctx, eventID, userID)`: INSERT со статусом `confirmed`, ON CONFLICT DO UPDATE

---

#### Service (`internal/service/event/service.go`)

- [ ] `GetByID`: если `!is_public` и пользователь не организатор и не участник → вернуть `ErrForbidden`
- [ ] Новый метод `ListPublic(ctx, userID)`
- [ ] Новый метод `JoinPublic(ctx, eventID, userID)`: проверить is_public, статус, лимит (`ErrFull`), затем `eventRepo.JoinPublic` + уведомление организатору

---

#### Handler + Router

- [ ] `handler/event/interfaces.go`: добавить `ListPublic`, `JoinPublic` в интерфейс `EventService`
- [ ] `handler/event/handler.go`: хендлеры `ListPublic` и `JoinPublic`; `GetByID` → обработать `ErrForbidden` → `403`
- [ ] `router.go`: `GET /api/events/public` (до группы `/{id}`), `POST /api/events/{id}/join`

---

### Frontend

#### Типы (`entities/event/model/types.ts`)

- [ ] `Event`, `EventListItem` — добавить `is_public: boolean`, `max_guests?: number`, `confirmed_count?: number`
- [ ] `CreateEventData`, `UpdateEventData` — аналогично
- [ ] Новый интерфейс `PublicEventListItem`: расширяет `EventListItem`, добавляет `is_participant: boolean`

---

#### API, Queries, Hooks

- [ ] `entities/event/api/index.ts` — добавить `getPublicEvents()`
- [ ] `features/event-manage/api/index.ts` — добавить `joinPublicEvent(id)`
- [ ] `entities/event/queries/index.ts` — добавить `publicEventKeys` и `usePublicEvents()`
- [ ] `features/event-manage/model/hooks.ts` — добавить `useJoinPublicEvent()`

---

#### UI

- [ ] `pages/event-form/index.tsx`: RadioGroup «Персональная» / «Публичная» + поле «Максимальное количество гостей» (условно)
- [ ] `pages/events-list/index.tsx`: третий таб «Публичные встречи» + кнопка «Присоединиться»
- [ ] `widgets/event-card/`: Badge «Публичная» (FiGlobe) / «Персональная» (FiLock) + счётчик `confirmed_count / max_guests`
- [ ] `pages/event-detail/index.tsx` + `EventInfoPanel.tsx`: кнопка «Присоединиться», disabled при лимите
- [ ] `shared/i18n/locales/ru.json`, `en.json`: ключи `typePersonal`, `typePublic`, `maxGuests`, `join`, `noSpots`, `spotsLeft`, `tabPublic`, `publicBadge`, `personalBadge`

---

## Этап 18 — Лендинг (отдельный проект)

### Контекст

Маркетинговая страница для продвижения приложения. Отдельный проект `landing/` — основное приложение (`frontend/`) не меняется. Стек: **Next.js (App Router) + Tailwind**, статическая генерация (`output: 'export'`).

---

### Структура

```
ai-project/
├── backend/
├── frontend/     ← SPA, без изменений
├── landing/      ← новый проект (Next.js)
│   ├── app/
│   │   ├── page.tsx       # главная
│   │   └── layout.tsx
│   ├── components/        # Hero, Features, Footer
│   ├── next.config.ts     # output: 'export'
│   └── package.json
└── docs/
```

---

### Содержимое лендинга

- **Hero**: название, tagline, CTA «Попробовать» → `NEXT_PUBLIC_APP_URL`
- **Features**: 4 карточки (встречи, сборы, опросы, карпулинг)
- **Footer**: ссылки на вход / регистрацию

---

### Деплой

| Проект | Хостинг | URL |
|---|---|---|
| `landing/` | Vercel / Cloudflare Pages | `bimeet.app` |
| `frontend/` | Docker + nginx (Этап 16) | `app.bimeet.app` |
| `backend/` | Docker + VPS | `api.bimeet.app` |

---

### Чеклист

- [ ] `npx create-next-app@latest landing --typescript --tailwind --app`
- [ ] `next.config.ts`: `output: 'export'`, `trailingSlash: true`
- [ ] Компонент `Hero` с CTA
- [ ] Компонент `Features` (4 карточки)
- [ ] Компонент `Footer`
- [ ] Env: `NEXT_PUBLIC_APP_URL`
- [ ] `.github/workflows/deploy.yml`: отдельный job для деплоя лендинга

---

## Этап 17 — Публичные и персональные встречи

### Контекст

Сейчас все встречи де-факто персональные: `GET /api/events` возвращает только встречи, где пользователь — организатор или участник. Нет полей `is_public` / `max_guests`, нет публичного каталога, нет кнопки «Присоединиться». Нужно добавить тип встречи, публичный список, ограничение по гостям и соответствующий UI.

---

### Backend

#### Миграция `008_public_events`

- [ ] Создать `backend/internal/db/migrations/008_public_events.up.sql`:
  ```sql
  ALTER TABLE events ADD COLUMN IF NOT EXISTS is_public  BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS max_guests INTEGER;
  ```
- [ ] Создать `backend/internal/db/migrations/008_public_events.down.sql`

---

#### Доменные изменения (`internal/model/model.go`)

- [ ] `Event` — добавить `IsPublic bool \`json:"is_public"\``, `MaxGuests *int \`json:"max_guests,omitempty"\``
- [ ] `EventDetail` — те же поля + `ConfirmedCount int \`json:"confirmed_count"\``
- [ ] `EventListItem` — те же поля + `ConfirmedCount int \`json:"confirmed_count"\``
- [ ] `InviteEventInfo` — добавить `IsPublic bool`
- [ ] `CreateEventRequest` — добавить `IsPublic bool`, `MaxGuests *int`
- [ ] `UpdateEventRequest` — добавить `IsPublic *bool`, `MaxGuests *int`
- [ ] Новый тип `PublicEventListItem` — все поля `EventListItem` + `IsParticipant bool \`json:"is_participant"\``

---

#### Repository (`internal/repository/event/repository.go`)

- [ ] `Create`: добавить `is_public`, `max_guests` в INSERT + RETURNING + Scan
- [ ] `Update`: добавить `is_public = COALESCE($N, is_public)`, `max_guests = COALESCE($M, max_guests)` + Scan
- [ ] `GetByID`: добавить новые поля в SELECT + Scan
- [ ] `GetDetail`: добавить `e.is_public`, `e.max_guests`, вычислить `confirmed_count` (COUNT confirmed + organizer), Scan
- [ ] `ListForUserEnriched`: добавить `e.is_public`, `e.max_guests`, `confirmed_count` в SELECT + Scan
- [ ] Новый метод `ListPublic(ctx, userID)` → `[]PublicEventListItem`: активные публичные встречи с confirmed_count и флагом is_participant
- [ ] Новый метод `JoinPublic(ctx, eventID, userID)`: INSERT в event_participants со статусом `confirmed`, ON CONFLICT DO UPDATE

---

#### Service (`internal/service/event/service.go`)

- [ ] `GetByID`: после GetDetail — если `!detail.IsPublic` и пользователь не организатор и не участник, вернуть `ErrForbidden`
- [ ] Новый метод `ListPublic(ctx, userID)`: делегирует в `eventRepo.ListPublic`
- [ ] Новый метод `JoinPublic(ctx, eventID, userID)`:
  1. Проверить `is_public = true` и `status = active`
  2. Если `max_guests != nil`, проверить `confirmed_count < max_guests` (иначе `ErrFull`)
  3. Вызвать `eventRepo.JoinPublic`
  4. Уведомить организатора (горутина)

---

#### Interfaces (`internal/handler/event/interfaces.go`)

- [ ] Добавить `ListPublic` и `JoinPublic` в интерфейс `EventService`

---

#### Handler (`internal/handler/event/handler.go`)

- [ ] `GetByID`: обработать `ErrForbidden` → `403 Forbidden`
- [ ] Новый хендлер `ListPublic`: `GET /api/events/public`
- [ ] Новый хендлер `JoinPublic`: `POST /api/events/{id}/join`; `ErrFull` → `409 Conflict`

---

#### Router (`internal/handler/router.go`)

- [ ] `r.Get("/api/events/public", event.ListPublic)` — добавить до группы `/{id}`
- [ ] Внутри `/{id}`: `r.Post("/join", event.JoinPublic)`

---

### Frontend

#### Типы (`entities/event/model/types.ts`)

- [ ] `Event`, `EventListItem` — добавить `is_public: boolean`, `max_guests?: number`, `confirmed_count?: number`
- [ ] `CreateEventData` — добавить `is_public: boolean`, `max_guests?: number`
- [ ] `UpdateEventData` — добавить `is_public?: boolean`, `max_guests?: number`
- [ ] Новый интерфейс `PublicEventListItem` — расширяет `EventListItem`, добавляет `is_participant: boolean`

---

#### API

- [ ] `entities/event/api/index.ts` — добавить `getPublicEvents(): Promise<PublicEventListItem[]>`
- [ ] `features/event-manage/api/index.ts` — добавить `joinPublicEvent(id: string)`

---

#### Queries (`entities/event/queries/index.ts`)

- [ ] Добавить `publicEventKeys` и хук `usePublicEvents()`

---

#### Mutation hook (`features/event-manage/model/hooks.ts`)

- [ ] Добавить `useJoinPublicEvent()` — инвалидирует `publicEventKeys.all` и `eventKeys.all`

---

#### Форма события (`pages/event-form/index.tsx`)

- [ ] Добавить в `FormValues`: `isPublic: boolean`, `maxGuests: string`
- [ ] Секция «Тип встречи»: RadioGroup «Персональная» / «Публичная»
- [ ] При «Публичная» — показывать `NumberInput` «Максимальное количество гостей» (необязательное)
- [ ] Передавать `is_public`, `max_guests` при сабмите

---

#### Список встреч (`pages/events-list/index.tsx`)

- [ ] Добавить третий таб «Публичные встречи» с данными из `usePublicEvents()`
- [ ] В публичном табе: кнопка «Присоединиться» если `!is_participant` и места есть
- [ ] Счётчик таба = число публичных встреч

---

#### EventCard и EventListRow (`widgets/event-card/`)

- [ ] Badge «Публичная» (FiGlobe) / «Персональная» (FiLock)
- [ ] Счётчик участников: `confirmed_count / max_guests` или просто `confirmed_count`

---

#### Детальная страница (`pages/event-detail/index.tsx`, `widgets/event-detail/EventInfoPanel.tsx`)

- [ ] Кнопка «Присоединиться» для публичных встреч (если не участник и не организатор)
- [ ] Кнопка disabled с подсказкой «Мест нет» при достижении лимита
- [ ] Отображать `confirmed_count / max_guests` в информационной панели

---

#### i18n (`shared/i18n/locales/ru.json`, `en.json`)

- [ ] Новые ключи: `typePersonal`, `typePublic`, `maxGuests`, `maxGuestsPlaceholder`, `join`, `joinSuccess`, `noSpots`, `spotsLeft`, `tabPublic`, `publicBadge`, `personalBadge`

---

## Этап 19 — Редизайн списка встреч: лента + новые табы

### Контекст

Текущие табы: **Организую | Участвую | Публичные** — встречи изолированы по ролям. Первый таб становится discovery-лентой всех встреч (включая незаписанные публичные), с кнопкой **«Иду»** для быстрого участия прямо из списка. Порядок табов меняется.

---

### Видимость встреч

- **Приватные** (`is_public = false`) — видны только тем, кто приглашён или является организатором. `GET /api/events` уже фильтрует их на бэкенде.
- **Публичные** (`is_public = true`) — видны всем. `GET /api/events/public` возвращает их независимо от участия.

---

### Новые табы

| Таб | Данные | «Иду» |
|---|---|---|
| **Все встречи** | `useEvents()` (все «мои») + `usePublicEvents()` (все публичные), dedupe по id, сортировка по дате | да |
| **Участвую** | `events` где `organizer.id !== user.id` | нет |
| **Организую** | `events` где `organizer.id === user.id` | нет |

---

### Логика кнопки «Иду»

- `organizer` → кнопки нет
- `my_status === 'confirmed'` → кнопки нет
- `my_status === 'invited'` → «Иду» → `confirmAttendance(eventId, userId)`
- `is_public && !is_participant && места есть` → «Иду» → `joinPublicEvent(eventId)`

---

### Backend

Изменений не требуется. `PATCH /api/events/:id/participants/:userId` уже существует.

---

### Frontend

#### `features/event-manage/model/hooks.ts`
- [ ] Добавить `useConfirmAttendance()` — вызывает `eventMutationsApi.updateParticipantStatus(eventId, userId, 'confirmed')`, инвалидирует `eventKeys.all`

#### `pages/events-list/index.tsx`
- [ ] Изменить порядок табов: Все встречи → Участвую → Организую
- [ ] Таб «Все встречи»: объединить `events` + `publicEvents` (dedupe по `id`), сортировка по `date_start`
- [ ] Функция `handleAttend(event)`: если `my_status === 'invited'` → confirm, иначе → join
- [ ] Таб «Участвую»: `events.filter(e => e.organizer.id !== user.id)`
- [ ] Таб «Организую»: `events.filter(e => e.organizer.id === user.id)`

#### `widgets/event-card/index.tsx`
- [ ] Кнопку `t('eventInfo.join')` заменить на `t('eventCard.attendButton')`

#### `widgets/event-card/EventListRow.tsx`
- [ ] Аналогично: `t('eventInfo.join')` → `t('eventCard.attendButton')`

#### `shared/i18n/locales/ru.json`, `en.json`
- [ ] `events.tabAll`: `"Все встречи"` / `"All"`
- [ ] `eventCard.attendButton`: `"Иду"` / `"I'm going"`

---

## Этап 20 — Геолокация: координаты места встречи

### Контекст

Поле `location` хранит только текстовое описание места. Нужно добавить хранение координат (`latitude`, `longitude`) — необязательные поля. Пользователь может ввести координаты вручную или нажать кнопку «Определить моё местоположение» (Browser Geolocation API). Провайдер карт не подключается — вместо этого в карточке события появляется ссылка на внешние карты.

---

### Ссылка на внешние карты

Если координаты заданы, показывать кнопку-ссылку:
- **Яндекс.Карты**: `https://yandex.ru/maps/?pt={lng},{lat}&z=16`
- При отсутствии координат — ссылки нет.

---

### Backend

#### Миграция `009_event_coordinates`

```sql
ALTER TABLE events ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION;
ALTER TABLE events ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
```

#### Изменения в коде

| Файл | Изменение |
|---|---|
| `internal/model/model.go` | `Latitude *float64 \`json:"latitude,omitempty"\``, `Longitude *float64 \`json:"longitude,omitempty"\`` в `Event`, `EventDetail`, `EventListItem` |
| `internal/repository/event/repository.go` | `e.latitude`, `e.longitude` в SELECT + Scan; `Create` и `Update` — опциональные параметры |
| `internal/service/event/service.go` | Прокидывать поля без бизнес-логики |
| `internal/handler/event/handler.go` | `CreateEventRequest` и `UpdateEventRequest` — добавить `Latitude *float64`, `Longitude *float64` |

- [ ] Создать `009_event_coordinates.up.sql` и `009_event_coordinates.down.sql`
- [ ] Добавить поля в модели
- [ ] SELECT + Scan в репозитории
- [ ] INSERT / UPDATE в репозитории

---

### Frontend

#### Типы (`entities/event/model/types.ts`)
- [ ] `latitude?: number`, `longitude?: number` в `Event`, `EventListItem`, `CreateEventData`, `UpdateEventData`

#### Форма события (`pages/event-form/index.tsx`)
- [ ] Два поля `latitude` / `longitude` в `FormValues` (строки, необязательные)
- [ ] Раздел «Координаты» с двумя `NumberInput` или `Input type="number"` (широта / долгота)
- [ ] Кнопка «Определить местоположение» (иконка `FiNavigation`) — вызывает `navigator.geolocation.getCurrentPosition`, заполняет оба поля
- [ ] При сабмите: передавать `latitude` / `longitude` если заполнены, иначе `undefined`

#### Карточка события (`widgets/event-detail/EventInfoPanel.tsx`)
- [ ] Если `latitude` и `longitude` заданы — рядом с иконкой `FiMapPin` добавить ссылку «Открыть на карте» → Яндекс.Карты

#### i18n (`shared/i18n/locales/ru.json`, `en.json`)
- [ ] `eventForm.fieldCoordinates`: `"Координаты"` / `"Coordinates"`
- [ ] `eventForm.fieldLatitude`: `"Широта"` / `"Latitude"`
- [ ] `eventForm.fieldLongitude`: `"Долгота"` / `"Longitude"`
- [ ] `eventForm.detectLocation`: `"Определить местоположение"` / `"Detect location"`
- [ ] `eventForm.detectLocationError`: `"Не удалось определить местоположение"` / `"Could not detect location"`
- [ ] `eventInfo.openMap`: `"Открыть на карте"` / `"Open in maps"`

---

## Этап 21 — Верификация взносов через чек

### Контекст

Сейчас участник нажимает «Я скинулся» и статус сразу меняется на `paid` без проверки. Это недостоверно. Вводится трёхшаговый процесс подтверждения через чек. Дополнительно: организатор может принудительно отметить любого участника как заплатившего (для наличных и других случаев).

---

### Статусная машина

```
not_paid → (участник загрузил чек)         → pending
pending  → (организатор подтвердил)        → paid  [необратимо]
pending  → (организатор отклонил)          → not_paid
not_paid → (организатор принудительно)     → paid  [необратимо]
pending  → (организатор принудительно)     → paid  [необратимо]
```

---

### Backend

#### Миграция `010_contribution_receipt`

```sql
ALTER TABLE collection_contributions
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'not_paid'
    CHECK (status IN ('not_paid', 'pending', 'paid')),
  ADD COLUMN IF NOT EXISTS receipt_url TEXT;

UPDATE collection_contributions SET status = 'paid' WHERE paid = TRUE;
```

#### Доменные изменения (`internal/model/model.go`)

- [ ] Добавить `Status string \`json:"status"\`` и `ReceiptURL *string \`json:"receipt_url,omitempty"\`` в `CollectionContribution`

#### Repository (`internal/repository/collection/repository.go`)

- [ ] Обновить SELECT + Scan: добавить `status`, `receipt_url`
- [ ] Удалить `ToggleContribution`
- [ ] Новый метод `SubmitContribution(ctx, collectionID, userID, receiptURL)` — INSERT/UPDATE со `status='pending'`
- [ ] Новый метод `ConfirmContribution(ctx, id)` — `status='paid'`, `paid=TRUE`, `paid_at=NOW()`
- [ ] Новый метод `RejectContribution(ctx, id)` — `status='not_paid'`, `paid=FALSE`, `receipt_url=NULL`
- [ ] Новый метод `MarkPaid(ctx, collectionID, userID)` — принудительно `status='paid'` (без чека)
- [ ] Новый метод `GetContributionByID(ctx, id)` — для confirm/reject по ID взноса
- [ ] Обновить `CountPaidContributions`: WHERE `status = 'paid'`

#### Service (`internal/service/collection/service.go`)

- [ ] Добавить `NotificationRepo` и `Uploader` в зависимости сервиса
- [ ] Удалить `ToggleContribution`, добавить:
  - `SubmitContribution(ctx, eventID, collectionID, userID, file, contentType)` — загружает в S3, сохраняет URL, уведомляет организатора
  - `ConfirmContribution(ctx, eventID, collectionID, contribID, organizerID)` — подтверждает, уведомляет участника
  - `RejectContribution(ctx, eventID, collectionID, contribID, organizerID)` — отклоняет, уведомляет участника
  - `MarkPaid(ctx, eventID, collectionID, targetUserID, organizerID)` — принудительная отметка

#### Handler + Router

- [ ] `SubmitContribution`: `POST /api/events/{id}/collections/{collectionId}/contribute` (multipart, поле `receipt`, лимит 10 MB)
- [ ] `ConfirmContribution`: `POST /api/events/{id}/collections/{collectionId}/contributions/{contribId}/confirm`
- [ ] `RejectContribution`: `POST /api/events/{id}/collections/{collectionId}/contributions/{contribId}/reject`
- [ ] `MarkPaid`: `POST /api/events/{id}/collections/{collectionId}/contributions/mark-paid` (тело: `{ "user_id": "..." }`)
- [ ] Обновить `interfaces.go`: `CollectionService` + `Uploader`
- [ ] Обновить `main.go`: передать uploader в коллекции (S3-клиент уже инициализирован для аватарок)

---

### Frontend

#### Типы (`entities/event/model/types.ts`)

- [ ] Добавить `status: 'not_paid' | 'pending' | 'paid'` и `receipt_url?: string` в `CollectionContribution`

#### API + Хуки (`features/collections/`)

- [ ] `api/index.ts`: обновить `contribute` (FormData + файл), добавить `confirmContribution`, `rejectContribution`, `markPaid`
- [ ] `model/hooks.ts`: удалить `useToggleContribution`, добавить `useSubmitContribution`, `useConfirmContribution`, `useRejectContribution`, `useMarkPaid`

#### UI (`features/collections/ui/CollectionsTab.tsx`)

- [ ] Кнопка «Я скинулся» → открывает модальное окно загрузки чека
- [ ] Модальное окно: `<input type="file" accept="image/*,.pdf">` + кнопка «Отправить»
- [ ] Статусы участника: `not_paid` → кнопка, `pending` → жёлтый badge, `paid` → зелёный badge
- [ ] Аватарки по статусу: зелёный/жёлтый/серый
- [ ] Блок организатора «Ожидают подтверждения»: имя + ссылка на чек + кнопки «Подтвердить» / «Отклонить»
- [ ] Кнопка «Отметить оплату» для организатора рядом с каждым участником (`not_paid` / `pending`)

#### i18n

- [ ] Новые ключи: `statusNotPaid`, `statusPending`, `statusPaid`, `uploadReceiptTitle`, `uploadReceiptHint`, `uploadReceiptButton`, `pendingSection`, `viewReceipt`, `confirm`, `reject`, `markPaid`, `tooltipPending`

---

### Чеклист реализации

**Backend:**
- [ ] `010_contribution_receipt.up.sql` / `.down.sql`
- [ ] Обновить модель
- [ ] Обновить репозиторий (новые методы + SELECT)
- [ ] Обновить сервис (новые методы + зависимости)
- [ ] Обновить хендлер и интерфейсы
- [ ] Обновить роутер
- [ ] Обновить `main.go`

**Frontend:**
- [ ] Обновить типы
- [ ] Обновить API + хуки
- [ ] Переработать `CollectionsTab.tsx`
- [ ] Обновить i18n

---

## Этап 22 — Фиксированная сумма взноса на участника

### Контекст

Сейчас сумма взноса вычисляется динамически: `ceil(target_amount / confirmed_count)`. Это несправедливо — ранние плательщики могут заплатить больше, чем поздние. Решение: организатор задаёт фиксированную сумму **с каждого** при создании сбора. Итоговый сбор = `per_person_amount × confirmed_count` и растёт вместе с участниками, но каждый платит одинаково.

---

### Изменения модели данных

`target_amount` (целевая сумма) → `per_person_amount` (сумма с каждого).

Итог вычисляется динамически на основе числа участников и нигде не хранится.

---

### Backend

#### Миграция `011_collection_per_person`

```sql
ALTER TABLE collections RENAME COLUMN target_amount TO per_person_amount;
```

#### Модель (`internal/model/model.go`)

- [ ] `Collection.TargetAmount` → `PerPersonAmount float64 \`json:"per_person_amount"\``
- [ ] `CollectionInfo` — то же
- [ ] `CreateCollectionRequest.TargetAmount` → `PerPersonAmount`
- [ ] `CollectionSummary`: убрать `TargetAmount`, добавить `ExpectedTotal float64 \`json:"expected_total"\``

#### Repository (`internal/repository/collection/repository.go`)

- [ ] `Create`, `GetByID`, `ListByEvent`: `target_amount` → `per_person_amount` в SQL и Scan

#### Service (`internal/service/collection/service.go`)

- [ ] Упростить `Summary`: `perPerson = col.PerPersonAmount` (не делить на count); `remaining = (totalCount - paidCount) * perPerson`

---

### Frontend

#### Типы (`entities/collection/model/types.ts`)

- [ ] `target_amount` → `per_person_amount`

#### API + UI (`features/collections/`)

- [ ] `api/index.ts`: payload `{ title, per_person_amount }`
- [ ] `CollectionsTab.tsx`: метка формы «С каждого (₽)»; подсказка «Итого ожидается: N ₽»; убрать `Math.ceil(target_amount / contributors.length)`
- [ ] i18n: обновить ключ `perPersonHint` в `ru.json` и `en.json`

---

### Чеклист реализации

**Backend:**
- [ ] `011_collection_per_person.up.sql` / `.down.sql`
- [ ] Обновить модели
- [ ] Обновить репозиторий
- [ ] Упростить Summary в сервисе

**Frontend:**
- [ ] Типы
- [ ] API payload
- [ ] `CollectionsTab.tsx` — форма и отображение
- [ ] i18n

---

## Этап 23 — Админ-панель статистики

### Контекст

Read-only админ-панель для разработчиков и директора. Отображает KPI приложения, динамику регистраций и встреч, распределения и топ-листы. Без CRUD: всё, что нужно — увидеть состояние системы. Доступ ограничен whitelist'ом email-адресов в `.env`, чтобы не вводить миграцию ролей в `users` и не раздувать JWT.

---

### Доступ

#### Backend

`backend/.env` (+ `.env.example`):
```
ADMIN_EMAILS=email1@example.com,email2@example.com
```

- [ ] `internal/config/config.go`: поле `AdminEmails []string`, парсинг по запятой, lowercase + `strings.TrimSpace` каждого элемента
- [ ] `internal/middleware/admin.go`: `RequireAdmin(userRepo UserRepo, allowed []string)` — берёт `userID` из контекста, грузит email через существующий `userrepo.GetByID`, проверяет вхождение в `allowed`. На несоответствие — 403
- [ ] `cmd/server/main.go`: пробросить `cfg.AdminEmails` и `userRepo` в роутер

#### Frontend

`frontend/.env` (+ `.env.example`):
```
VITE_ADMIN_EMAILS=email1@example.com,email2@example.com
```

- [ ] `features/auth/lib/isAdmin.ts`: `isAdmin(user)` — читает `import.meta.env.VITE_ADMIN_EMAILS`, lowercase-сравнение. Только для UI-видимости (серверная проверка обязательна)
- [ ] `features/auth/ui/AdminRoute.tsx`: оборачивает дочерний компонент, редиректит `/events` если `!isAdmin(user)` или нет авторизации

---

### Backend

#### Repository (`internal/repository/admin/repository.go`)

- [ ] `Overview(ctx) (model.AdminOverview, error)` — один запрос с подзапросами по образцу `userrepo.GetStats` (см. `repository/user/repository.go:131`):
  - `total_users`, `users_active_7d`, `users_active_30d` (active = создал или подтвердил участие в событии за период)
  - `total_events`, `events_active`, `events_completed`
  - `total_collections`, `total_collected` (`SUM` по `collection_contributions` где `status='paid'`)
- [ ] `Timeseries(ctx, days int) (model.AdminTimeseries, error)` — два запроса `GROUP BY DATE(created_at)` за последние N дней, заполнение пропусков нулями на стороне Go
- [ ] `Distribution(ctx) (model.AdminDistribution, error)` — три запроса: `events GROUP BY category`, `GROUP BY status`, `GROUP BY is_public`
- [ ] `TopOrganizers(ctx, limit int) ([]model.OrganizerStat, error)` — JOIN с `users`, агрегация по `events.organizer_id`, ORDER BY count DESC
- [ ] `RecentUsers(ctx, limit int)` и `RecentEvents(ctx, limit int)` — простой `ORDER BY created_at DESC LIMIT`

#### Model (`internal/model/model.go`)

- [ ] `AdminOverview`, `AdminTimeseries`, `AdminTimeseriesPoint`, `AdminDistribution`, `OrganizerStat`, `AdminUserRow`, `AdminEventRow`

#### Service (`internal/service/admin/service.go`)

- [ ] Тонкий слой над repo: одна структура `Service{repo *adminrepo.Repository}` с методами `Overview`, `Timeseries(days)`, `Distribution`, `TopOrganizers(limit)`, `RecentUsers(limit)`, `RecentEvents(limit)`

#### Handler (`internal/handler/admin/handler.go`)

- [ ] `GET /api/admin/overview`
- [ ] `GET /api/admin/timeseries?days=30` (default 30, max 365)
- [ ] `GET /api/admin/distribution`
- [ ] `GET /api/admin/top-organizers?limit=10` (default 10, max 50)
- [ ] `GET /api/admin/recent-users?limit=20`
- [ ] `GET /api/admin/recent-events?limit=20`

#### Router (`internal/handler/router.go`)

- [ ] Новая защищённая группа `r.Route("/api/admin", ...)` под `middleware.Auth(jwtSecret)` + `middleware.RequireAdmin(userRepo, cfg.AdminEmails)`

---

### Frontend

#### Зависимости (`frontend/package.json`)

- [ ] `recharts` для графиков. `@tanstack/react-table` уже установлен — переиспользуем для таблиц

#### Сущность (`entities/admin-stats/`)

- [ ] `model/types.ts` — типы, зеркалирующие backend-модель
- [ ] `api/index.ts` — методы `getOverview`, `getTimeseries`, `getDistribution`, `getTopOrganizers`, `getRecentUsers`, `getRecentEvents` через `apiFetch`
- [ ] `queries/index.ts` — `adminStatsKeys` + хуки `useAdminOverview`, `useAdminTimeseries(days)`, `useAdminDistribution`, `useAdminTopOrganizers`, `useAdminRecentUsers`, `useAdminRecentEvents`. Все с `staleTime: 60_000`

#### Виджеты

- [ ] `widgets/admin-kpi-card/` — плитка с заголовком, числом и иконкой. Использует `cardBg` + `cardBorder`
- [ ] `widgets/admin-line-chart/` — обёртка над `recharts.LineChart`, адаптированная под текущую тему

#### Страница (`pages/admin-panel/`)

- [ ] `index.tsx` — три таба (Tabs из Chakra UI): «Обзор», «Пользователи», «Встречи»
- [ ] `ui/OverviewTab.tsx`:
  - 6 KPI-плиток в Grid (`totalUsers` / `activeUsers7d` / `totalEvents` / `activeEvents` / `totalCollections` / `totalCollected`)
  - Линейный график «Регистрации vs Встречи» по дням (переключатель 30 / 90 дней)
  - Bar-чарт «Категория» и Pie-чарт «Статус»
- [ ] `ui/UsersTab.tsx` — таблица последних 20 пользователей (TanStack Table) + блок «Топ организаторов»
- [ ] `ui/EventsTab.tsx` — таблица последних 20 событий с category, status, organizer email

#### Роутинг и навигация

- [ ] `app/router/index.tsx`: маршрут `/admin` через `AdminRoute` + `Layout`
- [ ] `widgets/layout/Sidebar.tsx`: условно показывать `NavItem` «Админка» (icon `FiBarChart2`) если `isAdmin(user)`. Аналогично в `BottomNav.tsx`

#### i18n

- [ ] `shared/i18n/locales/ru.json` и `en.json`:
  - `nav.admin` = «Админка» / «Admin»
  - `admin.title`, `admin.tabs.overview`, `admin.tabs.users`, `admin.tabs.events`
  - `admin.kpi.totalUsers`, `admin.kpi.activeUsers7d`, и т.д.
  - `admin.charts.timeseries`, `admin.charts.byCategory`, и т.д.

---

### Чеклист реализации

**Backend:**
- [ ] `config.go`: добавить `AdminEmails`
- [ ] `middleware/admin.go`: `RequireAdmin`
- [ ] `model/model.go`: новые DTO
- [ ] `repository/admin/repository.go`: 6 методов
- [ ] `service/admin/service.go`
- [ ] `handler/admin/handler.go`
- [ ] `handler/router.go`: группа `/api/admin`
- [ ] `cmd/server/main.go`: проводка
- [ ] `.env.example`: `ADMIN_EMAILS=`

**Frontend:**
- [ ] `package.json`: добавить `recharts`
- [ ] `features/auth/lib/isAdmin.ts`
- [ ] `features/auth/ui/AdminRoute.tsx`
- [ ] `entities/admin-stats/{api,model,queries}/`
- [ ] `widgets/admin-kpi-card/`, `widgets/admin-line-chart/`
- [ ] `pages/admin-panel/{index,ui/OverviewTab,ui/UsersTab,ui/EventsTab}.tsx`
- [ ] `app/router/index.tsx`: `/admin`
- [ ] `widgets/layout/{Sidebar,BottomNav}.tsx`: условный пункт «Админка»
- [ ] i18n: `nav.admin` + `admin.*`
- [ ] `.env.example`: `VITE_ADMIN_EMAILS=`

---

## Этап 24 — Редизайн: App-минимализм + переход с Chakra UI на Tailwind/shadcn

### Контекст

Текущий look — generic SaaS на Chakra v2 + emotion. После сравнения четырёх направлений (см. `design/01-luma.html` … `design/04-frosted.html`) выбран **минималистичный app-style** ([`design/05-app-web.html`](../design/05-app-web.html) для десктопа и [`design/05-app.html`](../design/05-app.html) для мобильного). Это «iOS Settings / Things 3 / Linear» tonality: ноль декора, inset-list группы с тонкими разделителями, цветной accent-bar слева у строки, один основной цвет (iOS Blue) + системные семантические (green/orange/red/purple). Без hero-обложек, без spectrum-градиентов, без serif-display шрифтов — контент главный.

Параллельно меняем UI-стек: Chakra v2 раздувает bundle и завязан на emotion; Tailwind + Radix/shadcn даёт меньше байт, точный контроль над дизайном и современный DX.

Текущее состояние: 70 .tsx-файлов, ~30 импортируют `@chakra-ui/react`. Стили в основном написаны как props на `Box` (по сути inline-Tailwind) — миграция в основном механическая. Theme tokens, color modes и компонентные оверрайды из `app/styles/theme.ts` переносим в `@theme` Tailwind v4. Data layer (queries, api, entities, i18n, backend) — без изменений.

---

### Целевой визуальный язык

Эталон — `design/05-app-web.html` (desktop) и `design/05-app.html` (mobile). Светлая тема сейчас, тёмную добавим позже.

#### Палитра

Минимум цветов. Один primary accent (iOS Blue), системные семантические для статусов. Никаких градиентов на поверхностях.

```
surface:
  bg          #FFFFFF              — основной фон main/sidebar/rail
  bg-2        #F7F7F8              — search, segmented controls, rail cards
  surface     #FFFFFF              — inset-list карточки, popovers
  hover       rgba(60,60,67,0.05)  — hover-стейт строк и пунктов

ink (text + lines):
  ink         #000000              — заголовки, primary text
  ink-2       #3C3C43              — body, nav items
  ink-3       rgba(60,60,67,0.60)  — meta, секции, плейсхолдеры
  ink-4       rgba(60,60,67,0.30)  — chevron, dim numbers
  line        rgba(60,60,67,0.14)  — границы карточек, sidebar/rail dividers
  line-soft   rgba(60,60,67,0.07)  — внутренние разделители списка

accent + семантика (системные iOS-цвета, для статуса events):
  accent      #007AFF              — primary action, ссылки, active states
  green       #34C759              — confirmed/going
  orange      #FF9500              — invited/pending action
  red         #FF3B30              — birthday/wedding accents
  purple      #AF52DE              — events с особым статусом (конференция)
  indigo      #5856D6              — карточка пользователя

dark-mode (для будущего этапа):
  bg #0A0A0B · bg-2 #131316 · surface #161618 · ink #FFFFFF · ink-2 rgba(235,235,245,0.92) …
```

Цвет события (`accent-bar` 4px слева) выбирается по правилу: ordinary → red/orange/green/purple по хэшу id; business → blue/gray; completed → gray.

#### Типографика

- **Single family**: `'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif` — без display/serif шрифтов
- **font-feature-settings**: `'cv11', 'ss01', 'tnum'` (tabular numerics критичны — даты, время, счётчики в списке)

Шкала:
- `large-title` 28/32 700 -0.022em — page heading
- `h2` 22/28 700 -0.02em — модалки
- `h3` 17/22 600 -0.015em — nav-title в navbar (mobile)
- `body-strong` 14.5/19 600 -0.01em — row title
- `body` 13.5/18 500 — nav items, buttons, search input
- `small` 13/17 500 — desc в строке
- `caption` 12/16 400 — meta, place
- `micro` 11/15 600 0.06em uppercase — section titles

#### Геометрия и поверхности

- Скругления: `nav-item 7px`, `button/input 9px`, `inset-list 12px`, `cards/sheets 14px`, `app-frame 28px` (mobile desktop preview)
- Тени: минимум. `0 1px 2px rgba(0,0,0,0.04)` на activated сегментах, `0 2px 12px rgba(0,0,0,0.04)` на floating-pill. Поверхности отделяются линиями, не тенями.
- Spacing: 4px base, шаги 4/6/8/10/12/16/20/24/28/36/48
- Иконки: `lucide-react`, размеры 14px (компактные), 16px (nav), 20px (navbar actions), strokeWidth 2

#### Ключевые UI-паттерны (web + mobile)

1. **Inset-list группы** — белая карточка с border, внутри строки разделены тонкой линией (left-offset под date-колонку). Не drop-shadow карточки.
2. **Accent-bar** 4px слева у строки, full-row-height, цветной — единственный «цветной» элемент в строке.
3. **Date-cell** — день крупно (22px tabular), под ним день недели (10px uppercase 0.08em).
4. **Status pill** — компактная (4×10px padding), вариант определяет цвет: `going` (зелёная outline), `invited` (orange solid), `host` (gray outline), action (blue solid).
5. **Segmented control** для табов — `bg-2` контейнер 3px padding, активный — `surface` + лёгкая тень. Счётчик в виде маленького pill справа от лейбла.
6. **Avatars stack** 24px (web) / 22px (mobile), border = surface цвет, overlap −6px, без spacing prop. Цвета аватаров — из системного набора (`a1..a6` по индексу пользователя).
7. **Search input** в toolbar с `⌘K` kbd-подсказкой справа, иконка слева, focus = accent ring 3px (12% opacity).
8. **Mini-calendar** в правой панели — 7-колонок, точка-индикатор под числом для дней со встречами, `today` = solid accent, hover = `hover` token.

#### Layout (web vs mobile)

**Desktop (`05-app-web.html`):**
- 3 колонки: `260px sidebar` + `1fr main` + `340px rail`, max-width 1480px центрировано
- Sidebar sticky на весь viewport, внутри — brand, nav sections, фильтры, user-pill внизу
- Main: toolbar (search + actions), page-head, segmented tabs + view-toggle, секции списка по месяцам
- Right rail: «Сегодня» (upnext), mini-calendar, stats grid 2×2
- Breakpoints: `<1200px` скрывает rail; `<820px` скрывает sidebar → mobile layout

**Mobile (`05-app.html`):**
- Узкая колонка max 480px центрирована (на desktop preview — со скруглением 28px и тонкой тенью)
- Sticky navbar (44px) с blur, иконка-календарь слева + title по центру + actions справа (search, +)
- Large-title под navbar (34px iOS-style)
- Segmented control 4 columns full-width
- Inset-list секции с group titles над ними
- Bottom tab bar 3 пункта (Встречи / Уведомления / Профиль), sticky с safe-area

---

### Технический стек

| Назначение | Было | Стало |
|---|---|---|
| UI-компоненты | `@chakra-ui/react` | `shadcn/ui` (копии в `src/shared/ui/`) |
| Primitives | (внутри Chakra) | `@radix-ui/react-*` |
| Стили | `@emotion/react`, `@emotion/styled`, props на Box | Tailwind CSS v4 (CSS-first `@theme`) |
| Toasts | `useToast` | `sonner` |
| Иконки | `react-icons` | `lucide-react` |
| Тема | `useColorMode` | `next-themes` (используем позже, на этом этапе только light) |
| Variants | (Chakra `variants`) | `class-variance-authority` + `clsx` + `tailwind-merge` |
| Поиск ⌘K | — | `cmdk` |
| Mini-calendar | — | `react-day-picker` (или собственная сетка — оценим в 24.1) |
| Анимации | `framer-motion` | `framer-motion` (только там, где нужно — Dialog/Drawer; список не анимируем) |

**Удаляем:** `@chakra-ui/react`, `@emotion/react`, `@emotion/styled`, `react-icons`.

**На этом этапе только светлая тема.** Tokens проектируем сразу с dark-вариантами в `@theme`, но не активируем — переключатель добавляем позже отдельной задачей.

---

### Структура и этапы реализации

Полная переделка всех страниц. Делаем поэтапно, в одной ветке, без фича-флага — миграция страница-за-страницей, чтобы UI не сломался посреди. Эталон каждого экрана сверяем с `design/05-app-web.html` и `design/05-app.html`.

#### Этап 24.0 — Подготовка стека

- [ ] `npm i tailwindcss @tailwindcss/vite class-variance-authority clsx tailwind-merge lucide-react sonner next-themes cmdk react-day-picker @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tabs @radix-ui/react-tooltip @radix-ui/react-avatar @radix-ui/react-select @radix-ui/react-popover @radix-ui/react-separator @radix-ui/react-switch`
- [ ] Vite plugin: `@tailwindcss/vite` в `vite.config.ts`
- [ ] Новый `src/index.css`: `@import "tailwindcss";` + `@theme { ... }` с токенами bg/bg-2/surface/ink/ink-2/ink-3/ink-4/line/line-soft/hover/accent/green/orange/red/purple/indigo (+ dark-варианты, неактивные)
- [ ] `src/shared/lib/cn.ts` — стандартная shadcn-утилита
- [ ] `ThemeProvider` на `next-themes` в `src/app/providers/` — `defaultTheme="light"`, `enableSystem={false}` (dark включим позже), сосуществует с `ChakraProvider` до этапа 24.8

#### Этап 24.1 — Дизайн-система

Каждый компонент копируем из shadcn в `src/shared/ui/`, кастомизируем под токены и палитру (5-й вариант).

**Базовые:**
- [ ] `<Button>` варианты `primary | ghost | outline | icon` (cva). Высота 36px, radius 9px, primary = solid accent, icon = квадрат 36×36 с border
- [ ] `<Input>` высота 36px, radius 9px, `bg-bg-2`, focus = accent ring 3px (12% opacity), поддержка `leadingIcon`/`trailingKbd` slot'ов
- [ ] `<Textarea>`, `<Select>` (Radix Select) — те же токены
- [ ] `<Dialog>`, `<Drawer>` (vaul) — замена Chakra Modal/Drawer
- [ ] `<DropdownMenu>` — замена Chakra Menu
- [ ] `<Tooltip>`, `<Popover>`, `<Separator>`
- [ ] `<Avatar>` 24px (web default), 22px (mobile), `<AvatarStack>` — overlap −6px, border = surface
- [ ] `<Toast>` через sonner — обёртка с `useToast()`-compatible API для миграции 1:1

**Прикладные (под 5-й вариант):**
- [ ] `<SegmentedControl>` — 3px padding, `bg-bg-2` контейнер, активный = `surface` + box-shadow `0 1px 2px rgba(0,0,0,0.04), 0 2px 6px rgba(0,0,0,0.04)`. Поддержка count-badge справа от лейбла. Используется для tab-фильтров на events-list и табов на event-detail.
- [ ] `<ListGroup>` + `<ListRow>` — inset-карточка с border + radius 12px; строки разделены тонкой `line-soft` с left-offset (нужно отступить под date-колонку). Props: `accentBar?: 'blue'|'green'|'orange'|'red'|'purple'|'gray'`, `onClick`, `href`
- [ ] `<DateCell>` — день крупно (22px tabular) + день недели мелким (10px uppercase)
- [ ] `<TimeCell>` — время + место (две строки, tabular)
- [ ] `<StatusPill>` варианты `going | invited | host | action | completed`. Цвета — из семантики.
- [ ] `<EventTag>` — мини-тег (Личная/Деловая/Публичная/Black tie/Конференция), варианты `default | public | work | host`
- [ ] `<SearchInput>` — composition `<Input>` + leading `Search` icon + trailing `<Kbd>⌘K</Kbd>`, на enter открывает `<CommandPalette>` (cmdk)
- [ ] `<CommandPalette>` — глобальный поиск событий/мест/людей через cmdk
- [ ] `<MiniCalendar>` — на `react-day-picker` (или собственная сетка 7×6) с точкой-индикатором под днями со встречами, `today` = solid accent
- [ ] `<AccentBar>` цветовая логика: helper `eventAccentColor(event) → 'blue'|...'`
  - `category === 'business'` → `blue` (online) или `gray` (карпулинг)
  - `category === 'ordinary'` + содержит сбор крупный (свадьба, ДР) → `red`
  - публичные → `orange`
  - походы/природа → `green`
  - конференции/онлайн с большим числом — `purple`
  - completed → `gray`

**Удаляются концепты (из старого плана, не нужны):**
- ~~`<EventCover>` с градиентами~~, ~~`<DateBlock>` с цветным фоном~~, ~~`hero-секция`~~, ~~`spectrum` 8 цветов~~, ~~serif display fonts~~

- [ ] Завести `src/pages/_design-system/` для визуальной проверки (страница с примерами всех компонентов; не публикуем в production)

#### Этап 24.2 — Layout shell (web + mobile)

Эталон: `design/05-app-web.html` (sidebar + main + rail) и `design/05-app.html` (navbar + content + bottom tabs).

- [ ] `widgets/layout/index.tsx` — корневой shell. Адаптив:
  - `≥1200px` — 3 колонки `260px / 1fr / 340px`, max-width 1480px центрировано
  - `820–1199px` — 2 колонки `240px / 1fr`, rail скрыт
  - `<820px` — mobile: только main + sticky navbar сверху + bottom tab bar снизу, sidebar в Drawer
- [ ] `widgets/layout/Sidebar.tsx` — brand (28×28 квадрат с буквой) + sections (Встречи / Уведомления / Найти публичные) + filters (Иду / Организую / Прошедшие) с счётчиками + user-pill внизу с DropdownMenu (Профиль / Выйти / Язык / Тема — disabled пока)
- [ ] `widgets/layout/RightRail.tsx` — новый виджет: `<UpNextCard>` + `<MiniCalendar>` + `<StatsCard>`. Данные — из существующих queries (`useEvents`, `useProfileStats`)
- [ ] `widgets/layout/Navbar.tsx` (mobile) — sticky 44px с blur, иконки слева/справа, title по центру
- [ ] `widgets/layout/BottomNav.tsx` — переписать на 3 пункта (Встречи / Уведомления / Профиль), sticky с `env(safe-area-inset-bottom)`
- [ ] `widgets/layout/Toolbar.tsx` (web main) — `<SearchInput>` + filter icon-btn + `<Button>Создать</Button>`
- [ ] Заменить `useColorMode` на `useTheme` (next-themes), но фиксируем light
- [ ] `LanguageToggle` — DropdownMenu item в user-pill (убираем из topbar)
- [ ] `features/notifications/ui/NotificationCenter.tsx` — переезжает в sidebar nav-item «Уведомления» с count-badge, страница `/notifications` с тем же list-стилем

#### Этап 24.3 — Events-list (флагман редизайна)

- [ ] `pages/events-list/index.tsx`:
  - `<Toolbar>` сверху main
  - `<PageHead>` с h1 «Встречи» и подзаголовком «N впереди · одна сегодня»
  - `<SegmentedControl>` табы (Все / Иду / Организую / Архив) + `<ViewToggle>` справа (List / Grid / Calendar — Grid и Calendar заглушками)
  - Группировка событий по `Сегодня / <Месяц>` (через `formatDate` или `date-fns`)
  - Внутри каждой группы — `<ListGroup>` с `<EventListRow>`
- [ ] `widgets/event-card/EventListRow.tsx` — основной row-компонент:
  - 7 grid-колонок: `[accent-bar 4px] [date-cell 64px] [info 1fr] [time 160px] [att 120px] [action 130px] [chev 16px]`
  - Адаптив: `<1100px` скрывает time+att (5 колонок); `<600px` скрывает action (3 колонки)
  - На mobile-роутах рендерится в компактной вёрстке (см. `05-app.html`)
- [ ] `widgets/event-card/index.tsx` (старая Grid-карточка) — удалить или оставить под `view=grid` (тёмная статья — на 24.3 решим, пока удаляем)
- [ ] Empty state — `<EmptyState>` с иконкой `CalendarOff` + текст + primary button
- [ ] Helper `eventAccentColor(event)` (см. 24.1) — переезжает в `entities/event/lib/`

#### Этап 24.4 — Event-detail

Без hero-обложки. На детальной — те же inset-list группы, но богаче. Mobile-first вёрстка с двумя секциями (info + tabs).

- [ ] `pages/event-detail/index.tsx`:
  - На `≥1200px` — двух-колоночный layout: левая sticky панель `320px` (EventInfoPanel + ParticipantsSummary) + правая (tabs)
  - На `<1200px` — single column, info-секция сверху
- [ ] `widgets/event-detail/EventInfoPanel.tsx`:
  - Карточка `<ListGroup>`-style: accent-bar по статусу события + `<DateCell>` большего размера (36px day) + title h2 + meta-grid (location/dress code/organizer)
  - DropdownMenu для организатора (Редактировать / Завершить / Удалить)
- [ ] `widgets/event-detail/ParticipantsSummaryPanel.tsx`:
  - Компактная карточка: счётчики `<StatusPill>` (N подтверждено / M приглашено / K отказались) + `<AvatarStack>` max 8
- [ ] Tabs (Participants/Collections/Polls/Items/Carpools/Links) — `<SegmentedControl>` под info-секцией, контент в `<ListGroup>`
- [ ] Sticky action bar внизу на mobile (Confirm/Decline/Join) — только когда нужен; на desktop — кнопки в info-panel

#### Этап 24.5 — Feature tabs

Все табы — на `<ListGroup>` + `<ListRow>` паттерн, с accent-bar/avatars/action-pill.

- [ ] `features/participants/ui/ParticipantsTab.tsx` — row: avatar + name + status pill + organizer-actions DropdownMenu
- [ ] `features/collections/ui/CollectionsTab.tsx`:
  - Каждый сбор — карточка `<ListGroup>` с заголовком сбора и progress (paid/total)
  - Участники внутри — rows с avatar + name + status (`going` для paid, `invited` для pending, `gray` для not_paid) + action pill
  - Modal `ReceiptUploadModal` → `<Dialog>` из `shared/ui/`
- [ ] `features/polls/ui/PollsTab.tsx` — карточка опроса + варианты как inset-list rows с progress-bar
- [ ] `features/items/ui/ItemsTab.tsx` — list rows: item + assigned avatar + take/leave button
- [ ] `features/carpools/ui/CarpoolTab.tsx` — list rows с driver + departure + seats counter
- [ ] `features/links/ui/LinksTab.tsx` — list rows с favicon (если получим) + title + url + open icon

#### Этап 24.6 — Формы и авторизация

Без декоративных split-screen с градиентами — те же минималистичные карточки на чистом фоне.

- [ ] `pages/event-form/index.tsx`:
  - Центрированная колонка max 720px на desktop, full-width на mobile
  - Поля сгруппированы в `<ListGroup>` секциях: Основное (название, описание, категория) / Когда (даты, время, дресс-код) / Где (location, координаты, кнопка «Определить») / Тип (личная/публичная, max guests)
  - Sticky footer с Cancel / Submit на mobile; на desktop кнопки внизу формы
- [ ] `pages/login`, `pages/register`, `pages/forgot-password`, `pages/reset-password`:
  - Полноэкранный центрированный layout, карточка max 400px
  - Brand-mark сверху (28×28), h2 заголовок, инпуты, primary button full-width, ссылки внизу
  - Без иллюстраций и градиентов — тот же app-look
- [ ] `pages/invite/index.tsx` — карточка с meta события + Join/Decline кнопками, тот же стиль что event-detail info-panel
- [ ] `pages/profile/index.tsx`:
  - Sidebar/rail те же
  - Main: `<PageHead>` + segmented control (Профиль / Статистика / Настройки) + `<ListGroup>` секции
  - Аватар upload — кликабельный avatar + `<input file>`

#### Этап 24.7 — Админка

- [ ] `pages/admin-panel/index.tsx` + `ui/OverviewTab/UsersTab/EventsTab.tsx`:
  - Tabs через `<SegmentedControl>`
  - KPI-плитки = маленькие карточки в grid 3×2, цифра tabular + label uppercase 11px (как `<StatsCard>` из RightRail)
  - Таблицы (TanStack Table) — рестайл под inset-list стиль: header sticky, rows с тонкими разделителями, `hover` token
- [ ] `widgets/admin-kpi-card/`, `widgets/admin-line-chart/` — `recharts` остаётся, цвета — accent + ink-2 (минимально, без градиентов)

#### Этап 24.8 — Уборка

- [ ] Удалить `@chakra-ui/react`, `@emotion/react`, `@emotion/styled`, `react-icons` из `package.json`
- [ ] Удалить `src/app/styles/theme.ts`, `ChakraProvider` из `app/providers/`
- [ ] Удалить `src/App.css` (legacy), почистить `src/index.css`
- [ ] `npm run build` + сравнить bundle size до/после

---

### Reuse: что переезжает как есть

- Все queries/mutations/api-клиент/i18n/router не трогаем — это слой данных
- `formatDate`, `formatTime` из `shared/lib/formatDate` — переиспользуются; добавим хелпер `groupByMonth(events)` для секций
- `useAuth`, `isAdmin`, `apiFetch` — без изменений
- Семантические токены из `app/styles/theme.ts` — **не переносим**: новая палитра другая (см. выше), старые `pageBg`/`cardBg` и т.д. удаляются вместе с Chakra на 24.8

### Drop / не переносим из старого

- `getGradient` логика в `widgets/event-card/index.tsx:30` — **удаляется**, в новом дизайне нет градиент-обложек. Цвет события определяется через `eventAccentColor(event) → 'blue'|'green'|...` для accent-bar (4px), а не для cover
- `useColorMode` + dark-токены `_dark` — **временно отключаем** (Tailwind токены готовы для dark, переключатель добавим позже)
- Hero-card на event-detail, спектр из 8 градиентов, BUSINESS_GRADIENT — **удаляются**

---

### Верификация

После каждого подэтапа:
1. `cd frontend && npm run build` — проверка типов и сборки
2. `npm run dev` + ручная проверка изменённой страницы (light + dark, mobile + desktop)
3. Прогон ключевых flow: создание события, список, открытие детали, переключение табов, открытие модалок (ReceiptUploadModal), формы auth
4. Backend интеграция: `cd backend && go run ./cmd/server`, login → events → detail
5. После 24.8: сравнить bundle (`npm run build`), визуальный smoke-тест всех роутов

---

### Риски и ожидания

- **Bundle**: ожидаем сокращение ~30–40% (Chakra+emotion ≈ 200KB gzipped → Tailwind+Radix ≈ 80–100KB)
- **Toasts**: Chakra `useToast` используется в 7 файлах — sonner-обёртка с тем же API даст миграцию 1:1
- **i18n**: ключи переводов не меняются
- **Тёмная тема**: на этом этапе **только светлая**. Tokens в `@theme` проектируем сразу с dark-вариантами в комментариях, но не активируем — переключение добавим отдельной задачей после стабилизации UI
- **Mini-calendar**: `react-day-picker` может оказаться overkill для 7×6 сетки — на 24.1 оценим, не проще ли написать 50 строк собственного компонента
- **`cmdk` palette**: добавляется новая фича (⌘K-поиск), которой не было раньше — это улучшение, но потенциальный scope creep. Если затягивает 24.2, выносим в отдельный пост-этап 24.9
- **Тестирование**: автоматических UI-тестов нет, валидируем глазами и `npm run build`. Эталон — `design/05-app-web.html` и `design/05-app.html`

---

## Этап 25 — PWA (устанавливаемое приложение + офлайн)

### Контекст

Приложение Bimeet (Vite 8 + React 19 + Tailwind 4 + Radix) нужно сделать
**устанавливаемым** на домашний экран (desktop + mobile) с офлайн-фоллбэком и
корректным обновлением версий. Сейчас PWA нет: ни manifest, ни service worker.
Backend и слой данных (queries/api-клиент) не меняются.

**Выбранный объём:**
- Offline scope: **installable + app shell** — прекэш статики (JS/CSS/иконки/шрифты)
  и офлайн-фоллбэк страницы; запросы к `/api` всегда идут в сеть и **не кэшируются**
  (безопасно для приложения с JWT в localStorage).
- Update UX: **тост `sonner` с кнопкой «Обновить»** (`registerType: 'prompt'`).
  `sonner` уже подключён в `app/providers/index.tsx`.

---

### Подход: `vite-plugin-pwa` + `workbox-window`

Идиоматичный для Vite путь (на базе Workbox): генерирует manifest, service worker,
precache-манифест. Регистрация SW и тост обновления сделаны вручную через
`workbox-window` (см. «Отклонение от плана» ниже).

Конфиг `VitePWA` (в `vite.config.ts`, рядом с `react()` + `tailwindcss()`):
- `registerType: 'prompt'`, `injectRegister: false`
- `manifest`: name/short_name `Bimeet`, `theme_color: '#0a0a0b'`,
  `background_color: '#0a0a0b'`, `display: 'standalone'`, `start_url: '/'`,
  иконки 192 / 512 / 512-maskable
- `workbox`: `globPatterns: ['**/*.{js,css,html,svg,woff2}']`,
  `navigateFallback: '/index.html'`, `navigateFallbackDenylist: [/^\/api\//]`
  (без `runtimeCaching` — `/api` не кэшируется)

---

### Файлы

| Файл | Изменение |
|---|---|
| `frontend/package.json` | + `vite-plugin-pwa`, `workbox-window` (devDep) |
| `frontend/vite.config.ts` | подключить `VitePWA(...)`, `injectRegister: false` |
| `frontend/index.html` | мета `theme-color` (#0a0a0b), `apple-touch-icon`, `apple-mobile-web-app-*` |
| `frontend/public/pwa-192.png`, `pwa-512.png`, `pwa-512-maskable.png`, `apple-touch-icon.png` | новые иконки: чёрный фон `#0a0a0b` + белая «B» (как `favicon.svg`) |
| `frontend/src/shared/pwa/PWAUpdater.tsx` | тост обновления через `workbox-window` + `sonner` |
| `frontend/src/app/providers/index.tsx` | смонтировать `<PWAUpdater/>` (глобально) |
| `frontend/src/shared/i18n/locales/ru.json`, `en.json` | секция `pwa` (тексты тостов) |
| `frontend/nginx.conf` | `Cache-Control: no-cache` для `sw.js` и `manifest.webmanifest` |

**Не меняется:** backend, queries/mutations/api-клиент, router, entities, страницы.

> **Отклонение от плана.** Виртуальный модуль `virtual:pwa-register/react` не
> использовался: SW регистрируется вручную через `workbox-window`
> (`new Workbox('/sw.js')` + события `waiting`/`installed`/`controlling`), а у
> плагина выставлен `injectRegister: false`, чтобы не было двойной регистрации.
> Сгенерированный `sw.js` слушает `SKIP_WAITING` — кнопка «Обновить» вызывает
> `wb.messageSkipWaiting()` → `controlling` → `location.reload()`.
> `<PWAUpdater/>` смонтирован глобально в `providers`; отдельный `<Toaster/>`
> не добавлялся — он уже есть в `features/auth/ui/AuthShell` и `widgets/layout`,
> так что тосты обновления отображаются на всех роутах. `tsconfig.app.json` не
> менялся: типы берутся из `workbox-window`.
> Иконка и splash сделаны на **чёрном фоне** `#0a0a0b` (как `favicon.svg`),
> поэтому `theme_color`/`background_color` в манифесте тоже `#0a0a0b`.

---

### Чеклист реализации

- [x] `vite-plugin-pwa` + `workbox-window` установлены (devDep)
- [x] Подключить `VitePWA` в `vite.config.ts` (manifest + workbox, `/api` в denylist, `injectRegister: false`)
- [x] Сгенерировать иконки 192 / 512 / 512-maskable + apple-touch-icon (180×180), чёрный фон
- [x] Мета-теги iOS / theme-color в `index.html`
- [x] `shared/pwa/PWAUpdater.tsx` (workbox-window) + монтаж в `app/providers/index.tsx`
- [x] Секция `pwa` в `ru.json` и `en.json`
- [x] `no-cache` для `sw.js` / manifest в `nginx.conf`
- [x] `npm run build` (exit 0); в `dist/` — `sw.js` (со `SKIP_WAITING`), `manifest.webmanifest`, `workbox-*.js`, иконки, `<link rel="manifest">` в `index.html`
- [ ] Ручная проверка: Lighthouse PWA «installable», установка на desktop/mobile (за пользователем)

---

### Верификация

1. `cd frontend && npm run build` — типы и сборка проходят; в `dist/` появились
   `sw.js`, `manifest.webmanifest`, `workbox-*.js`, иконки.
2. `npm run preview` → DevTools → Application: manifest валиден, SW `activated`,
   иконки подхвачены; Lighthouse → PWA «installable».
3. Кнопка установки в браузере (desktop) и «Добавить на экран» (mobile).
4. Авторизация и `/api`-запросы работают как раньше (не перехватываются кэшем).
5. Обновление: пересобрать → перезагрузить preview → тост «Обновить» → клик применяет новую версию.
6. Офлайн-фоллбэк: DevTools Offline — открытые статические роуты грузятся из кэша.

> Возможное продолжение (вне текущего объёма): NetworkFirst-кэш для GET `/api/events`
> и подобных, чтобы недавно открытые встречи читались офлайн.

---

## Этап 26 — Багфиксы: авторизация и мобильный выход

Точечные фиксы двух багов, обнаруженных в проде.

### Баг 1 — истёкшая авторизация не редиректит на логин

**Проблема.** `AuthProvider` при старте слепо доверял `localStorage` (`token` + `user`)
и не валидировал токен. `ProtectedRoute` пускал пользователя дальше, пока в storage
лежит `user`. Когда токен протухал на бэке, API отвечал `401`, но `apiFetch` просто
кидал обычную `Error` — запросы тихо падали, страница рисовалась пустой, пользователь
оказывался «залогинен в никуда» без редиректа.

**Решение.** Глобальный 401-интерсептор в SPA-стиле, без хард-релоада:

- `shared/api/client.ts` — в `apiFetch` при `res.status === 401 && token` (т.е. токен
  был, но отклонён) чистим `localStorage` (`token` + `user`) и эмитим DOM-событие
  `window.dispatchEvent(new Event('auth:unauthorized'))`. Условие `token` важно:
  запросы `login`/`register`/`forgot`/`reset` идут без токена, их `401` (неверный
  пароль) не вызывает сброс/редирект.
- `features/auth/model/AuthContext.tsx` — `useEffect` слушает `auth:unauthorized`
  и обнуляет сессию (`setToken(null)`, `setUser(null)` + очистка storage). После
  `setUser(null)` `ProtectedRoute` сам рендерит `<Navigate to="/login" replace />`
  (своего `useNavigate` тут нет — `AuthProvider` выше `BrowserRouter`).
- `features/auth/api/index.ts` — такой же блок в `uploadAvatar` (он использует «сырой»
  `fetch` мимо `apiFetch`), для единообразия.

Случай «нет токена» и до этого закрывался `ProtectedRoute`; теперь закрыт и случай
«токен протух». Публичные роуты (`/login`, `/register`, `/forgot-password`,
`/reset-password`) остаются доступны неавторизованному пользователю.

### Баг 2 — в мобильной версии нет кнопки «Выход»

**Проблема.** Logout жил только в дропдауне `Sidebar` (десктоп, `lg:` и выше).
В мобильной нижней навигации (`BottomNav`) его не было — выйти было нельзя.

**Решение.** `pages/profile/index.tsx` — в левой карточке профиля под мета-блоком
добавлена destructive-кнопка «Выход» (`logout()` + `navigate('/login')`, иконка
`LogOut`, ключ `common.logout`). Класс `lg:hidden` — кнопка видна только в
мобильной/планшетной версии, на десктопе выход остаётся в сайдбаре.

### Файлы

- `frontend/src/shared/api/client.ts`
- `frontend/src/features/auth/model/AuthContext.tsx`
- `frontend/src/features/auth/api/index.ts`
- `frontend/src/pages/profile/index.tsx`

### Верификация

1. `cd frontend && npm run build` + `npm run lint` — без ошибок.
2. Залогиниться → испортить `localStorage.token` → действие с API → редирект на
   `/login`, storage очищен.
3. Неверный пароль на `/login` не вызывает редирект-петлю (запрос без токена).
4. Неавторизованный заход на `/events`, `/profile`, `/events/:id` → редирект на
   `/login`; `/register`, `/forgot-password`, `/reset-password` доступны.
5. Мобильный вьюпорт (≤ `lg`) → `/profile` → кнопка «Выход» разлогинивает и ведёт
   на `/login`; на десктопе кнопки на профиле нет.

---

## Этап 27 — Push-уведомления (Web Push)

> **Статус:** реализовано. Остаётся только сгенерировать VAPID-ключи
> (`cd backend && go run ./cmd/genvapid`) и прописать их в env (бэк:
> `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`; фронт опц.: `VITE_VAPID_PUBLIC_KEY`).

### Context

Уведомления (`model.Notification`) сейчас только **поллятся** фронтом
(`entities/notification/queries` → `useNotifications`) и видны лишь при открытом
приложении. PWA (Этап 25) устанавливается, но не будит пользователя при закрытой
вкладке. Нужны **web push**: приглашения на встречу, напоминания за 3 дня / 1 день,
новые сборы и т.п. должны приходить на устройство даже когда приложение закрыто.

**Ключевая точка интеграции:** все in-app уведомления создаются в одном месте —
`notificationRepo.Create(ctx, userID, *eventID, type, message)`
(`repository/notification/repository.go`). Её зовут сервисы `event`, `collection`
и фоновый `reminder.Runner`. Оборачиваем этот репозиторий декоратором, который
после записи рассылает web push — и push появляется во всех сценариях без правки
самих сервисов.

### Стек и платформы

**Стандарт:** Web Push API + VAPID. Единственный кросс-браузерный механизм для PWA
(браузеры сами проксируют через свои push-сервисы, FCM напрямую не нужен).

**Доставка при закрытом приложении.** Главное требование — пуш должен прилетать,
даже когда приложение полностью закрыто. Web Push именно это и делает: push-сервис
браузера (Google FCM endpoint для Chrome, Mozilla autopush, Apple для Safari)
**будит service worker** в фоне, тот в `push`-обработчике вызывает
`showNotification` — и системное уведомление появляется без открытой вкладки.

**Почему не Firebase (FCM).** Пользователь предлагал Firebase, но для PWA это не
даёт ничего сверх Web Push: FCM web SDK работает **поверх того же стандарта
Web Push** и тех же service worker'ов, а ограничение iOS (только установленная на
«Домой» PWA, см. ниже) Firebase не снимает. Поэтому берём чистый VAPID —
self-hosted, без зависимости от Google/Firebase, меньше кода и конфигурации.

Поддержка (определяет UX-гейтинг кнопки «Включить уведомления»):
- **Chrome / Edge / Firefox** (desktop + Android) — работает в браузере и в
  установленной PWA. `userVisibleOnly: true` обязателен.
- **iOS / iPadOS Safari 16.4+** — push **работает**, но **только для PWA,
  добавленной на экран «Домой»** (standalone); в обычной вкладке Safari пушей нет.
  Путь пользователя: «Поделиться» → «На экран Домой» → открыть PWA → нажать
  «Включить уведомления» (разрешение запрашивается строго из жеста) → дальше пуши
  приходят как обычные системные уведомления iOS, в т.ч. при закрытом приложении.
- **macOS Safari 16+** — поддерживается.
- Гейтинг: проверяем `'Notification' in window`, `'PushManager' in window` и
  `display-mode: standalone`; на iOS вне standalone — подсказка «добавьте на
  экран Домой».

Библиотеки: backend — `github.com/SherClockHolmes/webpush-go` (VAPID + отправка);
frontend — нативные `PushManager` / `Notification`; SW — переход vite-plugin-pwa
со `generateSW` на `injectManifest` (свой `src/sw.ts` с обработчиками `push` /
`notificationclick`, с сохранением precache + `SKIP_WAITING`).

### Backend

1. **VAPID-ключи** в env (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
   `VAPID_SUBJECT=mailto:...`), сгенерированы один раз. Добавить в `.env.example`,
   `internal/config`, секреты CI/CD (Этап 16). Публичный ключ — фронту
   (через эндпоинт или `VITE_VAPID_PUBLIC_KEY`).
2. **Миграция `013_push_subscriptions`**: таблица `push_subscriptions`
   (`id`, `user_id` FK ON DELETE CASCADE, `endpoint` UNIQUE, `p256dh`, `auth`,
   `user_agent`, `created_at`) + индекс по `user_id`; `.down.sql`. Тип
   `PushSubscription` в `model.go`.
3. **Репозиторий `repository/pushsub`**: `Upsert` (по уникальному `endpoint`),
   `ListByUser`, `DeleteByEndpoint`.
4. **Сервис `service/push`**: `Subscribe` / `Unsubscribe`;
   `SendToUser(ctx, userID, payload)` — берёт подписки юзера, шлёт через
   `webpush.SendNotification`; на `404/410` удаляет мёртвую подписку. Отправка в
   goroutine, ошибки в лог (как в `reminder.sendToAll`). `payload` = JSON
   `{ title, body, url, tag }`; `url` — по `eventID`/типу (логика как в
   `entities/notification/lib/href.ts`).
5. **Декоратор `NotifyingNotificationRepo`** вокруг `notificationRepo` (тот же
   интерфейс `Create`): после успешной записи `go push.SendToUser(...)`. В
   `cmd/server/main.go` оборачиваем repo один раз и отдаём в `eventSvc`,
   `collectionSvc`, `reminderRunner`. Правок в сервисах не требуется.
6. **Хендлер `handler/push` + роуты** (под auth-middleware):
   `GET /api/push/vapid-public-key`, `POST /api/push/subscribe`,
   `POST /api/push/unsubscribe`.

### Frontend

1. **SW → `injectManifest`** (`vite.config.ts`: `strategies: 'injectManifest'`,
   `srcDir: 'src'`, `filename: 'sw.ts'`). Новый `src/sw.ts`:
   - `precacheAndRoute(self.__WB_MANIFEST)` — офлайн сохраняем;
   - `message` → `SKIP_WAITING` (поведение `PWAUpdater` сохранить);
   - `push` → `showNotification(title, { body, data:{url}, icon, badge, tag })`;
   - `notificationclick` → фокус существующей вкладки или `clients.openWindow(url)`.
2. **Модуль `shared/push/`**: `subscribe()` — `Notification.requestPermission()`
   (из жеста) → `reg.pushManager.subscribe({ userVisibleOnly: true,
   applicationServerKey })` → `POST /api/push/subscribe`; `unsubscribe()` —
   `sub.unsubscribe()` + `POST /api/push/unsubscribe`. Гейтинг платформ.
3. **UI opt-in в профиле** (`pages/profile/index.tsx`): кнопка/тоггл «Уведомления
   на устройстве» (включить / включены / недоступно + iOS-подсказка), запрос
   разрешения по клику.
4. **Отписка при logout** — встроить `unsubscribe()` в `AuthContext.logout()` /
   `Sidebar.handleLogout` / профильный `handleLogout`.
5. **i18n** — ключи `push.*` в `shared/i18n/{ru,en}.json`.

### Файлы

Backend: `db/migrations/013_push_subscriptions.{up,down}.sql`, `model/model.go`,
`repository/pushsub/`, `service/push/`, `handler/push/`, декоратор
`repository/notification`, `cmd/server/main.go`, `internal/config`, `.env.example`,
`go.mod`/`go.sum`.
Frontend: `vite.config.ts`, `src/sw.ts` (новый), `shared/push/`,
`pages/profile/index.tsx`, `features/auth/model/AuthContext.tsx`,
`shared/i18n/{ru,en}.json`, `VITE_VAPID_PUBLIC_KEY`.

### Риски

- iOS: push только в установленной PWA (16.4+) и только из жеста — UI обязан это
  отражать.
- Декоратор должен совпасть по интерфейсу со всеми потребителями
  (`service/*/interfaces.go`, `reminder/interfaces.go`).
- VAPID-ключи — секреты, не коммитить; прокинуть через CI/CD и docker env.
- `injectManifest` меняет генерацию SW — проверить, что офлайн-precache и кнопка
  «Обновить» (Этап 25) не сломались.
- Мёртвые подписки (`410 Gone`) чистить, иначе таблица копит мусор.

### Верификация (будущей реализации)

1. `cd backend && go vet ./...` + `go build ./cmd/server`; `cd frontend &&
   npm run build` — без ошибок; в `dist/` есть `sw.js` с `push`-обработчиком.
2. Подписка: в установленной PWA нажать «Включить уведомления» → запись в
   `push_subscriptions`.
3. Триггер уведомления (приглашение / напоминание) → приходит system-push при
   закрытом приложении; клик открывает нужную встречу.
4. Logout → подписка удалена (на устройстве и в БД).
5. Мёртвый endpoint (отписка в браузере) → при следующей отправке `410` → запись
   удалена.
6. iOS вне standalone → кнопка показывает подсказку про установку, подписка не
   создаётся.

---

## Этап 28 — Бейдж уведомлений на иконке PWA (Badging API)

> **Статус:** реализовано. Бэкенд (`go build ./...`) и фронтенд (`npm run build`)
> собираются; в `dist/sw.js` присутствует `setAppBadge`. Ручная проверка бейджа
> на установленной PWA — за пользователем.

### Контекст

Установленная PWA (Этап 25) с web push (Этап 27) показывает системные
уведомления, но на иконке приложения нет счётчика непрочитанных. Нужен
нативный бейдж с числом непрочитанных уведомлений — как у почты/мессенджеров.

### Подход: Badging API

`navigator.setAppBadge(count)` / `navigator.clearAppBadge()` — стандартный API
для числового бейджа на иконке установленной PWA. Доступен и в window, и в SW
(`self.navigator.setAppBadge`). Feature-detection: `'setAppBadge' in navigator`;
вне поддержки — тихий no-op (try/catch).

Поддержка: Chrome/Edge (desktop + Android), macOS Safari, iOS/iPadOS Safari
16.4+ — те же платформенные ограничения, что у push (на iOS только в PWA,
установленной на «Домой»).

Бейдж всегда отражает число непрочитанных и синхронизируется из двух источников:

- **Foreground (приложение открыто).** Хук читает `useNotifications()` и в
  эффекте зовёт `setAppBadge(unread)` / `clearAppBadge()` при 0. Срабатывает
  после mark-read мутаций (инвалидация → refetch → эффект) и при возврате
  фокуса на вкладку (`visibilitychange`). `unread` считается так же, как в
  `NotificationCenter`: `notifications.filter(n => !n.is_read).length`.
- **Background (приложение закрыто).** Бэкенд кладёт в push-payload `badge`
  (число непрочитанных юзера на момент отправки); SW в обработчике `push`
  зовёт `self.navigator.setAppBadge(data.badge)`.

При logout бейдж очищается (`clearAppBadge()`).

### Backend

- `repository/notification`: новый метод `CountUnread(ctx, userID) (int, error)`
  (`SELECT count(*) ... WHERE user_id=$1 AND is_read=false`).
- `service/push`: в тип `payload` добавить `Badge int `json:"badge"``;
  `SendToUser(...)` принимает `badge int` и прокидывает в payload.
- Декоратор `NotifyingNotificationRepo`: после успешного `Create` посчитать
  `CountUnread(userID)` и передать в `SendToUser(..., badge)`. Правок в самих
  сервисах (`event`/`collection`/`reminder`) не требуется.

### Frontend

- `shared/badge/index.ts` (новый): `isBadgeSupported()`, `setBadge(count)`,
  `clearBadge()` — обёртки с feature-detection и try/catch.
- `features/notifications/ui/AppBadgeSync.tsx` (новый): компонент без UI —
  `useNotifications()` + эффект (`setBadge(unread)`/`clearBadge()`) +
  слушатель `visibilitychange` (refetch при возврате фокуса). TanStack Query
  дедуплицирует запрос по ключу — лишнего поллинга нет.
- `app/providers/index.tsx`: смонтировать `<AppBadgeSync/>` глобально (рядом с
  `<PWAUpdater/>`), чтобы синк работал на всех роутах.
- `src/sw.ts`: в `PushPayload` добавить `badge?: number`; в обработчике `push`
  после `showNotification` — `if ('setAppBadge' in self.navigator) ...setAppBadge(data.badge)`.
- Logout: вызвать `clearBadge()` в `AuthContext.logout()` (рядом с
  `disablePush()`/отпиской из Этапа 27).
- i18n: новых пользовательских строк не требуется (бейдж — системный).

### Файлы

Backend: `repository/notification/repository.go`,
`service/push/service.go`, декоратор `repository/notification` (Notifying-обёртка).
Frontend: `shared/badge/index.ts` (новый),
`features/notifications/ui/AppBadgeSync.tsx` (новый),
`app/providers/index.tsx`, `src/sw.ts`,
`features/auth/model/AuthContext.tsx`.

### Риски

- iOS: бейдж только в установленной PWA (16.4+); вне standalone — no-op.
- `badge` в payload отражает счётчик на момент отправки; реальную коррекцию
  даёт foreground-синк при следующем открытии — это нормально и ожидаемо.
- Если пользователь отключил уведомления, push не приходит → background-бейдж
  не обновляется; foreground-синк остаётся источником истины.

### Верификация

1. `cd backend && go vet ./... && go build ./cmd/server`;
   `cd frontend && npm run build && npm run lint` — без ошибок; в `dist/sw.js`
   есть `setAppBadge` в `push`-обработчике.
2. Установленная PWA, есть непрочитанные → на иконке число; «прочитать все» →
   бейдж исчезает (foreground-синк).
3. Закрыть PWA → триггер уведомления → системный push приходит и бейдж на
   иконке обновляется (background-синк из payload).
4. Возврат на вкладку после чтения с другого устройства → `visibilitychange`
   → refetch → бейдж скорректирован.
5. Logout → бейдж очищен.
6. Браузер без поддержки Badging API / iOS вне standalone → ошибок нет (no-op).

---

## Этап 29 — Безопасность бэкенда (CORS, rate limiting, защита)

### Контекст

Бэкенд имел минимум защит: CORS открыт на `*`, нет rate limiting (брутфорс `/login`,
`/register`, `/forgot-password`), нет recovery от паник (паника рвала соединение),
нет защитных заголовков, нет лимита размера тела запроса, за nginx терялся реальный IP
клиента. Этап закрывает эти дыры. Что уже было сделано хорошо и не менялось: JWT с
проверкой HMAC-алгоритма (блокирует `alg=none`), bcrypt, generic-ошибки авторизации.

Решения: переключатель `APP_ENV` (dev/prod), rate limiting на `go-chi/httprate`.

### Конфигурация

- `APP_ENV` (`development` | `production`, дефолт `development`):
  - prod → строгий CORS из `CORS_ALLOWED_ORIGINS`, включён HSTS;
  - dev → CORS пермиссивный (`*`), HSTS выключен.
- `CORS_ALLOWED_ORIGINS` — список доменов через запятую (например `https://app.bimeet.app`).

### Глобальный middleware-стек (router.go)

`RequestID → RealIP → Logging → Recoverer → SecurityHeaders → CORS → RateLimitGlobal`

> RealIP доверяет `X-Forwarded-For` — корректно только за доверенным прокси (nginx).
> Бэкенд не должен быть напрямую доступен из интернета, иначе rate limit обходится спуфингом IP.

### Защиты

| Защита | Реализация |
|---|---|
| CORS lockdown | `middleware/cors.go`: origins из env, dev-фолбэк `*`, credentials off |
| Rate limiting | `go-chi/httprate`: глобально ~300/мин per-IP; auth-ручки ~10/мин per-IP+endpoint; 429 JSON |
| Security headers | `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `CSP default-src 'none'`, HSTS (prod) |
| Panic recovery | `chi/middleware.Recoverer` → 500 вместо разрыва соединения |
| RealIP | `chi/middleware.RealIP` — реальный IP клиента за nginx для логов и лимитов |
| Лимит тела | `http.MaxBytesReader` (1 МБ) в `response.ParseJSON` |
| Валидация входа | `Register`: формат email (`net/mail`) + минимальная длина пароля |
| Server timeouts | `ReadHeaderTimeout` (Slowloris) + `MaxHeaderBytes` |

### Чеклист

- [x] `go get github.com/go-chi/httprate`
- [x] `config.go`: `APP_ENV`, `CORS_ALLOWED_ORIGINS`, `IsProduction()`
- [x] `middleware/cors.go`: env-driven origins + dev-фолбэк
- [x] `middleware/security_headers.go`: заголовки + HSTS в prod
- [x] `middleware/ratelimit.go`: global + auth limiters, JSON-429
- [x] `response.go`: `MaxBytesReader` в `ParseJSON`
- [x] `router.go`: новый стек middleware + rate limit на auth-группе
- [x] `main.go`: проброс CORS/env, `ReadHeaderTimeout`, `MaxHeaderBytes`
- [x] `auth/service.go`: валидация email + длины пароля в `Register`
- [x] `.env.example`: `APP_ENV`, пример `CORS_ALLOWED_ORIGINS`
- [x] Unit-тесты: security headers, CORS, rate limit 429, body limit, recoverer

---

## Этап 30 — Observability бэкенда (slog + OpenTelemetry трейсы)

### Контекст

Бэкенд логировал через голый `log.Printf` без уровней, структуры и корреляции
(~30 разрозненных call-site'ов в `service/*`, `handler/*`, `reminder`, `db`,
`middleware/logging.go`). `chi` RequestID был подключён в `router.go`, но в логи
не попадал — связать строки одного запроса нечем. Трейсинга и инструментации БД
не было: нельзя проследить путь запроса handler→service→repo→pg и найти узкое
место. Паники ловил `chi.Recoverer`, но писал в свой логгер, без структурного
stack и без trace_id.

Этап вводит структурированное логирование (`log/slog`) и распределённый трейсинг
(OpenTelemetry) с единым `trace_id`, связывающим строки логов с waterfall'ом в
Jaeger. Скоуп — только Go-бэкенд (фронтенд — отдельным этапом позже). Без Sentry:
ошибки и паники идут в структурированные логи с trace_id.

### Конфигурация (`config.go` + `.env.example`)

| Переменная | Назначение | Дефолт |
|---|---|---|
| `LOG_LEVEL` | `debug`/`info`/`warn`/`error` | `info` |
| `LOG_FORMAT` | `json`/`text`; пусто → `json` в prod, `text` в dev | (по `APP_ENV`) |
| `OTEL_ENABLED` | включить трейсинг | `false` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | коллектор, напр. `localhost:4318` | — |
| `OTEL_SERVICE_NAME` | имя сервиса | `bimeet-backend` |

> SDK OpenTelemetry сам читает стандартные `OTEL_*` env, поэтому конфиг тонкий:
> `OTEL_ENABLED` — единственный кастомный флаг; остальное прокидывается в SDK.
> Без `OTEL_ENABLED=true` трейсинг — no-op (NoopTracerProvider), нулевой оверхед.

### Решения

| Задача | Реализация |
|---|---|
| Структурный логгер | `internal/observability/log.go`: `slog` с JSON/Text handler по `LOG_FORMAT`+`LOG_LEVEL`, `slog.SetDefault` |
| Логгер из контекста | `obs.FromContext(ctx) *slog.Logger` / `obs.WithLogger(ctx, l)` — логгер с привязанными `trace_id`,`span_id`,`request_id`,`user_id` |
| Инициализация трейсера | `internal/observability/tracing.go`: `Init(ctx, cfg) (shutdown func(context.Context) error, error)` — `TracerProvider` с OTLP-экспортёром, resource (`service.name`/`version`/`deployment.environment=APP_ENV`), `W3C TraceContext`+`Baggage` пропагаторы |
| HTTP-спаны | `github.com/riandyrn/otelchi` middleware — спан на каждый запрос с именем по chi-роуту (`POST /api/events/{id}`) |
| БД-спаны | `github.com/exaring/otelpgx`: `pgxpool.ParseConfig` → `cfg.ConnConfig.Tracer = otelpgx.NewTracer()` → `pgxpool.NewWithConfig`; каждый SQL — дочерний спан |
| Спаны сервис-слоя | хелпер `obs.Span(ctx, name)`; обернуть ключевые методы (`EventService.Create`, `CollectionService.SubmitContribution` и др.) для промежуточного уровня в waterfall |
| Корреляция логов↔трейсов | middleware `Observability`: после старта спана достаёт `trace_id`/`span_id` из `trace.SpanContextFromContext`, кладёт обогащённый `slog.Logger` в контекст; на ответ — заголовок `X-Trace-Id` |
| Request-лог | переписать `middleware/logging.go` на `slog`: `method`,`route`,`status`,`dur_ms`,`bytes`,`remote_ip`,`trace_id`,`user_id` одной структурной строкой по завершении запроса |
| Recovery паник | свой recover-middleware вместо `chi.Recoverer`: `slog.Error` со `stack`, `trace_id`, помечает спан `span.RecordError`+`StatusError`, отдаёт 500 JSON |
| Миграция call-site'ов | заменить `log.Printf`→`obs.FromContext(ctx)` в request-scoped местах (`service/*`, `handler/*`); фоновые (`db`, `reminder`, `main`) — на пакетный `slog` |
| Локальный Jaeger | `docker run jaegertracing/all-in-one` (OTLP `4317/4318`, UI `16686`); опц. сервис `jaeger` в `docker-compose.prod.yml` |
| Web-UI для логов | **Grafana + Loki** рядом с Jaeger (см. раздел ниже) — логи смотреть/фильтровать в браузере, а не grep |

### Поток одного запроса

```
RequestID → RealIP → otelchi(span) → Observability(logger+trace_id в ctx)
  → Recover → SecurityHeaders → CORS → RateLimit → Auth(user_id в ctx) → handler
handler/service зовут obs.FromContext(ctx).Info(...) → строка с trace_id
otelpgx добавляет pg-спаны под спаном запроса
→ Jaeger показывает waterfall, логи грепаются по тому же trace_id
```

### Где смотреть (UI)

| Что | Интерфейс | Адрес (локально) |
|---|---|---|
| Трейсы (waterfall) | Jaeger UI | `http://localhost:16686` |
| Логи (поиск/фильтр) | Grafana → Loki | `http://localhost:3000` |

Два UI — связь между ними вручную по общему `trace_id` (из ответа `X-Trace-Id`):
в Grafana нашёл строку лога → скопировал `trace_id` → открыл трейс в Jaeger.

**Сбор логов в Loki.** Бэкенд по-прежнему пишет структурный JSON в stdout —
менять код приложения не нужно. Логи в Loki доставляет **Promtail** (или
`loki` docker-driver), который читает stdout контейнера. Promtail парсит JSON и
поднимает `trace_id`,`level`,`user_id`,`route` в метки/поля Loki — по ним идёт
фильтрация в Grafana (`{service="bimeet-backend"} | json | trace_id="..."`).

> Loki и Promtail работают с теми же stdout-логами, что и `docker logs` — это
> просто веб-надстройка поверх них. Локальная разработка без Loki не ломается:
> `slog` всё так же пишет в терминал, стек логов опционален.

### Стек логов (docker-compose)

Добавить рядом с `jaeger` (всё опционально, профиль `observability`):

| Сервис | Образ | Назначение | Порт |
|---|---|---|---|
| `loki` | `grafana/loki` | хранилище логов + запросы (LogQL) | `3100` |
| `promtail` | `grafana/promtail` | читает stdout контейнеров → шлёт в Loki | — |
| `grafana` | `grafana/grafana` | UI: датасорсы Loki + Jaeger, дашборды | `3000` |

Конфиги (provisioning, всё в репозиторий, чтобы поднималось из коробки):
- `deploy/observability/promtail.yml` — scrape docker stdout + JSON-pipeline
  (`trace_id`,`level`,`route`,`user_id` в labels).
- `deploy/observability/grafana-datasources.yml` — Loki (`http://loki:3100`) и
  Jaeger (`http://jaeger:16686`) как provisioned datasources.

### Доступ к логам в проде

Прод — один хост с `docker-compose.prod.yml` за Traefik; бэкенд крутится
контейнером `backend`. Два уровня доступа:

**1. Baseline — `docker logs` (всегда доступен, даже если Loki лежит).**
Логи — структурный JSON в stdout, читаются через `jq`:
```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose logs backend | jq 'select(.level=="ERROR")'
docker compose logs backend | jq 'select(.trace_id=="<из X-Trace-Id>")'
```
> ⚠️ Сейчас в `docker-compose.prod.yml` **не задан logging-драйвер** → дефолтный
> `json-file` без ротации забьёт диск. Закрыть в этом этапе: на `backend` (и
> прочих сервисах) добавить
> `logging: { driver: json-file, options: { max-size: "10m", max-file: "5" } }`.

**2. Grafana + Loki — история и поиск через браузер.** Promtail собирает stdout
в Loki с ретеншеном. Grafana в проде **не светить публично** (чувствительные
данные). Доступ — один из:
- **SSH-туннель** (дефолт, безопаснее): порт `3000` наружу не проброшен,
  `ssh -L 3000:localhost:3000 user@host` → `http://localhost:3000` локально.
- **Traefik-роут за basic-auth**: `logs.bimeet.pro` с `basicauth`-middleware
  (по аналогии с `s3.bimeet.pro`), порт `3000` только во внутренней `app-net`.

Рекомендация: оба уровня — json-file с ротацией как fallback + Loki/Grafana для
истории; доступ к Grafana через SSH-туннель.

### Файлы

Новые: `internal/observability/log.go`, `internal/observability/tracing.go`,
`internal/middleware/observability.go`, `internal/middleware/recover.go`.

| Файл | Изменение |
|---|---|
| `internal/config/config.go` | `LOG_LEVEL`,`LOG_FORMAT`,`OTEL_ENABLED` в `Config`+`Load` |
| `.env.example` | блок observability-переменных |
| `internal/db/db.go` | `ParseConfig`+`otelpgx.NewTracer()`+`NewWithConfig` (сохранить DSN-опции) |
| `internal/handler/router.go` | вставить `otelchi` + `Observability` + новый recover в стек |
| `cmd/server/main.go` | `obs.Init`, `defer shutdown`, миграция стартовых `log.*` |
| `internal/middleware/logging.go` | переписать на структурный slog |
| `internal/reminder/runner.go`, `service/*`, `handler/*` | request-scoped `log.Printf` → `obs.FromContext(ctx)` |
| `docker-compose.prod.yml` | `logging` json-file + ротация (`max-size`/`max-file`) на `backend` и др.; опц. сервисы `jaeger`/`loki`/`promtail`/`grafana` (профиль `observability`); опц. Traefik-роут `logs.bimeet.pro` за basic-auth |
| `deploy/observability/promtail.yml` (новый) | scrape docker stdout + JSON-pipeline (метки `trace_id`/`level`/`route`/`user_id`) |
| `deploy/observability/grafana-datasources.yml` (новый) | provisioned datasources: Loki + Jaeger |

### Риски

- otelpgx требует перейти с `pgxpool.New` на `ParseConfig`+`NewWithConfig` —
  следить, чтобы DSN-опции (`sslmode` и пр.) сохранились.
- `chi.RealIP` стоит до Observability — `remote_ip` в логах берётся уже
  распарсенный; не доверять `X-Forwarded-For` вне прокси (как в Этапе 29).
- Спаны сервис-слоя добавляются вручную — начать с нескольких репрезентативных
  методов, не инструментировать всё разом.
- `OTEL_ENABLED=false` обязан быть полным no-op (NoopTracerProvider), чтобы
  локальная разработка без Jaeger не ломалась и не теряла перфоманс.

### Чеклист

- [x] `go get`: `go.opentelemetry.io/otel`, `otel/sdk`,
      `otel/exporters/otlp/otlptrace/otlptracehttp`, `riandyrn/otelchi`,
      `exaring/otelpgx`
- [x] `internal/observability/log.go` — slog-логгер + `FromContext`/`WithLogger`/`Span`
- [x] `internal/observability/tracing.go` — `InitTracing()` + graceful `shutdown`
- [x] `config.go`/`.env.example` — `LOG_LEVEL`,`LOG_FORMAT`,`OTEL_*`
- [x] `db/db.go` — `ParseConfig`+`otelpgx.NewTracer()`+`NewWithConfig`
- [x] `middleware/observability.go` — корреляция logger↔span (+ `X-Trace-Id` пишет otelchi)
- [x] `middleware/logging.go` — переписать на структурный slog
- [x] `middleware/recover.go` — slog + RecordError (заменить `chi.Recoverer`)
- [x] `router.go` — новый стек middleware (otelchi → Observability → Logging → Recoverer)
- [x] `main.go` — `obs.Init`, `defer shutdown`, миграция стартовых `log.*`
- [x] миграция request-scoped `log.Printf` → `obs.FromContext(ctx)`
- [x] обернуть ключевые сервис-методы в `obs.Span` (`EventService.Create`, `reminder.run`)
- [x] юнит-тесты: handler пишет `X-Trace-Id`; recover→500+лог; FromContext-фолбэк; request-лог
- [x] `docker-compose.prod.yml` — `logging` json-file + ротация (anchor на всех сервисах)
- [x] `docker-compose.prod.yml` — сервисы `jaeger`/`loki`/`promtail`/`grafana` (профиль `observability`) + `deploy/observability/*`
- [x] прод-доступ к Grafana/Jaeger: порты на `127.0.0.1` → SSH-туннель `:3000`/`:16686`
- [ ] `deploy/observability/promtail.yml` — scrape stdout + JSON-pipeline
- [ ] `deploy/observability/grafana-datasources.yml` — Loki + Jaeger datasources
- [ ] верификация: трейс `POST /api/events` с pg-спанами виден в Jaeger UI;
      те же логи ищутся в Grafana/Loki по `trace_id` из `X-Trace-Id`
