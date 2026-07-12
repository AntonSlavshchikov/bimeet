# Отчёт о проверке безопасности backend Bimeet

Дата проверки: 12 июля 2026 года  
Проверенная ревизия: `24e7d463c241d31c51bc6b8a1a58e0a478f5f880`  
Область: `backend/`

## Краткий итог

Проверен Go backend: HTTP-маршруты, middleware, сервисы, репозитории,
PostgreSQL-миграции, JWT, одноразовые коды входа, приглашения, S3/MinIO,
SMTP/Resend, Web Push и OpenTelemetry.

| Уровень | Количество |
|---|---:|
| High | 2 |
| Medium | 14 |
| Low | 6 |
| **Всего** | **22** |

- В детальный review попали 118 из 118 отобранных runtime/security-control файлов.
- Исходная инвентаризация содержала 280 текстовых артефактов; generated graph cache,
  mocks, тесты и сгенерированный Swagger не рассматривались как production-код.
- Все кандидаты прошли отдельные этапы discovery, validation и attack-path analysis.
- Проверка была статической с безопасным запуском существующих тестов. Production и
  внешние сервисы не атаковывались.

## High

### 1. ✅ Исправлено — участники события получают URL платёжных чеков других пользователей

**Статус:** исправлено в рабочем дереве 12 июля 2026 года.

`EventDetail` теперь фильтруется в service-слое: организатор видит все чеки,
участник — только собственный, URL чеков остальных участников отсутствуют в JSON.
Добавлены regression-тесты service- и handler-слоёв. Публичность самого bucket
остаётся отдельной находкой №4.

Затронутые места:

- `backend/internal/handler/event/handler.go:100`
- `backend/internal/service/event/service.go:65`
- `backend/internal/repository/event/repository.go:335`
- `backend/internal/model/model.go:361`

`EventDetail` включает ненулевые `receipt_url` всех взносов и возвращается любому
пользователю, для которого существует запись участника, независимо от его статуса.
При этом просмотр и подтверждение чеков в продукте предназначены организатору.
В bundled-конфигурации MinIO объекты доступны анонимно, поэтому полученного URL
достаточно для чтения изображения или PDF с возможными финансовыми и персональными
данными.

Рекомендация: убрать `receipt_url` из общего `EventDetail`. Выдавать чек только его
владельцу и организатору через отдельный авторизованный endpoint. Хранить чеки в
закрытом bucket и использовать короткоживущие signed URL.

### 2. ✅ Исправлено — Event detail раскрывает organizer-only invite token всем участникам

**Статус:** исправлено в рабочем дереве 12 июля 2026 года.

Поле `EventDetail.invite_token` стало опциональным и удаляется из ответа для всех
неорганизаторов. Организатор продолжает получать токен для копирования ссылки.
Добавлены regression-тесты фактической JSON-формы ответа. Утечка токена через
список событий остаётся отдельной находкой №9, отсутствие срока жизни — №10.

Затронутые места:

- `backend/internal/handler/event/handler.go:100`
- `backend/internal/service/event/service.go:65`
- `backend/internal/repository/event/repository.go:244`
- `backend/internal/model/model.go:427`

Обычный, приглашённый или отказавшийся участник получает постоянный
`invite_token`. Токен можно передать произвольному аутентифицированному аккаунту,
который затем станет подтверждённым участником и получит доступ к приватным данным
события, истории чата и participant-only операциям.

Рекомендация: убрать токен из participant-facing DTO. Получение, ротация и отзыв
invite token должны быть отдельными organizer-only операциями.

## Medium

### 3. Production допускает фиксированный код входа

Файлы: `internal/config/config.go:129`, `internal/service/auth/service.go:84`,
`cmd/server/main.go:74`.

При `AUTH_TEST=true` код всегда равен `120401`. Значение не связано с `APP_ENV`, а
production startup не запрещает тестовый режим. При ошибочной конфигурации атакующий
может запросить код для любого email и получить JWT без доступа к почтовому ящику.

Исправление: завершать startup с ошибкой, если `APP_ENV=production` и включён
`AUTH_TEST`; тестовый код лучше вынести в test-only constructor/build.

### 4. Платёжные чеки хранятся как анонимно доступные объекты

Файлы: `internal/service/collection/service.go:132`, `internal/storage/s3.go:24`,
`docker-compose.prod.yml:87`.

Backend сохраняет постоянный прямой URL без авторизации, срока действия или signed
retrieval. Bundled MinIO делает общий bucket публичным. Самостоятельно угадать ключ
сложно, но любой обладатель URL сохраняет доступ к документу.

Исправление: закрытый bucket, авторизованная загрузка через backend либо signed URL
с коротким TTL.

### 5. Race condition обходит лимит попыток одноразового кода

Файлы: `internal/service/auth/service.go:129`,
`internal/repository/loginrepo/repository.go:65`.

Параллельные запросы читают одинаковое старое значение `attempts`, выполняют bcrypt
до обновления счётчика и затем независимо инкрементируют строку. Десять запросов с
одного IP могут проверить десять вариантов вместо заявленных пяти, не сжигая код
внутри этой группы.

Исправление: блокировать строку или атомарно обновлять её с условием
`used=false AND attempts < 5`; JWT выдавать только победившей транзакции.

### 6. Cross-event IDOR при отклонении contribution

Файлы: `internal/handler/collection/handler.go:315`,
`internal/service/collection/service.go:188`,
`internal/repository/collection/repository.go:150`.

Сервис проверяет, что пользователь организует событие из URL, и что contribution
принадлежит указанной collection, но не проверяет принадлежность collection этому
событию. Организатор собственного события может отклонить pending contribution из
чужого события, сбросить статус и удалить ссылку на чек из БД.

Исправление: проверять `collection.EventID == eventID` и выполнять mutation SQL,
ограниченный всеми parent ID.

### 7. Cross-event IDOR при подтверждении contribution

Файлы: `internal/handler/collection/handler.go:259`,
`internal/service/collection/service.go:152`,
`internal/repository/collection/repository.go:134`.

Причина аналогична предыдущей: отсутствует связь `collection -> event` относительно
event ID из маршрута. В результате можно отметить чужой pending contribution как
оплаченный.

Исправление: scoped authorization и SQL update по `event_id`, `collection_id` и
`contribution_id` в одной операции.

### 8. При отсутствии mail transport одноразовые коды попадают в логи

Файлы: `internal/service/mailer/mailer.go:70`,
`internal/service/mailer/mailer.go:90`, `internal/service/auth/service.go:106`.

Если не настроены Resend и SMTP, fallback логирует email и тему письма, содержащую
активный код входа. Пользователь получает успешный ответ, но письмо не отправляется.
Читатель Loki/Docker logs может обменять код на JWT выбранного аккаунта.

Исправление: никогда не логировать коды; в production считать отсутствие mail
transport фатальной ошибкой конфигурации.

### 9. Event list раскрывает invite token неорганизаторам

Файлы: `internal/handler/event/handler.go:33`,
`internal/repository/event/repository.go:560`, `internal/model/model.go:452`.

Тот же reusable invite capability возвращается через список событий, включая
пользователей со статусом `invited` или `declined`.

Исправление: отдельные DTO для организатора и участника; токен отсутствует во всех
list/detail ответах для неорганизаторов.

### 10. Invite token позволяет вступить в завершённое событие

Файлы: `internal/handler/event/handler.go:164`,
`internal/service/event/service.go:134`,
`internal/repository/event/repository.go:122`.

Token join не проверяет `event.status`. Старый токен создаёт подтверждённое
membership после завершения события, открывая историю и participant-only API.

Исправление: разрешать join только для `active` event и ротировать/отзывать токен
при завершении.

### 11. Web Push запросы не имеют deadline и могут накапливать goroutine/socket

Файлы: `internal/service/push/service.go:94`,
`internal/service/push/service.go:131`, `internal/notify/notify.go:65`.

Пользователь может сохранить много endpoint. Push library использует клиент без
общего timeout/response-header timeout и местами заменяет context на
`context.Background()`. Медленный endpoint удерживает goroutine и соединение
неограниченно долго.

Исправление: HTTP client с total и response-header timeout, сохранение request
context, лимит подписок и ограниченный worker pool.

### 12. Подделка `True-Client-IP` обходит rate limit

Файлы: `internal/handler/router.go:57`, `internal/middleware/ratelimit.go:33`.

Chi `RealIP` доверяет `True-Client-IP`, а bundled Nginx/Traefik chain не удаляет этот
клиентский заголовок. Меняя корректные IP-литералы, атакующий создаёт новые buckets
для global и auth rate limits.

Исправление: удалять forwarding headers на внешнем ingress, принимать их только от
доверенного proxy и рассчитывать client IP по списку trusted hops.

### 13. SMTP может передавать login codes и invite tokens без TLS

Файлы: `internal/service/mailer/mailer.go:59`,
`internal/service/mailer/mailer.go:193`, `internal/service/mailer/mailer.go:213`.

Соединение начинается в plaintext, а STARTTLS используется только если его
объявляет сервер. Для anonymous SMTP без `SMTP_USER` письмо будет отправлено даже
при отсутствии TLS. На наблюдаемом сетевом участке можно перехватить код или токен.

Исправление: в production требовать проверенный TLS до `DATA`; запрещать anonymous
plaintext SMTP.

### 14. Аутентифицированный SSRF через произвольный push endpoint

Файлы: `internal/handler/push/handler.go:40`,
`internal/service/push/service.go:131`,
`internal/repository/pushsub/repository.go:23`.

`/api/push/subscribe` сохраняет URL без проверки, а `/api/push/test` передаёт его в
обычный redirect-following HTTP client. Пользователь может обращаться к внутренним
Docker/LAN endpoints и получать до 512 байт тела non-2xx ответа.

Исправление: разрешать только HTTPS endpoints известных push-провайдеров,
запрещать private/link-local IP после DNS resolution и повторять проверку после
каждого redirect либо полностью запретить redirects.

### 15. Production может молча хранить chat messages в plaintext

Файлы: `internal/config/config.go:149`, `cmd/server/main.go:122`,
`internal/secret/cipher.go:56`, `internal/repository/message/repository.go:74`.

Пустой `CHAT_ENCRYPTION_KEY` включает pass-through cipher независимо от `APP_ENV`.
Startup только пишет информационный лог. Сообщения сохраняются в БД без шифрования.

Исправление: обязательный ключ в production, явная миграция plaintext rows и
процедура ротации ключа.

### 16. Пользователи со статусом `declined` читают историю чата и email авторов

Файлы: `internal/service/message/service.go:119`,
`internal/repository/event/repository.go:652`,
`internal/repository/message/repository.go:46`.

`IsParticipant` проверяет только существование строки, а не статус. Отказавшийся от
участия пользователь продолжает получать расшифрованные сообщения, reply preview и
email авторов.

Исправление: определить продуктовую политику явно и требовать `confirmed`/активный
статус для чтения чата; минимизировать PII в message DTO.

## Low

### 17. Race между resubmit и confirm contribution

`SubmitContribution` и `ConfirmContribution` выполняют независимые read/check/write
операции. В гонке организатор может подтвердить старый чек, а итоговая строка будет
содержать новый, либо поздний submit вернёт оплаченный взнос в `pending`.

Исправление: version/receipt ID, conditional transitions и row lock в транзакции.

### 18. Приглашённые пользователи подтверждаются сверх `max_guests`

Self-confirm меняет статус без проверки активности события, количества гостей и без
блокировки event row. Использовать общий атомарный capacity transition.

### 19. OpenTelemetry экспортирует invite token в `http.target`

Глобальный `otelchi` сохраняет raw `RequestURI`; route template не удаляет UUID из
`http.target`. Читатель telemetry может получить постоянный invite token.

Исправление: редактировать capability-bearing path до записи span attributes или
отключить raw target для таких маршрутов.

### 20. SMTP exchange не имеет deadlines после установки TCP

10-секундный timeout ограничивает только dial. Greeting, STARTTLS, AUTH, DATA и QUIT
могут зависнуть. Нужны socket deadlines, context и лимит delivery workers.

### 21. Join по invite token игнорирует `max_guests`

Token join напрямую upsert'ит confirmed participant и не использует защищённый
`FOR UPDATE` capacity flow публичного join. Все варианты вступления должны идти
через одну атомарную state transition.

### 22. Avatar upload не имеет жёсткого лимита request body

`ParseMultipartForm(5 MiB)` задаёт memory threshold, а не максимальный размер тела.
Большой файл полностью читается и spill'ится во временный файл, после чего может
быть отправлен в S3.

Исправление: `http.MaxBytesReader` до multipart parsing и streaming byte limit.

## Что было отклонено или оставлено только для hardening

После validation/policy adjustment в итоговые находки не вошли:

- повторная выдача нескольких эквивалентных JWT по уже известному корректному коду;
- panic-only логирование invite path без достижимого production panic;
- duplicate reminders, не пересекающие границу доступа;
- перенос ownership push subscription при штатной смене аккаунта в одном браузере;
- очистка чужих item assignments как обратимый same-event product defect;
- orphaned receipt/avatar objects как самостоятельные findings без отдельного пути
  получения URL;
- plaintext OTLP transport: дефект подтверждён, но bundled production route остаётся
  внутри host-local Docker bridge; реальная topology требует отдельной проверки.

## Проверки и ограничения

- `go test ./...` — успешно.
- `go vet ./...` — успешно.
- `go test -race ./...` — не выполнен: установленный race runtime не смог разрешить
  module packages. Это ограничение среды, а не доказательство отсутствия гонок.
- PostgreSQL, S3, SMTP, Web Push и OTLP не поднимались для live DAST.
- Production-конфигурация и внешние ACL не читались; условные findings явно отмечены.

## Рекомендуемый порядок исправлений

1. Убрать invite token и receipt URL из общих event DTO; закрыть receipt bucket.
2. Исправить cross-event binding contribution и покрыть confirm/reject тестами IDOR.
3. Запретить `AUTH_TEST` и пустой `CHAT_ENCRYPTION_KEY`/mail transport в production.
4. Сделать login-code attempts и event capacity атомарными DB transitions.
5. Ограничить Web Push destinations, redirects, timeout, fan-out и число подписок.
6. Настроить trusted proxy IP extraction и удалить клиентские forwarding headers.
7. Добавить жёсткие upload limits, SMTP TLS/deadlines и редактирование telemetry.

Для каждой исправленной проблемы следует добавить regression test с отдельными
actor'ами и подменой всех parent/nested ID, а для state transitions — конкурентный
тест на PostgreSQL.
