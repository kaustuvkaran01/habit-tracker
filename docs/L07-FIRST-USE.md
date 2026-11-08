# L07 — First use and the daily loop

Implemented locally on 8 November 2026. This milestone improves the path from installation to the first genuine log, and audits the current screens. It does not build notifications, cloud sync, purchases or public/legal destinations.

## Welcome and data safety

New installations hydrate an empty habit snapshot. `sample-habits.ts` remains an explicitly tagged regression fixture; the application store does not import it. Existing saved habits, including earlier demo records a user may have edited, are preserved rather than removed automatically.

`use-first-use.ts` waits for habit hydration before reading `@habit-tracker/onboarding/v1`. New users see the existing themed welcome design with a Skip action. Continue saves the welcome marker and opens Add Habit. Skip saves the same completion marker and opens Home. Cancelling Add leaves the empty tracker ready to add a habit later; it does not restart onboarding. Existing installations with saved habits or retained collections bypass welcome and save the new completion marker. Settings replay is independent and never changes onboarding or habit data.

The marker contains only a version and completion flag. It uses a separate key from habit history. Unreadable welcome settings offer Retry or Continue for now; a failed welcome write stays on the welcome screen with retry and a session-only bypass. The bypass does not overwrite the failed/unreadable preference, so onboarding may return on a later launch. Duplicate taps cannot perform two completion writes or open Add twice. Async results are ignored after cancellation/unmount. Invalid habit storage still follows the existing protected-load/retry path and is never replaced by an empty tracker.

## Daily loop and recovery

The empty Home content distinguishes four states:

| State | Action |
|---|---|
| No active or archived habits | Add a habit |
| All habits archived | Open Archived Habits directly, or add a habit |
| Completed habits hidden | Show all habits |
| Search/category filters match nothing | Clear filters |

The first-log hint explains scheduled-day completion and holding a calendar day for corrections/notes. It disappears once any actual record exists, including partial progress or an explicit zero. Rest days and unlogged Quit days are not described as completed. All three Home views use the same empty-state rules and keep the existing fixed toolbar/view-switcher behavior.

Settings → Quick guide explains the completion and correction gestures, month navigation, archive restoration, earned Pro wallpaper export, device-local storage and the pending notification service. It uses the existing right-hand drawer and shared back/swipe handling. Archive and reorder save errors now show retry inside Settings, as well as Home's existing save-error banner. Retries save the current snapshot instead of replaying an action.

## Visible-control audit

| Control | Current treatment / follow-up |
|---|---|
| Home toolbar, views, filters, search, reorder, habit details/calendar, Add/Edit, icon/emoji, logging/corrections/notes, sharing | Existing handlers retained; no generic future-action fallback for navigation buttons |
| General, Overview, Language, Theme, Archived Habits, Reorder | Working screens retained; Pro limits remain L05 policy |
| Daily Check-In Reminders and per-habit time | Saved preferences only, explicitly says delivery is coming soon; scheduling/permissions in L08 |
| Backup & Restore | Clearly marked coming soon, with device-local storage information; actual file tools in L09 |
| iCloud Sync | Clearly marked coming soon, planned Pro entry; implementation in L17 |
| Pro | Preview prices and purchase/restore explanations remain explicit; real billing in L19 |
| Wallpapers/badges | Existing earned previews, Pro export gate, Free badge sharing and unavailable-sharing/error states retained |
| Show Onboarding | Replay of welcome information; no changes to habit data or first-use marker |
| Quick guide | New local screen, with existing back/swipe drawer |
| What's New | Keep the short local informational alert for this preview; final release copy in L16 |
| Feedback, Website, X, Rate App | Removed until real destinations exist; support/store configuration in L16 |
| Privacy Policy, Terms | Removed placeholder actions; real content/destinations are a release prerequisite in L10/L16 |
| Crash reporting / Purchase ID | Existing explicit unavailable/disabled state; integrations remain later milestones |

This is not a claim that pending services are ready for release. Notification permission denial and device settings belong to L08. File recovery/erase controls belong to L09. The image-sharing flows already handle unavailable sharing and export errors without requesting new app permissions. Legal/support/store links must return with real content before App Store submission.

Later 8 November updates supersede the earlier service placeholders: [L08](L08-REMINDERS.md) connects notification scheduling and records one user-confirmed receipt, while [L09](L09-BACKUP-RESTORE.md) connects file preview/export/restore and confirmed local erasure. Both retain their broader physical-device acceptance gates; iCloud remains pending.

## Verification

`check:first-use` covers welcome completion/restart, existing data, duplicate submission, load/write errors, retry and session bypass; a new-install → create → first log → correction → archive → restore → reload loop; distinct empty states, explicit zero/unlogged/rest-day behavior, welcome/skip controls, Settings control wiring, guide back navigation, archive deep linking and in-menu save retry. Existing action checks now assert empty first-install behavior instead of sample seeding. New copy is translated across all 12 available locales.

Physical iPhone/iPad acceptance remains open: safe areas, welcome scrolling and sticky footer, skip/cancel/relaunch, native presentation/dismissal, all three empty views, long translations, larger text, VoiceOver, share cancellation, and guide back swipes. No dependency installation, server, simulator, native build, publication, purchase or cloud provisioning is required for this local milestone.

Local verification: TypeScript (including unused-variable checks) and all eleven regression scripts passed, 12 checks total. The installed Expo preset transformed 77 source files for iOS and Android. Translation coverage is 680 messages in 12 languages. Physical-device/native permission acceptance was not performed; no project server or other background process was started.

L08 update (8 November): the reminder deferral above is superseded by local scheduling, permission controls, privacy, coverage and one/three-time editor integration in [L08](L08-REMINDERS.md). Physical delivery remains open. Other service and legal/store gates remain unchanged.
