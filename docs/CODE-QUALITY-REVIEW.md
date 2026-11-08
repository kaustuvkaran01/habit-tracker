# Code simplification review — 8 November 2026

Scope: review the current Expo app, simplify code with concrete maintenance or correctness value, regress each step, and push separate commits. Preserve tracking history, schemas, Free/Pro policy, existing layouts, gesture/dismissal sequencing and pending native acceptance. No packages, servers, simulators, native builds, cloud setup or publication are part of this review.

## Baseline and commit strategy

The working tree contained the previously implemented L01–L10 changes across 128 files. The baseline passed TypeScript with unused-local checking and all sixteen existing regression scripts. Commit `df271a3` preserves that implementation separately from the audit; two extra blank lines at EOF were normalized. Review simplification commits after this checkpoint for the changes made by this task.

Each code step runs `npm run check` from `apps/mobile` before its commit. This discovers every `check:*` script, runs TypeScript without a global tool, checks source/import boundaries and transforms the app for iOS/Android using the installed Expo preset. Failures stop the suite and print the underlying output. These are local/mocked regressions, not a replacement for signed-device, VoiceOver, gesture or process-termination testing.

## Findings and progress

| Finding | Planned bounded improvement | Status |
|---|---|---|
| No single complete regression command; transforms run manually | Discover and run all checks, enforce import casing and native-free domain code | Implemented; regression recorded below |
| Store save/restore and notification paths contain overlapping lifecycle guards | Reproduce races first; simplify the owning boundary rather than adding screen workarounds | Under review |
| Home duplicates the same long presentation conditions for reminders and achievements | Give shared presentation readiness one name/owner; test each blocker and handoff | Planned |
| Settings routes pages through a deeply nested JSX ternary with a default reorder fallback | Use explicit typed page routing and focused content components, preserving retained content during dismissal | Planned |
| History and reward selectors repeatedly scan unchanged records | Remove demonstrated duplicate work while keeping dated rules and immutable data semantics | Under review |
| Architecture text mixes older backend proposals with current implemented ownership | Make current architecture the entry point; label historical plans and update evidence/gaps | Planned |

## Regression record

- Baseline: 17 checks passed before the checkpoint commit.
- Step 1: `npm run check` passed all 18 checks in 11.0 seconds, including 95-source iOS/Android transforms and import/domain boundaries. No runtime app code changed.

## Release limits retained

Native widgets, transactional cross-process storage, CloudKit, purchase verification, app-switcher snapshot guarantees, public-page hosting and actual release-binary declarations remain their existing milestones. A smaller file or passing mocked test does not close those gates. The review will document deferred issues rather than introduce an unapproved platform or storage migration.
