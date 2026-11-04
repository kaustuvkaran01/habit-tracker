# Initial architecture

Status: revised mobile-first design to validate during M1–M3. Date: 4 November 2026. Supersedes the SwiftUI/shared-Swift-core design.

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
