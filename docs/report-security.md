# Проверка безопасности: ai-app

## Статус исправления

Исправлено в текущей рабочей копии 2026-07-05:

- `BIMEET-BE-SEC-001`: public event/invite responses больше не раскрывают `email` и `invite_token`; full event detail требует membership/organizer access.
- `BIMEET-BE-SEC-002`: receipt upload получил hard request limit, byte sniffing и строгий allowlist `jpeg/png/webp/pdf`; SVG/HTML-like payloads отклоняются.
- `BIMEET-BE-SEC-003`: mailer отклоняет CRLF в recipient/subject, валидирует email через `net/mail` и MIME-кодирует SMTP subject.
- `BIMEET-BE-SEC-004`: push unsubscribe удаляет subscription только по `(user_id, endpoint)`.

Проверки после исправления:

- `go test ./...` — успешно
- `go vet ./...` — успешно
- `npm run build` — успешно
- `npm run lint` — успешно

## Область проверки

Выполнена ограниченная проверка безопасности backend-части по чеклисту из `docs/security.md`. Были рассмотрены критичные runtime/control поверхности: роутер, middleware, авторизация, публичные event/invite-флоу, загрузки и storage, mailer, push, SQL-репозитории, admin API, poll/carpool/message/notification сервисы, миграции и конфигурация.

- Режим сканирования: `scoped_path`
- Тип цели: `git_revision`
- Target ID: `target_sha256_08b05627b5171a01e4cb40cda6dd7d7a0981fbc8a6bddb90189c5fc73dbb1883`
- Ревизия: `df0723337278875873c28f4042e10db6a0fc8cc6`
- Стратегия инвентаризации: `scoped_path`
- Включённые пути: `backend`
- Исключённые пути: нет
- Статус runtime/тестов: статическая валидация; live PostgreSQL/S3/SMTP/webpush не поднимались. `go test` и `go vet` были запущены отдельно после генерации контракта отчёта.
- Рассмотренные артефакты: `docs/security.md`, `graphify-out/GRAPH_REPORT.md`, выбранные high-impact файлы `backend/internal/**`, `backend/.env.example`
- Контекст проверки: пользователь указал `docs/security.md` как авторитетный backend-чеклист; он был скопирован в per-scan threat model artifact.

Ограничения и исключения:

- Это не полный live DAST-прогон.
- Покрытие сфокусировано на high-impact backend frontier, а не на каждом generated/cache файле.
- Dependency CVE network scan не выполнялся из-за ограниченной сети.
- `backend/graphify-out/**` исключён: это локальные generated graph/cache артефакты, не deployed backend runtime.
- `backend/server` исключён: это собранный binary artifact, вместо него проверялся исходный код.

### Сводка

| Поле | Значение |
| --- | --- |
| Reportable findings | 4 |
| Severity mix | high: 1, medium: 1, low: 2 |
| Confidence mix | high: 1, medium: 3 |
| Coverage | partial |
| Режим валидации | Статическая трассировка source/control/sink с coverage ledger и receipt для каждого кандидата. |

Канонические артефакты: `scan-manifest.json`, `findings.json`, `coverage.json`. Этот отчёт является русской версией итогового `report.md`.

## Модель угроз

Backend API защищает пользовательские аккаунты, события, PII участников, invite tokens, payment/receipt contribution metadata, chat messages, notifications, push subscriptions, admin analytics, S3 objects и mail delivery.

Ключевые trust boundaries:

- публичные auth/invite endpoints;
- authenticated user endpoints;
- organizer/admin-only операции;
- PostgreSQL persistence;
- S3-compatible public object storage;
- SMTP/Resend mail transport;
- webpush providers.

### Активы

- JWT-сессии и login codes
- Event membership, invite tokens и PII участников
- Collection contributions и receipt URLs
- Содержимое chat messages
- Push subscriptions и notification delivery
- Admin analytics и user/event data
- S3 object namespace и public URLs

### Границы доверия

- Неаутентифицированные HTTP-клиенты к публичным auth/invite endpoints
- Аутентифицированные пользователи к event/participant/collection/message/push APIs
- Organizer-only и admin-only service operations
- Backend к PostgreSQL
- Backend к S3-compatible object storage
- Backend к SMTP/Resend/webpush providers

### Возможности атакующего

- Создать обычный аккаунт
- Создавать или присоединяться к публичным events, когда это разрешено
- Отправлять JSON и multipart bodies в authenticated endpoints
- Как organizer контролировать event title/description и invite email input
- Наблюдать ответы public event listing и invite preview

### Цели безопасности

- Protected routes требуют валидный Bearer JWT
- Пользователь не может получить доступ к чужим private events или user-owned objects
- Public responses не должны раскрывать private event/user data
- Uploads должны применять строгие ограничения типа и размера
- Mail/push операции не должны позволять одному пользователю неожиданно влиять на другого

### Предположения

- Bearer JWT не является cookie auth, поэтому CSRF-риск снижен.
- `S3_PUBLIC_BASE_URL` objects могут быть доступны event members или admins.
- SMTP transport является поддерживаемой конфигурацией, когда Resend отсутствует.

## Находки

| Finding | Severity | Confidence |
| --- | --- | --- |
| [1. Public event and invite responses expose invite tokens and participant emails](#finding-1) | high | high |
| [2. Receipt upload trusts multipart Content-Type and allows active SVG/HTML-like image uploads](#finding-2) | medium | medium |
| [3. SMTP invite emails allow CRLF header injection from event title or invite email](#finding-3) | low | medium |
| [4. Push unsubscribe deletes subscriptions by endpoint without owner check](#finding-4) | low | medium |

### Шкала confidence

| Метка | Значение |
| --- | --- |
| high | Есть прямые доказательства; существенных нерешённых блокеров нет. |
| medium | Доказательства поддерживают правдоподобную проблему, но остаётся runtime/reachability gap. |
| low | Доказательства неполные; пункт сохранён только для явного follow-up. |

<a id="finding-1"></a>

### [1] Public event and invite responses expose invite tokens and participant emails

| Поле | Значение |
| --- | --- |
| Severity | high |
| Confidence | high |
| Confidence rationale | Статическая валидация проследила attacker-controlled source до response/storage/SMTP/database sink с точными строками; live PoC с зависимостями не запускался. |
| Category | Authorization/data exposure |
| CWE | CWE-200, CWE-862 |
| Затронутые строки | `backend/internal/service/event/service.go:65-72`, `backend/internal/repository/event/repository.go:735-769`, `backend/internal/repository/event/repository.go:793-814`, `backend/internal/model/model.go:343-346`, `backend/internal/model/model.go:427`, `backend/internal/model/model.go:452` |

#### Кратко

Публичные event и invite API раскрывают invite tokens и email участников, потому что response DTO не минимизированы, а `GetByID` пропускает membership check для публичных events.

#### Первопричина

Public-event path пропускает проверку участника, когда `detail.IsPublic == true`. Public list и invite DTO повторно используют `UserInfo` и `EventListItem`, в которых есть `Email` и `InviteToken`.

Ключевые evidence:

- `backend/internal/service/event/service.go:65-72`: для public event доступ разрешается без `IsParticipant`.
- `backend/internal/repository/event/repository.go:735-769`: `GetPublicEvents` выбирает `e.invite_token`, `u.email`.
- `backend/internal/repository/event/repository.go:793-814`: `GetByInviteToken` возвращает organizer email и invite token.
- `backend/internal/model/model.go:343-346`: `UserInfo` содержит `Email`.
- `backend/internal/model/model.go:427`: `EventDetail` содержит `InviteToken`.
- `backend/internal/model/model.go:452`: `EventListItem` содержит `InviteToken`.

#### Валидация

Атакующий без участия в событии может вызвать публичный список или invite preview и получить поля, которые выглядят приватными для участников/организатора:

- organizer `email`;
- participant `email` внутри fat `EventDetail`;
- `invite_token`, который дальше может использоваться для invite/join flow;
- дополнительные приватные subresources в публичном detail response.

Проблема подтверждена статически: путь от public handler/service до repository response DTO не содержит minimization layer и не заменяет приватные DTO на отдельные public DTO.

#### Dataflow

1. Неаутентифицированный клиент обращается к public event listing или invite preview.
2. Router направляет запрос в event handler/service.
3. Service разрешает чтение public event без membership check.
4. Repository собирает enriched event/list DTO через joined queries.
5. Ответ сериализуется наружу с `Email` и `InviteToken`.

#### Reachability

Reachable. Публичные endpoints существуют, часть из них не требует auth, а public event detail намеренно доступен не-участникам. Для эксплуатации не нужен organizer/admin доступ.

#### Severity

High, потому что это прямое раскрытие PII и invite token. Invite token повышает риск дальнейшего несанкционированного присоединения или распространения доступа к событию.

#### Remediation

- Ввести отдельные DTO для public list, public detail и invite preview.
- Исключить из public responses `email`, `invite_token`, receipt URLs и приватные fat subresources.
- Для public detail явно определить минимальный контракт ответа.
- Добавить regression tests на форму JSON-ответов для public endpoints.
- Проверить, что organizer/participant emails возвращаются только авторизованным участникам события или organizer/admin контекстам.

<a id="finding-2"></a>

### [2] Receipt upload trusts multipart Content-Type and allows active SVG/HTML-like image uploads

| Поле | Значение |
| --- | --- |
| Severity | medium |
| Confidence | medium |
| Confidence rationale | Source-to-sink trace подтверждает доверие multipart header и сохранение Content-Type; live S3/browser PoC не запускался. |
| Category | Unsafe file upload / active content |
| CWE | CWE-434, CWE-79 |
| Затронутые строки | `backend/internal/handler/collection/handler.go:147`, `backend/internal/handler/collection/handler.go:152`, `backend/internal/service/collection/service.go:122-128`, `backend/internal/storage/s3.go:21-25` |

#### Кратко

Receipt upload доверяет `Content-Type` из multipart header, принимает любой `image/*`, включая `image/svg+xml`, и не задаёт жёсткий request body limit. В результате можно загрузить активный SVG/HTML-like payload, который будет отдаваться из S3 с attacker-controlled content type.

#### Первопричина

`ParseMultipartForm` ограничивает память, а не общий размер тела запроса. Далее service использует `header.Header.Get("Content-Type")` и проверяет только `strings.HasPrefix(ct, "image/")`. S3 upload сохраняет переданный content type.

Ключевые evidence:

- `backend/internal/handler/collection/handler.go:147`: используется `ParseMultipartForm`.
- `backend/internal/handler/collection/handler.go:152`: file/header передаются в service.
- `backend/internal/service/collection/service.go:122-128`: доверие multipart `Content-Type`, allowlist уровня `image/*`.
- `backend/internal/storage/s3.go:21-25`: объект загружается с переданным `contentType`.

#### Валидация

Злоумышленник, имеющий доступ к authenticated receipt upload endpoint, может отправить multipart file с `Content-Type: image/svg+xml`. Поскольку тип не sniffed по байтам и SVG явно не запрещён, payload проходит проверку. Если объект затем отдаётся браузеру с этим content type и без безопасного `Content-Disposition`, возникает риск active content execution в контексте storage/public URL.

Дополнительно отсутствие `MaxBytesReader` или аналогичного hard limit оставляет endpoint уязвимым к oversized body DoS, хотя это не основной акцент finding.

#### Dataflow

1. Authenticated user отправляет multipart receipt upload.
2. Handler парсит multipart form.
3. Service читает `Content-Type` из multipart header.
4. Проверка принимает любое значение с prefix `image/`.
5. Storage сохраняет объект в S3-compatible backend с тем же content type.
6. Получатель открывает public URL receipt object.

#### Reachability

Reachable для authenticated пользователя, которому разрешено загружать receipt. Live проверка зависит от production S3/MinIO serving headers.

#### Severity

Medium. Требуется authenticated доступ и пользовательский сценарий просмотра receipt URL, но impact может включать stored active content / XSS-like execution через public object hosting.

#### Remediation

- Добавить hard request body limit на handler level, например через `http.MaxBytesReader`.
- Не доверять multipart `Content-Type`; определять тип по первым байтам.
- Использовать строгий allowlist: `image/jpeg`, `image/png`, `image/webp`.
- Явно запретить SVG и любые XML/HTML-like форматы.
- При сохранении receipt задавать безопасный `Content-Disposition` и/или отдавать user uploads с отдельного cookieless домена.
- Добавить тесты на SVG payload, oversized upload и mismatch между header/body content type.

<a id="finding-3"></a>

### [3] SMTP invite emails allow CRLF header injection from event title or invite email

| Поле | Значение |
| --- | --- |
| Severity | low |
| Confidence | medium |
| Confidence rationale | Кодовая трассировка подтверждает raw RFC822 header construction; runtime impact зависит от SMTP-конфигурации и поведения downstream mail server. |
| Category | SMTP header injection |
| CWE | CWE-93, CWE-113 |
| Затронутые строки | `backend/internal/service/event/service.go:297`, `backend/internal/service/event/service.go:311`, `backend/internal/service/event/service.go:314`, `backend/internal/service/mailer/mailer.go:55-57`, `backend/internal/service/mailer/mailer.go:151-153` |

#### Кратко

SMTP invite email path формирует raw RFC822 headers через string formatting. Event title попадает в `Subject`, invite email попадает в `To`, и значения не очищаются от CRLF. При SMTP transport это может позволить header injection.

#### Первопричина

Invite flow принимает email/title input, затем вызывает mailer. SMTP branch собирает сообщение строкой вида `From`, `To`, `Subject`, `Content-Type` с `\r\n` separators. Значения не проходят CRLF stripping и не собираются через typed mail APIs.

Ключевые evidence:

- `backend/internal/service/event/service.go:297`: organizer-controlled event title участвует в invite flow.
- `backend/internal/service/event/service.go:311`, `:314`: invite email/title передаются в mailer.
- `backend/internal/service/mailer/mailer.go:55-57`: SMTP является supported fallback/configuration.
- `backend/internal/service/mailer/mailer.go:151-153`: raw headers собираются через formatted string.

#### Валидация

Если SMTP transport включён, attacker-controlled title или email может содержать CRLF-последовательности. При прямой сборке raw headers это создаёт риск добавления новых headers или изменения структуры письма. Не проводилась live SMTP PoC, поэтому confidence остаётся medium, а severity снижена до low.

#### Dataflow

1. Organizer создаёт/редактирует event title или вводит invite email.
2. Service запускает invite email delivery.
3. Mailer выбирает SMTP transport, если Resend не настроен.
4. SMTP branch строит raw RFC822 message строкой.
5. CRLF из пользовательского ввода может перейти в email headers.

#### Reachability

Reachable только при SMTP transport. Если production всегда использует Resend path и SDK корректно экранирует headers, практический риск ниже.

#### Severity

Low. Для эксплуатации требуется organizer-controlled input и SMTP-конфигурация. Impact зависит от SMTP server/client behavior.

#### Remediation

- Валидировать invite email через `mail.ParseAddress` или эквивалент.
- Удалять/запрещать `\r` и `\n` в subject/display fields.
- Формировать SMTP message через typed MIME/mail builder, а не raw string headers.
- Добавить unit tests с CRLF payload в event title и invite email.

<a id="finding-4"></a>

### [4] Push unsubscribe deletes subscriptions by endpoint without owner check

| Поле | Значение |
| --- | --- |
| Severity | low |
| Confidence | medium |
| Confidence rationale | Static trace подтверждает authenticated handler, который игнорирует userID при delete; практическая эксплуатация требует знания/получения чужого endpoint. |
| Category | Object ownership / authorization |
| CWE | CWE-639, CWE-862 |
| Затронутые строки | `backend/internal/handler/push/handler.go:65`, `backend/internal/handler/push/handler.go:81`, `backend/internal/service/push/service.go:52`, `backend/internal/repository/pushsub/repository.go:62-63` |

#### Кратко

Push unsubscribe endpoint аутентифицирует пользователя, но удаляет subscription только по `endpoint`, без проверки владельца. Пользователь, знающий чужой endpoint, может удалить чужую push subscription.

#### Первопричина

Handler находится под auth middleware, но в unsubscribe flow не извлекает и не передаёт `userID`. Service/repository выполняют `DELETE FROM push_subscriptions WHERE endpoint = $1`.

Ключевые evidence:

- `backend/internal/handler/push/handler.go:65`: route требует auth context.
- `backend/internal/handler/push/handler.go:81`: unsubscribe использует только request endpoint.
- `backend/internal/service/push/service.go:52`: service вызывает delete без userID.
- `backend/internal/repository/pushsub/repository.go:62-63`: delete выполняется только по endpoint.

#### Валидация

Для успешной атаки нужен authenticated аккаунт и значение чужого push endpoint. Endpoint обычно высокоэнтропийный и не очевиден, поэтому severity low. Тем не менее это ownership bug: authenticated boundary существует, но объект удаляется без связи с владельцем.

#### Dataflow

1. Authenticated user отправляет unsubscribe request с endpoint.
2. Handler декодирует endpoint.
3. Handler не сверяет endpoint с текущим `userID`.
4. Service вызывает repository delete.
5. Repository удаляет любую subscription с указанным endpoint.

#### Reachability

Reachable при наличии чужого endpoint. Прямая утечка endpoint в рамках этой проверки не подтверждена.

#### Severity

Low. Impact ограничен удалением push subscription, а exploitability зависит от знания чужого endpoint.

#### Remediation

- Передавать `userID` из auth context в unsubscribe service.
- Удалять subscription по паре `(user_id, endpoint)`.
- Вернуть одинаковый successful/no-op ответ, чтобы не раскрывать existence endpoint.
- Добавить regression test: пользователь A не может удалить subscription пользователя B.

## Проверенные поверхности

| Surface | Risk Area | Итог | Notes |
| --- | --- | --- | --- |
| Authentication / JWT | JWT validation | No issue found | HMAC alg enforced, sub UUID required, empty JWT secret rejected at startup; default example secret остаётся config-hardening вопросом. Evidence: `artifacts/03_coverage/repository_coverage_ledger.md` |
| Public event and invite responses | PII/token exposure | Reported | `BIMEET-BE-SEC-001`. Evidence: `artifacts/03_coverage/repository_coverage_ledger.md` |
| Receipt upload | Unsafe upload / active content | Reported | `BIMEET-BE-SEC-002`. Evidence: `artifacts/03_coverage/repository_coverage_ledger.md` |
| SMTP invite mailer | Header injection | Reported | `BIMEET-BE-SEC-003`. Evidence: `artifacts/03_coverage/repository_coverage_ledger.md` |
| Push unsubscribe | Object ownership | Reported | `BIMEET-BE-SEC-004`. Evidence: `artifacts/03_coverage/repository_coverage_ledger.md` |
| Repository SQL | SQL injection | No issue found | `pgx` parameters используются для user-controlled values; admin dynamic table names являются service-internal constants. Evidence: `artifacts/03_coverage/repository_coverage_ledger.md` |
| Avatar upload | Upload validation | No issue found | Byte sniffing и строгий allowlist `jpeg/png/webp`. Evidence: `artifacts/03_coverage/repository_coverage_ledger.md` |
| Poll voting and carpool joins | Race/business logic | No issue found | Poll upsert использует `(poll_id,user_id)`; carpool join locks row и пересчитывает inside transaction. Evidence: `artifacts/03_coverage/repository_coverage_ledger.md` |
| Admin API | Admin authorization | No issue found | Routes находятся внутри Auth, `RequireAdmin` lowercases/trims whitelist emails. Evidence: `artifacts/03_coverage/repository_coverage_ledger.md` |

## Открытые вопросы и follow-up

- Должны ли public events вообще раскрывать participant/organizer emails или invite tokens?
  - Follow-up prompt: исправить backend public event DTOs, убрать emails, `invite_token`, receipt URLs и fat private subresources, затем добавить response-shape regression tests.
- Как receipt objects отдаются в production?
  - Follow-up prompt: выполнить live MinIO/S3 integration check для receipt upload content-type и content-disposition behavior с SVG payload.
- Этот проход приоритизировал high-impact runtime/control surfaces из `docs/security.md`; непроверенные non-critical files не считаются полностью reviewed.
  - Follow-up prompt: закрыть deferred unit `full-backend-exhaustive-file-review` и его proof gap. Paths: `backend/internal/**`, `backend/cmd/**`, `backend/internal/db/migrations/**`.

## Верификация

После генерации отчёта отдельно были запущены:

- `cd backend && go test ./...` — успешно
- `cd backend && go vet ./...` — успешно

SARIF-экспорт: `exports/results.sarif`.
