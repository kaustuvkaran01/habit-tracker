# Habit Tracker

A React Native app for iOS and Android to build habits and quit unwanted ones, with a small single-habit widget and shared cloud sync. Release iOS first, Android next from the same codebase, and consider a full Mac companion later.

`habit-tracker` is the working project name, not the public brand. Keep all app code, backend code, product decisions, design assets, tests and store materials inside this directory. This directory is an independent Git working repository connected to [kaustuvkaran01/habit-tracker](https://github.com/kaustuvkaran01/habit-tracker), with SSH remote `git@github.com:kaustuvkaran01/habit-tracker.git` named `origin`. Its local history starts from the existing GitHub repository history.

## Start here

- [Current launch checklist](docs/LAUNCH-CHECKLIST.md) covers the remaining product work and App Store release requirements.
- [Home screen](apps/mobile/src/screens/home-screen.tsx): the current Expo Go screen. Follow the run instructions below.
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

`apps/mobile/` contains an Expo Go app with three dark home views, habit details and a shared New/Edit Habit form. The remaining code directories are reserved with placeholders; persistent storage and the backend have not been implemented.

## Run the starter

Use Node.js LTS and the Expo Go app on your phone. This starter uses Expo SDK 58 to match the Expo Go version on your phone. See [Expo's SDK upgrade guide](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/) when upgrading in future.

From the project directory:

```sh
cd apps/mobile
npm start
```

After updating dependencies, stop any existing server with `Ctrl+C` and run `npm start -- --clear` to clear its bundler cache.

Keep your phone and computer on the same Wi-Fi network. Scan the terminal's QR code with the iPhone Camera app or Expo Go on Android. You should see a dark home screen with Settings, Pro, Wallpapers, Charts and Add buttons. First use seeds two sample habits: Habit 2 and Workout; later launches restore saved habits. Change files under `apps/mobile/src/` in your editor and save to see them update on your phone. Press `Ctrl+C` in the terminal to stop the server.

The bottom switcher selects 26-week habit grids, a five-day checklist table or monthly calendar cards, following the supplied references. The top toolbar and bottom switcher stay fixed while only the habit content pages swipe horizontally. Swipe left to move to the next view and right to return. The bottom highlight follows the scroll position continuously, including while holding a swipe halfway between pages; tapping a view button scrolls the page and highlight together. A shared safe-area-aware header accounts for iPhone/iPad status bars and notches. Tap checkmarks or checklist squares to toggle check-ins. Tap a habit name, history grid or monthly card to open its details. Check-ins are shared across all views.

The detail screen slides in from the right and slides back out to the right when Back is pressed, revealing the previous home view. It keeps the habit content mounted through the exit animation to avoid a blank frame. The transition uses Reanimated on the UI thread and respects Reduce Motion. The screen includes a history grid, a streak calculated from check-ins, and an interactive month calendar. Tap an eligible past or current day to change completion; hold it to write a note. Month selectors open a month/year picker, arrows change the detail month, and Today returns to the current month. Future dates, unselected repeat days and days before a new habit's creation cannot be checked in. The home Settings and Pro buttons open their own sheets; Charts remains a preview notice.

Settings follows the supplied grouped layout, with a Habit Tracker Pro card, app/help/about sections and the real app version. Archived Habits shows time remaining and restores individual habits with their history and notes intact. Theme applies Light, Dark or System appearance immediately and saves the choice on the device. Reorder Habits moves active habits up/down across all three home views; archived habits retain their position and history. Show Onboarding opens a welcome sheet with ten coloured feature cards, a scrollable welcome heading and a fixed Continue button. Continue returns to Settings; swipe-down, Back and accessibility escape also dismiss the sheet. Notifications and widgets are labelled Coming soon. It is a replay from Settings, not a new first-launch flow, and does not alter habit data. What's New shows release guidance. Other settings, feedback and about links remain explicitly identified preview actions. Habits and rewards save locally. Backup displays Off because cloud backup and cross-device sync are not enabled.

The Pro sheet opens directly from Home or from Settings after the Settings sheet finishes dismissing on iOS. It has selectable Lifetime, Annual (initial selection) and Monthly plans, a scrollable planned-feature list, a fixed Continue button and a restore action. Reference prices (₹5,900 lifetime, ₹2,499/year and ₹499/month) are placeholders, labelled as previews. Continue and Restore explain that billing is not available. No purchase, entitlement, paywall restriction or store connection is implemented. Third-party branding and the reference's unrelated product advertisement are replaced with Habit Tracker content. The sheets use dark native page-sheet dismissal with mounted contents to avoid blank closing frames. TypeScript, iOS/Android compilation, plan selection, ordering/history preservation and presentation sequencing checks passed; device appearance and gestures still need review in Expo Go. No new dependencies were needed for these screens.

On habit details, Theme, Archived Habits and Reorder Habits, swipe right starting at the left edge to go back. Gesture Handler tracks the finger and Reanimated updates the drawer on the UI thread, without sending each movement through JavaScript. A spring uses the release velocity to finish closing after a long swipe/quick flick or return into place after a short or cancelled swipe. Reversing direction cancels the dismissal. React closes the drawer only after the swipe animation finishes. TypeScript, Expo's worklet transformation and gesture thresholds at phone/tablet widths have been checked; physical-device smoothness still needs review in Expo Go.

Swipe horizontally across the detail calendar to change its month: left for next, right for previous. The calendar pages with native scrolling and shares its selected month with the arrows, Today and month picker. Vertical drags can still scroll the detail screen, day taps mark completion, and holds open notes. The screen's left-edge back gesture remains separate. Calendar paging and touch interactions still need review on a device in Expo Go.

Holding a calendar day opens a dark bottom note drawer with the habit icon/name, Today or the selected date, that day's completion checkbox, a multiline note and a purple Save button. The keyboard opens when the note field is tapped. Save stores the trimmed note (an empty note removes it); tapping outside, dragging the handle down or using Back discards unsaved note edits. The completion checkbox updates the habit immediately, like a calendar day tap. The drawer and dimming backdrop animate on the UI thread, retain their contents while closing, respect Reduce Motion and leave space for the keyboard and device safe areas. Device layout, keyboard and drag behaviour still need review in Expo Go.

Tap the purple Add button to open the scrollable New Habit sheet. It includes an Icons/Emoji picker, 21 colours, name and description, Build/Quit selection, repeat days, tracking settings, reminder time and categories. Choose one of six rounded vector habit symbols, one of 42 suggested emoji, or enter/paste a single emoji from the device keyboard. Combined emoji (including skin tones, families, keycaps and flags) are preserved. Invalid or multiple emoji block saving until corrected. The choice is prefilled when editing and appears in every home view, details, notes, archived/reordered lists and shared images. Picker content stays mounted through its fade-out. Save stays fixed at the bottom and becomes available when the form is valid. Saving adds the habit to all three home views. Closing without saving discards the draft.

Habit and interface icons now share a vector renderer with rounded line caps/joins, consistent stroke weights and softly rounded icon tiles. This includes the gear, top toolbar, view switcher, calendar arrows, checkmarks, edit/share/archive actions, Settings/Pro symbols and close controls. The existing top-button sizes, touch areas and grid layout are retained. Emoji rendering uses the device's emoji font and keeps the habit colour on the surrounding tile. Code, Unicode validation, Add/Edit callbacks and history-preservation checks passed; appearance and native share-image capture still need device review.

Interactions use a shared haptic press control without adding layout wrappers. Buttons give a soft response; changed selections, the start of a home view drag and completed calendar swipes give a small tick. Long-pressing a calendar day gives a distinct response before opening notes. Committing a completion gives a medium response, undoing one gives a light response, and newly earned wallpapers/patches give success feedback. Completion feedback is based on the committed state change, outside state updaters, so hydration, note edits and React re-renders remain quiet. Completion controls suppress the generic button response to avoid double feedback. Save actions and export failures have success/error feedback. Disabled controls, already-selected options, cancelled button presses and text entry do not generate app haptics; repeated effects are rate-limited.

Settings → Haptic feedback turns app haptics on/off. The choice is stored separately at `@habit-tracker/haptics/v1`, with serialized writes and protection against late preference reads overriding a fresh user choice. Nothing vibrates while the preference loads. A failed preference read defaults to quiet; unsupported devices or native haptic failures never interrupt the action. Web and background app states are silent. Actual feedback depends on hardware and system settings ([Expo haptics documentation](https://docs.expo.dev/versions/v58.0.0/sdk/haptics/)); feel and intensity need checking on a physical device.

Tap the pencil in a habit's details to open Edit Habit. It uses the same form, prefilled with that habit's settings, including numeric goals, units and tap behaviour. Saving updates the existing habit across all views and returns to its details. Its ID, creation date, check-ins and notes are preserved; changing repeat days does not delete previous check-ins. Closing the edit sheet without saving discards the draft. The shared form lives in `apps/mobile/src/screens/habit-form-screen.tsx`.

The settings wheel inside a habit opens Share Habit / Delete Habit. Delete Habit moves the habit to Settings → Archived Habits for 30 local calendar days on the free tier. Expiry removes habit history and notes while keeping earned wallpapers and badges in the collection. Older archives receive a full recovery window when first loaded. Pro archives have no expiry once billing supplies a verified entitlement. The home banner offers Undo for one archived habit or Restore all for several.

Share Habit opens a live preview with Light/Dark themes, 21 accent colours and switches for the completion indicator, description and streak. Showing the streak also includes the repeat schedule, matching the reference. Share colours apply to the image preview; the habit's own colour is preserved. The image uses Habit Tracker branding. Either Share button captures the preview as a PNG and opens the device's share sheet. Temporary images are released when the share screen closes or the next export begins. Theme and toggle choices reset when the share screen closes.

Count and Measure follow the supplied form references: a Daily Goal (or Quit limit) field with `/ Day`, minus/plus controls that step by one, and an On Tap selector for Add 1 or Enter total. Measure has a separate Unit field above the goal. Positive decimal goals are supported for Measure; Count requires a whole number. The selected tap behaviour is saved with the habit's tracking settings. Daily check-ins still use a manual completion mark; numeric entry and the configured daily tap actions are not implemented yet. Reminder times are validated and kept as settings; notifications are not scheduled and no notification permission is requested. Categories, repeat schedules and tracking settings appear in the habit's details.

The Wallpapers button beside Pro opens a per-habit wallpaper and badge collection. Consecutive **scheduled** days unlock rewards at 7, 10, 21, 30, 45, 60 and 90 days. A missed scheduled day resets the current run; rest days do not. Once earned, wallpapers and badges are retained through missed days, historical check-in corrections, habit edits and archiving. The circular progress ring is empty at zero and fills to 90, with the count and remaining days inside. Completed cycles remain complete until the user starts another cycle.

All seven milestones have original vector landscapes in the style of the initial 60/90-day designs. Thumbnails show the complete portrait image at a compact size, in three columns on a normal phone and four on wider sheets. The original five user-provided quote images remain available as alternate editions for the first five milestones. They fit on an extended matching-colour canvas without cropping their text; their source files are preserved unchanged. Landscape exports remain sharp at **1179 × 2556**, the [iPhone 16's resolution](https://www.apple.com/iphone-16/specs/). The export contains the wallpaper only, and uses a full-size render rather than enlarging a gallery thumbnail.

A 90-day cycle awards a permanent animal patch. The illustrated patch collection shares one original shield, stitched border and two-tone portrait style: Bear / Resolve, Boar / Drive, Bison / Endurance, Badger / Grit and Wolf / Focus. The animals have focused eyes, pronounced brows, angular silhouettes and snarling mouths. Patch artwork shows the animal name with “90 DAYS” underneath; rank labels are removed from the gallery and share image. Later cycles repeat the animal set with distinct cycle records. Earned patches can be exported as 1080 × 1080 social images with the habit name and cycle; notes are not included. Future patches are visible in the badge shelf. The next cycle can start only after completing the current one and begins on the following day, so one completion cannot count in two cycles. History and previous collections remain intact.

Quote artwork has explicit image width/height matching its portrait container, contain scaling and clipped outer bounds. This overrides the source image's intrinsic dimensions in both thumbnails and full previews, keeping the complete photo inside the frame. The Habit screen's streak pill includes a small rounded-outline flame before its day count.

Use Wallpaper exports the chosen unlocked design through the device share sheet. The chosen milestone and Landscape/Quote edition are remembered as “Your pick”; reopening the preview restores that edition. The app cannot confirm whether the user applied it as their phone wallpaper. Save the image and choose it in the phone's Wallpaper settings ([Apple's instructions](https://support.apple.com/en-gb/102638)). Native wallpaper changes are made by the user. Settings retains its fanned-card introduction, which now opens the real collection after the native sheets finish dismissing.

Habits, notes, check-ins, ordering, archive state, emoji and earned rewards persist together in a versioned AsyncStorage record (`@habit-tracker/state/v1`). Sample history is generated only on first use. Data is validated before loading and writing; corrupt/unrecognized saved data is not overwritten, and the app shows a retry screen. Writes are serialized to preserve the latest update; write failures retain in-memory changes and show Retry saving. These are local-device records, not cloud backups: clearing app data or uninstalling can remove them. View and share-appearance choices remain temporary. The app refreshes its local day at midnight and on foregrounding.

TypeScript and the reward/storage regression checks cover threshold boundaries, scheduled rest days, missed days, duplicates/future dates, two complete 90-day cycles, permanent unlocks, reset boundaries, archive/name/history preservation, invalid saved records, serialized writes and retry after failure. Native layouts, ring animation, PNG capture and the device share sheet still need review in Expo Go.

Dependencies are installed locally in `apps/mobile/node_modules`. To install them after a fresh clone, run `npm ci --cache ../../.cache/npm` from `apps/mobile`. The package cache stays inside this project at `.cache/npm`; nothing is installed globally.

The fixed home toolbar uses `react-native-safe-area-context` (`~5.11.1`), installed locally in `apps/mobile/node_modules/react-native-safe-area-context`. This SDK 58 dependency is included in Expo Go. Restart the app server with `npm start -- --clear` after installing it. Toolbar placement and continuous swipe animation still need review on the phone and iPad.

Image sharing adds two local dependencies: `expo-sharing` (`~58.0.22`) in `apps/mobile/node_modules/expo-sharing` and `react-native-view-shot` (`6.1.1`) in `apps/mobile/node_modules/react-native-view-shot`, using the versions listed for the installed Expo SDK 58. Both native modules are included in Expo Go. Restart the app server with `npm start -- --clear` after installing these packages. No native build is needed for this preview.

The detail swipe adds `react-native-gesture-handler` (`~3.3.0`), `react-native-reanimated` (`4.7.1`) and `react-native-worklets` (`0.13.0`), matching the installed Expo SDK 58's bundled versions. They are local to `apps/mobile/node_modules/react-native-gesture-handler`, `apps/mobile/node_modules/react-native-reanimated` and `apps/mobile/node_modules/react-native-worklets`. Expo's Babel preset configures worklet compilation automatically. These modules are included in Expo Go; restart the server with `npm start -- --clear` after installing them. No global installation, native build or simulator is required.

Vector icons add `react-native-svg` (`15.16.0`), installed locally at `apps/mobile/node_modules/react-native-svg` with its transitive dependencies in the same `node_modules` directory and its download cache under `.cache/npm`. This is the SVG version bundled with the installed Expo SDK 58 and Expo Go. Restart the existing server with `npm start -- --clear` to load the renderer. No icon fonts, global packages, native builds or simulators were installed or started.

Collections add `@react-native-async-storage/async-storage` (`2.2.0`), installed locally in `apps/mobile/node_modules/@react-native-async-storage/async-storage`, with its transitive dependencies in the same local `node_modules` and download cache under `.cache/npm`. The installed version matches Expo SDK 58's bundled version. No cloud services, global tools or native builds were created. Restart the existing server with `npm start -- --clear` after installing it.

Haptics add `expo-haptics` (`~58.0.7`, installed version `58.0.7`) locally at `apps/mobile/node_modules/expo-haptics`, using the project cache at `.cache/npm`. This matches the installed Expo SDK 58's bundled range and works in Expo Go. No global tools, native builds or development servers were started. Restart the existing Expo server with `npm start -- --clear` after installing it.

Checks from `apps/mobile`: `npm run typecheck`, `npm run check:rewards` and `npm run check:feedback`. These use the existing TypeScript package without adding a test framework. Haptic checks use mocked native calls to cover effect selection, saved opt-out, startup silence, preference races, rate limits, failure handling, completion/reward intent and disabled/selected controls; actual device vibration is not simulated.

The app is linked to the existing Expo project `@kaustuvkarans-team/habit-tracker` (ID `94a0dd2e-6093-4ef4-9055-b0952017b4b7`), recorded in `apps/mobile/app.json`. EAS CLI was run through `npm exec` with its tool files cached under `.cache/npm/_npx/`. Linking was verified with `eas project:info`; this step did not start a build or deployment.

## Current status

M1 was cancelled and rolled back on 5 November 2026. Work has since continued through individually authorized React Native + TypeScript steps in Expo Go, including the screens and collection features described above. Read [AGENTS.md](AGENTS.md) before further work; the original implementation plan remains an inactive reference.

Completed: M0 project organisation, repository setup, implementation plan and initial architecture decisions. See the [M0 completion record](docs/M0-COMPLETION.md) for verification results.

The app now includes the reference-based home views, habit details, shared New/Edit Habit form, emoji icons, archive/restore/reorder, Share Habit export, Settings and Pro previews, locally saved habits, and streak-based wallpaper/animal-patch collections. Native builds, emulators, backend/cloud sync, widgets, numeric daily logging and notification scheduling remain outside the authorized work. Development servers are started manually using the instructions above. Agree on each next step before implementing it.

## Development approach

Keep tracking usable offline and without an account. Require sign-in only for cloud sync. Share progress calculations across both mobile apps; keep React Native, SQLite and Firebase dependencies outside the TypeScript domain engine. Widgets receive derived snapshots and use a tested platform-specific action path; do not assume the isolated widget runtime can import application logic. Use fictional fixtures for previews and tests.

Start backend work with local emulators and development configuration. Keep generated build output, credentials and personal habit data out of source control. Commit dependency lockfiles when dependencies are introduced. Add executable setup/test instructions here as their corresponding code lands.
