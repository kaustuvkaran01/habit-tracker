# Decisions and working assumptions

Updated: 4 November 2026.

## Agreed product direction

| Decision | Consequence |
|---|---|
| iOS and Android with React Native; release iOS first, Android next | One shared mobile codebase; build/test both from the start; full Mac app deferred |
| Build and Quit in one app | Shared Today/history structure with metrics appropriate to each mode |
| One small widget displaying any one habit | One widget layout; user chooses the habit per instance; larger/checklist/Lock Screen widgets deferred |
| Shared cross-platform sync | Use a common account/backend rather than separate iCloud and Android systems |
| HabitKit-style Free plus one Pro tier | Same Pro features across monthly/annual options; avoid an artificial middle feature tier |
| Offline operation and privacy | Account-free local tracking, discreet surfaces, export/restore and optional sync |
| Keep MVP focused | No community, AI coach, blocking engine, courses or wearable app |

## Implementation defaults

These choices let work proceed; change them when the prototype gives a concrete reason.

| Default | Validation point |
|---|---|
| React Native/Expo development builds; Expo Widgets first with narrow native adapters if needed | M1/M2 builds and closed-app/offline widget check on iOS and Android |
| Pure TypeScript `habit-core` package | M1 domain tests and both mobile builds |
| SQLite locally; prototype `expo-sqlite` | M2 persistence/migration/widget access |
| Firebase Auth/Firestore via native React Native Firebase modules | M3 mobile login, offline merge, account isolation and cost assessment |
| Three free habits; small widget included | Beta activation and retained use |
| Pro includes cloud sync | M5 capability policy and beta willingness to pay |
| US $2.99/month and $19.99/year as test prices | Store configuration and pricing experiment; not a validated optimum |
| No lifetime at initial release | Reassess after measuring recurring sync costs |
| Deployment minimums chosen from supported Expo/native dependencies | M1/M2 validation; iOS 17 interactive-widget capability does not establish the stack minimum |
| English/US as initial ASO research focus; India as a secondary pricing/market review | M7 research; do not assume demand volumes |

## Details to resolve when needed

- Final public name, bundle identifiers, visual identity and developer team.
- Exact operation schema and deterministic conflict policy, including simultaneous schedule edits.
- Supported sign-in/recovery methods, Expo/native module compatibility and widget action persistence on iOS/Android.
- Later Mac scope and implementation, based on observed desktop demand.
- Final backend provider/region, expected operating cost and retention policy.
- Exact cloud-sync behaviour after subscription expiry, and any future lifetime service promise.
- Final storefront prices, launch territories and public support/privacy URLs.

The user has authorised starting the project. Routine local implementation can proceed using these defaults; no additional confirmation is needed to create the app foundation or tests.

## Setup record

M0 created the project folder, moved the existing MVP specification here, and reserved component directories. Xcode/Swift/SDK discovery succeeded. The user then accepted mobile-first delivery. The plan, architecture, product spec and folder layout now use React Native with iOS first, Android next and Mac deferred. No app code, deployed backend, paid service, store product or release has been created yet.

M0 is now verified complete: the project has its own Git history and origin, shared editor/ignore settings, and checked document links. See [M0-COMPLETION.md](M0-COMPLETION.md). M1 remains the next implementation milestone.
