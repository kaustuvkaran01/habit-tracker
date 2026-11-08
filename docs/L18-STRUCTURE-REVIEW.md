# L18.1 — Initial app structure review

Reviewed 7 November 2026 against the current local working tree, based on commit `6fc2123`. Recent screens, localization and layout fixes are uncommitted and were included in this review. This report records findings and the proposed refinements; it does not implement them or sign off the production app.

## Outcome

Keep the existing Expo app, components, theme and gesture implementation. The immediate work is to give tracking rules and writes a shared owner before L02 adds richer records. The current boolean check-in model cannot supply reliable numeric analytics or historical configuration.

L18.1's code inspection is complete. Runtime contracts, implementation and acceptance of the refinements below remain open. L18.2, signed-device verification and the final L19 review are separate gates. Outstanding L01 product choices are not resolved by this technical review.

## Current ownership

| Area | Current owner | Assessment |
|---|---|---|
| Home paging, filters, sibling sheets and selection | `screens/home-screen.tsx` | Keep presentation here; move habit mutations behind the store's action API. |
| Check-ins, edits, note writes, archive/restore, ordering and reward calls | Home callbacks, plus helpers in `data/` | Rules can be bypassed through the store's unrestricted `setHabits` updater; widgets and incoming sync have no equivalent entry point. |
| Habit types, calendar helpers, streaks and sample data | `data/sample-habits.ts` | Production rules and demo fixtures share one module. Split responsibilities without changing behaviour first. |
| Persistence and hydration | `hooks/use-habit-store.ts`, `data/habit-storage.ts` | Retain validation, serialized writes, load protection and retry. Add explicit mutation/save results and versioned migration boundaries. |
| Earned rewards | `data/habit-rewards.ts` | Stable cycle badge IDs and retained awards are useful foundations. Add explicit award-event origins and delivery state before animation work. |
| Navigation and gestures | Home/detail/Settings sheet state, `RightDrawer`, `BottomDrawer`, calendar pager | Preserve the native dismissal sequencing and UI-thread gestures. Extract coordination only where it removes duplicated transitions. |
| Preferences, appearance and haptics | `AppPreferencesProvider`, `ThemeProvider`, feedback service | Keep device preferences separate from habit history and future account-scoped sync. |
| Paid access | Home's `HAS_PRO = false` | Preview-only. No central capabilities or unknown/expired access state exists yet. |
| Sharing | Share screen and collection preview | Existing readiness, duplicate-export and cleanup guards should remain. Exported content is distinct from a personal-data backup. |

## Findings and required changes

### F01 — Numeric tracking has no daily amount record

**Priority: before L03 analytics; implementation belongs to L02.**

`Habit.checkIns` contains date strings. Home's `toggleCheckIn` uses the same toggle for Yes/No, Count and Measure. Tracking settings store a target and unit, but history cannot represent amounts, partial effort, explicit failure or the difference between unlogged and reported zero.

Fixture: save a Count habit with target 8 and seven legacy completed dates, then encode/decode it. The target and seven dates survive; daily amounts are absent. Migrating each completed date to “8” or “1” would invent data.

Introduce dated entries with an explicit status/value and recording context. Preserve unknown legacy amounts as unknown, retain notes and rewards, and make the UI, streaks and analytics use the same day evaluator. Quit tracking must require an explicit report; absence of a record must not imply success.

Evidence: [Habit model and schedule rules](../apps/mobile/src/data/sample-habits.ts), [Home mutations](../apps/mobile/src/screens/home-screen.tsx), [storage validation](../apps/mobile/src/data/habit-storage.ts).

### F02 — Schedule edits reinterpret existing history

**Priority: before accepting historical numeric data in L02.**

`updateHabitFromDraft` replaces the current schedule. `isScheduled`, `streakDays` and reward reconciliation apply that schedule to earlier dates too.

Reproduced with seven daily completions ending 7 November 2026: change the habit to Mondays-only. The saved dates remain unchanged, but the displayed streak changes from 7 to 1. This conflicts with L02's requirement that an edit effective today must not reinterpret earlier records.

Add configuration revisions with effective dates for schedules, targets, units and tracking kind. Determine a day's rules from its revision. Keep legacy configuration provenance explicit: older settings and actual occurrence times cannot be reconstructed from the current snapshot. Preserve previously earned permanent rewards during migration and correction.

Evidence: [draft updates](../apps/mobile/src/data/habit-draft.ts), [streak calculation](../apps/mobile/src/data/sample-habits.ts), [reward date eligibility](../apps/mobile/src/data/habit-rewards.ts).

### F03 — UI success and durable save completion are separate, with errors hidden by detail screens

**Priority: define the boundary before L02; complete durable operations before L17.**

Home changes React state through `setHabits`. A later effect in `useHabitStore` queues persistence. Edit/note sheets close without awaiting a save result. Save errors are exposed only through Home's banner; the detail drawer has no save-status input. A storage failure during detail entry therefore has no error feedback on that active screen.

Serialized writes and latest-revision error handling already prevent several races. They do not provide a durable command receipt, an operation identity or a state-plus-outbox transaction. This review has not proved data loss on real process termination; that requires the signed-device tests below.

Give mutations one owner and an explicit pending/saved/failed result. Preserve a failed draft or pending action and offer retry in the active editor. Keep immediate press haptics responsive, while durable reward delivery consumes committed events. Before sync, persist the operation, resulting state and upload intent together; do not add a separate independent cloud write in a screen callback.

Evidence: [store write effect](../apps/mobile/src/hooks/use-habit-store.ts), [serialized persistence adapter](../apps/mobile/src/data/habit-storage.ts), [detail save callbacks](../apps/mobile/src/screens/habit-detail-screen.tsx).

### F04 — A boolean cannot safely represent unresolved Pro access

**Priority: before paid retention, capability enforcement or sync; L05/L17/L19.**

Archive reconciliation accepts a boolean and can remove expired history during hydration. Today's fixed free preview flag is not a production entitlement provider. Replacing it with an initial `false` while purchases load could purge a paying user's old archives before their access is known.

Use explicit free, Pro, expired and unknown states behind one capability policy. Unknown or temporarily unverifiable access must defer destructive expiry. Keep the free active-habit allowance and post-expiry recovery policy as L01 decisions; do not choose them inside individual screens. StoreKit remains last in L19.

Evidence: [Home preview flag](../apps/mobile/src/screens/home-screen.tsx), [archive reconciliation](../apps/mobile/src/data/habit-archive.ts), [store hydration](../apps/mobile/src/hooks/use-habit-store.ts).

### F05 — Same-day timezone changes do not reschedule midnight

**Priority: fix alongside the date/context boundary before L02 verification.**

`useToday.refresh` keeps the existing state object when the local date string is unchanged. Its timer effect depends on that object. Returning from a timezone change on the same date can therefore retain the timer calculated in the previous timezone.

A mocked-clock reproduction at 12:00 UTC on 7 November 2026, switching from UTC to Europe/Paris and activating the app, leaves one timer targeting the old midnight. Its next refresh is 60 minutes later than the new local midnight. This is a hook-level reproduction, not a physical-device timezone test.

Track date and timezone/offset context, and reschedule the next midnight on activation even if the date is unchanged. Test same-day timezone switches, forward/backward date changes, daylight-saving boundaries and foreground rollover. New records need an explicit habit date and recording context; do not invent these for migrated entries.

Evidence: [today lifecycle hook](../apps/mobile/src/hooks/use-today.ts).

### F06 — Demo history already earns rewards without an origin distinction

**Priority: before L04 achievement delivery and L07 first use.**

First installation seeds sample habits and immediately reconciles rewards. The fixture habit `habit-2` receives the 7- and 10-completion wallpapers. The resulting reward records do not identify them as demo or migration awards.

L04 must distinguish a newly committed personal unlock from seeded, migrated or replayed history. Define a stable identity for every habit/cycle/milestone award, plus device-local reveal delivery state. Existing wallpaper records already have the components needed for that identity; badges already carry a cycle identity. L07 should replace default sample seeding with the agreed real first-use flow. Existing users' earned collections must survive that change.

Evidence: [initial sample hydration](../apps/mobile/src/hooks/use-habit-store.ts), [sample fixtures](../apps/mobile/src/data/sample-habits.ts), [reward records](../apps/mobile/src/data/habit-rewards.ts).

### F07 — All three home views build every habit's history eagerly

**Priority: measure before L18.2 performance sign-off.**

All three home pages stay mounted. A grid builds 182 cells per habit and a monthly card builds 42 more, in addition to checklist controls. Reward progress also scans historical entries. Changes coordinated in Home can update all these views.

This is a scaling risk observed in the code, not a measured device performance failure. Profile representative 10- and 100-habit, multi-year fixtures. Add memoized day summaries and bounded/virtualized rendering only where measurements justify them. Preserve paging position, accessibility and drag ordering when changing list rendering.

Evidence: [mounted home pages](../apps/mobile/src/screens/home-screen.tsx), [history rendering](../apps/mobile/src/components/habit-views.tsx), [reward scans](../apps/mobile/src/data/habit-rewards.ts).

## Proposed contracts and ownership

These are the contracts to implement incrementally, not a new installed framework or a claim that the current adapters already provide them.

| Boundary | Contract |
|---|---|
| Domain | Plain TypeScript types and pure actions/selectors for configuration effective on a date, entry evaluation, corrections, notes, archive/order and reward reconciliation. No React Native, persistence or network imports. |
| Application actions | Named actions for create/edit, record/correct, note, archive/restore, reorder, wallpaper selection and new cycle. Generate IDs/context at this boundary; serialize actions against current state. Screens do not receive a general state updater. |
| Repository | Validated load with schema version and migration provenance; explicit commit receipt/revision and retryable failure. Replay of the same operation ID must not apply an increment or award twice. Preserve the v1 source until a replacement is validated and durably committed. |
| Production persistence | Support the required state/operation/outbox transaction before enabling sync or extension writes. Retain AsyncStorage as the current implementation and migration source until a separately approved storage adapter is proven. No database package is selected by this audit. |
| Sync adapter | Account-scoped fetch/send/checkpoint and operation acknowledgements. Incoming data passes through the same domain validation and repository path. Keep native CloudKit transport separate from domain types and local device preferences. |
| Entitlement adapter | Explicit free/Pro/expired/unknown state, provenance and the central capability/retention decisions. Tests may inject fixtures; production must use verified access when L19 connects purchases. |
| Effects | Publish stable award events after durable commit. A reveal host consumes them with persisted device-local delivery state. Keep earned ownership separate from animation playback and haptic preference. |
| Screens/navigation | Retain existing views and drawers. Home owns paging/filter selection and delegates mutations. Keep presentation state in the owning screen or a narrow navigation hook; do not introduce a router rewrite for this work. |

## Bounded refinement order

| Slice | Scope and stopping point | Acceptance evidence |
|---|---|---|
| R1 — Domain/action boundary | Extract production types/calendar helpers from sample fixtures; centralize current mutations and expose named store actions. Rewire Home without changing storage version, UX, reward rules or access policy. | Existing checks pass; action fixtures cover check/uncheck, notes, editing, archive/restore, ordering and retained collections; opening/closing screens does not write entries. Stop before numeric logging or storage migration. |
| R2 — Historical entries and reliable saves, L02 | Add effective-date configuration, explicit daily records, legacy migration, contextual dates and visible save receipts/retry. Fix F05 and implement Count/Measure through the shared actions. | v1 migration round-trip preserves notes/awards/unknown amounts; changing today's rules leaves yesterday unchanged; explicit quit zero differs from unlogged; retries cannot double-add; interruption does not leave a half-migration; active editors show failed saves. Include real device termination/timezone proof later in L15. |
| R3 — Central capabilities, L05 | Add an injectable access provider and pure capability/retention policy using the agreed L01 limits. No purchase SDK. | Free/Pro/expired/unknown fixtures cover archive expiry, individual/bulk restore, creation limits and paid entry points. Unknown access never purges records. |
| R4 — Award delivery, L04 | Stable committed award events and a reusable reveal host using existing artwork/haptics. | No demo/startup/re-render replay; queued unlocks and interrupted reveals recover; Reduce Motion and disabled haptics work; corrections and cycle resets preserve award identity. |
| R5 — Native/sync readiness, L14/L17 | Approve and prove production storage and native transport separately, using the shared contracts. | Atomic local operation/outbox persistence, two-device offline convergence, duplicate/correction/deletion fixtures and signed-device permissions/export checks. |
| R6 — Final core refinement, L18.2 | Profile large histories and complete the agreed accessibility/lifecycle checks. | Record device/build, dataset, timings and outstanding issues. Resolve release blockers before final L19 purchases. |

R1 was the next bounded coding task at the time of the audit and is now implemented as recorded below. R2 follows it; analytics must wait for trustworthy daily entries. The proposed acceptance criteria above still need to be carried into each implementation task and the required device results recorded before sign-off.

## Validation performed

- `npm run typecheck -- --noUnusedLocals` — passed.
- `npm run check:rewards` — passed: domain rewards, archive policy fixtures, serialized persistence, reloads and failure recovery.
- `npm run check:feedback` — passed: mocked platform effects, preference races, rate limits and completion/reward intent.
- `npm run check:i18n` — passed: 12 languages, 562 catalog messages, placeholders, limited-Intl fallback, live/saved selection and user-content preservation.
- Targeted read-only fixtures reproduced F02, F05 and F06 and confirmed F01's missing amounts. No user storage was read or changed by those fixtures.
- Compared installed versions of all 12 dependencies listed in the installed Expo SDK 58 bundled-module manifest: every version satisfies its local Expo range. This checks version alignment, not native behaviour or vulnerability status.
- Reviewed navigation lifecycle, sharing cleanup, local data/privacy boundaries and layout/accessibility controls in source. Native animations, VoiceOver, large text, device-lock/privacy decisions and process-termination durability remain release verification work.

The recently fixed missing-`Intl.PluralRules` crash demonstrates why Node checks and successful bundling cannot substitute for device runtime checks. Its missing/rejected-constructor cases are now covered locally; that does not establish complete Hermes compatibility.

No dependencies were added, no app code was changed by this review, and no builds, simulators, servers, cloud resources or purchases were started. The review does not certify privacy declarations, artwork rights, security or App Store readiness.

## R1 implementation record — 7 November 2026

R1's domain/action refactor is implemented. The audit findings above describe the pre-refactor tree; F01/F02/F03/F04/F05/F06 and native/performance verification still require their later slices.

- Production types now live in `src/data/habit-types.ts`, date/schedule/streak helpers in `habit-calendar.ts`, and `sample-habits.ts` contains only the existing demo fixtures.
- `habit-actions.ts` owns pure transitions for create/edit, check/uncheck, note save/remove, archive/restore, both ordering methods, wallpaper selection and reward-cycle advancement. The same transition handles wallpaper selection in retained collections. Duplicate IDs cannot overwrite habits or retained collections.
- `useHabitStore` exposes named actions instead of its general `setHabits` updater. Home delegates its mutations and keeps presentation, navigation and feedback. ID generation happens outside React updater functions; updater replay has no ID generation or haptic effects.
- Hydration/save/retry behaviour and the version 1 storage key/schema remain in place. Actions are ignored before hydration, and no-op renders do not save entries. Existing sample seeding, binary Count/Measure behaviour, reward rules and free preview policy remain unchanged.
- `npm run check:actions` covers immutable transitions, all action types, v1 encode/decode compatibility, schedule guards, note/history/award preservation, archive/order operations, retained wallpaper selection, deterministic updater replay, hydration protection, queued actions, save failure/retry, reload and corrupt-load protection.

Validation: TypeScript, action/store, reward/storage, feedback and localization checks passed; iOS/Android source transforms passed. Physical-device regression verification is still pending. No dependencies, native builds or servers were introduced.

Next is R2/L02: dated configuration and daily entries, safe legacy migration, visible save results and timezone refresh. This refactor alone does not supply durable command receipts, idempotent sync operations, numeric amounts, revised entitlement states or a production database.

## R2/L02 implementation record — 7 November 2026

Numeric daily logging, explicit day states, effective-date configuration, correction records and recording context are implemented. Saved v1 history migrates to validated v2 storage while retaining the original recovery source. Add/Edit/day-entry submissions await save results and retain failed drafts; detail and Home expose save errors. Same-day timezone activation reschedules midnight. The [tracking record](L02-TRACKING.md) contains behaviour, local evidence and remaining physical-device acceptance.

This addresses the local implementations behind F01/F02/F03/F05. It does not close native durability verification, unknown-entitlement retention, demo reward origins, scaling measurements or production transactional sync. L18 remains unsigned.
