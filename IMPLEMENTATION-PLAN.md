# Implementation plan

Created and revised: 4 November 2026. Status: M0 verified complete; M1 is next. Application implementation has not started. This revision supersedes the SwiftUI/iPhone-and-Mac implementation route.

## Delivery target

Build one React Native/Expo mobile codebase for iOS and Android, with Build and Quit habits, accurate history/statistics, one small configurable single-habit widget, offline operation, optional account-based sync, and Free plus one Pro tier. Keep both platforms building from the start. Run the first beta and release on iOS, then release Android once its platform checks pass. A full Mac app is deferred.

The current pricing hypothesis is Free with three active habits, and Pro at US $2.99/month or $19.99/year. Pro adds unlimited habits, full analytics, extra controls and cloud sync. Prices stay configurable and remain test assumptions. Lifetime is deferred until ongoing sync costs are understood.

The detailed product rules live in [MVP-SPEC.md](docs/MVP-SPEC.md). Implementation defaults live in [ARCHITECTURE.md](docs/ARCHITECTURE.md); record material changes in [DECISIONS.md](docs/DECISIONS.md).

## Milestones and dependencies

| Milestone | Deliverable | Depends on | Status |
|---|---|---|---|
| M0 | Dedicated directory, specification and implementation plan | — | Complete |
| M1 | Buildable iOS/Android development app and TypeScript habit engine | M0 | Next |
| M2 | Durable offline tracking and small-widget proof on both mobile platforms | M1 | Planned |
| M3 | Account-based sync proven across devices | M2 | Planned |
| M4 | Complete daily experience and analytics | M2; integrate M3 | Planned |
| M5 | Pro purchases and account entitlements | M3, M4 | Planned |
| M6 | Reliability, privacy and accessibility verification | M2–M5 | Planned |
| M7 | iOS-first beta/release, then Android release and store assets | M6; separate platform release gates | Planned |
| M8 | Full Mac companion if desktop demand is demonstrated | Mobile usage and observed demand | Deferred |

Design and ASO research can progress alongside engineering. Begin M4 screen design while the M3 prototype is being tested. Do not finish all screen polish before validating M3.

The earlier 8–12-week estimate was for the superseded Apple-native scope. Re-estimate this mobile scope after M1/M2 establish toolchain compatibility and actual widget work. Plan a four-week iOS beta, with Android testing continuing alongside it. Android release is gated by its own readiness, not an assumed fixed delay. Store review and access to devices remain external dependencies.

## M0 — Project setup

- [x] Create the dedicated `habit-tracker/` directory and component folders.
- [x] Move the existing product specification into `docs/MVP-SPEC.md`.
- [x] Record the agreed scope, architecture defaults and unresolved details.
- [x] Create the implementation plan and a project-specific ASO workstream.
- [x] Check that Xcode, Swift and Apple SDKs are available.
- [x] Align the plan, architecture, product specification and folders with React Native, iOS-first release, Android next and Mac later.
- [x] Connect the independent project repository to GitHub while preserving its existing history.
- [x] Add repository ignore rules and shared editor defaults; verify the project structure and local document links.

Acceptance: all project-owned materials have a home inside this folder; current status distinguishes planning from implemented code.

Verification results: [M0 completion record](docs/M0-COMPLETION.md).

## M1 — App foundation and progress engine

- [ ] **M1.1:** Check Node/package-manager, Java/Android SDK and simulator/emulator tooling; select a supported Expo/React Native/TypeScript combination and commit its lockfile. Create a pure TypeScript `habit-core` package with no UI, database or Firebase dependency. Introduce an injectable clock/calendar so calculations can be tested deterministically.
- [ ] **M1.2:** Define Build/Quit habits, schedule revisions, occurrence/entry timestamps, progress events, daily check-ins and deletion/archive state. Use portable string/UUID identifiers and explicit schema versions.
- [ ] **M1.3:** Implement the first rules: daily/selected-weekday scheduling; yes/no/count progress; undo; closed-day handling; build streaks; quit intervals and confirmed streaks; completion rate and check-in coverage.
- [ ] **M1.4:** Add meaningful rule tests: unscheduled days, partial counts, an unfinished today, leap day, daylight-saving changes, schedule edits, unknown quit days, backdated corrections and a lapse on a previously successful day.
- [ ] **M1.5:** Create the React Native/Expo app in `apps/mobile/` with shared Today/detail/settings navigation and separate iOS/Android identifiers. Use development builds, not Expo Go, for widgets and native Firebase modules. Choose and document whether native projects are generated from config plugins or committed; preserve custom native work through that choice.
- [ ] **M1.6:** Add fictional Build/Quit fixtures and a minimal original visual system: colour, type, spacing, status symbols and accessible chart colours. Record the build and test commands after running them successfully.

Acceptance: domain tests and TypeScript checks pass; iOS and Android development builds run and render the same fixture history/statistics. No backend account is needed. Record actual successful build/test commands and any missing device tooling.

First implementation session: start with M1.1–M1.4, then create and build the shared mobile app on both platforms. Do not introduce an external database dependency just to complete the pure domain tests.

## M2 — Local persistence and the small widget

- [ ] **M2.1:** Implement a versioned SQLite store, repository interfaces and migrations. Prototype `expo-sqlite` as the access layer; keep it outside `habit-core` and validate native/widget access and the selected supported SDK version.
- [ ] **M2.2:** Persist local-only habits, schedule revisions, progress events, notes and an upload queue. Make recording an action and enqueueing its operation one transaction. Prove recovery after a process interruption.
- [ ] **M2.3:** Connect creation, editing, logging, undo, archive and past-day correction to the store. Keep existing records intact on forward-only schedule/target changes.
- [ ] **M2.4:** Prototype one small single-habit widget on both iOS and Android with Expo Widgets first. Use separate SwiftUI/Compose widget layouts where needed and match compact Android dimensions to launcher capabilities. Let each instance select any active habit. Display habit identity/private alias, compact grid, progress or quit interval, and one relevant action.
- [ ] **M2.5:** Prove the widget action path with the main app closed, offline and after process termination. Expo's isolated widget runtime cannot be assumed to import `habit-core`, run async work or access app memory. Use durable widget actions/snapshots with iOS App Group sharing and the equivalent Android storage boundary. If required, add narrow native Swift/Kotlin modules while keeping the main app shared. Private actions and lapse resets open the app's authentication/confirmation flow.
- [ ] **M2.6:** Implement versioned export/restore, validation and a safe preview before importing. An export includes the record needed to reconstruct statistics; live sync is not the backup format.
- [ ] **M2.7:** Verify logging with no network, app termination/relaunch, multiple widget instances, archived/deleted selections, privacy mode and day rollover.

Acceptance: on both iOS and Android, create/select a habit, log from the small widget with the app closed and offline, then relaunch and see one correct durable action in the app/stats. Verify privacy and multiple widget instances. If the library cannot satisfy this, record the native adapter needed before proceeding. Restore an export on a clean installation. No medium, multi-habit or Lock Screen widget is included.

## M3 — Sync proof and provider decision

Default candidate: Firebase Authentication and Cloud Firestore through native React Native Firebase modules in development builds, validated first with local emulators. Verify Expo SDK/plugin compatibility; do not assume the Firebase web SDK has equivalent React Native persistence behaviour. Keep a narrow adapter boundary so provider-specific behaviour does not spread into domain/UI code.

- [ ] **M3.1:** Add emulator configuration, a portable sync schema and automated access-rule tests. An account can access only its own data. Client code cannot grant itself paid access.
- [ ] **M3.2:** Prove an email-based login and recovery path on iOS and Android. Add Apple sign-in where appropriate and link it to the same user identity. Verify account linking before treating it as complete.
- [ ] **M3.3:** Implement explicit opt-in migration from local-only data to an account, without overwriting existing cloud history. Isolate account caches and pending operations on sign-out/account switching.
- [ ] **M3.4:** Upload/download stable operations with retries and deduplication. Define independent action merging, reversal/undo handling, schedule versions, conflicting note edits and deletion markers. Preserve conflicting note text for resolution rather than silently discarding it.
- [ ] **M3.5:** Update the local store and widget snapshots after downloads. Expose syncing/pending/error state in settings without blocking local check-ins. Remote widget refresh follows OS scheduling; do not promise immediate background refresh.
- [ ] **M3.6:** Test simultaneous offline count increments, the same yes/no check-in on two devices, undo before upload, retries after acknowledgement loss, a lapse plus a success check-in, delete-versus-edit and account switching with pending work.
- [ ] **M3.7:** Use the actual shared mobile app on iOS and Android to exchange the same fixture habit/events; verify both mobile directions and a second installation. A separate Android probe app is unnecessary.
- [ ] **M3.8:** Measure a representative month of reads/writes using sample activity assumptions, then record cost and provider trade-offs. Check the native Firebase adapter, authentication providers and background constraints on both actual mobile targets.

Acceptance: iOS/widget → Android/widget → offline edits on both → reconnect converges without lost or doubled actions. Both apps understand the same record. Two accounts cannot read each other's data. Record the provider decision and known constraints before moving into production integration.

Use development entitlement fixtures for this proof; do not ship an entitlement bypass. Cloud sync's paid boundary is implemented in M5.

## M4 — Complete the daily experience

- [ ] **M4.1:** Finish onboarding: Build/Quit/both choice, relevant templates, first habit and first successful action. Show widget setup after first value.
- [ ] **M4.2:** Finish Today and habit detail: create/reorder/edit/archive/delete, recent grids, calendar navigation, optional daily note, corrections and clear empty/error states. Adapt safe areas, navigation, touch targets and permission flows for each mobile platform.
- [ ] **M4.3:** Finish Quit mode: reported interval, explicit daily check-ins, lapse confirmation/correction, optional triggers and milestones. Unknown days stay unknown and earlier progress survives a lapse.
- [ ] **M4.4:** Implement the short urge flow: optional intensity/trigger → pause/breathing timer → personal reason → replacement action → optional outcome. Returning from an interrupted timer must be predictable. Selecting a replacement action does not auto-complete a habit.
- [ ] **M4.5:** Build the statistics screen with habit/date filters, yearly grid, current/best streak, totals, completion rate, monthly bars and time-of-day distribution. Add quit success rate plus coverage, lapse counts and observed trigger summaries. Use `habit-core` for all application calculations, with equivalent snapshot/operation fixtures for any native widget action code.
- [ ] **M4.6:** Add one local reminder per habit and daily review, selected-day delivery and suppression after a build goal is complete. Reminder delivery is device-specific; use one designated device by default to avoid duplicate reminders across synced phones. Request permission when a reminder is configured.
- [ ] **M4.7:** Finish privacy settings, device authentication, discreet widget/notification labels, export/restore and sync settings. Keep personal content out of diagnostic logs and analytics.

Acceptance: users can complete the entire daily loop on both mobile apps, with and without sync. Charts explain missing data and use the same rules as widgets. Urge support works offline.

## M5 — Pro purchases and entitlements

- [ ] **M5.1:** Implement one central capability policy: three free active habits, core progress and the small widget; Pro adds unlimited habits, full charts, extra controls and cloud sync. Local history and export remain accessible after expiry.
- [ ] **M5.2:** Choose one maintained React Native purchase adapter, validate its current SDK support, and add monthly/annual subscriptions for the App Store and Google Play with store sandbox configuration. Both products unlock the same Pro capabilities. Prices displayed in the app come from the store rather than hardcoded strings.
- [ ] **M5.3:** Validate transactions and subscription events on the server, associate Pro with the signed-in account for sync, and process renewals/refunds/expiry idempotently. Keep a trusted cached entitlement for bounded offline use.
- [ ] **M5.4:** Handle anonymous local purchase → later sign-in without losing access; explain and resolve attempts to link a purchase already attached to another account. Add restore and subscription-management paths.
- [ ] **M5.5:** Test purchase cancellation, pending/failed purchases, store restore, account recovery, renewals, refunds, expiry and repeated server notifications. Implement Apple and Play verification; prove that Pro follows the linked account without requiring a second purchase. Android billing must pass before its release even if iOS ships first.

Acceptance: sandbox purchases and restore work for each store; Apple and Play entitlements attach to the same platform-neutral account. Test Apple purchase → Android access and the reverse without double purchase. Expiry preserves the local record. Before selling sync, publish its retention/expiry behaviour.

## M6 — Reliability and release readiness

- [ ] **M6.1:** Run the date/schedule/statistics fixtures through app, widget, export/restore and synced history. Test supported deployment targets as well as current OS versions where runtimes/devices are available.
- [ ] **M6.2:** Verify store migrations, interrupted imports, large multi-year histories, duplicate sync delivery, deletion propagation, sign-out and account deletion across previously offline devices.
- [ ] **M6.3:** Test private widgets while locked, background/foreground transitions, notification denial, missing widget data, slow connections and unavailable cloud service. Cover Android launcher differences and battery restrictions; document expected behaviour after explicit user force-stop separately from ordinary process termination.
- [ ] **M6.4:** Review VoiceOver/TalkBack, Dynamic Type/Android font scaling, keyboard access, light/dark mode, reduced motion, chart labels and non-colour status distinctions on actual screens.
- [ ] **M6.5:** Add only the diagnostic information needed to resolve crashes/sync failures. Use coarse opt-in usage measurement; validate that habit names, notes and trigger values never appear in reports.
- [ ] **M6.6:** Complete environment-specific configuration, signing, iOS App Groups, Android application configuration, both store purchase identifiers, support/privacy URLs and service access rules. Record release checks and test evidence in `docs/`.

Acceptance: no known data-loss, cross-account access or purchase-restoration defect remains. Every shipping platform and critical failure path has recorded verification. Make any unsupported device/OS combination explicit in the release scope.

## M7 — Beta, ASO and release

- [ ] **M7.1:** Recruit a small beta cohort covering everyday habit tracking, quit tracking, widget use and iOS/Android combinations. Observe four weeks, including users who mainly interact through widgets.
- [ ] **M7.2:** Measure first-habit/first-check-in activation, check-in days in weeks one/four, widget check-ins, sync problems, support feedback and upgrades/refunds. Keep acquisition cohorts distinguishable without transmitting raw personal habit content.
- [ ] **M7.3:** Execute [ASO-PLAN.md](marketing/ASO-PLAN.md): choose initial keyword focus, research an original brand, draft metadata, capture real iOS/Android screenshots and prepare a quit-focused custom page if supported by beta learning.
- [ ] **M7.4:** Review billing/privacy disclosures, retention policy, support/contact paths, account deletion and release notes against the delivered app and current store requirements.
- [ ] **M7.5:** Resolve the critical beta issues, prepare the iOS submission first; submit Android after its widget, reminder, accessibility, purchase and sync checks pass. Monitor crash/sync/support signals and upgrade/refund behaviour after release; keep a tested migration/rollback response for backend changes.

Acceptance: beta users repeatedly use the main loop; blocking reliability issues are resolved; store copy matches shipping behaviour. Do not infer successful retention or pricing from downloads alone. Low retention changes feature priorities; Android still has its own readiness gate rather than a promise of simultaneous release.

## M8 — Mac companion follow-up

Validate desktop demand before selecting a Mac implementation. Reuse the sync contract, account identity, entitlement service and behaviour fixtures. Do not assume the mobile React Native app automatically provides a complete Mac product. Evaluate whether supported iPhone widgets on Mac meet some early needs; test account/connectivity requirements and interactions before making a product claim. A full Mac app remains a separate design/build/release milestone.

## Inputs needed during implementation

These are external inputs to collect at the milestone where they become necessary; they do not prevent local M1/M2 work.

| Input | Needed for |
|---|---|
| Final public name and app identifiers | Signing, store records, URLs and final assets |
| Apple developer team, Play Console access and mobile test devices | Widget/device testing, beta distribution and submissions |
| Firebase development/production project configuration | Real hosted sign-in/sync; emulators come first |
| Store products and server notification configuration | End-to-end subscription sandbox tests |
| Support/privacy hosting and retention policy | Production account/billing flows and submission |
| Node/package manager, Java/Android SDK and mobile test targets | Verify in M1; both mobile builds remain working throughout development |

No production service has been created, no billing has been enabled and no app has been submitted as part of M0.
