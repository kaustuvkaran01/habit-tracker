# L01 release scope and Free/Pro proposal

Updated 8 November 2026. Status is in progress.

## Confirmed direction

- Use HabitKit's Free plus one Pro model as the basis for our offering.
- Include wallpapers and charts with analytics in Pro.
- Include optional cross-device iCloud sync in the planned Apple Pro experience, with backup/export available in Free. Its dedicated implementation milestone is L17. The later Android/shared-platform approach remains a separate decision.
- Make Apple purchases the final milestone, L19, with production structure review/refinement before integration and another review after integration inside L19.
- Preserve the previously requested archive policy, with 30 days of recovery for Free and no expiry while Pro is active.
- Continue with iOS first. Android has its own later release gate.

HabitKit currently offers four active habits free, unlimited habits with Pro, and Monthly, Annual and Lifetime purchase options with the same Pro capabilities. Its paid features include widgets, charts, extra reminders and display controls. Its current help page lists export/import as free and says it has no automatic cross-device sync. Prices vary by store and region. [HabitKit Free/Pro comparison](https://habitkit.app/help/billing-and-premium/what-habitkit-pro-unlocks), [HabitKit press facts](https://habitkit.app/press).

## Confirmed feature matrix

Confirmed by the user on 8 November 2026: four active habits Free, the feature split below, and a fresh 30-day recovery window for protected archives after Pro ends. L05 implements the policy locally; purchases remain in L19.

| Capability | Free | Pro |
|---|---|---|
| Active habits | Four | Unlimited |
| Build/Quit and Yes/No, Count, Measure | Included | Included |
| All three current home views | Included | Included |
| Calendar history, corrections, notes and categories | Included | Included |
| Colours, emoji, Light/Dark/System and haptic controls | Included | Included |
| Habit reminders | One per habit | Up to three per habit |
| Daily review reminder | Included | Included |
| Small single-habit home-screen widget | Upgrade required | Included when shipped |
| Current streak and basic completion totals | Included | Included |
| Charts, trends, weekday patterns and recovery insights | Upgrade required | Included |
| Streak-earned wallpapers | Earned milestone records, previews, progress and celebrations | Export when the milestone is achieved |
| 90-day badges and achievement celebrations | Included | Included |
| Share habit images and earned badges | Included | Included |
| File backup, restore and export of personal data | Included | Included |
| Restore archived habits | Within 30-day window, subject to active-habit allowance | No expiry while Pro is active |
| Extra home display controls | Standard layouts | Choose labels, categories, goal/streak display and compact-list day count |
| Cross-device iCloud sync | Backup/export and restore | Optional automatic Apple-device sync, planned in L17 |

The display controls cover customization beyond today's standard layouts. They do not gate the existing three views or appearance choices.

## Reward and subscription behaviour

- Keep earned badges and milestone celebrations available in Free.
- Require both the qualifying streak and Pro for premium wallpaper export. Make that condition visible in the gallery before a free user starts working toward a wallpaper.
- Keep earned milestone history across upgrades, cancellation and new cycles. An upgrade can unlock wallpaper exports for milestones already achieved.
- Previously exported wallpaper files remain on the user's device. Document any limits on future exports after Pro expires.
- Keep existing active-habit history readable and eligible for export after Pro expiry. If more than four habits remain active, let the user choose four to log. Preserve the remaining habits and their history; do not archive or delete them automatically. The existing archive expiry policy applies only to habits the user has archived.
- Suspend destructive archive expiry while purchase status is loading or unverifiable. On the first verified Free state following paid protection, begin a fresh 30-calendar-day recovery window and show it in Archived Habits. Reopening the app does not restart it.

## Confirmed streak and reward rule

Confirmed and implemented on 8 November 2026. A streak measures inclusive calendar days between the first and latest completed scheduled dates in an unbroken run. Every scheduled opportunity between those dates must have completed under its historical rules. Unscheduled rest days do not break the run and are added only when the next scheduled completion confirms them.

For a Monday/Friday habit:

| Latest result | Confirmed streak |
|---|---|
| First Monday completed | 1 day |
| Friday completed | 5 days |
| Following weekend, with no new completion | Still 5 days |
| Next Monday completed | 8 days |
| Friday missed, then next Monday completed | New 1-day streak |

An unfinished scheduled today preserves the last confirmed span until the day closes. Explicit failure today resets the current streak immediately. Partial Build progress, above-limit Quit values and unlogged closed scheduled days break the run; Quit success requires an explicit report, including zero where applicable. Schedule edits use dated rules and do not create earlier obligations.

Wallpaper thresholds and the 90-day badge use this confirmed calendar span too. If a threshold falls on a rest day, the qualifying next completion earns it; its actual completion date is the award date. Existing earned wallpapers and patches remain permanent. A new reward cycle starts a new span at its first eligible completion; the lifetime streak continues independently. Home/detail/share/analytics show the lifetime streak, while the collection ring shows the current reward cycle. Completion-rate denominators still count scheduled opportunities, not rest days.

Existing histories are recalculated using the shared rule. Previously earned records are preserved, and newly qualifying historical milestones can be recorded at their original confirming completion date. No data schema change is required.

Local evidence: `check:streaks`, including the exact Monday/Friday/Monday example, missing and failed days, partial and zero values, dated schedules, period clipping, reward crossing/cycles, storage round-trips, leap years and DST in UTC, Asia/Kolkata, America/New_York and Europe/Berlin. Physical-device display acceptance remains part of L15/L19.

## Purchase options

Use Monthly, Annual and Lifetime as the working purchase structure, with one Pro feature set. Exact storefront prices, launch offers and the annual discount remain undecided. The existing app prices are placeholders.

Before selling Lifetime, settle the ongoing iCloud sync service promise and cost assumptions. L17 plans the CloudKit private-database route, and L19 must finalize these terms before purchases are offered.

## Remaining L01 decisions

- [x] Confirm the detailed matrix, including four free active habits, Pro widgets, one/three reminder limits, customization and Free badges (user confirmed 8 November 2026).
- [ ] Choose whether the small iOS widget ships in version 1.0.
- [x] Add a dedicated Pro iCloud sync milestone for Apple devices, using the device's iCloud account as the proposed identity.
- [x] Put Apple purchases last, with production structure reviews before and after integration.
- [ ] Validate L17's CloudKit/native-adapter approach and supported OS baseline. Record any resulting release-scope change and the later Android/shared-platform decision.
- [ ] Confirm iPhone/iPad support, initial language, storefronts and the supported OS baseline.
- [x] Count inclusive calendar days across consecutive scheduled completions. Credit intervening rest days only at the next completion; use the same rule for wallpaper and badge milestones.
- [x] Confirm the entitlement-expiry policy and fresh 30-day archive recovery window (8 November 2026).
- [ ] Set Monthly/Annual/Lifetime prices.

The planned Apple experience includes local tracking and optional Pro iCloud sync. The small widget and full iPhone/iPad support remain in the proposed release matrix. Record any scope changes explicitly after technical validation.

L01 remains open until the remaining decisions are recorded. Capability enforcement is implemented locally in [L05](L05-FREE-PRO.md); physical-device and verified-purchase acceptance remain open. [iCloud sync](ICLOUD-SYNC-PLAN.md) belongs to L17, and Apple purchases plus the post-integration review belong to the final L19 milestone in the [launch checklist](LAUNCH-CHECKLIST.md).
