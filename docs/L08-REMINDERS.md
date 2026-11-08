# L08 — Local reminders

Implemented locally on 8 November 2026, after explicit approval to install the notification package. Native/device acceptance remains open. Habit reminders and the optional daily check-in now connect to local notification scheduling; they are no longer labelled coming soon.

## Installation record

- Project: `apps/mobile`; direct dependency `expo-notifications ~58.1.8`, resolved to **58.1.8**, as recommended by the installed Expo 58 SDK.
- Updated project `package.json`, `package-lock.json` and local `node_modules`. Required additions include `expo-application`, `abort-controller`, `event-target-shim` and `badgin`; `expo-constants 58.0.15` was hoisted/deduplicated without changing its version. Existing image utilities were reused.
- The initial restricted-network attempt was stopped. The approved local install completed with `npm install --ignore-scripts`. No global tool, simulator, server, native build or cloud/store account was created.
- `app.json` includes the notification config plugin, with background remote notifications disabled. Native configuration still needs L14/signed-device review. No push tokens, remote service credentials, exact-alarm requests or backend are used.
- npm reported five moderate audit findings during installation. No forced upgrades or unrelated fixes were performed; inspect the complete release dependency set during L18/L19's security review.

Expo documents local notifications as available in Expo Go. Standalone native behavior must still be validated separately. [Expo Notifications documentation](https://docs.expo.dev/versions/latest/sdk/notifications/).

## Ownership and saved-data boundary

`data/reminder-settings.ts` owns time validation and legacy single-time compatibility. `data/reminder-plan.ts` builds deterministic jobs from habit data, daily settings, access policy, current local time and localized copy. Its reconciler serializes replacement plans and compares the actual native pending queue against stable identifiers and fingerprints. Only owned reminder identifiers are cancelled; unrelated native jobs are preserved. Superseded work stops at asynchronous boundaries, and failures can be retried safely.

`services/reminder-notifications.ts` owns native permission queries/requests, the Android channel, job scheduling/cancellation, foreground presentation and notification response parsing. It accepts normal and provisional/ephemeral iOS authorization, does not reprompt when device settings are required, and never requests permission merely while polling. Ordinary reminders use best-effort timing; no exact-alarm privilege is requested.

`components/reminders.tsx` coordinates the queue inside Home, including permission/lifecycle refresh and deferred navigation. It waits for successfully saved habit and preference snapshots. Loading/unavailable permission is distinct from denied permission, so startup uncertainty does not cancel a previously scheduled queue. Failed saves leave the prior durable reminder configuration in effect. Preferences expose an awaitable save result and a separate persisted value; a failed preference load cannot silently overwrite stored settings.

## Scheduling policy

- Free has one habit reminder; Pro has up to three. The editor permits removal/disable on either tier and preserves existing paid choices across downgrade, while scheduling only the effective allowance. Store authorization also prevents adding paid reminder times through another entry point. Current production billing remains Free until L19; Pro is exercised by isolated fixtures.
- Only selected habit days qualify. Archived, demo and unselected excess Free habits do not schedule. Passed times are skipped instead of being sent immediately.
- Successful completion suppresses remaining habit reminders today. Numeric partials, explicit failures and unlogged Quit days still qualify. An explicit zero can complete a Quit goal. Undo, edits, archive/restore, data removal, access and language changes reconcile the queue.
- Daily review follows its own weekdays/time. Its content is a generic check-in rather than a stale count of incomplete habits.
- Discreet content is the default. Showing a habit name or using custom daily title/message requires turning discreet mode off. Notes are never put in notifications.
- The rolling window plans up to 30 local calendar days, selecting the earliest 60 jobs across all reminders. Settings and reminder editors show actual complete coverage through the first omitted occurrence, and explain that opening the app refreshes future reminders. Do not market this finite queue as indefinite scheduling after termination.
- Future dates use the current device timezone and its DST rules. A missing spring-forward time advances according to local `Date` normalization; a repeated fall-back hour produces one reminder for that local date. Foreground and active-minute refresh handle date/time/timezone changes. Travel while the app remains closed cannot rebase absolute jobs until it opens; the UI explicitly describes this behavior.

## Permission, errors and navigation

Saving an enabled daily reminder requests permission in context. Habit Save requests permission when reminder times are enabled/changed, when the reminder editor has been used, or when the authorization state is still undetermined. Denial leaves drafts open without creating a habit or marking the save as failed persistence. Save retries do not create a duplicate habit or reapply progress. Native sheets cannot be pulled closed during a permission/save operation.

Reminder status shows loading, denied, unavailable, waiting-for-saved-data, scheduling, error, no-upcoming-job and scheduled-through states. Device settings are opened only from an explicit button. Native scheduling failures and denied configured reminders also surface on Home. Saved-data errors retain their existing Home/Settings retry routes.

Cold-start and active notification taps accept only owned identifiers, the default action and a validated versioned habit/day or daily payload. Foreign jobs and arbitrary URLs are ignored. Duplicate initial/listener callbacks are handled once. The app queues navigation while another sheet/editor is open, opens the relevant habit/month without auto-logging, and routes daily review to Home. A removed/archived habit produces an unavailable message instead of being restored automatically.

## Verification and remaining acceptance

On 8 November 2026 the user reported: “I have received the notification. Looks good.” This confirms one successful receipt. The device/platform, build type, lock-screen/background state and notification-tap behavior were not specified; the broader acceptance list below stays open.

`check:reminders` covers legacy/multiple times, selected weekdays, passed times, complete/partial/failed/Quit-zero behavior, privacy, tier limits, bounded coverage, storage validation, idempotent queue mocks, edits, cleanup, stale plans and retry. Its timing checks also run in America/New_York and Europe/Berlin for DST normalization.

`check:notifications` covers native permission adapters, request deduplication, settings-required denial, quiet iOS authorization, Android channel creation, native job shape, response validation/deduplication, owned presentation, startup queue safety, persisted-data gating, lifecycle refresh, revocation/unavailable status, durable preferences, reminder limits and both form/drawer permission-denial/save-retry flows. Native APIs are mocked; these checks do not certify delivery by iOS or Android.

Physical iPhone/iPad acceptance remains required: grant/deny in Expo Go and a signed app, foreground/background/termination, lock-screen privacy, completion suppression, revised times, restart recovery, DST/timezone travel, duplicate prevention, notification taps, settings navigation and queue coverage. Android device/channel/inexact timing behavior has its platform gate. L14/native and L19/billing integration must recheck the same paths against actual entitlements and app lifecycle behavior.

Local verification: all 14 checks passed (TypeScript with unused-variable checks and 13 regression scripts), including notification/planner tests. Reminder timing was additionally checked under America/New_York, Europe/Berlin and Asia/Kolkata. The installed Expo preset transformed 83 source files for both iOS and Android, and local Expo config resolved the notification plugin/version. Translation coverage is 703 messages across 12 languages. No native build, simulator or development server was started.
