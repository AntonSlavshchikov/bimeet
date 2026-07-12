---
name: fsd-feature
description: Scaffold a new frontend feature slice in the bimeet React app following Feature-Sliced Design conventions (api / model hooks / ui), TanStack Query with eventKeys invalidation, apiFetch client, and Chakra semantic tokens. Use when adding UI for a new backend resource or an event tab ("новая фича на фронте", "добавь вкладку", "new frontend feature/tab"). Canonical example: features/polls.
---

# New frontend feature (FSD)

Feature-Sliced Design, import direction `app → pages → widgets → features → entities → shared`. Path alias `@/` → `src/`. Canonical example: `frontend/src/features/polls/`.

## Structure to create — `frontend/src/features/X/`

1. **`api/index.ts`** — object `Xapi` with methods calling `apiFetch<T>()` from `@/shared/api/client`:
   ```ts
   import { apiFetch } from '@/shared/api/client'
   export const Xapi = {
     list: (eventId: string) => apiFetch<unknown[]>(`/api/events/${eventId}/X`),
     create: (eventId: string, data: {...}) =>
       apiFetch<unknown>(`/api/events/${eventId}/X`, { method: 'POST', body: JSON.stringify(data) }),
   }
   ```
   `apiFetch` reads the JWT from localStorage and throws `Error(body.error)` on failure — do not re-handle auth.

2. **`model/hooks.ts`** — TanStack mutation hooks. **Always import `eventKeys` from `@/entities/event/queries`** (never redefine keys). Invalidate `eventKeys.detail(eventId)` after mutations (or `eventKeys.all` for list-wide changes):
   ```ts
   import { useMutation, useQueryClient } from '@tanstack/react-query'
   import { Xapi } from '@/features/X/api'
   import { eventKeys } from '@/entities/event/queries'
   export function useAddX(eventId: string) {
     const qc = useQueryClient()
     return useMutation({
       mutationFn: (data: {...}) => Xapi.create(eventId, data),
       onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.detail(eventId) }),
     })
   }
   ```

3. **`ui/XTab.tsx`** — Chakra UI v2 component. Use **semantic tokens** (`cardBg`, `subtleBg`, `cardBorder`, `mainText`, `dimText`, …) instead of hardcoded colors or `gray.X`. Primary buttons `colorScheme="blue"`. For `_dark`-specific styling, prefer theme overrides over scattering `useColorModeValue`.

## Wiring
- Read data comes from the enriched `useEvent(id)` detail query (`entities/event/queries`) — the tab usually reads from `event.X`, not a separate list query.
- Add the tab into the event-detail tabs panel; gate by `event.category` if it's category-specific (`ordinary` vs `business`).
- Add any user-facing strings via the `i18n-sync` skill (both `ru.json` and `en.json`).

## Verify
`cd frontend && npm run lint && npm run build`.
