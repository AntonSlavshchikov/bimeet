# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (`cd frontend`)
```bash
npm run dev        # dev server on :5173
npm run build      # tsc -b && vite build
npm run lint       # eslint
npm run preview    # preview production build
```

### Backend (`cd backend`)
```bash
go run ./cmd/server          # start server
go build ./cmd/server        # compile binary
go vet ./...                 # static analysis
```

Backend requires env vars. Copy `backend/.env.example` → `backend/.env`:
```
DSN=postgres://bimeet:bimeet@localhost:5432/bimeet?sslmode=disable
JWT_SECRET=change-me-in-production
PORT=8080
JWT_EXP_HOURS=72
```
`godotenv` loads `.env` automatically on startup. Migrations run automatically at startup.

## Architecture

### Backend — Go

Strict three-layer structure: **handler → service → repository → PostgreSQL**.

- **`internal/model/model.go`** — single file containing all domain structs, DTOs (request/response types), and enriched API response types (e.g. `EventDetail`, `EventListItem`). All backend types live here.
- **`internal/repository/`** — SQL queries via `pgxpool`. No ORM. Each repository receives the pool and exposes typed methods.
- **`internal/service/`** — business logic, authorization checks (organizer-only operations), notification dispatch (goroutines), changelog recording.
- **`internal/handler/`** — HTTP layer. `router.go` wires all routes using `go-chi/chi`. Auth middleware extracts `userID` from JWT and stores it in `context`.
- **`internal/db/`** — `Connect()` returns a `*pgxpool.Pool`; `Migrate()` runs embedded `*.up.sql` files in order, tracked in `schema_migrations` table.

Key API facts:
- All protected routes require `Authorization: Bearer <token>`.
- `GET /api/events/invite/{token}` is public; `POST` to same path requires auth (join flow).
- `EventDetail` is a fat enriched response with participants, collections, polls, items, carpools, links, and changelog — all assembled in the repository layer via joined queries.
- Event `category` is `ordinary` (collections, items, carpools) or `business` (links).

### Frontend — React + FSD

Follows **Feature-Sliced Design** with import direction: `app → pages → widgets → features → entities → shared`.

```
src/
  app/           # providers (Chakra+Query+Auth), router, theme
  pages/         # route-level components (events-list, event-detail, event-form, login, register, invite)
  widgets/       # layout (navbar), event-card
  features/      # auth, event-manage, participants, collections, polls, items, carpools, links
  entities/      # event (types, api, queries), user, collection, poll, item, carpool, notification
  shared/        # apiFetch client, formatDate utilities
```

**Data fetching pattern:**
- Read queries (`useEvents`, `useEvent`) live in `entities/event/queries/index.ts` and export `eventKeys`.
- Mutation hooks in `features/*/model/hooks.ts` call `invalidateQueries(eventKeys.all)` or `eventKeys.detail(id)` after mutations — always import `eventKeys` from entities, never redefine them.
- All HTTP calls go through `shared/api/client.ts` → `apiFetch<T>()`, which reads the JWT from `localStorage` and throws `Error(body.error)` on failure.
- Backend URL: `VITE_API_URL` env var (defaults to `http://localhost:8080`).

**Theme / design system:**
- Chakra UI v2 with custom theme in `src/app/styles/theme.ts`.
- Use **semantic tokens** for backgrounds and borders instead of hardcoded colors or Chakra's `gray.X`:
  - `pageBg`, `cardBg`, `subtleBg`, `inputBg` — surface backgrounds
  - `cardBorder`, `defaultBorder`, `subtleBorder` — border colors
  - `mainText`, `dimText`, `faintText` — text colors
- These tokens auto-switch between light/dark mode. Dark mode toggle lives in the Layout navbar.
- All primary buttons use `colorScheme="blue"` — the theme maps this to Indigo (`brand.600`). There is only one brand color; do not introduce `colorScheme="brand"` and `colorScheme="blue"` as different things.
- For `_dark`-aware component styles, add `_dark: {}` overrides in `theme.ts` component definitions rather than scattering `useColorModeValue` across JSX.

**Path alias:** `@/` → `src/` (configured in both `vite.config.ts` and `tsconfig.app.json`).
