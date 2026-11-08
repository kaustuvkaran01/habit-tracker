# L10 privacy, support and accessibility

Local implementation dated 8 November 2026. User-confirmed support email: `kaustuvkaran@gmail.com`. The user chose an app-switcher cover now and a separate later decision for device authentication. No domain/hosting destination has been supplied and no page has been published. This is partial L10 implementation, not launch sign-off.

## Delivered in the app

Settings now opens **Privacy Policy** and **Support** in the existing right-swipe/back drawer. Both work offline. The privacy screen describes the actual local data, exports, reminder content, archive/erase behavior, currently unconnected services and support contact. The support page explains recovery and opens the user's email app with only a translated generic subject. There is no automatic email transmission, body, log, habit data or attachment. If no email handler opens, an inline message offers the selectable address as fallback. Duplicate taps are locked until the handoff resolves. New copy is translated in the existing twelve languages.

The reviewable public-page content lives in [PRIVACY-POLICY.md](PRIVACY-POLICY.md) and [SUPPORT.md](SUPPORT.md). Confirm the final identity/operator and live service behavior before hosting. The final policy/support URLs must be public and connected in store metadata; local Markdown and an in-app screen do not meet that publication gate. [Apple privacy-link guidance](https://developer.apple.com/app-store/app-privacy-details/).

## App-switcher cover

`AppPrivacyProvider` observes active/inactive/background state and Android focus/blur. The cover appears without animation, contains only the working app name and a lock symbol, hides private descendants from accessibility and pointer interaction, and removes itself on return. Unknown initial state starts covered. Existing drafts/screens are kept mounted; covering does not alter history or save a draft.

`PrivacySurface` wraps the main screen. All eleven modules presenting native modals use `PrivateModal`, which inserts the same surface inside the actual native screen. This includes menus, calendars, Add/Edit, note/amount drawers, Settings, backup, analytics, collection/share previews and achievements. A cover at the Home root alone would leave an open native modal uncovered. Native permission alerts, keyboards, the OS file picker and external share/email interfaces remain system-managed.

This is a **best-effort JavaScript visual cover in Expo Go**, not a certified snapshot security boundary. React Native state/painting is asynchronous. Apple's app-switcher snapshot is captured on the native lifecycle boundary; a busy/suspended JS thread can miss that timing. L14 must validate a signed build and, where necessary, implement a synchronous window/scene-native cover before claiming reliable snapshot concealment. It does not block screenshots/recording or authenticate an unlocked device. Face ID/device lock remains a separate product/native decision. [Apple snapshot guidance](https://developer.apple.com/library/archive/qa/qa1838/_index.html), [React Native AppState events](https://reactnative.dev/docs/appstate).

Achievement presentation observes the cover state too, including Android blur while AppState still says active. New rewards wait until the cover clears; an already revealed reward resumes without replaying its motion/haptic.

## Accessibility pass

- Offscreen Home pager pages are excluded from the screen-reader tree; only the selected habit view is exposed. Existing bottom view controls remain the non-gesture route.
- Calendar cells expose an **Edit entry** screen-reader action, using the same allowed-day guard and editor callback as long press. This permits note/amount correction without performing a physical hold.
- Bottom-drawer handles now have a minimum 44-point target; busy handle/backdrop controls report disabled state. Right-drawer accessibility escape respects dismissal blocking during file/save work.
- Yes/No entry choices expose a named radio group and disabled states. Existing numeric labels, chart adjustable actions, chronological calendar labels, decorative icon exclusion, fixed-geometry exceptions, wrap-aware controls and Reduce Motion animation configuration remain.
- The normal theme text/secondary/error/accent-text pairs were checked against background/panel/raised/control surfaces: the lowest computed ratio was 6.32 in Dark and 5.40 in Light; primary text ratios were 6.19 and 6.01. This checks those tokens only. Dynamic habit colors, opacity effects, all chart marks and actual native large-text layout still need review.

Physical VoiceOver/TalkBack focus, rotor actions, keyboard behavior, text scaling, contrast under real rendering, dense calendar targets and native modal sequencing remain acceptance work. No store accessibility claim has been made. [React Native accessibility reference](https://reactnative.dev/docs/accessibility).

## Data-flow and dependency audit

App source has no direct `fetch`, `XMLHttpRequest` or console logging calls and no connected ad, usage-event or crash-reporting SDK. Analytics here means local habit calculations. The Pro adapter is still the Free preview, iCloud/accounts remain unconnected, and notifications use local jobs without obtaining a remote push token. This source inspection does not certify all transitive native/runtime behavior. Expo Go is a separate host and must not be represented as the release binary.

Current installed manifest inspection found twelve `PrivacyInfo.xcprivacy` files. All list empty collected-data arrays; all explicitly set tracking false except AsyncStorage, which omits that key. They declare these required-reason categories:

| Installed source | Declared category/reason codes |
|---|---|
| AsyncStorage; Expo Application | FileTimestamp `C617.1` |
| Expo Constants; Expo Notifications | UserDefaults `CA92.1` |
| Expo FileSystem | FileTimestamp `0A2A.1`, `3B52.1`; DiskSpace `E174.1`, `85F4.1` |
| React Native React resources | FileTimestamp `C617.1`; UserDefaults `CA92.1` |
| React Native cxxreact, RCT-Folly, glog | FileTimestamp `C617.1` |
| React Native timing | SystemBootTime `35F9.1` |
| React Native boost | FileTimestamp `C617.1`; SystemBootTime `35F9.1` |
| React Native ViewShot | No required-reason categories |

These are observed dependency declarations, not reasons selected or approved for a final assembled app. No speculative privacy-manifest values were added to app config. Inspect the signed archive, linked SDK list, aggregated manifest and required-reason use cases in L14/L18, then re-audit after L17 cloud and L19 billing. A module without a standalone manifest is not automatically defective; verify actual API usage and applicable SDK requirements. [Expo manifest configuration](https://docs.expo.dev/guides/apple-privacy/), [Apple SDK requirements](https://developer.apple.com/support/third-party-SDK-requirements/).

App Store privacy answers remain a draft: local-only processing is distinct from off-device collection; support correspondence, user-selected destinations, final platform services and third-party behavior must be evaluated against the final release. Do not submit a blanket “Data Not Collected” answer from the JS source audit. [Apple data-disclosure guidance](https://developer.apple.com/app-store/app-privacy-details/).

## Local checks and remaining gates

`check:privacy` exercises iOS inactive/background/return, Android blur/focus/stale state, unknown startup, covered accessibility/pointer content, preserved drafts, native-modal coverage, support URI encoding and duplicate/error handling, translated policy content and accessible calendar editing. It also flags new direct network/diagnostic calls for review. Existing first-use checks cover the real Settings privacy/support routes and shared back/swipe navigation. No real email is sent and no private history is used.

All seventeen local checks pass (TypeScript with unused-local checking and sixteen regression scripts). Translation coverage is 762 messages across twelve languages. The installed Expo preset transforms 95 sources for both iOS and Android. `git diff --check` passes. Native APIs/storage and support handoff are mocked in handler tests; these checks do not verify native snapshot timing, email delivery, publishing or physical accessibility.

Complete before L10 sign-off:

1. Host the reviewed pages on an approved destination and connect real public URLs in store metadata. Confirm identity/operator and support handling.
2. Validate a signed app's snapshot timing with Home, Add/Edit notes, Settings, charts and share/backup previews open. Test rapid transitions, a busy JS thread, the keyboard and system sheets; implement native protection where needed.
3. Complete the native SDK/manifest/reason audit and App Store disclosure answers against the actual archive, and repeat after cloud/purchases.
4. Run physical accessibility acceptance across themes, supported devices, long translations and larger text; record actual evidence before store claims.

No dependencies, global tools, servers, simulators, native builds, accounts, cloud services or publication were added or started by this step.
