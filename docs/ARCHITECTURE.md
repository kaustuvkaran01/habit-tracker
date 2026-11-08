# Current app architecture

Updated 8 November 2026 after the [code-quality review](CODE-QUALITY-REVIEW.md). This describes code that exists. The [launch checklist](LAUNCH-CHECKLIST.md) owns acceptance status; [iCloud sync](ICLOUD-SYNC-PLAN.md) is planned work. The [4 November architecture candidates](archive/ARCHITECTURE-PLANNING-2026-11-04.md) are historical, not installed infrastructure.

## Runtime and ownership

The implementation is one React Native + TypeScript app under `apps/mobile`, using the installed Expo SDK 58. Habits live in versioned AsyncStorage snapshots. No backend, SQLite database, app account, CloudKit transport, widget extension or purchase integration is connected. Production access currently resolves to Free through an adapter; tests inject other entitlement states.

| Boundary | Current owner | Contract |
|---|---|---|
| Application composition | `App.tsx`, `components/local-reset.tsx` | Recover interrupted erasure before mounting data owners; compose access, preferences, locale, theme and privacy providers |
| Domain and dated history | `data/habit-types.ts`, `habit-entries.ts`, `habit-calendar.ts`, `habit-draft.ts` | Pure TypeScript; no UI, native or service imports; recorded configuration takes priority over later edits |
| Mutations | `data/habit-actions.ts`, `hooks/use-habit-store.ts` | Named actions, access checks, generated operation context, immutable transitions and awaited save results; no general screen-owned state setter |
| Persistence | `data/habit-storage.ts` | Strict v1/v2 validation, retained legacy recovery source, serialized writes and retry; not a transactional sync database |
| Access and retention | `data/pro-access.ts`, `habit-archive.ts`, `components/pro-access.tsx` | Explicit verified/unknown states; Free logging allowance and capability guards; unknown access never triggers archive expiry |
| Home view data | `data/home-state.ts` | Immutable filtering, stable completion ordering, empty states and common presentation eligibility |
| Screen coordination | `screens/home-screen.tsx`, `settings-screen.tsx` | Selection, drafts, sibling modal/drawer lifecycle and retained content; domain changes go through the store |
| Settings content | `screens/settings-page-content.tsx` | One title map/page union, exhaustive routing and focused Appearance/Archive/Reorder content; navigation stays in Settings |
| Preferences and theme | `components/app-preferences.tsx`, `theme.tsx`, `utils/feedback.ts` | Separate device preferences, saved/live values and serialized writes; rejected patches never enter hydration merging |
| Analytics | `data/habit-analytics.ts`, `analytics-chart.ts`, `screens/charts-screen.tsx` | Read-only day states, bounded periods and separate amount series; unknown historical amounts stay unknown |
| Rewards and delivery | `data/habit-rewards.ts`, `achievement-events.ts`, `components/achievement-host.tsx` | Permanent collections plus durable pending/handled identities; event generation is independent of motion/haptics |
| Notifications | `data/reminder-plan.ts`, `services/reminder-notifications.ts`, `components/reminders.tsx` | Pure planning, native permission/job adapter and one lifecycle coordinator observing committed immutable inputs |
| File recovery | `data/habit-backup.ts`, `services/backup-files.ts`, `screens/backup-screen.tsx` | Versioned portable files, validation/preview, add/replace confirmation and commit before publication to UI |
| Privacy and support | `components/app-privacy.tsx`, `private-modal.tsx`, `data/privacy-info.ts` | Static per-surface visual cover and offline policy/contact; email draft has no private attachments |
| Localization | `src/i18n/` | Saved/system locale, bundled catalogs, fallback plural/number behavior and separation of labels from stored identifiers/user content |

## A daily action

1. A screen owns a draft or asks the store to toggle/increment. Count/Measure and Quit rules use the same day evaluator as the calendar and charts. Quit success requires an explicit report; an absent entry is never a success.
2. `useHabitStore` reads the latest date/access/snapshot, authorizes the named action and generates recording context outside React state updaters.
3. The pure reducer appends a correction record, updates the completion projection, reconciles rewards and queues genuine new achievement identities. Free selection/archive policy is applied at the store boundary.
4. Ordinary edits publish optimistic UI and queue an exact validated snapshot. The awaited result reports that write's success. Failure retains the latest in-memory result and exposes retry; retry saves state without repeating an increment.
5. Consumers use the committed snapshot and save/error readiness. Reminders never schedule from optimistic settings/history. New achievements are acquired only after progress saves and native editors finish closing.

Date keys are local calendar dates; recording instants and timezone/offset context are separate. Dated configuration and recorded provenance prevent later schedule/target edits rewriting earlier results. Completing a Monday/Friday habit on Monday, Friday and the next Monday earns an eight-calendar-day streak; rest days are added on the confirming completion. New sample factories are test fixtures, not initial user history.

## Persistence, restore and erase

The habit record is `@habit-tracker/state/v2`. Migration retains `@habit-tracker/state/v1` as a recovery source. Preferences, theme, haptics and welcome completion have separate `@habit-tracker/` keys. Their separation is intentional: portable habit restore preserves device choices and cannot grant paid access.

File restore validates again at commit and publishes restored UI only after the single snapshot write succeeds. It refuses to preempt an unfinished ordinary save, preserving that edit's save/error ownership; the preview remains retryable. Add-missing keeps existing IDs completely; replacement is explicitly confirmed. Imported times start paused and historical delivery events are consumed without replay. See [L09](L09-BACKUP-RESTORE.md).

Erasure freezes/drains writers and reminder reconciliation, persists intent before destruction, then unmounts providers. It clears owned jobs/temporary files and only the app storage namespace, including legacy data, with the erase marker removed last. Startup resumes interrupted cleanup before hydration. Exported copies and OS backups remain outside local erasure. A successful reset remounts fresh providers and resets haptic caches. Future cloud/widget writers must join this coordination boundary.

AsyncStorage serialization is not a cross-process transaction or upload outbox. Widget/background writes and L17 sync require a separately validated production-store contract and migration before integration.

## Presentation and native boundaries

`RightDrawer` and `BottomDrawer` retain content until native dismissal completes. UI-thread gestures and animation code are preserved. Home's shared presentation predicate blocks reminder navigation and achievement acquisition while an editor, sibling sheet, upgrade, nested detail modal or retained exiting detail is present. Settings owns its pending sibling handoff and backup busy lock.

A single stable achievement controller wraps Home and places only its native presentation inside the active surface. The controller survives Home/detail changes. Delivery uses an at-most-once policy after a persisted claim; the process can terminate before visible playback, while the earned item remains in the gallery. See [L04](L04-ACHIEVEMENTS.md).

All native modal modules use `PrivateModal`, placing a privacy surface inside each native screen. `AppPrivacyProvider` observes lifecycle/focus; covering preserves mounted drafts and hides private descendants from accessibility/touches. It also blocks acquisition of new celebration events. This JavaScript cover is best effort; signed-build/native-window snapshot proof remains L14. See [L10](L10-PRIVACY-ACCESSIBILITY.md).

## Avoid duplicated work

Home memoizes its read-only view selection, normalizes the search once, and builds completion membership before sorting. Dated rule lookup searches backward without a temporary history array. Reminder effects depend on stable committed snapshot, daily settings, access and locale identities; render does not serialize the complete history/notes as an effect digest. The reconciler is initialized once and compares native job fingerprints.

These are verified work reductions, not measured native performance claims. All three Home views still mount their dense grids; large-history performance, virtualization and any additional caching require representative device measurements. Do not cache mutable domain inputs or rewrite gesture/native boundaries speculatively.

## Checks and release gates

Run `npm run check` in `apps/mobile`. TypeScript enforces strict types, unused locals/parameters and switch fallthrough. The runner discovers all regression scripts, verifies relative import casing/domain isolation and transforms sources with the installed Expo preset for both platforms. Handler tests mock native APIs and storage failures; source transforms do not build an app.

Current local evidence is in [the review](CODE-QUALITY-REVIEW.md) and individual L02–L10 records. Device gestures/layout/accessibility, native termination/durability, notification behavior, signed-build privacy manifests, public-page hosting and asset rights remain open launch gates. Widgets are L11, native prerequisites L14, iCloud L17 and verified purchases the final L19 milestone. No separate packages, backend or global tooling were introduced by this refactor.
