# Backend Security Checklist

## 1. Authentication / JWT

- [ ] Проверить, что все protected routes требуют `Authorization: Bearer`.
- [ ] Проверить invalid/malformed/empty tokens.
- [ ] Проверить expired JWT.
- [ ] Проверить JWT без `sub`.
- [ ] Проверить JWT с не-UUID `sub`.
- [ ] Проверить подмену алгоритма JWT.
- [ ] Проверить слабый/пустой `JWT_SECRET`.
- [ ] Проверить срок жизни токена.
- [ ] Проверить, что ошибки auth не раскрывают лишние детали.

## 2. Authorization / IDOR

- [ ] Проверить доступ к чужим событиям.
- [ ] Проверить доступ к чужим участникам.
- [ ] Проверить доступ к чужим коллекциям.
- [ ] Проверить доступ к чужим платежным взносам.
- [ ] Проверить доступ к чужим poll/item/carpool/message/notification.
- [ ] Проверить organizer-only операции.
- [ ] Проверить participant-only операции.
- [ ] Проверить admin-only endpoints.
- [ ] Проверить invite join flow.

## 3. XSS / Injection Через Контент

- [ ] Проверить сохранение XSS в названиях/описаниях событий.
- [ ] Проверить XSS в сообщениях.
- [ ] Проверить XSS в poll questions/options.
- [ ] Проверить XSS в collections/items/carpools/profile fields.
- [ ] Проверить dangerous URLs: `javascript:`, `data:`, HTML payloads.
- [ ] Проверить, что API всегда отдает JSON, не HTML.
- [ ] Проверить security headers и CSP.

## 4. SQL Injection / Repository Layer

- [ ] Проверить все SQL-запросы на parameterized queries.
- [ ] Проверить dynamic SQL, sort/filter/search параметры.
- [ ] Проверить joined queries в `EventDetail` на утечки данных.
- [ ] Проверить pagination/limit/offset.
- [ ] Проверить DB constraints: foreign keys, unique constraints, cascade behavior.

## 5. Input Validation

- [ ] Проверить UUID path params.
- [ ] Проверить enum values.
- [ ] Проверить отрицательные суммы.
- [ ] Проверить слишком длинные строки.
- [ ] Проверить пустые обязательные поля.
- [ ] Проверить invalid dates.
- [ ] Проверить oversized JSON.
- [ ] Проверить malformed JSON.
- [ ] Проверить mass assignment: нельзя передать `owner_id`, `organizer_id`, admin flags.

## 6. Business Logic Abuse

- [ ] Проверить повторное голосование в poll.
- [ ] Проверить голосование в чужом event.
- [ ] Проверить подтверждение чужого contribution.
- [ ] Проверить double confirm/reject contribution.
- [ ] Проверить mark-paid без organizer role.
- [ ] Проверить join в carpool сверх лимита.
- [ ] Проверить join в чужой/private/completed event.
- [ ] Проверить удаление чужих сообщений.
- [ ] Проверить чтение чужих unread counts.

## 7. Rate Limiting / Abuse

- [ ] Проверить auth brute force.
- [ ] Проверить login code enumeration.
- [ ] Проверить invite token enumeration.
- [ ] Проверить message spam.
- [ ] Проверить push/test abuse.
- [ ] Проверить avatar upload abuse.
- [ ] Проверить global API flood.
- [ ] Проверить корректность IP detection через proxy.

## 8. CORS / CSRF / Headers

- [ ] Проверить `CORS_ALLOWED_ORIGINS` в production.
- [ ] Проверить отсутствие wildcard CORS в prod.
- [ ] Проверить `AllowCredentials=false`.
- [ ] Проверить HSTS в prod.
- [ ] Проверить `X-Content-Type-Options`.
- [ ] Проверить `X-Frame-Options`.
- [ ] Проверить `Referrer-Policy`.
- [ ] Проверить CSP.
- [ ] Проверить, что CSRF риск низкий из-за Bearer JWT, а не cookie auth.

## 9. File Upload / Avatar / Storage

- [ ] Проверить размер файла.
- [ ] Проверить MIME sniffing.
- [ ] Запретить опасные SVG/HTML uploads.
- [ ] Проверить extension whitelist.
- [ ] Проверить object key traversal.
- [ ] Проверить overwrite чужих файлов.
- [ ] Проверить удаление чужого avatar.
- [ ] Проверить bucket/object visibility.
- [ ] Проверить отсутствие signed URL/secret leaks.

## 10. Secrets / Config

- [ ] Проверить `.env.example`.
- [ ] Проверить prod-safe defaults.
- [ ] Проверить `JWT_SECRET=change-me-in-production`.
- [ ] Проверить DSN leakage.
- [ ] Проверить VAPID/private keys.
- [ ] Проверить S3 credentials.
- [ ] Проверить, что секреты не попадают в logs/errors/API responses.

## 11. Logging / Observability

- [ ] Проверить, что не логируются JWT.
- [ ] Проверить, что не логируются login codes.
- [ ] Проверить invite tokens в логах.
- [ ] Проверить PII: email/user data.
- [ ] Проверить panic recovery.
- [ ] Проверить generic 500 без stack trace.
- [ ] Проверить request id / trace id без лишних данных.

## 12. Dependency / Supply Chain

- [ ] Проверить `go.mod` зависимости.
- [ ] Проверить известные CVE.
- [ ] Проверить JWT/CORS/pgx/chi версии.
- [ ] Прогнать `go vet ./...`.
- [ ] Прогнать `go test ./...`.
- [ ] При доступе к сети прогнать vulnerability scan.

## 13. Concurrency / Race Conditions

- [ ] Проверить одновременный vote.
- [ ] Проверить одновременный carpool join.
- [ ] Проверить одновременный confirm/reject contribution.
- [ ] Проверить одновременный mark-paid.
- [ ] Проверить double-submit форм.
- [ ] Проверить транзакции и unique constraints.

## 14. Public API Exposure

- [ ] Проверить все public endpoints.
- [ ] Проверить invite GET.
- [ ] Проверить auth request/verify.
- [ ] Проверить public event list.
- [ ] Проверить, что private data не утекает в public responses.
- [ ] Проверить response DTO на лишние поля.

## 15. Error Handling

- [ ] Проверить единый формат ошибок.
- [ ] Проверить отсутствие SQL/internal errors наружу.
- [ ] Проверить отсутствие stack traces.
- [ ] Проверить различимость ошибок, которая помогает enumeration.
- [ ] Проверить корректные HTTP status codes.

## 16. Admin API

- [ ] Проверить email whitelist.
- [ ] Проверить case normalization email.
- [ ] Проверить пустой admin list.
- [ ] Проверить смену email пользователя.
- [ ] Проверить доступ обычного пользователя.
- [ ] Проверить утечки персональных данных в analytics endpoints.

## 17. Push Notifications

- [ ] Проверить ownership подписки.
- [ ] Проверить subscribe/unsubscribe чужой подписки.
- [ ] Проверить push test abuse.
- [ ] Проверить VAPID public/private key handling.
- [ ] Проверить payload на sensitive data.

## 18. Acceptance Criteria

- [ ] Для каждой найденной проблемы есть endpoint, actor, payload, actual/expected behavior.
- [ ] Для high/medium риска есть regression test.
- [ ] `go test ./...` проходит.
- [ ] `go vet ./...` проходит.
- [ ] Нет известных критичных dependency vulnerabilities.
- [ ] Нет публичного endpoint, который раскрывает private event/user data.
