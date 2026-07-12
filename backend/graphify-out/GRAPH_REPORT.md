# Graph Report - .  (2026-07-05)

## Corpus Check
- Corpus is ~45,808 words - fits in a single context window. You may not need a graph.

## Summary
- 971 nodes · 2021 edges · 44 communities detected
- Extraction: 59% EXTRACTED · 41% INFERRED · 0% AMBIGUOUS · INFERRED: 836 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Admin API|Admin API]]
- [[_COMMUNITY_Auth And Events|Auth And Events]]
- [[_COMMUNITY_Repository Queries|Repository Queries]]
- [[_COMMUNITY_Event Repository|Event Repository]]
- [[_COMMUNITY_Collection Service Tests|Collection Service Tests]]
- [[_COMMUNITY_Domain Models|Domain Models]]
- [[_COMMUNITY_HTTP Handler Tests|HTTP Handler Tests]]
- [[_COMMUNITY_Carpool Repository Mocks|Carpool Repository Mocks]]
- [[_COMMUNITY_Messages Notifications|Messages Notifications]]
- [[_COMMUNITY_Collection Contributions|Collection Contributions]]
- [[_COMMUNITY_Event Service Mocks|Event Service Mocks]]
- [[_COMMUNITY_Event Service|Event Service]]
- [[_COMMUNITY_App Bootstrap Config|App Bootstrap Config]]
- [[_COMMUNITY_HTTP Middleware|HTTP Middleware]]
- [[_COMMUNITY_Push Subscription Repo|Push Subscription Repo]]
- [[_COMMUNITY_Collection Service Mocks|Collection Service Mocks]]
- [[_COMMUNITY_User Profile|User Profile]]
- [[_COMMUNITY_Notification Service Mocks|Notification Service Mocks]]
- [[_COMMUNITY_Push Service Mocks|Push Service Mocks]]
- [[_COMMUNITY_Carpool Service Mocks|Carpool Service Mocks]]
- [[_COMMUNITY_Item Service Mocks|Item Service Mocks]]
- [[_COMMUNITY_Poll Service Mocks|Poll Service Mocks]]
- [[_COMMUNITY_Auth Service Mocks|Auth Service Mocks]]
- [[_COMMUNITY_Collection Interfaces|Collection Interfaces]]
- [[_COMMUNITY_Event Interfaces|Event Interfaces]]
- [[_COMMUNITY_Auth Interfaces|Auth Interfaces]]
- [[_COMMUNITY_Message Interfaces|Message Interfaces]]
- [[_COMMUNITY_Notification Interfaces|Notification Interfaces]]
- [[_COMMUNITY_Carpool Interfaces|Carpool Interfaces]]
- [[_COMMUNITY_Profile Interfaces|Profile Interfaces]]
- [[_COMMUNITY_Item Interfaces|Item Interfaces]]
- [[_COMMUNITY_Poll Interfaces|Poll Interfaces]]
- [[_COMMUNITY_Carpool Handler Interfaces|Carpool Handler Interfaces]]
- [[_COMMUNITY_Collection Handler Interfaces|Collection Handler Interfaces]]
- [[_COMMUNITY_Auth Handler Interfaces|Auth Handler Interfaces]]
- [[_COMMUNITY_Notification Handler Interfaces|Notification Handler Interfaces]]
- [[_COMMUNITY_Message Handler Interfaces|Message Handler Interfaces]]
- [[_COMMUNITY_Push Handler Interfaces|Push Handler Interfaces]]
- [[_COMMUNITY_Profile Handler Interfaces|Profile Handler Interfaces]]
- [[_COMMUNITY_Item Handler Interfaces|Item Handler Interfaces]]
- [[_COMMUNITY_Event Handler Interfaces|Event Handler Interfaces]]
- [[_COMMUNITY_Poll Handler Interfaces|Poll Handler Interfaces]]
- [[_COMMUNITY_Notification Repo Interfaces|Notification Repo Interfaces]]
- [[_COMMUNITY_Subscription Interfaces|Subscription Interfaces]]

## God Nodes (most connected - your core abstractions)
1. `Error()` - 108 edges
2. `New()` - 103 edges
3. `newService()` - 78 edges
4. `newRouter()` - 55 edges
5. `UserIDFromCtx()` - 48 edges
6. `JSON()` - 46 edges
7. `withAuth()` - 34 edges
8. `MockEventRepo` - 24 edges
9. `Repository` - 23 edges
10. `MockEventRepoMockRecorder` - 23 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `InitLogger()`  [INFERRED]
  cmd/server/main.go → internal/observability/log.go
- `main()` --calls--> `Error()`  [INFERRED]
  cmd/server/main.go → internal/handler/response/response.go
- `main()` --calls--> `Connect()`  [INFERRED]
  cmd/server/main.go → internal/db/db.go
- `main()` --calls--> `Migrate()`  [INFERRED]
  cmd/server/main.go → internal/db/db.go
- `main()` --calls--> `New()`  [INFERRED]
  cmd/server/main.go → internal/service/poll/service.go

## Communities

### Community 0 - "Admin API"
Cohesion: 0.06
Nodes (27): AdminService, Handler, RequireAdmin(), Service, Handler, UserIDFromCtx(), Handler, Handler (+19 more)

### Community 1 - "Auth And Events"
Cohesion: 0.07
Nodes (62): Service, Service, MockLoginCodeRepoMockRecorder, MockPollRepoMockRecorder, Service, defaultName(), generateCode(), normalizeEmail() (+54 more)

### Community 2 - "Repository Queries"
Cohesion: 0.03
Nodes (12): Repository, Repository, Repository, Repository, Repository, Repository, Repository, Repository (+4 more)

### Community 3 - "Event Repository"
Cohesion: 0.04
Nodes (35): Auth(), WithUserID(), Repository, FromContext(), InitLogger(), parseLevel(), Span(), TestFromContext_FallsBackToDefault() (+27 more)

### Community 4 - "Collection Service Tests"
Cohesion: 0.03
Nodes (14): MockCollectionRepo, MockLoginCodeRepo, MockMailer, MockMailerMockRecorder, MockNotificationRepo, MockNotificationRepoMockRecorder, MockUserRepo, MockUserRepoMockRecorder (+6 more)

### Community 5 - "Domain Models"
Cohesion: 0.03
Nodes (61): AdminDistribution, AdminDistributionItem, AdminEventRow, AdminOverview, AdminTimeseries, AdminTimeseriesPoint, AdminUserRow, AuthResponse (+53 more)

### Community 6 - "HTTP Handler Tests"
Cohesion: 0.13
Nodes (42): Repo, newRouter(), post(), TestCreate_Forbidden(), TestCreate_HappyPath(), TestCreate_InvalidBody(), TestCreate_ValidationError(), TestDelete_Forbidden() (+34 more)

### Community 7 - "Carpool Repository Mocks"
Cohesion: 0.04
Nodes (10): MockCarpoolRepo, MockCarpoolRepoMockRecorder, MockEventRepo, MockItemRepo, MockItemRepoMockRecorder, MockPollRepo, NewMockCarpoolRepo(), NewMockEventRepo() (+2 more)

### Community 8 - "Messages Notifications"
Cohesion: 0.06
Nodes (11): Service, MockMessageRepo, MockMessageRepoMockRecorder, MockNotifier, MockNotifierMockRecorder, NewMockMessageRepo(), NewMockNotifier(), Creator (+3 more)

### Community 9 - "Collection Contributions"
Cohesion: 0.11
Nodes (6): Service, Service, MockCollectionRepoMockRecorder, isAllowedReceiptType(), TestSummary_Forbidden(), TestSummary_HappyPath()

### Community 10 - "Event Service Mocks"
Cohesion: 0.07
Nodes (3): MockEventService, MockEventServiceMockRecorder, NewMockEventService()

### Community 11 - "Event Service"
Cohesion: 0.15
Nodes (3): Service, MockEventRepoMockRecorder, isNotFound()

### Community 12 - "App Bootstrap Config"
Cohesion: 0.11
Nodes (14): Config, Load(), parseAdminEmails(), parseBool(), parseCSV(), Connect(), Migrate(), fatal() (+6 more)

### Community 13 - "HTTP Middleware"
Cohesion: 0.14
Nodes (15): CORS(), corsResponse(), TestCORS_DevFallbackAllowsAny(), TestCORS_RestrictedAllowsListedOrigin(), TestCORS_RestrictedBlocksUnlistedOrigin(), RateLimitAuth(), rateLimitExceeded(), RateLimitGlobal() (+7 more)

### Community 14 - "Push Subscription Repo"
Cohesion: 0.13
Nodes (5): MockSubscriptionRepo, MockSubscriptionRepoMockRecorder, Config, payload, Service

### Community 15 - "Collection Service Mocks"
Cohesion: 0.1
Nodes (3): MockCollectionService, MockCollectionServiceMockRecorder, NewMockCollectionService()

### Community 16 - "User Profile"
Cohesion: 0.15
Nodes (4): noopUploader, Service, scanUser(), Repository

### Community 17 - "Notification Service Mocks"
Cohesion: 0.13
Nodes (3): MockNotificationService, MockNotificationServiceMockRecorder, NewMockNotificationService()

### Community 18 - "Push Service Mocks"
Cohesion: 0.15
Nodes (2): MockPushService, MockPushServiceMockRecorder

### Community 19 - "Carpool Service Mocks"
Cohesion: 0.18
Nodes (3): MockCarpoolService, MockCarpoolServiceMockRecorder, NewMockCarpoolService()

### Community 20 - "Item Service Mocks"
Cohesion: 0.18
Nodes (3): MockItemService, MockItemServiceMockRecorder, NewMockItemService()

### Community 21 - "Poll Service Mocks"
Cohesion: 0.18
Nodes (3): MockPollService, MockPollServiceMockRecorder, NewMockPollService()

### Community 22 - "Auth Service Mocks"
Cohesion: 0.22
Nodes (3): MockAuthService, MockAuthServiceMockRecorder, NewMockAuthService()

### Community 23 - "Collection Interfaces"
Cohesion: 0.4
Nodes (4): CollectionRepo, EventRepo, NotificationRepo, Uploader

### Community 24 - "Event Interfaces"
Cohesion: 0.4
Nodes (4): EventRepo, Mailer, NotificationRepo, UserRepo

### Community 25 - "Auth Interfaces"
Cohesion: 0.5
Nodes (3): LoginCodeRepo, Mailer, UserRepo

### Community 26 - "Message Interfaces"
Cohesion: 0.5
Nodes (3): EventRepo, MessageRepo, Notifier

### Community 27 - "Notification Interfaces"
Cohesion: 0.67
Nodes (2): EventRepo, NotificationRepo

### Community 28 - "Carpool Interfaces"
Cohesion: 0.67
Nodes (2): CarpoolRepo, EventRepo

### Community 29 - "Profile Interfaces"
Cohesion: 0.67
Nodes (2): AvatarStorage, UserRepo

### Community 30 - "Item Interfaces"
Cohesion: 0.67
Nodes (2): EventRepo, ItemRepo

### Community 31 - "Poll Interfaces"
Cohesion: 0.67
Nodes (2): EventRepo, PollRepo

### Community 32 - "Carpool Handler Interfaces"
Cohesion: 1.0
Nodes (1): CarpoolService

### Community 33 - "Collection Handler Interfaces"
Cohesion: 1.0
Nodes (1): CollectionService

### Community 34 - "Auth Handler Interfaces"
Cohesion: 1.0
Nodes (1): AuthService

### Community 35 - "Notification Handler Interfaces"
Cohesion: 1.0
Nodes (1): NotificationService

### Community 36 - "Message Handler Interfaces"
Cohesion: 1.0
Nodes (1): MessageService

### Community 37 - "Push Handler Interfaces"
Cohesion: 1.0
Nodes (1): PushService

### Community 38 - "Profile Handler Interfaces"
Cohesion: 1.0
Nodes (1): ProfileService

### Community 39 - "Item Handler Interfaces"
Cohesion: 1.0
Nodes (1): ItemService

### Community 40 - "Event Handler Interfaces"
Cohesion: 1.0
Nodes (1): EventService

### Community 41 - "Poll Handler Interfaces"
Cohesion: 1.0
Nodes (1): PollService

### Community 42 - "Notification Repo Interfaces"
Cohesion: 1.0
Nodes (1): NotificationRepo

### Community 43 - "Subscription Interfaces"
Cohesion: 1.0
Nodes (1): SubscriptionRepo

## Knowledge Gaps
- **113 isolated node(s):** `CarpoolService`, `CollectionService`, `payload`, `AuthService`, `NotificationService` (+108 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Carpool Handler Interfaces`** (2 nodes): `CarpoolService`, `interfaces.go`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Collection Handler Interfaces`** (2 nodes): `CollectionService`, `interfaces.go`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth Handler Interfaces`** (2 nodes): `AuthService`, `interfaces.go`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Notification Handler Interfaces`** (2 nodes): `interfaces.go`, `NotificationService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Message Handler Interfaces`** (2 nodes): `interfaces.go`, `MessageService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Push Handler Interfaces`** (2 nodes): `interfaces.go`, `PushService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Profile Handler Interfaces`** (2 nodes): `interfaces.go`, `ProfileService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Item Handler Interfaces`** (2 nodes): `interfaces.go`, `ItemService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Event Handler Interfaces`** (2 nodes): `EventService`, `interfaces.go`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Poll Handler Interfaces`** (2 nodes): `interfaces.go`, `PollService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Notification Repo Interfaces`** (2 nodes): `interfaces.go`, `NotificationRepo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Subscription Interfaces`** (2 nodes): `interfaces.go`, `SubscriptionRepo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Error()` connect `Admin API` to `Auth And Events`, `Event Repository`, `HTTP Handler Tests`, `Collection Contributions`, `Event Service`, `App Bootstrap Config`, `Push Subscription Repo`?**
  _High betweenness centrality (0.257) - this node is a cross-community bridge._
- **Why does `newRouter()` connect `HTTP Handler Tests` to `Auth And Events`, `Event Repository`, `Messages Notifications`, `Event Service Mocks`, `App Bootstrap Config`, `HTTP Middleware`, `Collection Service Mocks`, `Notification Service Mocks`, `Carpool Service Mocks`, `Item Service Mocks`, `Poll Service Mocks`, `Auth Service Mocks`?**
  _High betweenness centrality (0.197) - this node is a cross-community bridge._
- **Why does `Repository` connect `Event Repository` to `Repository Queries`?**
  _High betweenness centrality (0.157) - this node is a cross-community bridge._
- **Are the 106 inferred relationships involving `Error()` (e.g. with `main()` and `fatal()`) actually correct?**
  _`Error()` has 106 INFERRED edges - model-reasoned connections that need verification._
- **Are the 92 inferred relationships involving `New()` (e.g. with `main()` and `newRouter()`) actually correct?**
  _`New()` has 92 INFERRED edges - model-reasoned connections that need verification._
- **Are the 12 inferred relationships involving `newService()` (e.g. with `NewMockCarpoolRepo()` and `NewMockEventRepo()`) actually correct?**
  _`newService()` has 12 INFERRED edges - model-reasoned connections that need verification._
- **Are the 13 inferred relationships involving `newRouter()` (e.g. with `main()` and `NewRouter()`) actually correct?**
  _`newRouter()` has 13 INFERRED edges - model-reasoned connections that need verification._