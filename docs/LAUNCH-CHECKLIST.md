# App Store launch checklist

Updated 7 November 2026. This is the current delivery checklist for the app built through the recent incremental sessions. The older [implementation plan](../IMPLEMENTATION-PLAN.md) remains an inactive reference after the rollback. Its proposed backend, storage architecture, prices and feature allowances need fresh decisions before use.

This checklist plans the next steps. An unchecked item is unfinished or awaiting release verification. External setup, dependency installation, native builds and publishing follow the project approval rules in [AGENTS.md](../AGENTS.md).

## Existing foundation

These items have local implementations. Physical-device release verification remains under L15.

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

Count/Measure currently configure goals but still log through a Yes/No toggle. Reminders save a time without scheduling notifications. Charts and several Settings rows are placeholders. Pro prices and purchase actions are previews, and access currently uses a fixed free flag. The onboarding screen is replayable from Settings, while first use still seeds sample habits. Widgets, portable backup/restore and account sync are absent.

## L01 — Set the release boundaries

Product decision. Resolve this before building paywalls or advertising features.

- [ ] Confirm iPhone and iPad support for the iOS launch, supported OS versions, initial language and storefronts. Android remains a separate release gate.
- [ ] Decide whether the small iOS widget and optional cloud sync belong in version 1.0. They remain requested product features. If deferred, record their later release and update all claims and Pro copy.
- [ ] Choose the reward rule for selected-weekday habits. The current engine counts consecutive scheduled opportunities. Decide how calendar days, scheduled completions and the 90-day badge are labelled.
- [ ] Confirm the initial Free/Pro matrix, active-habit allowance, plan types and prices. Earlier planning documents and current preview prices are working proposals.

Done when the version 1.0 feature list, reward rules and paid offering are written down consistently.

## L02 — Finish tracking and protect historical accuracy

Required before analytics and achievement triggers.

- [ ] Implement Count and Measure logging from every relevant entry point, including Add 1, Enter total, decimal amounts, units, undo and past-day corrections.
- [ ] Represent explicit completion, partial progress, explicit failure/lapse, unlogged, unscheduled and future days. Quit success requires a user report, including an explicit zero for zero-limit goals.
- [ ] Preserve schedule, target and unit history across edits. An edit effective today must not reinterpret earlier records.
- [ ] Record the habit date, occurrence time when known, recording time and timezone context. Migrate existing check-ins and notes without inventing numeric amounts or occurrence times.
- [ ] Verify midnight, daylight-saving and timezone changes, leap days, unfinished today, limit/target boundaries, retries and interrupted saves.

Done when home views, detail, streaks and rewards agree on the same underlying entries.

## L03 — Charts and useful analytics

Requested launch work. Depends on L02.

- [ ] Build the Charts screen with habit selection and 7-day, 30-day, 90-day and yearly views.
- [ ] Add scheduled-day completion rate, current/best streak and totals, with visible denominators and today's unfinished progress handled separately.
- [ ] Use completion summaries for Yes/No and daily amount bars with target markers for Count/Measure. Show partial effort and actual activity alongside goal attainment.
- [ ] Add weekday breakdowns and recovery after missed sessions, with underlying counts and clear small-sample/empty states.
- [ ] Add one evidence-based observation linked to the entries behind it. Avoid causal claims, invented predictions and combining incompatible units into one activity total.
- [ ] Make charts readable with VoiceOver, larger text, non-colour cues and both themes. Keep private habit analytics on the device for the local-only release.

Later candidates include optional obstacle tags, habit relationships and user-directed experiments. They can follow the initial analytics release.

## L04 — Achievement animations and a reusable trigger system

Requested launch work. Depends on stable reward identities from L02.

- [ ] Define reward-earned events with stable identities, such as a habit/cycle/milestone combination, separate from screen animations and haptics.
- [ ] Build one animation host and event-to-animation registry. Queue multiple rewards and provide completion/dismiss callbacks so new effects can be added centrally.
- [ ] Create wallpaper and badge reveals using the actual earned artwork, coordinated motion and haptics, a clear achievement message, and View/Share actions.
- [ ] Decide whether a wallpaper earned again by another habit or cycle receives a repeat celebration. Persist delivery state to prevent unintended replay on ordinary startup, re-renders or opening the collection.
- [ ] Handle interrupted reveals, app backgrounding, save failures, backdated entries and migrated history. Seed/demo data must never trigger personal achievements.
- [ ] Support Reduce Motion, a quick dismissal and disabled haptics. A reveal must preserve the user's in-progress entry or note.

Done when a genuine unlock produces one appropriate celebration and remains available in the collection afterwards.

## L05 — Separate Free and Pro capabilities

Requested launch work. Separate product policy from purchase processing.

- [ ] Implement one central capability policy used by creation, restore, charts, reminders, widgets and all other paid entry points. Define each capability after L01.
- [ ] Give locked features a consistent explanation and upgrade route. Keep descriptions aligned across Settings, the paywall, onboarding and the store listing.
- [ ] Define subscription-expiry behaviour, including excess active habits, previously earned rewards and access to existing history and export.
- [ ] Connect archive retention to trusted entitlement state. Protect archives while paid status is loading or temporarily unverifiable. Explain and implement the recovery window after Pro expires.
- [ ] Check upgrades, downgrades, restoring a habit at the free limit and offline use. Preview/development flags must not grant production access.

Recommended starting policy for discussion is usable core logging, notes, basic stats, data export and earned rewards in Free, with unlimited habits and deeper analytics in Pro. Widget access, extra reminders and future sync need explicit decisions. This is not an approved final matrix.

## L06 — Real purchases and restoration

Required if Pro is sold at launch.

- [ ] Set up the selected Apple in-app purchase products and a compatible purchase integration. Load localized prices and periods from the store.
- [ ] Verify transactions and maintain trusted entitlements. Cover successful, cancelled, failed and pending purchases, renewals, refunds, expiry, reinstall and offline access.
- [ ] Implement Restore Purchases and Manage Subscription. Test recovery on a second Apple device.
- [ ] Complete paywall disclosures, feature descriptions, terms and privacy links. Configure subscription grouping and introductory offers only if included in L01.

Apple's purchase and subscription rules apply to the shipped offering. [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).

## L07 — First use and a complete daily loop

Required product work.

- [ ] Replace first-install sample habits with an empty state and a short path to creating a real habit and recording its first entry. Keep demo data explicitly separate.
- [ ] Add first-launch onboarding completion state, with a skip path and the existing Settings replay.
- [ ] Finish empty, loading, error and permission-denied states. Show users how to correct an entry, restore an archived habit and export an earned wallpaper.
- [ ] Audit every visible control. Finish, explicitly defer or remove placeholder actions such as General, Overview, Language, Daily Check-In Reminders, feedback and store links.

## L08 — Working reminders

Required if reminders are advertised.

- [ ] Schedule local reminders for selected habit days and the optional daily review. Ask permission when the user configures a reminder.
- [ ] Update or cancel notifications when a habit is edited, completed, archived or deleted. Define behaviour for an incomplete numeric goal.
- [ ] Test permission denial, timezone changes, app termination, notification taps and duplicate prevention.
- [ ] Offer discreet notification text for private habits and a route to device notification settings.

## L09 — Backup, restore and data removal

Recommended launch gate for an app holding personal history.

- [ ] Add versioned file export and restore covering entries, notes, schedules and earned collections.
- [ ] Validate imports and show a preview. Define merge/replace behaviour and protect existing data if an import fails.
- [ ] Verify a real round-trip on another installation, older-format migration, interrupted writes and large histories.
- [ ] Add an explicit erase-all-local-data action with confirmation. It must remove notes, archives, retained collection snapshots and preferences covered by the request.

Ordinary habit deletion currently retains earned rewards with habit-name snapshots. Explain that behaviour and distinguish it from erasing all personal data.

## L10 — Privacy, support and accessibility

Required release work, with protection features selected for the audience.

- [ ] Publish an accurate privacy policy and a working support/contact page. Connect them in the app and store listing. Describe local storage, exports, archive expiry and retained rewards.
- [ ] Complete App Store privacy disclosures and audit dependencies, required-reason APIs and bundled privacy manifests against the actual release binary.
- [ ] Keep names, notes, habit amounts and other private content out of diagnostic reports. Document any external service or product-usage measurement that is actually included.
- [ ] Review VoiceOver, text scaling, contrast, non-colour status, Reduce Motion, keyboard behaviour and touch targets across the daily flow.
- [ ] Decide whether a device-authentication lock and app-switcher privacy cover ship in 1.0. Include them if the app is marketed around sensitive quit tracking.

Apple requires accurate app privacy information and applicable SDK/API declarations. Verify the assembled app, including third-party code. [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/), [third-party SDK requirements](https://developer.apple.com/support/third-party-SDK-requirements/), [required-reason APIs](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api).

## L11 — Small single-habit widget

Product requirement if included in L01. It needs native development and release builds.

- [ ] Let each small widget choose one habit and show its identity, compact progress and appropriate action.
- [ ] Share durable state with the app. Verify actions and later reconciliation while the app is closed and offline, including numeric tracking.
- [ ] Handle archived/deleted habits, stale snapshots, midnight, private labels, multiple instances and the chosen Free/Pro policy.

## L12 — Optional accounts and cross-device sync

Conditional on L01. The local experience remains account-free.

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

## L14 — Production iOS app

Required release engineering. Expo Go verification covers only part of this.

- [ ] Configure the final bundle identifier, version/build numbering, developer team, signing, capabilities and any widget App Group.
- [ ] Produce and install a signed development/release build. Verify native modules, permissions, theme handling, purchase integration and export sheets.
- [ ] Check the build against Apple's SDK/upload requirements at release time, and resolve production warnings, privacy manifests and export-compliance answers.
- [ ] Confirm developer enrollment, App Store Connect access and any paid-app agreements, tax and banking requirements for the chosen business model.

Apple's current upload baseline includes Xcode 26 or later and the iOS/iPadOS 26 SDK or later. Recheck when preparing the release. [Apple SDK requirement notice](https://developer.apple.com/news/?id=ueeok6yw).

## L15 — Device testing and TestFlight

Required verification before release.

- [ ] Run the daily flow on a small and a large iPhone, the supported iOS range, and iPad if supported. Cover both themes, larger text, swipe cancellation, keyboards and sharing.
- [ ] Verify data survival across termination, updates and offline use, plus numeric corrections, reward delivery, archive expiry, backup recovery and paid-access recovery.
- [ ] Distribute a TestFlight beta after build authorization. Gather feedback on first habit/first log, missed-day recovery, analytics comprehension, reward reveals and paywall clarity.
- [ ] Fix release-blocking crashes, data-loss cases, incorrect metrics and purchase problems. Record the devices/builds checked and remaining limitations.

## L16 — ASO, submission and launch

Required store preparation. Continue the existing [ASO plan](../marketing/ASO-PLAN.md).

- [ ] Finalize name, subtitle, keywords, description, category and accurate Free/Pro messaging.
- [ ] Capture real release-build screenshots using fictional data for the required iPhone sizes and iPad if supported. Show only delivered features.
- [ ] Complete age rating, privacy information, content-rights, support/privacy URLs, availability and pricing fields. Declare accessibility support that has been verified.
- [ ] Provide review contact details, clear instructions for the daily flow and purchases, and reviewer access if account features require it.
- [ ] Submit the app and its initial purchase products as appropriate, resolve review feedback, and prepare a support and rollback/fix response for launch.

Use the current store requirements when preparing assets and metadata. [Apple submission guidance](https://developer.apple.com/app-store/submitting/), [screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications).

## Suggested order

L01 → L02 → L03/L04 → L05/L06 → L07/L08/L09 → L10/L13 → L14 → L15 → L16.

L11 and L12 join the launch path if included in L01. Identity and artwork work can run alongside feature development. Privacy and accessibility should be checked as each feature is built.

A narrower local-first launch can defer cloud sync and broader integrations. Widgets can be deferred through an explicit product decision. Android release, Mac, wearables, HealthKit, social feeds, AI coaching, content blocking, and advanced habit experiments have separate scope decisions. The old urge-support flow remains a future candidate unless explicitly reintroduced.

Tick an item after its stated behaviour is implemented and verified. Record evidence or a linked issue beside any item needing follow-up.
