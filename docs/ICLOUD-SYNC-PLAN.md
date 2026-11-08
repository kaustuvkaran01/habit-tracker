# L17 — Cross-device iCloud sync

Planned 7 November 2026. Implementation has not started.

## Outcome and boundaries

Keep the same habits, progress, notes and earned collections on a person's iPhone and iPad using their existing iCloud account. Keep local logging usable offline. Make automatic sync a Pro capability, with backup/export and restoration available in Free.

The target is Apple-device sync through CloudKit's private database. This route uses the device's iCloud identity and does not need a separate app-account registration flow. Apple's private database requires an iCloud account and counts toward the user's iCloud storage quota. Check availability and show actionable errors. [Apple private-database documentation](https://developer.apple.com/documentation/cloudkit/ckcontainer/privateclouddatabase).

Android remains part of the shared app codebase. Apple-device sync does not settle iOS-to-Android continuity. Keep a transport boundary and portable exports, and record the later Android/shared-backend decision under L12. A Mac companion remains a separate product decision.

## Required setup

- [ ] Confirm the developer team, final bundle identifier and CloudKit container identifier before creating resources.
- [ ] Configure iCloud/CloudKit, push notifications and the relevant background notification capability in reproducible Expo/native configuration. Check entitlements in both development and distribution provisioning.
- [ ] Use one CloudKit container for the planned iPhone/iPad app, with private user data and a custom record zone.
- [ ] Confirm supported OS versions and native adapter compatibility. Evaluate a small local Swift Expo module using CKSyncEngine, comparing maintained adapters if they meet the required behaviour.
- [ ] Set up a signed development build and access to two physical Apple devices using a test iCloud account. Use dedicated test data and verify a separate account cannot receive it.

Custom native CloudKit integration needs a development build. It cannot be exercised in Expo Go. Expo's local-module route is the default candidate, subject to the compatibility check. [Expo custom native code](https://docs.expo.dev/workflow/customizing/), [Apple iCloud configuration](https://developer.apple.com/documentation/xcode/configuring-icloud-services/).

Before native work, complete L18's early structural review. Schema work depends on L02 tracking rules and L09 backup/migration safeguards. Any widget integration uses L11's shared-state contract.

## 17.1 — Prepare a durable local sync record

- [ ] Separate tracking/reward rules, repository writes, sync transport and screen state using the existing code where possible.
- [ ] Choose and document storage that can atomically commit a user change and its pending upload. Evaluate SQLite for this boundary against the current AsyncStorage snapshot. Migrate existing habits, notes, archives and collections safely.
- [ ] Give records and operations stable portable IDs, schema versions and historical calendar context. Retried operations retain their IDs.
- [ ] Persist pending operations, server record metadata and sync-engine state across app termination. Establish one coordinated local writer for UI, native sync and widget actions.
- [ ] Retain dated schedule/goal revisions and explicit corrections. Derive charts and streaks through the same rules after local and remote changes.

Done when a local edit survives termination and can be replayed safely into a test transport.

## 17.2 — Prove the native transport

- [ ] Bridge account status, enqueue/send/fetch, durable state updates and actionable failures between Swift and the app repository.
- [ ] Prove creating a habit on device A and receiving it on device B, then editing on B and receiving it on A.
- [ ] Resolve conflicting record writes through explicit domain rules. Preserve conflicting note versions for user resolution.
- [ ] Support bounded batches, retries, partial failures, throttling, offline operation, quota exhaustion and expired server-change history.
- [ ] Fetch on activation and offer a manual retry/sync action. Support system-driven background updates without promising a fixed background delivery time.

CKSyncEngine is the proposed scheduling engine. It requires app-owned persistent state and application-specific conflict handling, and background scheduling depends on system conditions. [Apple sync-engine documentation](https://developer.apple.com/documentation/cloudkit/cksyncengine-5sie5).

Done when changes converge across two devices after offline edits, termination and retry.

## 17.3 — Define merge and deletion rules

| Change | Required result |
|---|---|
| Duplicate delivery | Apply the same operation once |
| Independent numeric increments | Keep both |
| Repeated Yes/No completion | One completed day, with deterministic correction rules |
| Undo and backdated correction | Target the original operation without cancelling unrelated work |
| Concurrent goal/schedule edits | Keep history and choose a deterministic revision, with conflict visibility where needed |
| Conflicting note edits | Preserve both versions until resolved |
| Archive, restore and delete-versus-edit | Follow explicit precedence and prevent silent resurrection |
| Archive expiry | Apply the user's retention policy across devices while protecting unverified Pro status |
| Earned milestones | Merge stable award identities and preserve permanent rewards |
| New cycle or device-clock differences | Prevent one completion or duplicate command from earning multiple cycles |

- [ ] Keep deletion markers long enough to reconcile old offline devices. Specify a full-reconciliation path for devices older than the supported history window before removing markers.
- [ ] Separate private content deletion from the minimal synchronization metadata needed to prevent resurrection. Provide explicit erase-all behaviour covering cloud records and retained reward-name snapshots.
- [ ] Define whether a remotely earned reward triggers a reveal on another device. Keep per-device animation-delivery state out of shared achievement ownership.
- [ ] Sync habit configuration and progress. Keep notification permission, haptic preference, app appearance and reminder-delivery device choices local unless deliberately opted into sync.

Done when a deterministic fixture suite covers these cases in either arrival order.

## 17.4 — Finish the user experience and account handling

- [ ] Add an optional Enable iCloud Sync flow. Show the Pro requirement, data involved and the initial merge behaviour before enabling uploads.
- [ ] Import an existing cloud history and merge local history without overwriting either. Deduplicate retries and restored backups using stable identities.
- [ ] Show Off, Syncing, Up to date, Offline, Sign in to iCloud, Storage full and Retry states using actual state.
- [ ] Handle iCloud sign-out and account changes while the app is open or terminated. Scope cached data and queued writes to the correct iCloud identity, and prevent old-account uploads to a new account.
- [ ] Explain what disabling sync does to local history and cloud records. Provide separate explicit cloud-data deletion with protection against reupload by stale clients.
- [ ] Refresh the current screen, derived analytics and widget snapshot after incoming changes. Apply a single designated reminder-device policy to avoid duplicate notifications.

Account changes require app-managed local-data handling. CKSyncEngine resets its internal pending changes when the iCloud account changes. Our durable operation ownership must survive this safely. [Apple account-change events](https://developer.apple.com/documentation/cloudkit/cksyncengine-5sie5/event/accountchange).

## 17.5 — Validate the production path

- [ ] Verify the schema and forward-compatible migrations before promoting record types, fields and indexes to production.
- [ ] Check the correct CloudKit environment in signed distribution builds and TestFlight. Development records do not become production records when the schema is deployed.
- [ ] Run the two-device matrix for new/existing local histories, reinstall, backup restoration, offline overlap, notes, corrections, deletion, reward cycles, widgets, storage exhaustion and account switching.
- [ ] Measure realistic storage, operation volume, convergence time and battery/network impact. Keep private record contents out of diagnostics.
- [ ] Verify clear recovery instructions and support material before the release candidate.

Apple requires production schema deployment for distributed apps and limits production schema changes to compatible additions. [CloudKit schema deployment](https://developer.apple.com/documentation/cloudkit/deploying-an-icloud-container-s-schema).

Done when a signed beta converges safely using the production schema and has recorded recovery evidence.

## Pro access while purchases are scheduled last

L05 establishes the capability interface before StoreKit exists. L17 exercises Free, Pro, expired and unknown states through test-only entitlement fixtures.

L19 replaces these fixtures with verified purchases. A fresh install with unresolved purchase state must not erase archives or cloud history. Define what new uploads/downloads do during grace periods and after expiry, while preserving local records, existing awards and exports. Test with the actual StoreKit and iCloud accounts, which are separate identities and may differ.

The iCloud private-database design avoids needing a separate habit-data backend for the initial Apple sync path. It still has engineering, support and entitlement costs. Confirm Monthly/Annual/Lifetime service promises before selling them.

## Dependencies and next step

Planning creates no Apple resources, installs no packages and starts no builds. Native-module/storage choices, dependency installation, container creation and device builds are reviewed at their implementation steps under [project guardrails](../AGENTS.md).

Begin with L18's early structure review and L02's historical tracking model. Then complete 17.1 before implementing the native transport. Finish L18's pre-purchase sign-off after L17, and enter [L19](LAUNCH-CHECKLIST.md#l19--apple-purchases-post-integration-review-and-release) only when those gates pass.
