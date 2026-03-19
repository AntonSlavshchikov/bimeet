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
