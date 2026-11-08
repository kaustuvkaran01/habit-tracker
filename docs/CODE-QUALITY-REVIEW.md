# Code simplification review — 8 November 2026

Scope: review the current Expo app, simplify code with concrete maintenance or correctness value, regress each step, and push separate commits. Preserve tracking history, schemas, Free/Pro policy, existing layouts, gesture/dismissal sequencing and pending native acceptance. No packages, servers, simulators, native builds, cloud setup or publication are part of this review.

## Baseline and commit strategy

The working tree contained the previously implemented L01–L10 changes across 128 files. The baseline passed TypeScript with unused-local checking and all sixteen existing regression scripts. Commit `df271a3` preserves that implementation separately from the audit; two extra blank lines at EOF were normalized. Review simplification commits after this checkpoint for the changes made by this task.

Each code step runs `npm run check` from `apps/mobile` before its commit. This discovers every `check:*` script, runs TypeScript without a global tool, checks source/import boundaries and transforms the app for iOS/Android using the installed Expo preset. Failures stop the suite and print the underlying output. These are local/mocked regressions, not a replacement for signed-device, VoiceOver, gesture or process-termination testing.

## Findings and progress

| Finding | Planned bounded improvement | Status |
|---|---|---|
| No single complete regression command; transforms run manually | Discover and run all checks, enforce import casing and native-free domain code | Implemented; regression recorded below |
| A restore started during an unfinished edit invalidates that edit's error revision; failed writes can appear saved | Reject restore at the store boundary while ordinary saves are pending; preserve preview/retry and original save ownership | Fixed; failing reproduction added before change |
| Rejected preference patches are marked touched before validation and overwrite saved choices during hydration | Track touched keys only after validation succeeds | Fixed; failing reproduction added before change |
| Home duplicates long presentation conditions and performs filter/sort work in the screen body | Extract immutable Home selectors and a shared readiness rule; memoize view data by its actual inputs | Implemented; combination/transition regression added |
| Settings routes pages through a deeply nested JSX ternary with a default reorder fallback | Use exhaustive typed routing and focused Appearance/Archive/Reorder content, retaining navigation ownership | Implemented; all ten routes and retained dismissal content checked |
| ReminderProvider serializes the complete persisted history and notes on every render and constructs unused reconcilers | Observe stable committed-input identities and lazily create the single reconciler | Implemented; serialization reproduction and queue regression added |
| Every unrecorded calendar day allocates/filters the full configuration history | Reverse-search the last applicable rule without allocation; keep recorded provenance first | Implemented; historical-equivalence and revision-access regression added |
| Architecture text mixes older backend proposals with current implemented ownership | Make current architecture the entry point; label historical plans and update evidence/gaps | Planned |

## Regression record

- Baseline: 17 checks passed before the checkpoint commit.
- Step 1: `npm run check` passed all 18 checks in 11.0 seconds, including 95-source iOS/Android transforms and import/domain boundaries. No runtime app code changed.
- Step 2: reproduced both defects with failures before changing code: a failed edit/restore race returned no store error, and a rejected pre-load navigation patch overwrote a saved preference. Added store-level pending-save protection and moved touched-key tracking after validation. Regresses failed writes, unchanged disk/history, retained retry, later successful restore, pre-load rejection and absence of unsolicited preference writes. Full suite: 18/18 passed (10.7 seconds).
- Step 3: extracted `selectHomeHabits` and `homePresentationReady`; Home now memoizes normalized filters, category options and completion membership. Both reminders and celebrations consume the same readiness value. All 1,152 filter/control combinations match the pre-refactor rules, including retained disabled filters; ordering, immutable data, empty states and every native-dismissal blocker are checked. Native modal and gesture implementation is unchanged. Full suite: 19/19 passed (11.5 seconds), including both-platform transforms of 96 sources.
- Step 4: reproduced the render-time full-history JSON serialization in the reminder provider. Replaced the digest with immutable committed-input dependencies and lazy ownership of the one reconciler. Regresses unchanged renders, new committed snapshots, stable job fingerprints, saved-only planning, permission changes, foreground refresh and existing retry/deduplication behavior. Full suite: 19/19 passed (10.8 seconds). This removes demonstrated duplicate work; it is not a measured native frame-rate claim.
- Step 5: split Settings navigation from page content. A single title map defines the page union and an exhaustive switch replaces routing ternaries/default reorder fallthrough. Appearance, archive display and reorder controls have focused content components; Settings still owns access checks, native sheets, busy locks and retained content. The navigation file shrank from 250 to 180 lines; maximum nested conditional-expression depth dropped from 9 to 2 (page content: 3). All ten routes, theme choices, archive access states, restore IDs, ordering bounds, empty states, missing backup tools and back/busy-dismissal paths are checked. Full suite: 20/20 passed (11.3 seconds), including both-platform transforms of 97 sources.
- Step 6: reproduced a full 128-revision scan on a current-day lookup. `configurationOn` now searches backward for the last applicable rule without allocating a filtered array. A 273-date fixture matches the previous lookup exactly (including returned object identity), current-day reads stop at the recent revision, and the full tracking/streak/analytics/reward suites retain recorded-day provenance and migration coverage. Full suite: 20/20 passed (11.6 seconds). Broader memoization/virtualization remains a measured-device task, not a speculative rewrite.

## Release limits retained

Native widgets, transactional cross-process storage, CloudKit, purchase verification, app-switcher snapshot guarantees, public-page hosting and actual release-binary declarations remain their existing milestones. A smaller file or passing mocked test does not close those gates. The review will document deferred issues rather than introduce an unapproved platform or storage migration.
