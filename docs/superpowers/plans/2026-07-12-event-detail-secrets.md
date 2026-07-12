# Event Detail Secrets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Не выдавать invite token участникам и не выдавать им URL чужих платёжных чеков, сохранив полный доступ организатора и доступ участника к собственному чеку.

**Architecture:** `event.Service.GetByID` остаётся единой participant-facing границей и редактирует загруженный repository-слоем `EventDetail` после проверки membership. `InviteToken` становится опциональным полем JSON; repository по-прежнему загружает полный токен для organizer-flow.

**Tech Stack:** Go 1.24, chi, pgx, testify/gomock, React 19, TypeScript 5.9.

## Global Constraints

- Invite token возвращается только организатору.
- Организатор видит все receipt URL.
- Участник видит только собственный receipt URL.
- HTTP-коды и остальные поля `EventDetail` не меняются.
- Не исправлять соседние findings из `docs/errors.md` в этой работе.

---

### Task 1: Response-shaping regression tests

**Files:**
- Modify: `backend/internal/service/event/service_test.go`
- Modify: `backend/internal/handler/event/handler_test.go`

**Interfaces:**
- Consumes: `Service.GetByID(ctx, eventID, userID) (model.EventDetail, error)`.
- Produces: требования к optional `EventDetail.InviteToken` и фильтрации `ContributionInfo.ReceiptURL`.

- [ ] **Step 1: Write failing service tests**

Добавить participant- и organizer-сценарии. Participant input содержит `InviteToken: &inviteToken`, собственный и чужой contribution; ожидаются `nil` token, сохранённый собственный URL и `nil` чужой URL. Organizer input содержит те же секреты; ожидается полное равенство результата исходному detail.

- [ ] **Step 2: Run service tests and verify RED**

Run: `cd backend && go test ./internal/service/event -run 'TestGetByID_(RedactsParticipantSecrets|PreservesOrganizerSecrets)$' -count=1`

Expected: FAIL/compile failure, потому что `InviteToken` ещё не pointer и redaction отсутствует.

- [ ] **Step 3: Write failing JSON-shape test**

В `handler_test.go` вернуть из mock service participant-safe detail с `InviteToken: nil`, собственным receipt URL и чужим `ReceiptURL: nil`; декодировать ответ в `map[string]any` и проверить отсутствие `invite_token` и чужого `receipt_url` при наличии собственного.

- [ ] **Step 4: Run handler test and verify RED**

Run: `cd backend && go test ./internal/handler/event -run TestGetByID_OmitsParticipantSecretsFromJSON -count=1`

Expected: FAIL/compile failure до optional API field.

### Task 2: Minimal backend remediation

**Files:**
- Modify: `backend/internal/model/model.go:411-436`
- Modify: `backend/internal/repository/event/repository.go:237-256`
- Modify: `backend/internal/service/event/service.go:59-79`

**Interfaces:**
- Consumes: regression requirements from Task 1.
- Produces: `EventDetail.InviteToken *uuid.UUID` с `json:"invite_token,omitempty"`; caller-shaped `EventDetail` from `Service.GetByID`.

- [ ] **Step 1: Make invite token optional**

Изменить поле модели:

```go
InviteToken *uuid.UUID `json:"invite_token,omitempty"`
```

В repository читать SQL-значение во временный `uuid.UUID`, затем присваивать адрес полю detail:

```go
var inviteToken uuid.UUID
// Scan(..., &inviteToken, ...)
detail.InviteToken = &inviteToken
```

- [ ] **Step 2: Redact secrets for non-organizers**

После membership-проверки в `Service.GetByID` выполнить:

```go
if !detail.Organizer.IsMe {
    detail.InviteToken = nil
    for i := range detail.Collections {
        for j := range detail.Collections[i].Contributions {
            contribution := &detail.Collections[i].Contributions[j]
            if !contribution.User.IsMe {
                contribution.ReceiptURL = nil
            }
        }
    }
}
```

- [ ] **Step 3: Format and verify GREEN**

Run: `cd backend && gofmt -w internal/model/model.go internal/repository/event/repository.go internal/service/event/service.go internal/service/event/service_test.go internal/handler/event/handler_test.go`

Run: `cd backend && go test ./internal/service/event ./internal/handler/event -count=1`

Expected: PASS.

### Task 3: Frontend contract compatibility

**Files:**
- Modify: `frontend/src/entities/event/model/types.ts:14-62`
- Modify: `frontend/src/features/participants/ui/ParticipantsTab.tsx:47-52`

**Interfaces:**
- Consumes: backend `invite_token` отсутствует для non-organizer responses.
- Produces: `invite_token?: string` and guarded copy-link handler.

- [ ] **Step 1: Update TypeScript response types**

Сделать `invite_token?: string` в `Event` и `EventListItem`.

- [ ] **Step 2: Guard organizer copy action**

Добавить ранний выход:

```ts
function handleCopyLink() {
  if (!event.invite_token) return
  const link = `${window.location.origin}/invite/${event.invite_token}`
  // existing clipboard flow
}
```

- [ ] **Step 3: Verify frontend contract**

Run: `cd frontend && npm run build`

Expected: PASS.

### Task 4: Security closure and repository verification

**Files:**
- Modify: graph artifacts under `graphify-out/` through the project command.

**Interfaces:**
- Consumes: completed backend/frontend patch.
- Produces: verified remediation and updated knowledge graph.

- [ ] **Step 1: Inspect patch scope**

Run: `git diff --check`

Run: `git diff -- backend/internal/model/model.go backend/internal/repository/event/repository.go backend/internal/service/event/service.go backend/internal/service/event/service_test.go backend/internal/handler/event/handler_test.go frontend/src/entities/event/model/types.ts frontend/src/features/participants/ui/ParticipantsTab.tsx`

Expected: только response-shaping, tests и frontend optional contract.

- [ ] **Step 2: Run backend checks**

Run: `cd backend && go test ./...`

Run: `cd backend && go vet ./...`

Run: `cd backend && go build ./cmd/server`

Expected: PASS for all commands.

- [ ] **Step 3: Run frontend checks**

Run: `cd frontend && npm run test`

Run: `cd frontend && npm run lint`

Run: `cd frontend && npm run build`

Expected: PASS for all commands.

- [ ] **Step 4: Refresh graph**

Run: `graphify update .`

Expected: successful AST-only graph update.

- [ ] **Step 5: Re-run focused exploit checks**

Run: `cd backend && go test ./internal/service/event ./internal/handler/event -run 'TestGetByID_(RedactsParticipantSecrets|PreservesOrganizerSecrets|OmitsParticipantSecretsFromJSON)$' -count=1`

Expected: PASS, proving participant response lacks invite token and чужие receipt URLs while organizer and owner behavior remains.

Git commit steps intentionally omitted because the user declined Git write approval for this task.
