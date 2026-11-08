# Habit tracker MVP: build habits and break unwanted ones

Planning date: 4 November 2026. This is a proposed scope, not a validated demand or revenue forecast.

Revision: React Native/Expo for iOS and Android, with iOS released first and Android next from the same codebase. A full Mac app is deferred. Keep one small single-habit widget, shared account-based sync, and HabitKit-style Free/Pro packaging. Exact provider, prices and deployment minimums remain subject to implementation validation.

## Product direction

**Promise:** Build better habits. Break unwanted ones. See your progress across your phones.

Build a general habit tracker with an optional quit mode. The first audience to test is people who currently split their routine tracking and unwanted-behaviour tracking between separate apps. Porn avoidance can be one private, user-selected use case alongside scrolling or other unwanted habits. It should not determine every user's onboarding or visual language.

The daily loop is: choose a goal → check in from the app or widget → see progress → use a short urge-support flow when needed → review the week. A lapse updates the record and starts a new interval; earlier progress stays visible.

The differentiating hypothesis is the combination of visual habit tracking, meaningful quit-mode statistics, useful widgets, and shared iOS/Android sync. Preference and willingness to pay still need testing.

## What the references establish

| Reference | Useful inspiration | Scope decision |
|---|---|---|
| HabitKit | Visual grids; daily logging; current/best streaks; completion totals; monthly and time-of-day charts; habit/year filters | Use these familiar metric categories in an original screen and independently specified calculations. |
| MDF | Quit streaks, personal stats, daily journal, panic button, breathing, commitments and triggers | Include quit tracking, a short note, personal motivation, optional trigger tags, and a small support flow. |
| QUITTR | Progress dashboard, panic button, plans, milestones and support during urges | Include a lightweight support flow and fixed milestones. Defer community, AI, content blocking and a full course. |

HabitKit already supports quit habits. Its current help page says automatic device sync and individual quit-habit charts are not provided. This supports testing those features as differentiators against HabitKit; it does not establish that other competitors lack them. [HabitKit feature comparison](https://habitkit.app/help/billing-and-premium/what-habitkit-pro-unlocks), [HabitKit statistics changelog](https://habitkit.app/changelog).

MDF's developer listing explicitly describes journaling, personal statistics, streaks, a panic button and breathing. [MDF on Google Play](https://play.google.com/store/apps/details?id=manevolves.mdf). QUITTR's site describes its dashboard, progress tracking, panic button, community, AI companion and blocker; these are advertised capabilities, not independently tested outcomes. [QUITTR](https://quittrapp.com/).

MDF availability check: the old US iOS listing at app ID 1487641342 returned 404 to the research tool; the India request was rate-limited. Its Android listing was accessible. This does not establish removal from every iOS storefront or explain why it is unavailable. Treat an iOS replacement opportunity as a hypothesis rather than the sole acquisition strategy. [Old US listing checked](https://apps.apple.com/us/app/mdf-quit-porn-addiction/id1487641342).

## Launch features — P0

| Area | Required behaviour | Scope boundary |
|---|---|---|
| Onboarding | Choose build, quit, or both; create the first habit; complete a first check-in; offer widget setup after showing value | No required app account; ask for notification permission when a reminder is configured |
| Habit creation | Name, icon, colour, optional reason, start date and schedule; reorder, edit, archive and delete | Build habits: daily or selected weekdays. Quit habits: daily. Weekly quotas and reduction targets follow later |
| Build mode | Yes/no or simple count target, such as one workout or three reading sessions; one-tap logging, undo and past-day correction | No dedicated duration timer, measurement-unit engine or automatic health imports |
| Quit mode | User-supplied start/last-lapse timestamp; elapsed time; daily check-in; lapse logging and correction; current/best confirmed run; milestones | Abstinence mode first. Record a lapse with confirmation and optional context; preserve history |
| Today | Build and quit cards, compact recent history, visible daily status, quick actions and an always-accessible “Need a reset?” action | One main dashboard; additional dashboard layouts are unnecessary for launch |
| Urge support | Optional intensity and trigger; 60–120 second pause/breathing timer; personal reason; one chosen replacement action; optional outcome check | Works offline. One small flow, without an AI chat or large lesson library |
| Replacement action | Let a quit goal link to one build habit or a simple action, such as “walk for two minutes” | Choosing the action does not automatically mark it completed |
| Notes and milestones | One short daily note per habit; fixed 1, 3, 7, 14, 30, 60 and 90-day milestones for quit mode | No standalone journal product, public badges, ranks or custom reward economy |
| Statistics | Shared visual structure, build-specific and quit-specific metrics; clear date filters and chart legends | No opaque combined “life score” |
| Reminders | One reminder per habit plus optional daily review; selected-day scheduling; completed build habits stop reminding; generic private wording | Device-specific reminder settings; one designated reminder device by default |
| Widgets | One small widget design, with any one active habit chosen per instance | Equivalent compact scope for iOS and Android; multi-habit, larger and Lock Screen widgets deferred |
| iOS and Android | Shared React Native app with full core logging, editing, history, stats and urge support; platform-specific permissions/widgets | iOS beta/release first; Android next after its platform checks pass; full Mac app later |
| Data continuity | Offline operation; optional account-based sync through a cross-platform backend; visible sync state; portable export and restore; delete data | No account required for local use; account required for sync; sync and backup remain separate functions |
| Privacy and accessibility | Optional Face ID/Touch ID/device authentication; private notification/widget labels; accessible text, VoiceOver, dark mode and non-colour status cues | Habit names, notes and trigger values stay out of telemetry |
| Paid upgrade | Usable free allowance, a clear Pro upgrade and store purchase restoration and linked-account Pro access across mobile platforms | Defer complex offers and multiple overlapping plans |

## Screens

1. **Onboarding and habit setup:** short build/quit choice and a few relevant templates.
2. **Today:** daily actions and small progress grids. Use appropriate navigation, safe areas and permission flows on each mobile platform.
3. **Habit detail:** full history, current status, goal settings, notes and corrections.
4. **Statistics:** common structure with metrics appropriate to the selected habit type.
5. **Urge support:** short, focused overlay reachable from either platform.
6. **Settings:** reminders, widget guidance, privacy, sync, export/restore and Pro.

The habit editor and lapse confirmation are small sheets rather than additional primary destinations.

## Statistics specification

HabitKit's published categories are the reference for the structure, not a requirement to duplicate its exact formula or interface. The following are proposed calculations for this product.

### Common presentation

- A habit picker and 7-day, 30-day, year and all-time filters. The yearly heatmap has its own selected year.
- A full-year grid, current/best streak cards and monthly breakdown.
- Separate visuals for achieved, partial, lapsed/not achieved, unlogged, unscheduled and future days. Include labels or patterns as well as colour.
- Overall views keep build and quit summaries separate; individual-habit detail is the main analysis surface.
- An empty state with sample explanations, without fabricated personal history.

### Build habits

- **Completed days:** scheduled days on which the target was met.
- **Logged actions:** actual count increments, including partial days; label separately from completed days.
- **Completion rate:** completed scheduled days / elapsed scheduled days in the selected window. Exclude today from this historical rate and show today's progress separately. An unlogged closed scheduled day is not completed.
- **Current and best streak:** inclusive calendar days spanned by consecutive achieved scheduled dates. Rest days are added at the next scheduled completion. Unscheduled dates do not break the run; a missed scheduled day does. Today's unfinished goal has until day-end.
- **Monthly bars:** completed scheduled days, with the month's denominator available.
- **Time-of-day distribution:** occurrence time of logged actions, separated into morning, afternoon, evening and night. Exclude backdated entries without a supplied occurrence time; do not substitute the time the correction was entered.

Example: a Monday/Friday habit completed on Monday, Friday and the next Monday has an 8-day streak. On the weekend before that final Monday it remains 5 days, awaiting the next completion. Missing a scheduled Friday breaks the run when Friday closes.

### Quit habits

- **Elapsed time:** time since the user-reported start or latest lapse. Label this as reported history; it is distinct from a confirmed daily streak.
- **Confirmed current/best run:** consecutive closed days explicitly marked successful. An unlogged day interrupts the confirmed run without implying a lapse.
- **Successful days / logged days:** successful closed days divided by closed days with either a success or lapse record.
- **Check-in coverage:** logged closed days / elapsed days since tracking began, shown beside the success rate. An unlogged day is never silently counted as successful.
- **Lapse days and events:** distinguish days containing a lapse from the total number of reported lapse events.
- **Monthly view:** successful, lapse and unlogged days together.
- **Triggers and urges:** simple counts and time-of-day distribution for entries the user supplied. Describe these as observed logs rather than predictions.

Example: over 30 closed days, 18 successful days, 2 lapse days and 10 unlogged days produce **90% success across logged days, with 67% coverage**. Display both figures; a standalone 90% would hide the missing history.

Today's quit check-in can say “on track.” A later lapse overrides that day's successful status. Historical daily rates exclude the current open day. A backdated start timestamp does not fill previous days as confirmed successes.

### Shared history rules

- Preserve the schedule/target effective for each historical date; edits apply forward by default.
- Store an occurrence timestamp and its calendar context separately from entry/edit time. A stable tracking timezone keeps travel from reassigning past days; a timezone change takes effect prospectively.
- Corrections, undo, restore and sync must recompute every affected summary and widget.
- Archive hides a habit from Today and reminders while preserving history. Permanent deletion is explicit.
- Define cross-device duplicates and conflicts before implementing sync. A tap delivered twice must not become two completions; intentional count increments on different devices must survive merging.

## Widgets

Widgets are part of the core promise. Ship one small, single-habit widget design. Each instance can display any one active habit selected by the user. Multiple instances can reuse this design with different selected habits. Expo Widgets currently supports iOS and Android home-screen widgets with platform-specific UI components and isolated widget runtimes. Prototype our selected-habit, closed-app and offline-action requirements before committing; use narrow native adapters if necessary. [Expo Widgets](https://docs.expo.dev/versions/latest/sdk/widgets/).

| Widget | iOS | Android | Behaviour |
|---|---|---|---|
| Single habit, small | Home Screen, system-small | Home Screen, compact launcher-compatible sizing | Name/icon or private alias; compact grid; build progress or quit interval; one relevant action |

Widget requirements:

- Choose any one active habit per instance, respect system appearance, show meaningful empty states and provide setup guidance.
- Keep the layout compact: habit identity, a recent grid, current status and a single action. The full milestone/history view opens in the app.
- Direct logging for ordinary build habits, with correction available in the app. A lapse/reset always opens an authenticated confirmation flow.
- Sensitive habit names and values are hidden unless the user explicitly enables them. A privacy-restricted widget opens the locked app instead of allowing direct mutation.
- Refresh after local actions, sync, edits and day rollover. Show pending/stale state when necessary. Avoid promising instantaneous cross-device updates or per-second widget refreshes.
- All widgets and app screens use the same progress calculation rules.

## Platform and data approach

Recommended starting point: React Native/Expo development builds, a pure TypeScript habit engine, local SQLite storage, small platform-specific widgets and one optional account-based backend shared by iOS/Android. A full Mac app is a later companion. Select deployment minimums from supported Expo/native dependencies during setup; the iOS 17 interactivity requirement alone does not determine the minimum supported OS.

Start with real mobile development builds: enable sync on iOS → check a habit from the small widget → view/edit it on Android using the same account → go offline on both → reconnect → verify the resulting history. Verify small-widget selection and durable closed-app actions on both platforms before polishing the rest of the app. This is the main platform risk and should be tested before polishing all screens.

Proposed sync requirements:

- Local tracking works without an account or internet connection. Ask for sign-in only when enabling sync; preserve and merge existing local history.
- Use one platform-neutral user identity. Offer an email-based sign-in method on all platforms; Apple sign-in can be a convenience linked to the same account. Verify that login, linking and recovery work on both iOS and Android.
- Keep local history durable. Widget actions write locally first, update a shared widget snapshot and queue changes for upload. A pending upload must not prevent a check-in.
- Synchronise habits, logs, schedule history, notes and user edits. Keep notification and widget placement preferences device-specific.
- Use stable IDs, explicit log events, schedule history, deletion markers and a versioned portable export format. Design how undo and conflicting edits merge; avoid uploading a whole overwritten calendar as the sync unit.
- Sync purchase access separately from habit data: validate store purchases server-side and attach the resulting entitlement to the account. A signed-in subscriber should not need a second Pro purchase when moving to another supported platform. Define expiry/refund behaviour before release.
- Keep export/restore independent of live sync. Account deletion must cover cloud data and explain what remains on offline devices until they reconnect.

**Provider candidate:** prototype Firebase Authentication plus Cloud Firestore first. Firestore documents offline read/write support and resynchronisation on Apple and Android; writes to the same document use last-write-wins, so that behaviour alone is insufficient to preserve every independent habit action. Use native React Native Firebase modules in development builds; mobile authentication and widget/local-store integration are part of the prototype, not assumed solved. [Firestore offline behaviour](https://firebase.google.com/docs/firestore/manage-data/enable-offline), [Firebase Apple platform support](https://firebase.google.com/docs/ios/learn-more).

Supabase with a dedicated offline sync layer is an alternative if the prototype reveals a material limitation. It introduces another component: Supabase's own integration catalogue describes PowerSync as a separate Postgres-to-SQLite sync layer. Do not assume realtime updates alone provide durable offline conflict handling. [Supabase PowerSync integration](https://supabase.com/partners/integrations/powersync).

Select the provider after testing offline merges, mobile sign-in, access isolation and expected usage costs. Both mobile releases use the same account and sync contract. Avoid maintaining an iCloud sync system and a separate Android cloud system.

Do not advertise end-to-end encryption, instant sync or universal device support unless the delivered implementation establishes those properties.

## ASO work included in the MVP launch

ASO research can begin alongside the prototype. Final screenshots and promises must match the shipped build. No keyword volume, difficulty or rank has been measured in this plan.

### Positioning and keyword research

Test three intent groups separately:

| Intent | Candidate queries to research | Product proof |
|---|---|---|
| Build routines | habit tracker, daily routine, habit streak | Fast check-in and visual history |
| Use widgets across mobile platforms | habit tracker widget, habit sync | Actual iOS/Android widget and shared-record demonstrations |
| Break unwanted habits | quit habits, stop scrolling, porn habit tracker | Private quit mode, useful quit statistics and support flow |

The final group is a candidate niche to investigate, not a recommendation to cram all phrases into metadata. Compare search results, review language, competition and available demand estimates before selecting terms. Start with English in the US and India as a working assumption; localise further when observed acquisition supports it.

### Store assets and metadata

- Choose and check an original brand; draft an app name such as “Brand: Habit Tracker” and a subtitle such as “Build habits. Break bad ones.” Check the final strings against store limits.
- Apple permits up to 30 characters each for name and subtitle. Its product-page guidance describes a 100-character keyword field; keep the English keyword set within that limit and avoid duplicate terms or competitor app names. [Apple product-page guidance](https://developer.apple.com/app-store/product-page/).
- Propose Productivity as the primary category for the broad habit-tracking product; reassess if the shipped product becomes primarily wellness support.
- Produce five or six benefit-led screenshots: build/quit together; check in from a widget; understand progress; get through an urge; continue across mobile devices; privacy controls. Use fictional data and real UI.
- Supply iOS screenshots first and Android-specific Play assets before the Android release. Do not advertise a full Mac app at launch. Prepare an optional short device-capture preview only after the interaction is polished.
- Prepare a clear description, support URL, privacy policy, accurate privacy disclosures, paid-upgrade copy and purchase-restore guidance.
- Use the system rating request after established use, consistently for eligible users; never route only satisfied users to reviews or interrupt a lapse/support flow.

### Launch learning

- Start with the general habit-tracker listing and a quit-focused iPhone custom product page if the niche is represented well in beta.
- Apple's custom product pages can use separate screenshots and promotional text, and can be assigned eligible approved-version keywords for relevant search appearances. They are not independent app listings. [Apple custom product pages](https://developer.apple.com/app-store/custom-product-pages/).
- Measure impressions, page views, downloads, source and upgrade purchases. Review performance by storefront and page where available.
- Test a widget-led versus progress-led first screenshot when there is enough traffic. Apple's product-page optimisation supports testing iOS/iPadOS icons, screenshots and previews; use the appropriate Google Play experiment tools for Android instead of assuming identical store features. [Apple optimisation overview](https://developer.apple.com/help/app-store-connect/create-product-page-optimization-tests/overview-of-product-page-optimization/).
- Make one material change at a time and avoid declaring a winner from a handful of downloads. Metadata is an ongoing iteration, not a completed growth channel.

## Pricing comparison and recommendation

The user's proposed structure is Free → approximately $10/month for a modest feature increase → a slightly more expensive tier with substantially more value. Illustrate the upper price as $12/month for comparison only; that price was not specified or agreed. The intended effect is to make the upper tier an attractive incremental purchase.

HabitKit uses a different structure: Free plus one Pro feature set, offered monthly, annually or as a lifetime purchase. Its official help page says all three paid options unlock the same capabilities. Free includes up to four active habits; Pro includes unlimited habits, widgets, charts, more reminders and customisation. [HabitKit official plan comparison](https://habitkit.app/help/billing-and-premium/what-habitkit-pro-unlocks).

Public-price check on 4 November 2026: the US App Store lists $1.99 monthly, $11.99 annual and $29.99 lifetime among multiple purchase variants. The India listing includes ₹199 monthly, ₹1,199 annual and ₹2,999 lifetime, also alongside other variants. Public listings do not establish which variant a new user is currently shown in the app; region and offer matter. [US listing](https://apps.apple.com/us/app/habit-tracker-habitkit/id6443918070), [India listing](https://apps.apple.com/in/app/habit-tracker-habitkit/id6443918070).

| Consideration | Proposed Free / medium / large | HabitKit-style Free / Pro |
|---|---|---|
| Paid choice | Which feature bundle is worth paying for? | Is Pro useful, and which payment duration suits me? |
| Intended strength | Small price gap can make large attractive to someone already willing to pay | One clear upgrade, with short commitment and subscription-free ownership choices |
| Main MVP concern | The free-to-$10/month step needs substantial value; a modest improvement may fail before the larger plan is considered | Recurring versus lifetime preferences may reduce subscription revenue; lifetime must cover future service costs |
| Delivery implication | More entitlement rules and pressure to add features to justify a high tier | One paid feature set is simpler to build, communicate and support |
| Recommended use | Revisit if a distinct ongoing service earns a separate higher tier | Starting packaging for this product |

At $10/month the medium plan costs $120 for twelve months. Compared with the listed $11.99 HabitKit annual variant, that is approximately ten times the annual outlay. This comparison uses that listed variant, not a claim about the only current checkout price. Richer quit support may attract a different audience, but this MVP has not established that audience's willingness to pay $120/year.

**Recommendation:** use a genuinely useful Free tier and one complete Pro tier. Test monthly and annual subscriptions first because shared cloud sync adds ongoing costs. Offer lifetime only after measuring those costs and deciding exactly what continuing cloud service a lifetime purchase funds. This revises the earlier one-time-first recommendation in light of cross-platform sync.

| Package | Proposed contents | Initial US price hypothesis |
|---|---|---|
| Free | Three active habits of either type; core grids/streaks; the small single-habit widget; local notes, reminders and urge support; privacy, export and restore | $0 |
| Pro | Unlimited habits; full historical charts and quit insights; extra reminder/appearance controls; account-based cross-device sync | $2.99/month or $19.99/year |

These prices and the paid sync boundary are recommendations for a test, not user-approved launch prices or measured optima. Use local storefront pricing rather than mechanically converting US dollars. The small widget layout remains the same across Free and Pro; selecting an active habit is not a premium layout feature.

Make the annual total and renewal period clear wherever shown. Keep existing local history readable/exportable after a subscription ends, and communicate cloud retention and sync behaviour before the user subscribes. When Android launches, Pro access should follow the linked account rather than require an additional purchase.

A price experiment should compare complete offers with comparable acquisition cohorts. Track upgrades per activated install, net receipts after refunds and store fees, renewal/retention, support burden, and sync cost per active account. A larger share choosing the most expensive card does not establish higher overall revenue if fewer people buy anything. Public information does not prove HabitKit's pricing causes its commercial performance or that it will outperform every alternative for this product.

## Explicitly deferred

**First follow-up candidates:** weekly frequency goals, reduction/daily-limit mode, richer units and duration tracking, menu-bar quick logging, shareable progress cards, larger/multi-habit widgets, a Lock Screen shortcut and iPad-specific layout.

**After mobile demand is demonstrated:** evaluate a full Mac companion and native Mac-specific workflows. Android is part of the shared initial mobile implementation and follows the iOS release after its own readiness checks.

**Outside the MVP:** community, clans/battles, leaderboards, accountability messaging, AI coaching, app/site blocking, long recovery courses, meditation audio libraries, wallpaper rewards, Apple Watch, Health integrations, and predictive/medical recovery scores.

## Build order and release gates

1. **Validate the combined workflow:** interview people using a habit tracker, a quit app, or both. Test an original Today/stats prototype with both groups. Determine whether they value a combined mobile app and cross-device continuity; validate desktop demand separately.
2. **Prove storage, widgets and sync:** the end-to-end iOS/Android prototype described above. Keep this as the foundation of the product.
3. **Build the daily loop:** onboarding, the two habit types, logging/correction, reminders, support flow and milestones.
4. **Complete progress views and the small widget:** statistics rules, chart legends, single-habit selection and privacy behaviour. Begin ASO drafts in parallel.
5. **Beta and release preparation:** purchases/restore, export/restore, accessibility, storefront assets and four weeks of observed use from a small mixed cohort. Beta findings can reduce or change the scope.

Release only after:

- A widget check-in appears correctly in the app, statistics and the other mobile platform after sync completes.
- Midnight, daylight-saving transitions, travel, backdating, schedule changes and an unfinished current day produce the documented results.
- Duplicate actions and simultaneous offline edits preserve intended logs without creating phantom completions.
- A fresh install can restore exported data; archive/delete and cloud deletion have clear, tested outcomes.
- An unlogged quit day remains visibly unknown; a lapse preserves previous successful days and notes.
- Private widget/notification settings and app authentication behave as shown to users.
- Notification denial, unavailable cloud service, interrupted purchases and sync errors have understandable recovery paths.
- Local-only use stays usable without sign-in; enabling sync merges the existing record; account recovery and Pro access work on iOS and Android.
- Both actual mobile development builds exchange the same record before the backend choice is finalised.
- Charts and widgets remain usable with large text and accessibility tools.

Track first-habit/first-check-in activation, check-in days in weeks one and four, widget-origin check-ins, voluntary support-flow feedback, sync/data-loss issues, upgrades and refunds. Use coarse opt-in measurement or beta feedback; never send raw habit names, notes or triggers to analytics. Widget use counts as product use even if the app is rarely opened.

The MVP succeeds as a learning release if people repeatedly use the combined workflow, trust the record, and can explain why they prefer it to their current app. Downloads alone do not establish that.
