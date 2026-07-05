# Graph Report - .  (2026-07-05)

## Corpus Check
- 122 files · ~37,566 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 284 nodes · 206 edges · 108 communities detected
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Page Event Form|Page Event Form]]
- [[_COMMUNITY_Feature Notifications|Feature Notifications]]
- [[_COMMUNITY_Shared Frontend Node|Shared Frontend Node]]
- [[_COMMUNITY_Page Events List|Page Events List]]
- [[_COMMUNITY_Widget Event Detail|Widget Event Detail]]
- [[_COMMUNITY_Widget Event Card|Widget Event Card]]
- [[_COMMUNITY_Feature Event Manage|Feature Event Manage]]
- [[_COMMUNITY_Feature Collections|Feature Collections]]
- [[_COMMUNITY_Entity Admin Stats|Entity Admin Stats]]
- [[_COMMUNITY_Feature Chat|Feature Chat]]
- [[_COMMUNITY_Page Login|Page Login]]
- [[_COMMUNITY_Frontend Node|Frontend Node]]
- [[_COMMUNITY_Feature Notifications|Feature Notifications]]
- [[_COMMUNITY_Feature Collections|Feature Collections]]
- [[_COMMUNITY_Shared Mini Calendar|Shared Mini Calendar]]
- [[_COMMUNITY_Shared Avatar|Shared Avatar]]
- [[_COMMUNITY_Shared Format Date|Shared Format Date]]
- [[_COMMUNITY_Shared Frontend Node|Shared Frontend Node]]
- [[_COMMUNITY_Entity Event|Entity Event]]
- [[_COMMUNITY_Feature Participants|Feature Participants]]
- [[_COMMUNITY_Feature Participants|Feature Participants]]
- [[_COMMUNITY_Feature Chat|Feature Chat]]
- [[_COMMUNITY_Feature Polls|Feature Polls]]
- [[_COMMUNITY_Feature Carpools|Feature Carpools]]
- [[_COMMUNITY_Feature Items|Feature Items]]
- [[_COMMUNITY_Shared Error Boundary|Shared Error Boundary]]
- [[_COMMUNITY_Shared Dialog|Shared Dialog]]
- [[_COMMUNITY_Shared Toast|Shared Toast]]
- [[_COMMUNITY_Shared Frontend Node|Shared Frontend Node]]
- [[_COMMUNITY_Shared Client|Shared Client]]
- [[_COMMUNITY_Shared Client Test|Shared Client Test]]
- [[_COMMUNITY_Page Admin Panel|Page Admin Panel]]
- [[_COMMUNITY_Page Profile|Page Profile]]
- [[_COMMUNITY_Readme|Readme]]
- [[_COMMUNITY_App Frontend Node|App Frontend Node]]
- [[_COMMUNITY_App Frontend Node|App Frontend Node]]
- [[_COMMUNITY_App Frontend Node|App Frontend Node]]
- [[_COMMUNITY_Feature Location Picker|Feature Location Picker]]
- [[_COMMUNITY_Feature Auth|Feature Auth]]
- [[_COMMUNITY_Feature Polls|Feature Polls]]
- [[_COMMUNITY_Feature Carpools|Feature Carpools]]
- [[_COMMUNITY_Feature Items|Feature Items]]
- [[_COMMUNITY_Shared Brand Mark|Shared Brand Mark]]
- [[_COMMUNITY_Shared Search Input|Shared Search Input]]
- [[_COMMUNITY_Shared Rail Card|Shared Rail Card]]
- [[_COMMUNITY_Shared Event Tag|Shared Event Tag]]
- [[_COMMUNITY_Shared Status Pill|Shared Status Pill]]
- [[_COMMUNITY_Shared Otp Input|Shared Otp Input]]
- [[_COMMUNITY_Shared Drawer|Shared Drawer]]
- [[_COMMUNITY_Shared Stat Cell|Shared Stat Cell]]
- [[_COMMUNITY_Shared Kbd|Shared Kbd]]
- [[_COMMUNITY_Shared Time Cell|Shared Time Cell]]
- [[_COMMUNITY_Shared Date Cell|Shared Date Cell]]
- [[_COMMUNITY_Shared Test|Shared Test]]
- [[_COMMUNITY_Shared Pwaupdater|Shared Pwaupdater]]
- [[_COMMUNITY_Shared Cn|Shared Cn]]
- [[_COMMUNITY_Widget Layout|Widget Layout]]
- [[_COMMUNITY_Widget Layout|Widget Layout]]
- [[_COMMUNITY_Entity Notification|Entity Notification]]
- [[_COMMUNITY_Eslint Config|Eslint Config]]
- [[_COMMUNITY_Vite Config|Vite Config]]
- [[_COMMUNITY_Vitest Config|Vitest Config]]
- [[_COMMUNITY_Main|Main]]
- [[_COMMUNITY_Sw|Sw]]
- [[_COMMUNITY_Vite Env D|Vite Env D]]
- [[_COMMUNITY_Feature Event Manage|Feature Event Manage]]
- [[_COMMUNITY_Feature Chat|Feature Chat]]
- [[_COMMUNITY_Feature Auth|Feature Auth]]
- [[_COMMUNITY_Feature Auth|Feature Auth]]
- [[_COMMUNITY_Feature Polls|Feature Polls]]
- [[_COMMUNITY_Feature Carpools|Feature Carpools]]
- [[_COMMUNITY_Feature Items|Feature Items]]
- [[_COMMUNITY_Feature Collections|Feature Collections]]
- [[_COMMUNITY_Feature Notifications|Feature Notifications]]
- [[_COMMUNITY_Feature Notifications|Feature Notifications]]
- [[_COMMUNITY_Shared Popover|Shared Popover]]
- [[_COMMUNITY_Shared Tooltip|Shared Tooltip]]
- [[_COMMUNITY_Shared Segmented Control|Shared Segmented Control]]
- [[_COMMUNITY_Shared Frontend Node|Shared Frontend Node]]
- [[_COMMUNITY_Shared Separator|Shared Separator]]
- [[_COMMUNITY_Shared Button|Shared Button]]
- [[_COMMUNITY_Shared Dropdown Menu|Shared Dropdown Menu]]
- [[_COMMUNITY_Shared Select|Shared Select]]
- [[_COMMUNITY_Shared Textarea|Shared Textarea]]
- [[_COMMUNITY_Shared Input|Shared Input]]
- [[_COMMUNITY_Shared Event Accent Color Test|Shared Event Accent Color Test]]
- [[_COMMUNITY_Shared Format Date Test|Shared Format Date Test]]
- [[_COMMUNITY_Shared Frontend Node|Shared Frontend Node]]
- [[_COMMUNITY_Page Admin Panel|Page Admin Panel]]
- [[_COMMUNITY_Page Admin Panel|Page Admin Panel]]
- [[_COMMUNITY_Page Admin Panel|Page Admin Panel]]
- [[_COMMUNITY_Page Design System|Page Design System]]
- [[_COMMUNITY_Page Notifications|Page Notifications]]
- [[_COMMUNITY_Widget Event Detail|Widget Event Detail]]
- [[_COMMUNITY_Widget Admin Line Chart|Widget Admin Line Chart]]
- [[_COMMUNITY_Widget Admin Kpi Card|Widget Admin Kpi Card]]
- [[_COMMUNITY_Entity Carpool|Entity Carpool]]
- [[_COMMUNITY_Entity Collection|Entity Collection]]
- [[_COMMUNITY_Entity Notification|Entity Notification]]
- [[_COMMUNITY_Entity Notification|Entity Notification]]
- [[_COMMUNITY_Entity Message|Entity Message]]
- [[_COMMUNITY_Entity User|Entity User]]
- [[_COMMUNITY_Entity Item|Entity Item]]
- [[_COMMUNITY_Entity Admin Stats|Entity Admin Stats]]
- [[_COMMUNITY_Entity Admin Stats|Entity Admin Stats]]
- [[_COMMUNITY_Entity Event|Entity Event]]
- [[_COMMUNITY_Entity Event|Entity Event]]
- [[_COMMUNITY_Entity Poll|Entity Poll]]

## God Nodes (most connected - your core abstractions)
1. `t()` - 9 edges
2. `enablePush()` - 6 edges
3. `isPushSupported()` - 5 edges
4. `getPushState()` - 5 edges
5. `getRegistration()` - 5 edges
6. `useAuth()` - 4 edges
7. `handleEnable()` - 4 edges
8. `HTML App Shell` - 4 edges
9. `LocationMap()` - 3 edges
10. `AdminRoute()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `handleEnable()` --calls--> `enablePush()`  [INFERRED]
  src/features/push/ui/PushSettings.tsx → src/shared/push/index.ts
- `handleEnable()` --calls--> `getPushState()`  [INFERRED]
  src/features/push/ui/PushSettings.tsx → src/shared/push/index.ts
- `handleDisable()` --calls--> `disablePush()`  [INFERRED]
  src/features/push/ui/PushSettings.tsx → src/shared/push/index.ts
- `sendCode()` --calls--> `t()`  [INFERRED]
  src/pages/login/index.tsx → src/pages/event-form/index.tsx
- `useMobileTitle()` --calls--> `t()`  [INFERRED]
  src/widgets/layout/index.tsx → src/pages/event-form/index.tsx

## Hyperedges (group relationships)
- **Bimeet iOS PWA Startup Experience** — index_bimeet, index_html_app_shell, index_ios_pwa_splash_screens, index_saved_theme_bootstrap_script [EXTRACTED 1.00]

## Communities

### Community 0 - "Page Event Form"
Cohesion: 0.12
Nodes (9): handleSubmit(), sendTestPush(), t(), useMobileTitle(), LocationMap(), handleDisable(), handleEnable(), handleTest() (+1 more)

### Community 1 - "Feature Notifications"
Cohesion: 0.14
Nodes (7): AdminRoute(), AppBadgeSync(), BadgeSync(), useAuth(), useNotifications(), isAdmin(), ProtectedRoute()

### Community 2 - "Shared Frontend Node"
Cohesion: 0.35
Nodes (11): disablePush(), enablePush(), getPushState(), getRegistration(), getVapidPublicKey(), isIOS(), isPushEnabled(), isPushSupported() (+3 more)

### Community 3 - "Page Events List"
Cohesion: 0.24
Nodes (3): groupEvents(), isSameDay(), pluralEvents()

### Community 4 - "Widget Event Detail"
Cohesion: 0.25
Nodes (4): formatDate(), formatTime(), formatDate(), handleJoin()

### Community 5 - "Widget Event Card"
Cohesion: 0.29
Nodes (5): eventAccentColor(), cn(), EventListRow(), formatRowTime(), ListRow()

### Community 6 - "Feature Event Manage"
Cohesion: 0.29
Nodes (0): 

### Community 7 - "Feature Collections"
Cohesion: 0.29
Nodes (0): 

### Community 8 - "Entity Admin Stats"
Cohesion: 0.29
Nodes (0): 

### Community 9 - "Feature Chat"
Cohesion: 0.33
Nodes (0): 

### Community 10 - "Page Login"
Cohesion: 0.47
Nodes (4): continueAfterLogin(), handleEmailSubmit(), sendCode(), submitCode()

### Community 11 - "Frontend Node"
Cohesion: 0.33
Nodes (6): Bimeet, First Paint Flash Prevention Rationale, HTML App Shell, iOS PWA Splash Screens, src/main.tsx Module Entry, Saved Theme Bootstrap Script

### Community 12 - "Feature Notifications"
Cohesion: 0.4
Nodes (0): 

### Community 13 - "Feature Collections"
Cohesion: 0.5
Nodes (0): 

### Community 14 - "Shared Mini Calendar"
Cohesion: 0.5
Nodes (0): 

### Community 15 - "Shared Avatar"
Cohesion: 0.5
Nodes (0): 

### Community 16 - "Shared Format Date"
Cohesion: 0.5
Nodes (0): 

### Community 17 - "Shared Frontend Node"
Cohesion: 0.83
Nodes (3): clearBadge(), isBadgeSupported(), setBadge()

### Community 18 - "Entity Event"
Cohesion: 0.5
Nodes (0): 

### Community 19 - "Feature Participants"
Cohesion: 0.67
Nodes (0): 

### Community 20 - "Feature Participants"
Cohesion: 0.67
Nodes (0): 

### Community 21 - "Feature Chat"
Cohesion: 1.0
Nodes (2): onKeyDown(), submit()

### Community 22 - "Feature Polls"
Cohesion: 0.67
Nodes (0): 

### Community 23 - "Feature Carpools"
Cohesion: 0.67
Nodes (0): 

### Community 24 - "Feature Items"
Cohesion: 0.67
Nodes (0): 

### Community 25 - "Shared Error Boundary"
Cohesion: 0.67
Nodes (0): 

### Community 26 - "Shared Dialog"
Cohesion: 0.67
Nodes (0): 

### Community 27 - "Shared Toast"
Cohesion: 0.67
Nodes (0): 

### Community 28 - "Shared Frontend Node"
Cohesion: 0.67
Nodes (0): 

### Community 29 - "Shared Client"
Cohesion: 1.0
Nodes (2): apiFetch(), getToken()

### Community 30 - "Shared Client Test"
Cohesion: 0.67
Nodes (0): 

### Community 31 - "Page Admin Panel"
Cohesion: 0.67
Nodes (0): 

### Community 32 - "Page Profile"
Cohesion: 0.67
Nodes (0): 

### Community 33 - "Readme"
Cohesion: 0.67
Nodes (3): ESLint Rules, React TypeScript Vite Template, Type-Aware Lint Rules

### Community 34 - "App Frontend Node"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "App Frontend Node"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "App Frontend Node"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Feature Location Picker"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Feature Auth"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Feature Polls"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Feature Carpools"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Feature Items"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Shared Brand Mark"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Shared Search Input"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Shared Rail Card"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Shared Event Tag"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Shared Status Pill"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Shared Otp Input"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Shared Drawer"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Shared Stat Cell"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Shared Kbd"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Shared Time Cell"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "Shared Date Cell"
Cohesion: 1.0
Nodes (0): 

### Community 53 - "Shared Test"
Cohesion: 1.0
Nodes (0): 

### Community 54 - "Shared Pwaupdater"
Cohesion: 1.0
Nodes (0): 

### Community 55 - "Shared Cn"
Cohesion: 1.0
Nodes (0): 

### Community 56 - "Widget Layout"
Cohesion: 1.0
Nodes (0): 

### Community 57 - "Widget Layout"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "Entity Notification"
Cohesion: 1.0
Nodes (0): 

### Community 59 - "Eslint Config"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "Vite Config"
Cohesion: 1.0
Nodes (0): 

### Community 61 - "Vitest Config"
Cohesion: 1.0
Nodes (0): 

### Community 62 - "Main"
Cohesion: 1.0
Nodes (0): 

### Community 63 - "Sw"
Cohesion: 1.0
Nodes (0): 

### Community 64 - "Vite Env D"
Cohesion: 1.0
Nodes (0): 

### Community 65 - "Feature Event Manage"
Cohesion: 1.0
Nodes (0): 

### Community 66 - "Feature Chat"
Cohesion: 1.0
Nodes (0): 

### Community 67 - "Feature Auth"
Cohesion: 1.0
Nodes (0): 

### Community 68 - "Feature Auth"
Cohesion: 1.0
Nodes (0): 

### Community 69 - "Feature Polls"
Cohesion: 1.0
Nodes (0): 

### Community 70 - "Feature Carpools"
Cohesion: 1.0
Nodes (0): 

### Community 71 - "Feature Items"
Cohesion: 1.0
Nodes (0): 

### Community 72 - "Feature Collections"
Cohesion: 1.0
Nodes (0): 

### Community 73 - "Feature Notifications"
Cohesion: 1.0
Nodes (0): 

### Community 74 - "Feature Notifications"
Cohesion: 1.0
Nodes (0): 

### Community 75 - "Shared Popover"
Cohesion: 1.0
Nodes (0): 

### Community 76 - "Shared Tooltip"
Cohesion: 1.0
Nodes (0): 

### Community 77 - "Shared Segmented Control"
Cohesion: 1.0
Nodes (0): 

### Community 78 - "Shared Frontend Node"
Cohesion: 1.0
Nodes (0): 

### Community 79 - "Shared Separator"
Cohesion: 1.0
Nodes (0): 

### Community 80 - "Shared Button"
Cohesion: 1.0
Nodes (0): 

### Community 81 - "Shared Dropdown Menu"
Cohesion: 1.0
Nodes (0): 

### Community 82 - "Shared Select"
Cohesion: 1.0
Nodes (0): 

### Community 83 - "Shared Textarea"
Cohesion: 1.0
Nodes (0): 

### Community 84 - "Shared Input"
Cohesion: 1.0
Nodes (0): 

### Community 85 - "Shared Event Accent Color Test"
Cohesion: 1.0
Nodes (0): 

### Community 86 - "Shared Format Date Test"
Cohesion: 1.0
Nodes (0): 

### Community 87 - "Shared Frontend Node"
Cohesion: 1.0
Nodes (0): 

### Community 88 - "Page Admin Panel"
Cohesion: 1.0
Nodes (0): 

### Community 89 - "Page Admin Panel"
Cohesion: 1.0
Nodes (0): 

### Community 90 - "Page Admin Panel"
Cohesion: 1.0
Nodes (0): 

### Community 91 - "Page Design System"
Cohesion: 1.0
Nodes (0): 

### Community 92 - "Page Notifications"
Cohesion: 1.0
Nodes (0): 

### Community 93 - "Widget Event Detail"
Cohesion: 1.0
Nodes (0): 

### Community 94 - "Widget Admin Line Chart"
Cohesion: 1.0
Nodes (0): 

### Community 95 - "Widget Admin Kpi Card"
Cohesion: 1.0
Nodes (0): 

### Community 96 - "Entity Carpool"
Cohesion: 1.0
Nodes (0): 

### Community 97 - "Entity Collection"
Cohesion: 1.0
Nodes (0): 

### Community 98 - "Entity Notification"
Cohesion: 1.0
Nodes (0): 

### Community 99 - "Entity Notification"
Cohesion: 1.0
Nodes (0): 

### Community 100 - "Entity Message"
Cohesion: 1.0
Nodes (0): 

### Community 101 - "Entity User"
Cohesion: 1.0
Nodes (0): 

### Community 102 - "Entity Item"
Cohesion: 1.0
Nodes (0): 

### Community 103 - "Entity Admin Stats"
Cohesion: 1.0
Nodes (0): 

### Community 104 - "Entity Admin Stats"
Cohesion: 1.0
Nodes (0): 

### Community 105 - "Entity Event"
Cohesion: 1.0
Nodes (0): 

### Community 106 - "Entity Event"
Cohesion: 1.0
Nodes (0): 

### Community 107 - "Entity Poll"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **6 isolated node(s):** `React TypeScript Vite Template`, `Type-Aware Lint Rules`, `Bimeet`, `iOS PWA Splash Screens`, `First Paint Flash Prevention Rationale` (+1 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `App Frontend Node`** (2 nodes): `App()`, `index.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `App Frontend Node`** (2 nodes): `Providers()`, `index.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `App Frontend Node`** (2 nodes): `AppRouter()`, `index.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Feature Location Picker`** (2 nodes): `setMarker()`, `LocationPicker.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Feature Auth`** (2 nodes): `freshStore()`, `AuthContext.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Feature Polls`** (2 nodes): `handleCreate()`, `PollsTab.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Feature Carpools`** (2 nodes): `handleCreate()`, `CarpoolTab.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Feature Items`** (2 nodes): `handleAdd()`, `ItemsTab.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Brand Mark`** (2 nodes): `BrandMark()`, `brand-mark.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Search Input`** (2 nodes): `cn()`, `search-input.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Rail Card`** (2 nodes): `RailCardTitle()`, `rail-card.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Event Tag`** (2 nodes): `EventTag()`, `event-tag.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Status Pill`** (2 nodes): `status-pill.tsx`, `StatusPill()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Otp Input`** (2 nodes): `OtpInput()`, `otp-input.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Drawer`** (2 nodes): `DrawerFooter()`, `drawer.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Stat Cell`** (2 nodes): `stat-cell.tsx`, `StatCell()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Kbd`** (2 nodes): `Kbd()`, `kbd.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Time Cell`** (2 nodes): `time-cell.tsx`, `TimeCell()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Date Cell`** (2 nodes): `DateCell()`, `date-cell.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Test`** (2 nodes): `freshTheme()`, `index.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Pwaupdater`** (2 nodes): `PWAUpdater()`, `PWAUpdater.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Cn`** (2 nodes): `cn()`, `cn.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Widget Layout`** (2 nodes): `TabLink()`, `BottomNav.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Widget Layout`** (2 nodes): `handleLogout()`, `Sidebar.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Entity Notification`** (2 nodes): `notificationHref()`, `href.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Eslint Config`** (1 nodes): `eslint.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Config`** (1 nodes): `vite.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vitest Config`** (1 nodes): `vitest.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Main`** (1 nodes): `main.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Sw`** (1 nodes): `sw.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Env D`** (1 nodes): `vite-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Feature Event Manage`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Feature Chat`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Feature Auth`** (1 nodes): `AuthShell.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Feature Auth`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Feature Polls`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Feature Carpools`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Feature Items`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Feature Collections`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Feature Notifications`** (1 nodes): `NotificationCenter.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Feature Notifications`** (1 nodes): `NotificationsNavbarActions.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Popover`** (1 nodes): `popover.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Tooltip`** (1 nodes): `tooltip.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Segmented Control`** (1 nodes): `segmented-control.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Frontend Node`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Separator`** (1 nodes): `separator.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Button`** (1 nodes): `button.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Dropdown Menu`** (1 nodes): `dropdown-menu.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Select`** (1 nodes): `select.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Textarea`** (1 nodes): `textarea.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Input`** (1 nodes): `input.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Event Accent Color Test`** (1 nodes): `eventAccentColor.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Format Date Test`** (1 nodes): `formatDate.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Frontend Node`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Page Admin Panel`** (1 nodes): `index.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Page Admin Panel`** (1 nodes): `EventsTab.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Page Admin Panel`** (1 nodes): `UsersTab.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Page Design System`** (1 nodes): `index.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Page Notifications`** (1 nodes): `index.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Widget Event Detail`** (1 nodes): `ParticipantsSummaryPanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Widget Admin Line Chart`** (1 nodes): `index.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Widget Admin Kpi Card`** (1 nodes): `index.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Entity Carpool`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Entity Collection`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Entity Notification`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Entity Notification`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Entity Message`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Entity User`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Entity Item`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Entity Admin Stats`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Entity Admin Stats`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Entity Event`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Entity Event`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Entity Poll`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `t()` connect `Page Event Form` to `Page Login`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `handleEnable()` connect `Page Event Form` to `Shared Frontend Node`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `t()` (e.g. with `LocationMap()` and `handleEnable()`) actually correct?**
  _`t()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `React TypeScript Vite Template`, `Type-Aware Lint Rules`, `Bimeet` to the rest of the system?**
  _6 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Page Event Form` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Should `Feature Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._