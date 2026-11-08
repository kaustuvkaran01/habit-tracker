# Initial architecture

Current access policy: [L05 Free/Pro](L05-FREE-PRO.md). Capability rules live in `data/pro-access.ts`, the store authorizes mutations, and a separate adapter owns purchase status. The current adapter grants Free only; verified purchase integration remains L19. Selection/retention metadata does not grant paid access.

Status: revised mobile-first design to validate during M1–M3. Date: 4 November 2026. Supersedes the SwiftUI/shared-Swift-core design.

Historical planning reference. The app subsequently took the incremental Expo Go route and currently uses AsyncStorage. The 7 November [iCloud sync plan](ICLOUD-SYNC-PLAN.md) is the current Apple sync proposal, and [L18/L19](LAUNCH-CHECKLIST.md#l18--production-structure-review-and-refinement-before-purchases) define the production structure reviews and final purchase integration. Firebase, SQLite and server-based account entitlements below are earlier candidates, subject to those decisions.

The [L18.1 structure review](L18-STRUCTURE-REVIEW.md) documents the actual current module ownership, confirmed tracking/lifecycle defects and proposed incremental contracts. Use its bounded refinement sequence for the next coding steps; this older design does not authorize a backend or database rollout.

## Components

| Component | Responsibility | Boundary |
|---|---|---|
| Mobile app | React Native/Expo screens, navigation, permissions and OS integrations | One iOS/Android codebase with platform-specific adapters |
| `habit-core` | Domain types, schedule/date rules, progress reducers and statistics | Pure TypeScript; no React Native, database or Firebase dependency |
| Data layer | SQLite repositories, migrations, import/export, widget snapshots and upload queue | Local durable source for app behaviour |
| Sync layer | Account isolation, backend adapter, retries, merging and sync state | Cloud records map to portable domain operations |
| Widgets | One small configurable widget per platform, preview and quick action | Expo Widgets first; prove isolated runtime/storage access and add narrow native modules where needed |
| Purchase adapter | App Store/Google Play purchase state and cached capabilities | Server-verified account entitlement required for paid cloud service |
| Backend | Authentication integration, per-user access rules, entitlement verification and account deletion | No UI or global habit-statistics aggregation |

These module names describe intended responsibilities. Create separate TypeScript packages only where they improve testing or dependency isolation; avoid generating many empty modules up front.

## Main data flow

1. App or widget creates a stable operation ID for a user action.
2. A local transaction records that action and queues it for upload where sync is enabled.
3. Domain rules derive the updated daily state and statistics; an atomic snapshot feeds the widget.
4. The sync adapter sends queued operations when signed in and connected, reusing IDs on retries.
5. Remote operations enter the same local store and reducers; downloaded data never bypasses the progress engine.

Keep an actual local database even if the backend SDK also has a cache. The local store must support the complete retained history, migration, export and app/extension access. Downloaded SDK cache contents alone are not our backup guarantee.

## Domain model

| Record | Key fields/behaviour |
|---|---|
| Habit | ID, Build/Quit type, name/icon/colour, creation/start context, optional motivation and replacement action, archive/delete state |
| Schedule revision | ID, habit ID, effective date, tracking timezone, weekdays and daily target; preserve earlier revisions |
| Progress operation | ID, habit ID, action, occurrence time/calendar context, entry time, device origin and optional referenced operation for reversal |
| Daily check-in | Explicit quit status for a closed day or current-day “on track”; a reported lapse prevents that day being successful |
| Note revision | Habit/day reference, text revision and base revision; preserve conflicts for resolution |
| Urge entry | Optional user-supplied intensity/trigger, timestamps and outcome; not automatically evidence of a successful day |
| Upload queue item | Operation ID, owner scope, payload version, retry state and acknowledgement |
| Entitlement | Server-established product access, expiry/status and store provenance, separate from habit content |

Store instants in UTC and retain the tracking timezone/calendar date needed for historical grouping. Separate occurrence time from entry time. A timezone or schedule change applies forward; it does not reinterpret old history.

Do not sync derived streaks as authoritative state. Recompute from the record using versioned rules and fixtures. Share the TypeScript rules between iOS and Android app runtimes. Any native widget action implementation must satisfy the same portable fixtures; do not assume the isolated widget runtime can import the package.

## Merge invariants to prove

- Retry of an operation with the same ID has no additional effect.
- Two independent count increments survive; duplicate delivery of one increment does not create another.
- Two devices setting the same yes/no habit complete for a day produce one completed day.
- Undo reverses its referenced action once; it is not an ambiguous overwrite of a total.
- A lapse on a day overrides an ordinary success check-in; removing an erroneous lapse requires explicit correction.
- Unknown quit days remain unknown after sync and restore.
- Delete markers prevent stale offline edits from resurrecting a deleted habit. Intentional restoration, if later supported, needs an explicit operation.
- Account A's records, snapshots and queued operations never leak into account B after switching accounts.
- Server arrival order must not silently rewrite historical schedules. Specify same-day concurrent revision handling during M3 and cover it with fixtures.

The exact operation encoding and conflict order must be written into backend schema examples during M3; these are acceptance requirements, not a claim that a merge algorithm already exists.

## Sync provider

Prototype Firebase Auth/Firestore through React Native Firebase native modules in Expo development builds first. Validate config plugins and the supported native build configuration before selecting versions. The native adapter requires a development/native build rather than Expo Go. [React Native Firebase setup](https://rnfirebase.io/). Firestore documents offline access and resynchronisation on Apple/Android, and last-write-wins for competing writes to the same document. Use this as infrastructure, not as a complete application conflict policy. [Firestore offline documentation](https://firebase.google.com/docs/firestore/manage-data/enable-offline).

Validate email-based sign-in/recovery and linked providers on both mobile platforms. Keep the actual local database as the durable record; do not replace it with assumptions about a web-SDK cache. [React Native Firebase Firestore usage](https://rnfirebase.io/firestore/usage).

Start with emulators, fixture data and tested access rules. The hosted development and production projects must remain separate. Scope data paths to the authenticated owner; use trusted server processing for entitlements and deletion. A client cannot enable Pro by changing its own account document.

Use SQLite locally, with `expo-sqlite` as the initial access-layer candidate. Validate migrations, concurrency and the widget boundary in a native development build; commit the selected dependency lockfile. [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/).

## Widget boundary

Each instance selects one active habit. Use iOS system-small sizing and an equivalent compact Android layout appropriate to launcher sizing. Prototype Expo Widgets with separate SwiftUI/Compose layouts where necessary. Its isolated runtime cannot use application state, hooks, arbitrary imports or async work; it does not run the application's domain engine. [Expo Widgets](https://docs.expo.dev/versions/latest/sdk/widgets/).

Provide privacy-filtered snapshots from durable storage. Prove recording an action while the main app is closed and offline, persisting it once, then reconciling it into the same local record/outbox. Use iOS App Group sharing and the corresponding Android storage boundary. If the library does not provide the required action lifecycle, implement narrow native Swift/Kotlin adapters instead of replacing the shared mobile app. A successful foreground snapshot render alone is not sufficient acceptance.

The snapshot is disposable derived data and can be rebuilt. Private names/values stay hidden until enabled; private mutations and lapse confirmation open the app. Trigger refresh after local changes and received sync, with pending/empty states where necessary. Remote updates are subject to OS execution/refresh scheduling.

## Privacy and operations

Local-only use remains available without an account. Enabling sync explicitly explains what is uploaded. Use platform-protected storage and secure credential storage. Do not claim end-to-end encryption unless it is actually designed and verified; ordinary server-side access controls are a different property.

Keep names, notes and triggers out of analytics, logs and crash breadcrumbs. Exports contain personal data and must only be written through explicit user export actions. Store retention, account deletion and subscription-expiry behaviour are release requirements.

A full Mac app is outside the initial architecture. It can later use the same account, sync schema, entitlements and rule fixtures after desktop demand is validated. No dependency versions, Firebase project, production collection layout or signing identifiers are finalised by this document.

## Current localization implementation

The Expo app bundles translation catalogs under `apps/mobile/src/i18n`. `LocaleProvider` follows the existing saved language preference and refreshes the system locale when the app becomes active. UI text uses `useTranslation`; pure validation keeps source messages and translates them at display time. `Intl` supplies dates and weekdays. Number and plural formatters are used when available; bundled cardinal rules handle day/habit counts when `Intl.PluralRules` is missing in Expo Go, and plain numeric strings keep counts readable without `Intl.NumberFormat`. Constructor failures also use these fallbacks. English is the fallback for unsupported locales and new untranslated messages.

Storage keys, tracking/schedule identifiers, category IDs and user-entered content stay independent of translated labels. Original quote-photo assets retain their embedded text. The localization check covers catalog completeness, interpolation, plural forms, live selection, persistence, system changes and content preservation. No localization package or remote translation service is required. Native-speaker and physical-device layout review remain release work.

## Current domain/action boundary (R1)

`apps/mobile/src/data/habit-types.ts` owns production habit types. `habit-calendar.ts` owns current date, schedule and streak rules. `sample-habits.ts` is demo data only, used by the existing first-install seeding path. `habit-actions.ts` implements pure transitions; `useHabitStore` exposes named actions for all existing mutations. Home coordinates presentation and feedback without receiving a general state updater.

The AsyncStorage v1 snapshot, validation, serialized writes and retry remain unchanged. This boundary prepares R2; it does not implement effective-date history, numeric entries, durable action receipts or cloud operations. Run `npm run check:actions` from `apps/mobile` for transition and store lifecycle checks.

## Current daily-entry model (R2/L02)

`habit-entries.ts` resolves dated configuration and evaluates complete/partial/failed/unlogged/unscheduled/future states. Daily correction histories capture rule snapshots and recording context without inventing occurrence times. `habit-actions.ts` logs amounts and combined note/entry changes through that evaluator; `checkIns` is retained as a completion projection. The store returns awaited save results, preserving optimistic state for snapshot retry.

`habit-storage.ts` validates v2 snapshots and serializes migration from the retained v1 source. The shared `HabitEntryDrawer` replaces the earlier notes-only drawer and is used from Home and detail. See [L02 implementation](L02-TRACKING.md) for exact behaviour, checks, recovery-key retention and pending device acceptance. AsyncStorage remains the adapter; transactional sync/outbox storage is later L17 work.


## Achievement delivery (L04, 8 November 2026)

Daily actions derive new achievement events separately from animation and haptics. Stable identities and optional pending/handled delivery records live with `HabitRewards` in the existing v2 snapshot, so progress, earned rewards and queue state share a serialized write. Configuration edits, hydration, migration and demo fixtures do not enqueue personal celebrations.

The store persists acknowledgement before `AchievementHost` presents. This chooses at-most-once playback after a successful claim; interrupted claimed reveals remain available as permanent collection items instead of replaying automatically. One stable controller wraps Home's content; its render callback places only native presentation elements inside the active Home/detail surface. Changing surfaces does not remount the controller or discard a claimed event. Native dismissal gates protect editors and sequence collection previews. All personal habits use this queue; the same milestone earned by different habits has separate identities and reveals. Presentation variants live in a central registry; domain event generation does not import UI or native animation modules. See [the L04 contract](L04-ACHIEVEMENTS.md) for failure handling and device acceptance.

## L07 first-use ownership

`data/first-use.ts` owns welcome-marker validation and Home empty-state rules. `hooks/use-first-use.ts` coordinates hydration, completion, retry and session-only bypass. Its separate onboarding key never replaces habit history. The store starts empty on missing habit data; sample factories remain regression fixtures. Home owns the welcome-to-Add transition, while Settings replay and Quick guide remain local screens with existing drawer navigation. See [L07](L07-FIRST-USE.md) for evidence and pending native acceptance.

## L08 notification ownership

Reminder time validation and legacy compatibility live in `reminder-settings.ts`; planning/reconciliation live in `reminder-plan.ts`. The native adapter in `services/reminder-notifications.ts` owns Expo permissions, jobs, presentation and responses. A single Home-owned `ReminderProvider` observes successfully persisted habit/preferences snapshots, queues safe navigation, and refreshes jobs on lifecycle/time changes. Permission loading/unavailability never masquerades as denial. Scheduling uses the persisted language choice too. Forms own drafts and await authorization/save; notification status and device-setting actions are shared. Physical acceptance is tracked in [L08](L08-REMINDERS.md).

## L09 backup and erasure ownership

`data/habit-backup.ts` owns the versioned portable envelope, validation, summary and add/replace rules. It reuses the v1/v2 storage validator, pauses imported reminder times, preserves earned collections without replaying historical celebrations, and applies Free logging selection without granting capabilities. `services/backup-files.ts` owns the native picker/share boundary, a 20 MiB input limit, owned export temporaries and tracked picker copies. `BackupScreen` owns selection, preview and explicit confirmation. `useHabitStore.importBackup` freezes habit dispatch and commits one serialized snapshot before publishing it; failure retains the existing state. No new multi-key habit transaction is introduced.

`LocalResetBoundary` gates data-provider mounting while recovering a durable erase marker. Before an in-app erase, Home and the backup screen freeze/drain store, preference, theme, haptic and reminder writers. The boundary unmounts owners, cancels/dismisses owned notifications, removes owned temporary files and `@habit-tracker/` records (including the legacy recovery snapshot), and removes the marker last. An interrupted erase resumes before hydration; a failed cleanup remains gated with retry. A successful erase remounts providers and resets module-level haptic caches. External exported copies are outside this operation. Future L17 cloud writers require their own quiescence and deletion policy before integration; no cloud deletion is implemented here. See [L09](L09-BACKUP-RESTORE.md).

## L10 privacy surfaces and support ownership

`AppPrivacyProvider` owns lifecycle/focus cover state without persistence or data access. `PrivacySurface` hides private descendants and draws a static themed cover. The main screen uses it at the root; all app-owned native modals use `PrivateModal`, preserving their existing props/callbacks and adding the cover inside that native surface. No extra modal is presented on backgrounding. Screens/drafts stay mounted. This JS layer is best effort; synchronous native snapshot protection and signed-build proof belong to L14.

`data/privacy-info.ts` holds current-build policy content, review date and the user-confirmed support address. `PrivacySupportScreen` renders translated offline content and opens only a generic email subject after a button press. It does not receive a habit snapshot or create an email body/attachment. Settings owns its normal submenu navigation. `check:privacy` guards native-modal coverage and flags new direct diagnostic/network output; adding cloud/billing must intentionally re-audit this boundary and update disclosures. See [L10](L10-PRIVACY-ACCESSIBILITY.md).
