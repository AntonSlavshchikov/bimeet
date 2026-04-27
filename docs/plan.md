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
