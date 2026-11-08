# Habit Tracker

A React Native + TypeScript habit tracker built incrementally with Expo SDK 58. iOS launches first; the shared codebase also targets Android. Habit Tracker is the working name, not the final public brand.

## Current implementation

The app supports Yes/No, Count and Measure habits; three Home views; dated entry corrections and notes; calendar-day streaks; analytics; wallpaper/badge collections and celebrations; theme/language preferences; local reminders; archive recovery; portable backup/restore and local erasure; and privacy/support screens. New trackers start empty. Personal data is stored locally in versioned AsyncStorage snapshots.

Production access currently grants Free through a separate entitlement adapter. The confirmed Free/Pro policy is enforced, but selecting a preview purchase plan never charges or grants Pro. Widgets, iCloud sync and verified purchases are not connected yet. A visual privacy cover is implemented; native snapshot guarantees remain unverified. Local checks do not certify App Store readiness.

## Run and check

From `apps/mobile`:

```sh
npm start
npm run check
```

`npm start` starts the Expo Go development server; stop it with Ctrl+C. `npm run check` starts no server or native build. It runs strict TypeScript, every `check:*` regression, import/casing and pure-domain checks, and iOS/Android source transforms using installed dependencies. Native calls and storage failures are mocked in handler checks. Individual checks remain available for focused debugging.

For a fresh clone, read [the project guardrails](AGENTS.md) before installing dependencies. The existing local workflow is `npm ci --cache ../../.cache/npm` inside `apps/mobile`; no global tool is needed for the checks. See [development instructions and screen walkthrough](docs/DEVELOPMENT.md) for Expo Go setup, cache recovery and the existing installation records.

## Project map

| Location | Current purpose |
|---|---|
| `apps/mobile/src/data` | Pure types, date/history rules, actions, access policy, selectors and validated formats |
| `apps/mobile/src/hooks` | Habit-store, first-use, local-day and haptic lifecycle hooks |
| `apps/mobile/src/components` | Shared UI, theme/preferences/access providers, gestures, privacy and effect coordinators |
| `apps/mobile/src/screens` | Screen composition and local drafts; Settings navigation is separate from page content |
| `apps/mobile/src/services` | Native notification and file-picker/share adapters |
| `apps/mobile/src/i18n` | Twelve-language catalogs and runtime fallbacks |
| `apps/mobile/scripts` | Local regression runner and behavioral/native-mock checks |
| `docs`, `design`, `marketing` | Architecture, product/release evidence, assets and ASO planning |

The reserved `packages`, `backend` and Mac-app directories are planning placeholders, not connected services or production packages. Keep all work inside this project; do not restart the cancelled original M1 scaffold.

## Review and release references

- [Current architecture](docs/ARCHITECTURE.md): actual module ownership, save/restore boundaries, presentation and effects.
- [Code-quality review](docs/CODE-QUALITY-REVIEW.md): findings, focused commits, reproductions, per-step regressions and remaining risks.
- [Launch checklist](docs/LAUNCH-CHECKLIST.md): implementation versus device/release acceptance. Widgets are L11, native foundation L14, iCloud L17, and purchases remain the final L19 milestone.
- [Tracking](docs/L02-TRACKING.md), [analytics](docs/L03-ANALYTICS.md), [achievements](docs/L04-ACHIEVEMENTS.md), [Free/Pro](docs/L05-FREE-PRO.md), [first use](docs/L07-FIRST-USE.md), [reminders](docs/L08-REMINDERS.md), [backup/erase](docs/L09-BACKUP-RESTORE.md), [privacy/accessibility](docs/L10-PRIVACY-ACCESSIBILITY.md).
- [Design system](docs/DESIGN-SYSTEM.md), [iCloud proposal](docs/ICLOUD-SYNC-PLAN.md), [decisions](docs/DECISIONS.md), [ASO plan](marketing/ASO-PLAN.md).
- [Public privacy/support content](docs/PRIVACY-POLICY.md) and [support guide](docs/SUPPORT.md) are prepared locally and not hosted yet.
- [Initial structure audit](docs/L18-STRUCTURE-REVIEW.md), [original implementation plan](IMPLEMENTATION-PLAN.md), [MVP specification](docs/MVP-SPEC.md) and [archived architecture candidates](docs/archive/ARCHITECTURE-PLANNING-2026-11-04.md) retain historical context; they do not authorize new infrastructure.

The repository is connected to [kaustuvkaran01/habit-tracker](https://github.com/kaustuvkaran01/habit-tracker). Expo project linking is recorded in `apps/mobile/app.json`; it does not imply a signed build, cloud service or deployment.
