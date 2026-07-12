# План внедрения Swagger в backend

## Summary

Добавить OpenAPI/Swagger-документацию для Go backend на `chi` через `swaggo/swag`: аннотации рядом с HTTP handler-методами, генерация спецификации в `backend/docs`, публичный Swagger UI по `/swagger/index.html`, проверка сборкой и генерацией спеки.

## Key Changes

- Добавить зависимости:
  - `github.com/swaggo/swag/cmd/swag` как dev-tool для генерации.
  - `github.com/swaggo/http-swagger` для Swagger UI handler.
- Добавить top-level Swagger meta-аннотации в `backend/cmd/server/main.go`: title, version, base path `/api`, security scheme `BearerAuth`.
- Сгенерировать OpenAPI package в `backend/docs` командой из `backend`:
  - `swag init -g cmd/server/main.go -o docs --parseDependency --parseInternal`
- Подключить generated docs import в server/router layer:
  - blank import `_ "bimeet/docs"` в месте, где регистрируется Swagger UI.
- Зарегистрировать публичные GET routes вне JWT-группы:
  - `/swagger/*` -> Swagger UI.
  - опционально `/swagger/doc.json` оставить стандартным endpoint, который использует `http-swagger`.
- Не менять существующий API behavior: auth, middleware, route paths и response bodies остаются прежними.

## Annotation Plan

- Описывать эндпоинты в handler-пакетах по доменам: `auth`, `event`, `collection`, `poll`, `item`, `carpool`, `message`, `notification`, `profile`, `push`, `admin`.
- Использовать существующие DTO из `internal/model/model.go` как schema source.
- Для ошибок ввести отдельный документируемый тип, например `response.ErrorResponse { error string }`, чтобы не ссылаться на `map[string]string`.
- Для protected endpoints добавить `@Security BearerAuth`; public endpoints оставить без security:
  - public: `POST /api/auth/request-code`, `POST /api/auth/verify-code`, `GET /api/events/invite/{token}`.
  - protected: остальные `/api/**`, включая invite join, public events list и admin.
- Для multipart endpoints явно описать form-data:
  - avatar upload.
  - collection contribution receipt, если handler принимает файл.
- Для `204 No Content` endpoints указать пустой success response.

## Test Plan

- Запустить генерацию:
  - `cd backend && swag init -g cmd/server/main.go -o docs --parseDependency --parseInternal`
- Проверить компиляцию:
  - `cd backend && go build ./cmd/server`
- Проверить static analysis:
  - `cd backend && go vet ./...`
- Запустить backend локально и открыть:
  - `http://localhost:8080/swagger/index.html`
- Smoke-проверки:
  - Swagger UI загружается без JWT.
  - `Authorize` принимает Bearer token.
  - Protected endpoint из UI отправляет `Authorization: Bearer <token>`.
  - Public invite/auth endpoints отображаются без `BearerAuth`.
- Проверить, что generated files не ломают `graphify`; после изменения кода выполнить `graphify update .`.

## Assumptions

- Используем `swaggo/swag`, потому что проект на `net/http + chi`, без существующего OpenAPI tooling.
- Generated OpenAPI package хранится в `backend/docs`, а план внедрения хранится в repo-level `docs/swagger.md`.
- Swagger UI доступен во всех окружениях; если позже нужно закрыть его в production, добавить config flag вроде `SWAGGER_ENABLED`.
