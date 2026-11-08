# L02 / R2 tracking implementation

Implemented 7 November 2026. Local verification passes; physical-device migration, termination, keyboard and gesture checks remain pending. This does not sign off L18 or the production release.

## Delivered behaviour

- Yes/No taps still check/uncheck a day. Holding a calendar day opens an entry drawer with Done, Not done, Clear entry and optional notes. Completion and notes are now saved together instead of immediately changing completion while the note draft is open.
- Count and Measure use daily numeric records. Build habits configured with Add 1 increment today's amount until the goal is reached; tapping an already completed day opens the total editor. Enter total always opens that editor. Past numeric dates open it for corrections. Measure accepts decimal amounts, including comma decimal input; Count requires safe whole numbers.
- Quit numeric habits open the editor so zero can be explicitly reported. A missing record never counts as a successful zero-limit day. Reported amounts at or below the limit complete a Quit day; exceeding it is a failure.
- Partial effort, explicit failure, completion, unlogged, unscheduled and future are distinct day states. The first home view shows numeric totals against goals, the compact view shows amounts, and the detail calendar shows amounts and failure marks. Partial progress has a dashed border in addition to colour. Descriptions remain exclusive to the first home view.
- Clear entry removes the current reported result without deleting its correction history. Undo in the editor restores the preceding recorded value. Neither discarding a draft nor opening a screen records progress.
- An unfinished today keeps the previous completed run visible. An explicitly failed today resets the current streak immediately. The 8 November refinement now measures inclusive calendar days between consecutive scheduled completions, crediting intervening rest days at the next completion. Reward milestones follow the same confirmed span and earned rewards remain permanent; see [L01](L01-RELEASE-SCOPE.md).

## Historical rules

`habit-entries.ts` evaluates a day using its recorded rule snapshot first, then effective-date configuration revisions. A configuration edit is effective today for days without a record. Already recorded days, including a cleared record's history, retain their original target, unit, tracking kind, habit type and schedule. Editors show the rules belonging to that day.

Configuration edits must receive an effective date. Corrections append records with stable per-action IDs; replaying the same daily operation ID does not apply an increment twice. Recorded IDs are generated outside pure transitions. Every new record includes the habit date through its map key, recording timestamp, timezone when available, UTC offset and an explicitly unknown occurrence time. Logging now is not assumed to be the time the activity happened.

Legacy configuration history cannot be reconstructed. Migration captures the current configuration as a baseline; it does not invent earlier schedules, amounts, timezones or occurrence times. New edits after migration preserve earlier records. Existing notes and earned collections are retained.

## Storage and save feedback

The active schema/key is version 2 at `@habit-tracker/state/v2`. When it is absent, the repository validates the old version 1 record, migrates completed dates into `legacy-complete` records with unknown amounts/times, validates the resulting snapshot and writes v2 before returning the migration. Reads, migration writes and ordinary writes share the serialized queue.

The v1 source at `@habit-tracker/state/v1` remains untouched for recovery. A failed migration can be retried. A present but unreadable v2 record produces a load error rather than silently reverting to older v1 history. Future erase-all and migration-cleanup work in L09 must cover both keys; retaining the recovery copy is not secure erasure of its old contents.

Daily records are authoritative once present; `checkIns` remains a compatibility projection for the current renderers, rewards and sharing. Validation checks numeric values, rule snapshots, correction IDs, dates and recording metadata.

The store applies changes optimistically, serializes the exact snapshots and returns an awaited write result. A failed write leaves the latest result available for retry. Retry writes that result; it does not repeat an increment or create another habit. Add/Edit and the day editor wait for the write before closing normally. Failed submissions keep the draft and show Retry saving. Fields are locked during submission/retry so the displayed draft cannot diverge from the pending result. Save errors are also visible on the detail screen as well as Home.

The entry drawer retains its content through dismissal and disables dismissal while submitting. This implementation remains AsyncStorage-based; it does not add a transaction/outbox database, multi-device operation merging, entitlement verification or achievement reveal delivery.

## Date refresh

The midnight timer is rescheduled on app activation even when the local date is unchanged. Calendar-day arithmetic continues to use local date construction rather than adding a fixed 24-hour duration. A mocked UTC-to-Paris same-day change now schedules the correct local midnight instead of refreshing one hour late. Actual automatic timezone changes and background execution remain device checks.

## Local evidence

- `npm run typecheck -- --noUnusedLocals`
- `npm run check:tracking`: target/limit boundaries, decimals, explicit zero, failures, partial/unlogged states, effective-date history, correction IDs and replay, preserved awards, unknown legacy amounts, migration retry and retained source, corrupt v2 protection, leap days, DST date arithmetic and timezone timer rescheduling.
- `npm run check:entry-ui`: decimal drafts, combined value/note submission, double-save guards, failed-save retention, retry without duplicate entries or habits.
- `npm run check:actions`, `check:rewards`, `check:feedback` and `check:i18n`: existing domain/store, retention, persistence, haptic and translation regressions. The 12-language catalogs include the new editor/status text.
- iOS and Android source transforms pass with the installed Expo preset.

The UI checks use mocked native components and do not verify physical rendering, keyboards, animations, VoiceOver or actual process termination. No packages, simulators, native builds, servers or cloud services were added or started.

## Remaining device acceptance

- Reload Expo Go fully for the new data version. Use a copy/test installation with existing habits, notes, archives and earned rewards; confirm migration and relaunch preserve them.
- Exercise Add 1, Enter total, decimals, zero-limit Quit, past corrections, Undo/Clear and notes from Home and detail. Check both themes, narrow iPhone and iPad layouts, larger text and VoiceOver.
- Verify entry/form save, retry, cancellation, keyboard and downward dismissal. Confirm the entry drawer opens within habit details and leaves the detail screen visible on closing.
- Terminate/relaunch around recording and migration writes. Confirm the saved/failed state corresponds to the recovered data and retries do not double-add.
- Exercise midnight, timezone changes and DST on actual devices. Record device/build evidence before closing L02's final verification item.

L03 analytics is now locally implemented at the user’s request after visual review; see [L03 analytics](L03-ANALYTICS.md). This tracking foundation still needs the physical-device acceptance checks above. Achievement animation and paid boundaries remain L04/L05; purchases remain final in L19.
