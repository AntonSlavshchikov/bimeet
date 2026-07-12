# План реализации публичных встреч

## Summary

Публичная встреча должна отображаться в публичной ленте всем авторизованным пользователям, включая организатора и уже присоединившихся участников. Сейчас `/api/events/public` работает как discover-only список и скрывает встречи, где пользователь организатор или участник. Нужно изменить семантику на общий каталог публичных активных встреч, а UI должен показывать кнопку присоединения только там, где она применима.

## Key Changes

- Backend: в `ListPublic` убрать SQL-фильтры `organizer_id <> $1` и `NOT EXISTS(participant)`, чтобы возвращать все `is_public = true AND status = 'active'`.
- Backend: в основном запросе `ListPublic` вычислять `is_participant` через participant row текущего пользователя и `my_status` через `LEFT JOIN event_participants` для текущего пользователя.
- Backend: во втором запросе participants для public list использовать тот же широкий фильтр `is_public = true AND status = 'active'`, без исключения организатора/участника.
- Backend: сохранить безопасный публичный DTO: не возвращать `invite_token`, email и user id в `/api/events/public`.
- Frontend `/discover`: обновить copy и поведение с "встреч, к которым можно присоединиться" на "все публичные встречи".
- Frontend `/discover`: отображать строки для организатора и участников тоже; `Join` показывать только если `!event.organizer.is_me`, `!event.is_participant`, event active, и есть места.
- Frontend events list: оставить вкладку "Публичные" внутри "Встреч" как "мои публичные", потому что `/api/events` уже отвечает за личную ленту.
- i18n: все новые/измененные тексты держать синхронно в `frontend/src/shared/i18n/locales/ru.json` и `en.json`.

## Test Plan

- Backend unit/integration coverage для `ListPublic`:
  - организатор видит свою публичную активную встречу в `/api/events/public`;
  - подтвержденный участник видит публичную встречу в `/api/events/public`;
  - посторонний пользователь видит ту же публичную встречу;
  - приватная встреча не попадает в `/api/events/public`;
  - completed публичная встреча не попадает в `/api/events/public`;
  - public DTO не содержит email, user id и invite token.
- Frontend scenarios:
  - организатор видит свою публичную встречу на `/discover`, без кнопки join;
  - участник видит публичную встречу на `/discover`, без кнопки join;
  - посторонний пользователь видит кнопку join, если есть места;
  - full event отображается, но join недоступен;
  - поиск на `/discover` ищет по всем публичным встречам, а не только присоединяемым.
- Verification:
  - `cd backend && go test ./...`
  - `cd backend && go vet ./...`
  - `cd frontend && npm run build`
  - `cd frontend && npm run lint`
  - после изменения кода выполнить `graphify update .`.

## Assumptions

- Файл плана записан в `docs/public-meet.md`.
- Публичная лента остается защищенной JWT: "видят все" означает все авторизованные пользователи Bimeet.
- Публичный список показывает только активные публичные встречи; завершенные остаются вне `/discover`.
