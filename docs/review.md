# План ревью backend и frontend Bimeet

## Цель

Провести полное ревью основных частей приложения: `backend/` и `frontend/`. Найти ошибки, архитектурные нарушения, некачественный или хрупкий код, слабые места в тестах, API-контрактах, безопасности и пользовательских сценариях.

Итог ревью должен быть оформлен как список находок с приоритетами `P0-P3`, ссылками на файлы и строки, описанием риска, сценарием воспроизведения и рекомендацией по исправлению.

## Scope

В ревью входят:

- `backend/`
- `frontend/`
- контракты между backend API и frontend API-клиентом
- тесты, конфигурация сборки, миграции, Docker/nginx/PWA-настройки в рамках этих двух приложений

Не входят в первый проход:

- `backend-teams/`
- `frontend-teams/`
- `landing/`
- `design/`, `design-landing/`, `design-teams/`

## Источники архитектурного контекста

Перед ревью использовать graphify-отчеты:

- `backend/graphify-out/GRAPH_REPORT.md`
- `frontend/graphify-out/GRAPH_REPORT.md`

Корневой `graphify-out/` сейчас неполный, поэтому не считать его основным источником архитектурной картины.

## Backend Review

Проверить архитектуру handler -> service -> repository:

- HTTP routes, middleware order, auth/admin checks, invite/public flows.
- Сервисную бизнес-логику: права доступа, organizer-only операции, notification side effects, goroutine, reminder runner.
- Repository слой: SQL-запросы, nullable-поля, сканирование строк, транзакционность, N+1, корректность joins для `EventDetail`.
- Миграции: последовательность, обратимость, соответствие моделям и repository-запросам.
- Конфиг и запуск: env vars, секреты, CORS, rate limits, tracing/logging, graceful shutdown.
- Error handling: единый формат ошибок, правильные HTTP-коды, отсутствие утечек внутренних ошибок.
- Тесты: покрытие handler/service/middleware, отсутствие важных пропусков в repository и integration-сценариях.

Особое внимание:

- `internal/handler/router.go`
- `internal/model/model.go`
- `internal/repository/event/repository.go`
- auth/invite/public event flows
- notification, push, message, reminder flows
- admin API access control

## Frontend Review

Проверить фактическую FSD-структуру:

- import direction: `app -> pages -> widgets -> features -> entities -> shared`
- отсутствие протекания business logic в UI-компоненты
- консистентность query keys и invalidation после mutations
- auth guards, admin guards, logout/401 behavior
- API client errors, loading, empty и error states
- формы, validation, optimistic updates, disabled states
- i18n ru/en consistency
- PWA, service worker, push notifications, badge sync
- responsive layout, accessibility, keyboard/focus states
- дублирование UI/state logic между features/pages/widgets

Отдельно проверить расхождение документации и факта: в `AGENTS.md` описан Chakra UI, но фактический frontend использует React 19, Radix, Tailwind и shared UI-компоненты. В ревью не оценивать текущий код по устаревшему Chakra-контракту, а зафиксировать это как documentation drift.

Особое внимание:

- `src/shared/api/client.ts`
- `src/app/router/index.tsx`
- `src/features/*/model/hooks.ts`
- `src/entities/*/api`
- `src/shared/i18n/locales/ru.json`
- `src/shared/i18n/locales/en.json`
- `src/sw.ts` и PWA-настройки в `vite.config.ts`

## Integration Review

Сверить frontend и backend как единый продукт:

- Все frontend API-вызовы должны иметь соответствующий backend route.
- DTO, enum, status/category значения должны совпадать.
- Ошибки `401`, `403`, `404`, validation errors должны корректно отображаться в UI.
- Protected/public маршруты должны совпадать с реальной навигацией.
- Invite/public join flows должны работать без конфликтов auth state.
- Notification/chat/push flows должны быть консистентны между backend side effects и frontend polling/query invalidation.

## Команды проверки

Backend:

```bash
cd backend
go test ./...
go vet ./...
```

При подозрении на гонки в reminder/push/notifications:

```bash
cd backend
go test -race ./internal/...
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
npm run test
```

Ручные critical flows:

- login by code
- events list/detail/create/edit/delete
- invite join
- public events join
- collections/contributions
- polls
- items
- carpools
- chat
- notifications and push
- profile/avatar
- admin panel

## Формат итогового отчета

Основной раздел: `Findings`.

Для каждой находки:

- `Priority`: `P0`, `P1`, `P2`, `P3`
- `Area`: backend, frontend, integration, architecture, tests, security
- `File/Line`: точная ссылка на файл и строку
- `Problem`: что не так
- `Impact`: чем это опасно
- `Reproduction`: как увидеть проблему
- `Suggested Fix`: что исправить

Дополнительные разделы:

- `Architecture Notes`: где код соответствует архитектуре, а где ответственность смешана.
- `Test Gaps`: какие сценарии не покрыты и какие тесты добавить первыми.
- `Quick Wins`: небольшие исправления с высокой пользой.
- `Larger Refactors`: изменения, которые лучше выносить в отдельные задачи.

## Assumptions

- Первый проход ревью не меняет код, только анализирует и фиксирует результат.
- Безопасность входит в обычное ревью, но не заменяет отдельный deep security audit.
- Если найдены `P0/P1`, сначала документировать их, затем отдельно планировать исправления.
- Если после ревью будут изменения кода, обновить graphify через `graphify update .`.
