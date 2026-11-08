# L09 backup, restore and local erasure

Implemented locally on 8 November 2026. Settings → Backup & Restore now exports files, previews validated imports, adds missing habits or replaces local habit data after confirmation, and erases local data after typed confirmation. The failed-load screen also offers this recovery route. Local checks pass; a real file round-trip and native failure/lifecycle acceptance remain open.

## Approved package changes

The user explicitly approved project-local `expo-document-picker ~58.0.4` and `expo-file-system ~58.0.13`. They were installed with scripts disabled inside `apps/mobile/node_modules`; only that app's package files and local dependencies changed. FileSystem already existed within Expo's dependencies at 58.0.13 and is now explicit; npm removed the redundant nested copy. No global tool, system setting, cloud entitlement, server, simulator or native build was added or started. npm reported five moderate audit findings; no forced upgrades or unrelated audit changes were made. Review the complete release dependency set in L18/L19.

## Portable format and scope

The plain JSON envelope has `format: habit-tracker-backup`, envelope `version: 1`, an ISO `exportedAt`, and `data` containing the validated v2 habit snapshot. Export and import are limited to 20 MiB. The parser also accepts older raw v1/v2 habit snapshots through the same validator and migration path. Unknown/foreign formats, invalid records, duplicate identities and unsupported versions are rejected before mutation. Legacy amounts remain unknown where the old format had no numeric evidence.

Included: habits, descriptions, icon/emoji choices, dated tracking rules, schedules, entry/correction history, notes, archives, reminder times, earned wallpapers/badges and retained collection snapshots. Device preferences (including theme, language, haptics and daily review settings), onboarding state, notification permission and purchase status are excluded. Restoring preserves those device-specific values. Backup files contain private notes and have no app-level encryption; the screen asks users to keep them in a trusted destination.

The exporter shares an owned temporary JSON file and removes it after the native share sheet resolves. Resolution does not prove that a destination saved it; the screen explicitly asks the user to check. Picker imports use a cache copy, check both actual native size and provider metadata, validate its text, and remove the owned copy. A manifest allows cleanup of tracked copies after interruption. Cleanup never removes external originals or shared directories wholesale. OS/provider-managed caches outside the tracked copies are not claimed as erased.

## Restore rules and failure boundary

Choosing a file only builds a preview: filename, export date, habit/archive/retained-collection counts, entry/note/badge counts and the number of existing copies. The user chooses:

- **Add missing habits** (default): existing habit and retained-collection IDs win completely; only missing IDs are added. This does not merge entries into an existing habit.
- **Replace local habits**: explicitly confirmed replacement of the whole habit/collection snapshot. The confirmation recommends exporting the current data first. This is the recovery option when existing data cannot load.

The store validates again at commit, freezes habit dispatch, and awaits one serialized snapshot write before publishing the restored state. A failed save leaves existing UI/disk data available and the preview open for retry. This is an application-level single-record commit using AsyncStorage; it is not a claim of native database transaction or crash durability. Native interrupted-write behavior remains an acceptance check. Invalid newly selected files clear an older restore candidate; picker cancellation makes no data changes. Busy file/restore operations disable back/dismiss controls and swipe dismissal.

Personal data export/import is Free. A backup cannot grant Pro, replace verified access state or bypass the four-habit logging allowance; excess imported habits and history stay saved. Imported archives receive a fresh 30-day Free recovery window and cannot import paid protection. Reminder times remain saved but start paused; opening/saving their reminder editor explicitly resumes the normal permission flow. An unrelated rename keeps them paused. Imported pending achievement events are marked handled so restoration does not replay past celebrations. Newly earned milestones on any habit still use the app-wide celebration queue.

## Explicit local erasure

Ordinary archive/deletion retains recovery data and earned reward snapshots. **Erase all local data** is separate, requires typing `ERASE`, and removes habits, notes, archives, retained collections and app preferences. Exported files outside the app remain under the user's control.

Before erasure, reminder reconciliation and habit/preference/theme/haptic writers are frozen and drained. `LocalResetBoundary` unmounts data owners before cleanup. A durable `@habit-tracker/erase/v1` marker is written before destruction; owned pending/presented notifications, owned response state and backup temporaries are cleared, then only `@habit-tracker/` storage keys are removed. This includes both v2 data and the retained v1 migration source. The marker is removed last. No global AsyncStorage clear is used.

If cleanup fails, the marker remains and providers stay unmounted behind a retry screen. Relaunch rolls the same operation forward before hydration. Invalid marker contents do not silently authorize erasure. A failed initial marker write performs no destructive cleanup. Successful cleanup resets in-memory haptic state and remounts fresh providers, so old queues cannot repopulate cleared records. Native notification permission is controlled by the OS and is not revoked by erasure. Future iCloud writers/deletion policy need a separate L17 integration review; this operation is local only.

## Local evidence and device acceptance

All 16 checks pass: TypeScript with unused-local checking and 15 regression scripts. `check:backups` covers v1/v2/portable round-trips, Unicode notes, numeric history, retained rewards, validation/size limits, add/replace behavior, Free overflow, paused reminders, quiet historical rewards, 100-habit histories, failed restore saves, writer freezing, namespace isolation, interrupted erasure, concurrent recovery and marker failures. `check:backup-ui` covers file/share mocks, awaiting async writes, cleanup, real-size rejection, cancellation, preview/confirmation, retry, typed erasure and root recovery/remount. `check:notifications` also verifies owned pending/presented cleanup while foreign jobs/responses remain intact.

The installed Expo preset transformed 90 TypeScript/TSX sources for both iOS and Android. Translation checks pass for 740 messages across twelve languages. Tests use isolated storage/native mocks and do not erase the user's data. No development server or native build was started.

Before closing L09 acceptance:

- Export to Files, inspect the destination and restore on a separate installation. Compare full entries/notes/archives/rewards; test add and replace with duplicate habits, older formats and a large valid file.
- Exercise provider/cloud-download errors, cancelled pick/share, unsupported files and unavailable sharing on iPhone/iPad. Inspect the iPad share/popover, light/dark appearance, large text, keyboard and VoiceOver flow.
- Interrupt native writes, restore and erasure at each boundary, then relaunch and inspect recovery. Confirm v1 cannot resurrect erased history, retained rewards/preferences disappear on erase, and external exports remain.
- Confirm imported reminder times stay paused until explicitly enabled, owned native jobs disappear on erase, other notification jobs remain, and fresh onboarding starts after reset.

L08's one user-confirmed notification receipt is recorded separately and does not certify these file or reset flows.
