# App Store launch checklist

Updated 8 November 2026. This is the current delivery checklist for the app built through the recent incremental sessions. The older [implementation plan](../IMPLEMENTATION-PLAN.md) remains an inactive reference after the rollback. Its proposed backend, storage architecture, prices and feature allowances need fresh decisions before use.

This checklist plans the next steps. An unchecked item is unfinished or awaiting release verification. External setup, dependency installation, native builds and publishing follow the project approval rules in [AGENTS.md](../AGENTS.md).

The 7 November sequencing update adds L17 for iCloud sync and L18 for structural review and refinement. Apple purchases have moved from L06 to L19, the final milestone. L19 includes the review after purchase integration and the release sign-off. Existing IDs stay stable, and L06 is retired.

## Existing foundation

These items have local implementations. Physical-device verification belongs to L15 and the final L19 regression pass.

- [x] Three home views with shared progress, fixed controls and horizontal paging.
- [x] Add/edit habits, colours, vector icons, emoji, categories and selected-weekday schedules.
- [x] Yes/No check-ins, calendar history, corrections and daily notes.
- [x] Local persistence with validation, serialized writes, load errors and save retry.
- [x] Archive/restore with a 30-calendar-day free retention rule and preserved earned collections.
- [x] Wallpaper milestones, collectible 90-day patches and image export/share.
- [x] Light, Dark and System appearance with a saved preference.
- [x] Haptic feedback with an opt-out.
- [x] Habit-detail and Settings-submenu swipe-back drawers.
- [x] Settings, onboarding replay and Pro screen layouts.

Count/Measure daily logging, dated rules and v2 migration, Balanced analytics, achievement celebrations, Free/Pro policy, first use, reminders and portable backup/restore are implemented locally. The user confirmed receiving a notification on 8 November; broader native/lifecycle acceptance remains open. New installations start empty with welcome/skip and first-log guidance. Backup & Restore now previews files, adds missing data or replaces local habits after confirmation, and supports explicit local erasure. Pro plans are previews and production access remains Free until L19. Widgets and account sync remain pending. Individual milestone sections below distinguish local checks from device acceptance.

The 8 November UI pass applies shared control/spacing roles across the current screens, including compact Analytics habit selectors and responsive colour palettes. See the [design system](DESIGN-SYSTEM.md). Physical-device layout and large-text review remain part of L15/L19.

## L01 — Set the release boundaries

Product decision. Resolve this before building paywalls or advertising features.

L01 is in progress. The user selected HabitKit's Free/Pro model as the basis, included wallpapers and analytics in Pro, and requested the iCloud sync milestone. The detailed feature matrix and remaining decisions are in [L01 release scope](L01-RELEASE-SCOPE.md).

- [ ] Confirm iPhone and iPad support for the iOS launch, supported OS versions, initial language and storefronts. Android remains a separate release gate.
- [ ] Confirm the small iOS widget's version 1.0 scope. Plan optional Pro iCloud sync under L17, with any release deferral explicitly recorded.
- [x] Confirm and implement calendar-day streaks for selected-weekday habits: Monday/Friday/Monday spans 8 days. Rest days are credited at the next completion; missed scheduled days break the run. Wallpaper/badge milestones use the same confirmed calendar span. See L01 for examples and evidence.
- [ ] Confirm the initial Free/Pro matrix, active-habit allowance, plan types and prices. Earlier planning documents and current preview prices are working proposals.

Done when the version 1.0 feature list, reward rules and paid offering are written down consistently.

## L02 — Finish tracking and protect historical accuracy

Required before analytics and achievement triggers. [Implementation and evidence](L02-TRACKING.md) are recorded for 7 November 2026. Local checks pass; the last verification item remains open pending physical-device migration, termination, keyboard, gesture and timezone evidence.

- [x] Implement Count and Measure logging from every relevant entry point, including Add 1, Enter total, decimal amounts, units, undo and past-day corrections.
- [x] Represent explicit completion, partial progress, explicit failure/lapse, unlogged, unscheduled and future days. Quit success requires a user report, including an explicit zero for zero-limit goals.
- [x] Preserve schedule, target and unit history across edits. An edit effective today must not reinterpret earlier records.
- [x] Record the habit date, occurrence time when known, recording time and timezone context. Migrate existing check-ins and notes without inventing numeric amounts or occurrence times.
- [ ] Verify midnight, daylight-saving and timezone changes, leap days, unfinished today, limit/target boundaries, retries and interrupted saves.

Done when home views, detail, streaks and rewards agree on the same underlying entries.

## L03 — Charts and useful analytics

Requested launch work. Depends on L02. [Implementation and calculation rules](L03-ANALYTICS.md) were revised on 8 November 2026 after the user selected the simplified Balanced design. The screen and local checks are implemented; L02 acceptance and L03 physical-device accessibility/layout checks remain open.

- [x] Build the Charts screen with habit selection and 7-day, 30-day, 90-day and yearly views.
- [x] Add scheduled-day completion rate, current/best streak and totals, with visible denominators and today's unfinished progress handled separately.
- [x] Show a seven-calendar-day consistency line for Yes/No and daily amount lines with historical target/limit markers for Count/Measure. Add bounded smooth/straight interpolation and date inspection.
- [x] Keep weekday breakdowns, day-state counts and separate activity totals under collapsed More details, with clear small-sample/empty states.
- [x] Use exact selected-date readouts and visible rolling-window denominators. Keep incompatible units separate; do not add causal or predictive claims.
- [ ] Make charts readable with VoiceOver, larger text, non-colour cues and both themes. Keep private habit analytics on the device for the local-only release.

The standalone recovery, observation and supporting-day sections were deferred from the screen in the 8 November simplification. Their domain calculations remain covered by local checks. Later candidates include optional obstacle tags, habit relationships and user-directed experiments. They can follow the initial analytics release.

## L04 — Achievement animations and a reusable trigger system

Implemented locally on 8 November 2026 with the confirmed once-per-habit wallpaper policy and one celebration for each new cycle badge. [Implementation and delivery contract](L04-ACHIEVEMENTS.md) record the local checks and at-most-once presentation policy. Native animation, interruption and accessibility acceptance remain pending.

- [x] Define reward-earned events with stable identities, such as a habit/cycle/milestone combination, separate from screen animations and haptics.
- [x] Build one animation host and event-to-animation registry. Queue multiple rewards and provide completion/dismiss callbacks so new effects can be added centrally.
- [x] Create wallpaper and badge reveals using the actual earned artwork, coordinated motion and haptics, a clear achievement message, and View/Share actions.
- [x] Decide whether a wallpaper earned again by another habit or cycle receives a repeat celebration. Persist delivery state to prevent unintended replay on ordinary startup, re-renders or opening the collection.
- [x] Handle interrupted reveals, app backgrounding, save failures, backdated entries and migrated history. Seed/demo data must never trigger personal achievements.
- [ ] Verify the locally implemented Reduce Motion, quick dismissal, disabled haptics and editor-protection paths on physical iPhone/iPad devices, including native sheet transitions and process interruption.

Done when a genuine unlock produces one appropriate celebration and remains available in the collection afterwards.


## L05 — Separate Free and Pro capabilities

Implemented locally on 8 November 2026. [Policy, evidence and remaining acceptance](L05-FREE-PRO.md). The user confirmed the detailed L01 split and a fresh 30-day archive recovery window after Pro ends.

- [x] Central capability policy for creation, individual/bulk restore, logging limits, analytics, wallpaper exports and dashboard customization. Reminder limits and planned widget/sync permissions are defined for their future integrations.
- [x] Contextual upgrade routes in the current screens; align Settings, paywall, gallery and onboarding copy. Production preview grants Free only; selecting a plan never grants Pro or charges money.
- [x] Preserve excess habits/history and saved paid preferences on downgrade; allow choosing four habits to keep logging. Keep badges, sharing, celebrations and personal-data export permissions Free.
- [x] Model retention with verified/loading/unavailable access states. Persist paid archive protection and a fresh 30-day recovery date after a verified downgrade. Never purge while access is uncertain.
- [x] Local fixtures cover upgrade/downgrade, stale callbacks, restore at the limit, unavailable access, saved recovery windows, policy translations and screen/export guards. No development switch grants production Pro.
- [ ] Verify native sheets, choose-four layout, upgrade dismissal, themes, larger text and accessibility on iPhone/iPad. Run real purchase/offline/renewal/revocation scenarios after L19 connects the adapter.
- [ ] Apply the same policy in L08 multiple-reminder delivery, L09 import/data export, L11 widget execution, L17 sync and L19 purchases. Align the final store listing in L16. These services are not implemented by this milestone.

Purchases stay in L19. Current production access is Free; Pro and uncertain states exist only as isolated regression fixtures until verified billing is connected. Device acceptance remains open, so L05 is not signed off for release. L06's former purchase tasks live in L19.

## L07 — First use and a complete daily loop

Implemented locally on 8 November 2026. [Flow, control audit and acceptance notes](L07-FIRST-USE.md). Physical-device and future-service acceptance remain open.

- [x] New installations start empty. Continue in the welcome screen saves its completion and opens Add Habit; Skip leads to the empty tracker with a direct Add action. Demo fixtures are no longer loaded by the app, and existing saved habits are preserved.
- [x] Persist first-launch completion separately from habit data. Keep Settings replay, handle unreadable/failed welcome preferences with retry and an explicit session-only bypass, and prevent duplicate submissions.
- [x] Add distinct empty states for a new tracker, archived habits, hidden completed habits and unmatched filters. Add a first-log hint and Settings Quick guide for logging, corrections, archive recovery and wallpaper export. Surface habit-save retry inside Settings too.
- [x] Audit current controls: General/Overview/Language remain functional; reminder preferences, file backup and sync are explicitly marked coming soon. Remove unconfigured feedback/site/social/store/legal actions. Keep What's New as a short informational alert for this preview.
- [ ] Verify fresh install, skip, repeat launch, welcome-save failure, cancelled Add, first log, archived/filtered/completed states, guide back swipe, native sheets, large text and VoiceOver on iPhone/iPad. Native-speaker acceptance remains L15.
- [ ] Complete notification permissions/delivery in L08, file backup/restore in L09, privacy/terms in L10, public/support/store destinations in L16, widgets in L11, sync in L17 and purchases in L19. Permission-denied checks for those services belong to their integrations; L07 does not request new permissions or advertise them as working.

### Screen inventory

Code review updated 8 November 2026. This distinguishes existing screens from unfinished flows. Device verification remains part of L15/L19.

| Screen or entry point | Current state | Remaining work / owner |
|---|---|---|
| Home, detail, calendar, notes, Add/Edit | Yes/No and numeric logging, day states, corrections and notes implemented | L07 empty/first-log/help states implemented; L02/L07 device acceptance remains |
| Theme, Archived Habits, Reorder Habits | Working submenus | L05 limits/recovery policy implemented locally; native and verified-purchase acceptance in L15/L19 |
| Wallpapers, badges and share previews | Collection/export plus queued artwork reveals implemented locally | L04 native/lifecycle/accessibility acceptance; L05 paid export boundaries implemented; device/billing acceptance pending |
| Charts | Balanced layout, habit/period selection, smooth/straight line graphs, selected-date details and expandable weekday/activity counts implemented locally | L03 physical-device accessibility/layout acceptance; L05 policy implemented; native/billing acceptance pending |
| Count/Measure daily entry | Add 1/Enter total, unit-aware historical records, explicit zero, correction/undo drawer and save retry implemented | L02 physical-device acceptance |
| Icon/emoji selector | Separate searchable category screen with back/swipe navigation, 56 vector choices, grouped emoji and custom emoji entry | Physical-device layout and navigation verification in L15 |
| General | Saved week-start, today-highlight and note settings, plus working haptics | Crash reporting and purchase ID explicitly unavailable until their integrations |
| Overview / dashboard customization | Saved controls connected to view navigation, filtering/search, streak/category display, compact-list layout and drag ordering | L05 paid boundaries implemented; verify gestures/upgrade sheets in L15 |
| Daily Check-In Reminders and habit reminder editor | Local scheduling, contextual permission flow, one/three habit times, discreet content, status/coverage and device settings implemented locally | L08 physical delivery/native/lifecycle acceptance |
| Backup & Restore | Validated file preview, add/replace restore, local erasure and failed-load recovery implemented locally | L09 real Files/share round-trip and native interruption acceptance |
| iCloud Sync | Planned Pro entry point; explicitly coming soon | Opt-in, status, account/storage errors and cloud-data controls in L17 |
| Onboarding | First-use completion/skip, direct first-habit path, Settings replay and Quick guide implemented locally | L07 native/device acceptance |
| Pro | Layout with preview prices | L05 capability copy/upgrade reasons implemented; actual purchase/restore/manage flow in final L19 |
| Language | Live, persisted translations for all 12 listed locales; system fallback, localized dates/plurals and icon/emoji search | Native-speaker review, device layout/accessibility checks and final launch-language selection in L01/L07/L15 |
| What's New | Short informational alert retained for the preview | Final release copy in L16; no separate release-notes screen required now |
| Privacy Policy and Support | Offline policy, recovery help and email-draft contact connected, with back/swipe navigation | L10 public-page hosting, final release/privacy audit and device acceptance |
| App-switcher cover | Static cover connected to Home and all app-owned native modal surfaces | L10/L14 signed-build snapshot proof and native lifecycle protection where needed; device lock separate |
| Feedback, Website, X, Terms, Rate App | Unconfigured external actions removed from the current menu | Add final public/store destinations in L10/L16 before release |

- [ ] Review the remaining user-supplied screen references and add their accepted behaviour to the corresponding milestone before implementing each screen.

## L08 — Working reminders

Implemented locally on 8 November 2026. [Implementation, package record and acceptance checklist](L08-REMINDERS.md). The project-local notification package was explicitly approved and installed. The user confirmed receiving a notification on 8 November; platform/build and delivery state were not specified, so this confirms basic receipt only.

- [x] Schedule local jobs for habit weekdays and optional daily review; request permission when a reminder is configured, with denied/unavailable states and device settings access.
- [x] Reconcile successfully saved changes after editing, completion/undo, archive/restore, deletion, settings and access changes. Keep partial numeric goals and unlogged Quit days eligible; suppress completed habit reminders today.
- [x] Apply one/three reminder allowances and discreet notification content. Show scheduling errors/retry and finite scheduled-through coverage; refresh on foreground and during active use.
- [x] Local mocked checks cover permissions, duplicate requests/jobs, stale queue plans, native API adapters, response taps, persisted-only settings, retained drafts and save retries. Local calendar/DST checks pass in multiple timezones.
- [ ] Verify real iPhone/iPad permission grant/denial, Expo Go versus signed-app behavior, background/termination delivery, notification taps, lock-screen privacy, timezone travel, duplicate prevention, revised times and queue coverage. Native build approval remains separate in L14; verified paid access remains L19.

## L09 — Backup, restore and data removal

Implemented locally on 8 November 2026. [Format, package record, restore/erase policy and acceptance checklist](L09-BACKUP-RESTORE.md). The project-local file packages were explicitly approved. Physical file round-trip and native interruption acceptance remain open; L09 is not signed off for release.

The L02 migration retains a v1 recovery record alongside v2; erase-all and migration cleanup must cover both.

- [x] Add versioned file export and restore covering habits, entries, notes, schedules, reminder times and earned collections; preserve device-specific preferences and permission on restore.
- [x] Validate imports and show a preview. Add missing IDs while keeping existing copies, or explicitly confirm replacement. Publish restored state only after its snapshot save succeeds. Restore is Free; excess habits stay saved under the four-habit logging allowance. Imported reminders start paused and historical celebrations do not replay.
- [x] Local checks cover older formats, large histories, failed writes, preview/confirmation/cancellation, namespaced cleanup and interrupted-erasure recovery. Erasure cancels/dismisses only owned native reminders.
- [ ] Verify a real round-trip on another installation, older-format migration, interrupted writes and large histories.
- [x] Add an explicit erase-all-local-data action with typed confirmation. Remove notes, archives, retained rewards, v1/v2 records, app preferences and owned temporary files. Freeze/drain writers, retain a recovery marker through partial failure, then remount fresh data owners.
- [ ] Verify erasure/retry and restore on iPhone/iPad, including native Files/share cancellation, large text, VoiceOver and termination. Exported copies outside the app remain under the user's control.

Ordinary habit deletion currently retains earned rewards with habit-name snapshots. Explain that behaviour and distinguish it from erasing all personal data.

## L10 — Privacy, support and accessibility

Required release work, with protection features selected for the audience.

Implemented locally on 8 November 2026: [L10 evidence and remaining gates](L10-PRIVACY-ACCESSIBILITY.md). Settings Privacy Policy/Support, the confirmed email contact, app-wide visual cover and targeted accessibility improvements are connected. Public content is prepared but unpublished; signed-build privacy and physical accessibility acceptance remain open.

- [x] Add offline Privacy Policy and Support screens, email-draft handoff with no automatic private content, error fallback and back/swipe navigation. Prepare reviewable public policy/support content using `kaustuvkaran@gmail.com`.
- [ ] Publish an accurate privacy policy and a working support/contact page. Connect them in the app and store listing. Describe local storage, exports, archive expiry and retained rewards.
- [x] Inspect current JS data flows and installed dependency privacy manifests; record observed declarations without treating them as a final binary audit.
- [ ] Complete App Store privacy disclosures and audit dependencies, required-reason APIs and bundled privacy manifests against the actual release binary.
- [x] Current app code has no connected diagnostic/product-usage service or direct console/network output; support drafts include only a generic subject. Keep this boundary under regression review and re-audit added native/cloud/billing services.
- [x] Add screen-reader calendar editing, hide offscreen Home pages, label Yes/No entry groups and disabled dismissal controls, and improve drawer handle touch area. Check normal theme text contrast tokens.
- [ ] Review VoiceOver, text scaling, contrast, non-colour status, Reduce Motion, keyboard behaviour and touch targets across the daily flow.
- [x] User chose a cover now and device lock as a separate decision. Add a static visual cover to Home and every app-owned native modal without discarding drafts.
- [ ] Verify snapshot concealment in a signed build and add synchronous native lifecycle protection where needed. Expo Go's JavaScript cover alone is not a security guarantee. Decide device authentication separately before sensitive-quit marketing.

Apple requires accurate app privacy information and applicable SDK/API declarations. Verify the assembled app, including third-party code. [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/), [third-party SDK requirements](https://developer.apple.com/support/third-party-SDK-requirements/), [required-reason APIs](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api).

## L11 — Small single-habit widget

Product requirement if included in L01. It needs native development and release builds.

- [ ] Let each small widget choose one habit and show its identity, compact progress and appropriate action.
- [ ] Share durable state with the app. Verify actions and later reconciliation while the app is closed and offline, including numeric tracking.
- [ ] Handle archived/deleted habits, stale snapshots, midnight, private labels, multiple instances and the chosen Free/Pro policy.

## L12 — Future app accounts and iOS/Android continuity

Future scope. Apple-device iCloud sync is planned separately in L17 using the existing iCloud identity. Decide this milestone before promising shared iOS/Android sync or introducing a separate app account.

- [ ] If included, provide optional Apple/Google sign-in with session recovery, account linking and safe migration of existing local data.
- [ ] Implement account-isolated storage and sync with retries, conflict handling and deduplication. Test offline edits, corrections, deletes and sign-out.
- [ ] Define paid sync access, cancellation and cloud retention. Keep portable backups available independently.
- [ ] Provide in-app account deletion, removal of associated cloud data and appropriate sign-in authorization revocation. Explain subscription management separately.

Apps supporting account creation must offer account deletion in the app. This requirement becomes applicable when accounts are introduced. [Apple account-deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app/).

## L13 — Original identity and cleared artwork

Release gate based on the current reference-driven screens and supplied wallpaper assets.

- [ ] Choose the public name, app icon and visual identity. Review the interface for sufficient original design and distinctive behaviour.
- [ ] Document commercial-use rights for every shipping wallpaper, photograph, quotation treatment, font and patch asset. Replace any asset whose rights cannot be established.
- [ ] Produce final app icon, launch appearance, reward imagery and export branding. Check image quality, cropping and app size.

Apple reviews imitation and unauthorized use of protected content. The current screenshot references and supplied photos require a deliberate release review. [Apple copycat guidance](https://developer.apple.com/help/app-review/guideline-reference/4-1-prevent-copycat-rejection).

## L14 — Native iOS foundation and release configuration

Required release engineering. Expo Go verification covers only part of this.

- [ ] Configure the final bundle identifier, version/build numbering, developer team, signing, capabilities and any widget App Group.
- [ ] Produce and install a signed development/release build. Verify native modules, permissions, theme handling and export sheets. Complete the CloudKit prerequisites before L17's device proof.
- [ ] Check the build against Apple's SDK/upload requirements at release time, and resolve production warnings, privacy manifests and export-compliance answers.
- [ ] Confirm developer enrollment, App Store Connect access and any paid-app agreements, tax and banking requirements for the chosen business model.

Apple's current upload baseline includes Xcode 26 or later and the iOS/iPadOS 26 SDK or later. Recheck when preparing the release. [Apple SDK requirement notice](https://developer.apple.com/news/?id=ueeok6yw).

## L15 — Core device testing and TestFlight

Required verification before release.

- [ ] Run the daily flow on a small and a large iPhone, the supported iOS range, and iPad if supported. Cover both themes, larger text, swipe cancellation, keyboards and sharing.
- [ ] Verify data survival across termination, updates and offline use, plus numeric corrections, reward delivery, archive expiry and backup recovery. Exercise capability states with test-only fixtures before L19.
- [ ] Distribute a TestFlight beta after build authorization. Gather feedback on first habit/first log, missed-day recovery, analytics comprehension, reward reveals and paywall clarity.
- [ ] Fix core crashes, data-loss cases and incorrect metrics. Record the devices/builds checked and remaining limitations. The final paid-access beta pass belongs to L19.

## L16 — ASO and store preparation

Required store preparation. Continue the existing [ASO plan](../marketing/ASO-PLAN.md).

- [ ] Finalize name, subtitle, keywords, description, category and accurate Free/Pro messaging.
- [ ] Capture real release-build screenshots using fictional data for the required iPhone sizes and iPad if supported. Show only delivered features.
- [ ] Complete age rating, privacy information, content-rights, support/privacy URLs, availability and pricing fields. Declare accessibility support that has been verified.
- [ ] Provide review contact details, clear instructions for the daily flow and purchases, and reviewer access if account features require it.
- [ ] Prepare submission materials and a support and rollback/fix response for launch. Refresh captures against the final paid build and submit in L19 after its review gates pass.

Use the current store requirements when preparing assets and metadata. [Apple submission guidance](https://developer.apple.com/app-store/submitting/), [screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications).

## L17 — Cross-device iCloud sync

New planned milestone. Use the detailed [iCloud sync plan](ICLOUD-SYNC-PLAN.md).

- [ ] Prepare atomic local writes, stable operations, schema migration and an upload queue after L02, L09 and L18's early structure review.
- [ ] Set up CloudKit private storage, the native adapter and a signed development build after the L14 prerequisites are ready.
- [ ] Prove offline two-device convergence, retry deduplication, note conflicts, corrections, archive/delete propagation and stable earned rewards.
- [ ] Add opt-in sync, useful status/errors, safe initial merging, iCloud account-change handling and cloud-data removal.
- [ ] Validate the production schema and TestFlight/device behaviour, including widget updates and entitlement-state fixtures. Record recovery and storage/quota behaviour.

Done when the same test iCloud account's iPhone and iPad safely converge after offline edits, with a durable local history and a tested production schema. Actual paid access is connected in L19.

## L18 — Production structure review and refinement before purchases

Required review and implementation gate. Start 18.1 before L02/L17 data changes, then finish 18.2 once the core features and sync are complete.

### 18.1 — Review the current app structure

The 8 November [code-quality pass](CODE-QUALITY-REVIEW.md) adds a tested checkpoint and focused simplification commits: save/restore and preference-race fixes, immutable Home selectors/shared presentation readiness, allocation-free recent-rule lookup, stable reminder effect inputs, explicit Settings routing and one complete regression command. [Architecture](ARCHITECTURE.md) now describes implemented ownership; older backend candidates are archived. These local improvements do not close native or cross-process storage acceptance.

Initial code inspection completed 7 November 2026. [The L18.1 review](L18-STRUCTURE-REVIEW.md) records confirmed findings, proposed contracts and bounded slices R1–R6. No application behaviour changed during the review. R1 is now implemented and locally checked: production types/date rules are separate, habit mutations use pure shared transitions, and Home uses named store actions. Repository/sync/entitlement contracts, remaining refinements and device acceptance remain open; L18 is not signed off.

- [x] Inspect screen/navigation ownership, habit types, tracking/reward calculations, persistence, error handling, capability policy, theme/haptics and platform code. Record concrete problems and a bounded refinement list. Evidence: L18.1 review and passing local checks.
- [x] Check the current Home screen's coordination responsibilities and the habit-store hook's migration/write boundaries. Move logic only where it improves correctness, testability or ownership. Inspection and R1 action-boundary moves are complete; R2 history/write changes are now locally implemented; device acceptance remains open.
- [ ] Establish narrow repository, sync and entitlement contracts. Share domain rules, keep platform adapters separate, and retain existing components rather than generating an empty framework.
- [ ] Review dependencies and native-module compatibility, data protection, accessibility, lifecycle behaviour and large-history performance. Agree acceptance evidence for the necessary changes.

All 12 installed dependencies covered by the local Expo SDK 58 manifest satisfy its version ranges. Native compatibility, lifecycle/accessibility proof and performance measurements remain pending. R1's domain/action boundary passed TypeScript, action/store, reward, feedback and localization checks. R2/L02 is now locally implemented: numeric entries, historical rules, save feedback and timezone timer rescheduling. See its implementation record for remaining device acceptance before analytics.

### 18.2 — Refine and sign off before StoreKit

- [ ] Complete the agreed refinements and the AsyncStorage-to-production-store migration if required. Verify existing local histories, archives and earned rewards through upgrade and recovery.
- [ ] Ensure local writes, remote changes and widget actions follow the same domain rules and coordinated storage path.
- [ ] Verify Free, Pro, expired and unknown capability states through development fixtures, including data retention. Keep production access independent of fixture flags.
- [ ] Pass the core checks and recorded signed-device scenarios for navigation, notifications, sync, privacy and performance. Resolve release blockers before purchase work begins.

Done when a versioned core beta is stable, module ownership is clear, migrations are proven, and the purchase adapter can be connected without restructuring tracking or sync.

## L19 — Apple purchases, post-integration review and release

Final milestone, as requested. L05 policy, L17 sync, L18 sign-off and store preparation must be ready. Purchase integration is followed by the required structural review inside this milestone.

### 19.1 — Integrate Apple purchases

- [ ] Set up the selected Monthly/Annual/Lifetime Apple products and compatible purchase integration. Resolve exact prices, service promises, localized pricing and required business agreements.
- [ ] Replace development entitlement fixtures with verified App Store access behind the L05 adapter. Handle transaction updates, trusted cached state, purchase cancellation, pending/failure, renewal, refund/revocation and expiry.
- [ ] Implement Restore Purchases and Manage Subscription. Verify reinstall and second-device recovery, including distinct iCloud and App Store accounts.
- [ ] Apply paid access consistently to wallpapers, analytics, sync, widgets and agreed limits. Preserve personal history and exports, and protect archives while entitlement status is unknown.
- [ ] Complete paywall disclosures, terms/privacy links and any approved offers. Make unfinished transactions and repeated callbacks safe.

### 19.2 — Review and refine the app after purchase integration

- [ ] Repeat the L18 ownership and dependency review against the actual integration. Resolve duplicate listeners, lifecycle races, scattered access checks, stale caches and any sensitive logs introduced by the purchase code.
- [ ] Verify paid-state changes alongside in-flight logging, notes, reward reveals, cloud operations and widget actions. Ensure purchase UI transitions do not corrupt or block pending saves.
- [ ] Run sandbox and signed beta scenarios for Free/Pro/expired/unknown access, offline startup, restore, iCloud account changes and paid archive retention. Cover Monthly, Annual and Lifetime where offered.
- [ ] Recheck migrations, privacy declarations, native configuration, accessibility, performance and release dependency security. Remove development overrides and record the final regression evidence.

### 19.3 — Final sign-off and submission

- [ ] Produce the release candidate and refresh store screenshots/review instructions against its delivered behaviour.
- [ ] Complete the final TestFlight pass using production CloudKit configuration and the appropriate purchase test environment.
- [ ] Submit the app and initial purchase products, resolve review feedback, and release after both the integration and post-integration review pass.

Apple's purchase and subscription rules apply to the shipped offering. Verify transaction results rather than trusting purchase UI completion. [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [StoreKit current entitlements](https://developer.apple.com/documentation/storekit/transaction/currententitlements).

## Suggested order

L01 → L18.1 early review → L02 → L03/L04 → L05 → L07/L08/L09 → L14 native prerequisites → L17 → L18.2 sign-off → L19 final milestone.

Complete L10 privacy/accessibility, L13 identity/artwork, L15 core beta and L16 store preparation before entering L19. L11 joins the native/sync validation path if the widget ships in 1.0. L19 contains purchase integration, the review after it, final beta and submission. No separate purchase integration runs earlier.

L12 remains the future account/shared-platform workstream. Android release, Mac, wearables, HealthKit, social feeds, AI coaching, content blocking, and advanced habit experiments have separate scope decisions. The old urge-support flow remains a future candidate unless explicitly reintroduced.

Tick an item after its stated behaviour is implemented and verified. Record evidence or a linked issue beside any item needing follow-up.
