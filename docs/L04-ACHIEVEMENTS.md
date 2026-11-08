# L04 achievement celebrations

Implemented locally on 8 November 2026. Type, domain/store, presentation-handler, haptic and translation checks pass. Native animation, modal sequencing, termination and accessibility acceptance remain open; this does not sign off L04 or the release.

## Delivered behaviour

A newly earned wallpaper lifts into view using its actual collection artwork, a short radial burst and success haptic. A new cycle badge receives a separate stamp-style reveal using its animal patch artwork. The presentation follows the current Light/Dark themes and shared UI sizing. It has no automatic dismissal deadline.

View wallpaper opens the existing wallpaper preview/export flow. View and share badge opens the existing badge preview/share flow. Continue advances to the next queued achievement. The close control dismisses the remaining queued celebrations; earned items remain in the collection. All new copy is translated in the existing twelve languages.

The user confirmed the repeat rule: celebrate a wallpaper milestone once per habit across cycles. Another habit may celebrate its own first unlock of that milestone. Every newly earned cycle badge is a distinct permanent achievement and receives a reveal. Re-rendering, opening the gallery, undo/redo or ordinary startup cannot generate another reveal of an already delivered reward.

## Trigger and storage contract

`achievement-events.ts` defines stable event identities from the habit ID, reward kind, cycle and milestone. It separates pure event generation and acknowledgement from artwork, animation and haptics. `achievement-reveals.ts` is the central presentation registry; it maps each event kind to its title, action and motion treatment. `AchievementHost` owns queue acquisition, native presentation, artwork, motion and preview handoff.

Only explicit daily recording actions (`toggle-check-in`, `increment`, `record-day`) enqueue newly earned rewards. The action reducer compares before/after reward records, so retrying a write does not increment again or enqueue a duplicate. Backdated user corrections can earn a reveal when they genuinely cross a previously unearned milestone. The event retains the original achievement date and a separate queue timestamp; queue time is not treated as the time the habit happened.

Hydration, legacy migration, configuration edits and opening collection screens do not create delivery events. Existing historical awards become the comparison baseline. New sample fixtures carry `demo: true`; the two older undated seed identities are also excluded. Demo histories cannot create personal celebrations, including when the user taps their existing seed cards. L07 still owns replacing first-use sample habits and any explicit conversion into personal tracking.

The existing v2 habit snapshot stores optional `HabitRewards.delivery` metadata with its own version 1: pending events and handled identities. No extra storage key, service or dependency is added. The daily result, earned reward and pending event are written in one serialized snapshot. Validation rejects duplicate identities, invalid dates/timestamps, cross-habit IDs and events without a corresponding earned reward. Older snapshots without delivery metadata remain readable; their existing awards do not retroactively animate.

## Saved delivery and interruptions

The host starts acquisition only when the store has no pending write or save error, the app is active, the motion preference is known, and the current interface permits another presentation. It acknowledges the event in storage before showing its reveal. Store claims distinguish success, missing/already-consumed identity and failed persistence. A failed claim shows a retry state without celebration motion or reward haptic; retry saves the latest snapshot rather than replaying the daily action.

This is an at-most-once presentation policy after a successful claim, not an exactly-once visible-animation guarantee. If the process terminates or the host is unmounted after claiming but before the reveal is seen, that event is not replayed automatically; its permanent reward remains available in the gallery. Events saved with progress but not yet claimed remain queued for a later eligible session. A failed dismissal write retains the ordinary save error and retry path; without a successful write, a process restart may still recover the previously persisted pending event. No implementation can promise durable dismissal while storage is failing.

The current reveal pauses when the app backgrounds or another editor blocks presentation. Within the same host instance it resumes statically without replaying motion or success feedback. Reduce Motion uses static earned artwork and removes the burst; changing the preference during motion stops the effect. Existing haptic opt-out and unsupported-device handling apply. Routine completion feedback remains separate from the reveal's success feedback.

Closing remains available during a pending retry; late asynchronous callbacks cannot reopen a dismissed event. Archived/deleted habits are excluded, and a candidate is cancelled if its habit disappears. Restoring or viewing retained artwork does not itself generate an event.

## Presentation safety

The entry drawer reports when its native dismissal has completed. Home waits for that callback, plus other sheet/detail-modal blockers, before acquiring a reveal. This leaves an in-progress note or amount draft alone. A single stable host now wraps Home's content; a render callback places its native presentation inside the active habit-detail drawer or Home. The controller, claimed event and playback state survive that surface change. Home waits for drawer exit before presenting from Home. View/share handoff waits for the celebration modal to dismiss, and the next event waits until the collection preview has dismissed.

The 8 November follow-up verifies every wallpaper threshold (7, 10, 21, 30, 45, 60 and 90) against five distinct personal habits, including the names/IDs used by older demo fixtures when they have a real creation date. Separate habits earning the same milestone each animate; a native-surface change while claiming does not lose the reward or restart playback. This preserves the confirmed once-per-habit/milestone rule rather than replaying already-owned wallpapers on every view.

Follow-up local verification: all sixteen current checks pass, including TypeScript with unused-local checking, multi-habit queue playback and claim-in-flight surface handoff. The installed Expo preset transforms ninety sources for both iOS and Android. Native animation smoothness and iOS presentation remain physical-device checks.

These lifecycle guards use native iOS dismissal callbacks and the existing Android close-state conventions. Actual native gesture and view-controller behaviour still needs physical-device confirmation.

## Local evidence

- `npm run typecheck -- --noUnusedLocals`.
- `npm run check:achievements`: stable IDs and deterministic replay; first wallpaper per habit; distinct cycle badges; demo/migration exclusion; backdated rewards; pending/handled validation and storage round-trip; failed entry/claim saves and retry; durable claims and no replay on remount; missing claims; queue advancement and bulk dismissal; actual wallpaper/badge render selection; preview handoff; background resume; Reduce Motion; retry while visible; quick dismissal during an outstanding retry.
- `check:tracking`, `check:streaks`, `check:analytics`, `check:entry-ui`, `check:actions`, `check:rewards`, `check:feedback` and `check:i18n` pass. The catalog contains 643 messages in twelve languages.
- iOS and Android source transforms pass using the installed Expo preset.

Tests use mocked native components and storage failures. They do not measure real animation smoothness, verify VoiceOver output or emulate process termination. No dependency, server, simulator, native build, cloud service or purchase integration was added or started.

## Remaining device acceptance

Use a separate test installation with a prepared personal habit immediately below a milestone. New habits cannot be backdated before creation, and demo cards are intentionally excluded; do not alter real user history to stage a reveal.

- Earn a wallpaper through a normal completion, a Count/Measure amount and a historical correction. Confirm the entry/note editor closes normally before the reveal and that its saved content is intact.
- Reach the 90-day threshold and inspect the wallpaper-then-badge queue. Continue through it, open both preview/export routes, and dismiss the full queue. Confirm collection history is unchanged by dismissal.
- Exercise Home and habit-detail entry points on iPhone/iPad in both themes, with long names/translations and larger text. Inspect actual motion, artwork sizing, touch targets and scrolling on small screens.
- Verify native drawer/sheet exit, menu dismissal, preview handoff, swipe back and background/foreground transitions. Confirm no white flashes or competing iOS modal presentations.
- Check Reduce Motion before/during presentation, haptics disabled, VoiceOver, hardware back/escape, rapid close/retry taps and closing during a stalled save.
- Terminate/relaunch before entry persistence, after pending-event persistence, during a claim, during the reveal and during image export. Check the documented at-most-once policy, save-error recovery and permanent collections.
- Record device/build evidence before closing L04's remaining acceptance item. Paid capability enforcement remains L05; Apple purchases remain L19.
