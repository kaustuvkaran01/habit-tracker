# Habit Tracker

A React Native app for iOS and Android to build habits and quit unwanted ones, with a small single-habit widget and shared cloud sync. Release iOS first, Android next from the same codebase, and consider a full Mac companion later.

`habit-tracker` is the working project name, not the public brand. Keep all app code, backend code, product decisions, design assets, tests and store materials inside this directory. This directory is an independent Git working repository connected to [kaustuvkaran01/habit-tracker](https://github.com/kaustuvkaran01/habit-tracker), with SSH remote `git@github.com:kaustuvkaran01/habit-tracker.git` named `origin`. Its local history starts from the existing GitHub repository history.

## Start here

- [Implementation plan](IMPLEMENTATION-PLAN.md): milestones, task order and acceptance criteria.
- [MVP specification](docs/MVP-SPEC.md): detailed product behaviour, statistics and pricing research, moved here from the parent directory.
- [Architecture](docs/ARCHITECTURE.md): module boundaries, local storage, widgets and sync.
- [Decisions](docs/DECISIONS.md): agreed scope, working implementation choices and unresolved release details.
- [ASO launch plan](marketing/ASO-PLAN.md): project-specific positioning, assets and measurement.

## Directory layout

| Location | Purpose |
|---|---|
| `apps/mobile/` | Shared React Native/Expo mobile app, iOS/Android configuration and platform-specific widget adapters |
| `apps/macos/` | Reserved for a later Mac companion; outside the initial release |
| `packages/` | Shared TypeScript domain rules, persistence interfaces and service adapters |
| `backend/` | Firebase emulator configuration, access rules, service functions, schema and backend tests |
| `design/` | Screen flows, design tokens, icons and original visual assets |
| `marketing/` | Keyword research, store copy, screenshots and launch experiments |
| `scripts/` | Repeatable development, verification and release helpers |
| `docs/` | Product specification, architecture, decisions and later QA/release records |

Code directories are reserved with placeholders. The application and backend have not yet been implemented.

## Current status

Completed: M0 project organisation, repository setup, implementation plan and initial architecture decisions. See the [M0 completion record](docs/M0-COMPLETION.md) for verification results.

Next: M1, a buildable React Native/Expo development app on iOS and Android plus a tested TypeScript habit engine. Prove the small widget on both mobile platforms early, then cross-platform sync before completing the remaining screens.

Development tools checked on 4 November 2026: Xcode 27.2 (27B52), Swift 6.4.2, and iOS/iOS Simulator/macOS 27.2 SDKs. No simulator boot, device installation, app compilation or signing check has been performed yet. Node/package-manager, Java/Android SDK and emulator availability still need checking in M1. Final iOS/Android deployment minimums must match the selected supported Expo SDK and native dependencies; iOS 17 widget interactivity is a feature requirement, not a promise that the selected stack supports that minimum.

## Development approach

Keep tracking usable offline and without an account. Require sign-in only for cloud sync. Share progress calculations across both mobile apps; keep React Native, SQLite and Firebase dependencies outside the TypeScript domain engine. Widgets receive derived snapshots and use a tested platform-specific action path; do not assume the isolated widget runtime can import application logic. Use fictional fixtures for previews and tests.

Start backend work with local emulators and development configuration. Keep generated build output, credentials and personal habit data out of source control. Commit dependency lockfiles when dependencies are introduced. Add executable setup/test instructions here as their corresponding code lands.
