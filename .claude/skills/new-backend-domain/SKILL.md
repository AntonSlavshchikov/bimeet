---
name: new-backend-domain
description: Scaffold a new backend domain in the bimeet Go service following the strict handler→service→repository three-layer pattern with consumer-side interfaces and mockgen. Use when adding a new feature/entity to the backend (e.g. "добавь домен X", "новая сущность на бэке", "new backend resource/CRUD"). The canonical example to copy is the `poll` domain.
---

# New backend domain

Scaffold a new domain `X` in `backend/` exactly like the existing `poll` domain. Idiomatic Go: interfaces are declared in the **consuming** package, mocks are generated with `go.uber.org/mock`.

## Reference files (copy their shape)
- `backend/internal/handler/poll/{handler.go,interfaces.go}`
- `backend/internal/service/poll/{service.go,interfaces.go}`
- `backend/internal/repository/poll/repository.go`
- Wiring: `backend/cmd/server/main.go`, `backend/internal/handler/router.go`

## Steps

1. **Model** — add domain structs, request DTOs and enriched response types to the single file `backend/internal/model/model.go` (all types live there).

2. **Repository** — `backend/internal/repository/X/repository.go`, package `Xrepo`:
   - `type Repository struct { pool *pgxpool.Pool }`, `func New(pool *pgxpool.Pool) *Repository`.
   - Typed methods with **parameterized** pgx queries (never string-concatenate SQL). No ORM.

3. **Service interfaces** — `backend/internal/service/X/interfaces.go`, package `Xsvc`:
   - First line after package: `//go:generate mockgen -destination=mock/mock.go -package=mock . XRepo,EventRepo`
   - Declare only the methods this service actually uses (`XRepo`, usually `EventRepo` for authz).

4. **Service** — `backend/internal/service/X/service.go`:
   - `New(...)` takes the interfaces. Business logic + authorization.
   - Authz convention: organizer-only ops check `event.OrganizerID != userID` → `fmt.Errorf("forbidden")`; participant gates via `eventRepo.IsParticipant` / `IsConfirmedParticipant`. Validation errors as plain `fmt.Errorf("...")`.

5. **Handler interfaces** — `backend/internal/handler/X/interfaces.go`, package `Xhandler`:
   - `//go:generate mockgen -destination=mock/mock.go -package=mock . XService`
   - Declare the `XService` interface (only methods the handler calls).

6. **Handler** — `backend/internal/handler/X/handler.go`:
   - `type Handler struct { svc XService }`, `func New(svc XService) *Handler`.
   - Each method: `middleware.UserIDFromCtx(r.Context())` → 401 if absent; parse `chi.URLParam(r, "id")` with `uuid.Parse` → 400; `response.ParseJSON(r, &req)` for bodies → 400.
   - Error mapping by string match: contains `"forbidden"` → 403, `"not found"` → 404, else 400; success via `response.JSON(w, status, v)` or `w.WriteHeader(http.StatusNoContent)`.
   - Return `[]T{}` instead of nil for list endpoints.

7. **Wire** `backend/cmd/server/main.go`: construct `XRepo := Xrepo.New(pool)`, `XSvc := Xsvc.New(...)`, `XH := Xhandler.New(XSvc)`, pass `XH` into `handler.NewRouter(...)`.

8. **Routes** `backend/internal/handler/router.go`: add the handler param to `NewRouter` signature and register routes inside the protected group (`r.Use(middleware.Auth(jwtSecret))`), nested under `/api/events/{id}` if event-scoped.

9. **Mocks + tests** — run `cd backend && go generate ./...` to produce `mock/mock.go`. Add `service_test.go` and `handler_test.go` mirroring `poll`'s tests (testify + uber/mock).

10. **Verify** — `cd backend && go vet ./... && go build ./cmd/server && go test ./...`.

## Notes
- If the domain needs notifications, inject the notification repo (see how `eventSvc` gets `notifyingRepo` in `main.go`) — persisting a notification auto-fans-out a web push via the `notify` decorator.
- If it needs a DB table, invoke the `new-migration` skill.
