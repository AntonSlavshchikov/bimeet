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
