# L05 — Free and Pro access

Implemented locally 8 November 2026. The user confirmed the detailed feature split and the fresh 30-day archive recovery window. Native acceptance and real purchase integration remain open.

## Product policy

Free includes four active habits, all tracking types and home views, history, notes, categories, themes, emoji, haptics, basic streaks, badges, celebrations and habit/badge image sharing. Personal-data backup/import/export permissions are Free; the actual file tools remain L09 work.

L09 follow-up (8 November): the [file tools](L09-BACKUP-RESTORE.md) are now implemented locally. Export/import is Free; imported excess habits stay saved with four selected for logging, imported archive protection cannot grant Pro, and existing device access is preserved. Physical round-trip acceptance remains open.

Pro includes unlimited active habits, analytics, earned-wallpaper exports and extra dashboard controls. One habit reminder is Free; up to three are Pro when L08 delivers them. Daily review is Free. Widgets and optional iCloud sync are Pro when implemented in L11/L17. These planned integrations are not activated by an access check.

Milestones are recorded and celebrated on either tier. Pro plus the earned milestone is required to select/export a wallpaper. An upgrade can therefore export earlier earned milestones. A lapse never erases rewards or previously exported files. Badge sharing remains Free, including from retained collections after an archived habit expires.

## Ownership and entry points

`data/pro-access.ts` owns capability descriptions, limits, reminder allowances, effective display preferences, logging selection and action authorization. The store checks the current entitlement before mutation, including calls through stale callbacks. Denials leave the snapshot unchanged and do not write. Restore All is atomic: it restores everything only if the active allowance permits it; individual restores remain available in Settings.

`components/pro-access.tsx` reads the purchase adapter and exposes explicit verified Free, verified Pro, loading or unavailable states. The production adapter currently returns Free because billing is not connected. No plan selection, saved preference, environment variable or development switch grants Pro. Pro fixtures are isolated in regression scripts. L19 must replace this adapter with verified purchase status, trusted offline caching, renewal/revocation updates and foreground refresh; this milestone does not claim App Store verification.

`useProUpgrade` presents the same contextual Pro screen from the requesting native screen and retains its content through dismissal. Analytics guards its screen. The collection preview checks permission before image capture and again after asynchronous work before selection/sharing. The gallery labels the Pro export requirement while leaving progress and badges available. Settings protects restores and customization. The preference provider also refuses paid changes outside the UI and derives Free display values without overwriting saved Pro preferences.

## Downgrades and recovery

Excess active habits are retained, with all history and configuration. A Home banner opens a chooser for the four habits to keep logging; the initial selection is deterministic and persisted. Selection changes do not reorder or archive habits. Other habits stay visible, can be shared/archived/edited, and show an explanatory message on their detail screen; daily logging and note changes require selection or Pro. Existing earned records and personal-data export permissions are retained.

Free archives expire 30 calendar days after archiving. Verified Pro marks archives as protected without expiry. Loading/unavailable status suspends cleanup. On the first verified Free state after paid protection, each protected archive gets a fresh persisted recovery date. The Archived Habits screen explains the window and shows days remaining. Renders/restarts do not restart it; restored habits lose archive metadata, and re-archiving begins a new window. Renewing Pro protects archives again. A later lapse grants another full window.

The recovery window begins when the app can confirm Free locally, so an offline or unused app cannot silently consume the post-Pro grace period before presenting it. Expired archives retain earned collections as before. This policy cannot recover habit data already removed by an older app version.

Optional `freeHabitIds` snapshot metadata and per-habit `archiveProtected`/`archiveRecoveryOn` fields are validated and round-trip through the existing v2 storage format. They are protection/selection metadata, never evidence granting paid access. Actual import and cloud merge paths must apply the same capability and retention rules when those milestones are built.

## Evidence and remaining acceptance

`check:access` exercises capabilities on all four access states; one/three reminder policy; creation and restoration limits; downgrade selection; stale callbacks; non-destructive denials; bulk restore atomicity; paid preference preservation; archive protection, migration, recovery, restart dates and renew/lapse cycles; translated capability copy; analytics screen gating; blocked Free wallpaper image APIs; and allowed Free badge capture/sharing. Existing tracking, rewards, analytics, action/store, entry, achievement, feedback and localization checks remain required.

Use physical iPhone/iPad acceptance for layouts, dark/light appearance, larger text, VoiceOver, restore feedback, native modal dismissal and choose-four interactions. Verified purchase/cache/offline/refund/renewal scenarios belong to L19, alongside access changes during logging, sharing and pending saves. L08/L09/L11/L17 must wire future entry points to this policy. Store copy belongs to L16. No dependencies, servers, simulators, native builds, purchases or cloud provisioning are needed for this local implementation.

Local verification: TypeScript with unused-variable checks and all ten regression scripts passed (11 checks total). The installed Expo preset transformed 73 source files for both iOS and Android. Localization coverage is 660 messages across 12 languages. Native rendering and purchase verification were not run. No new process was started.

L08 update (8 November): one/three reminder permissions are now applied by the habit editor, store action policy and local scheduler. Actual notification delivery and paid entitlements retain their physical-device/L19 acceptance gates.
