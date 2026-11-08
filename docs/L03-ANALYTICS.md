# L03 analytics implementation

Updated 8 November 2026. The initial analytics screen was implemented on 7 November, then simplified after the user's review and interactive Balanced-design prototypes. Local checks pass. L02 device acceptance and L03 rendering/accessibility acceptance remain open; this is not a production release sign-off.

## Delivered design

The home Charts button opens the existing themed bottom sheet. Select one active or archived habit and a rolling 7, 30, 90 or 365 calendar-day window. The Balanced layout has one completion summary, current/best streak figures and one interactive line graph. Weekday counts and additional activity information start collapsed under More details. The former standalone recovery, observation and supporting-day sections are deferred from this screen at the user's request; their read-only domain calculations remain tested but are not displayed.

The screen uses the app's actual Light/Dark backgrounds, typography colours, rounded surfaces and lavender controls. Blue in Light and green in Dark are limited to quantitative plot marks. A lavender point and exact date/value detail identify the inspected day. This revision does not change the global app themes or the Home layout.

Smooth/straight changes interpolation only. Smooth is initially enabled and remains a local screen preference. Both modes use the same saved observations; monotone cubic curves cannot invent peaks or negative amounts between neighbours. A subtle gradient sits under each uninterrupted segment. Missing values, different units and unscheduled numeric dates break the line. Historical goals/limits use a dashed step line and are never smoothed.

Tap or drag horizontally to inspect a date. Previous/next controls and a screen-reader adjustable action provide alternatives, including for a full year of closely spaced points. The plot takes its width from layout and uses window-relative coordinates for modal/iPad offsets. Horizontal drags claim the chart after a movement threshold; vertical scrolling remains available. Axis text and chart geometry respond to larger font settings.

The 8 November sizing pass reduces Analytics habit selectors to approximately 75% of their previous dimensions: 30-point icons, 13-point names, 44-point minimum targets and a 196-point width cap. Five-habit selection and long-name accessibility are locally checked. Shared spacing/control roles now follow the [UI design system](DESIGN-SYSTEM.md); device layout acceptance remains open.

## Formal data and metric contract

| Information | Source / interpretation |
|---|---|
| Habit date | Local date key, using calendar arithmetic rather than elapsed 24-hour blocks |
| Eligible history | Known creation date; otherwise the first saved check-in, entry or note |
| Scheduled opportunity | Schedule captured for that date, or the applicable effective-date configuration |
| Result | Completed, partial, explicitly failed, unlogged, unscheduled or future |
| Numeric activity | Explicit recorded amount, including zero; legacy completed amounts remain unknown |
| Applicable goal | Historical tracking kind, target/limit, exact unit and Build/Quit direction |
| Completion headline | Completed / elapsed scheduled days in the selected period, through yesterday |
| Current streak | Inclusive calendar span across consecutive scheduled completions; rest days are credited at the next completion, unfinished today preserves the confirmed span, explicit failure today resets it |
| Best streak | Best confirmed calendar span clipped to the selected period; can include completed today |
| Yes/No graph | Rolling seven-calendar-day completion percentage, ending at each plotted date; scheduled days only |
| Count/Measure graph | Actual recorded daily amount in one compatible kind/unit/direction group |
| Weekday detail | Completed / elapsed scheduled days for each weekday; today excluded |

A consistency point can use the six calendar days before the selected period. Its detail shows the window dates and completed/scheduled count. The window is clipped to known history; a window without scheduled days has no point. Today is excluded from the consistency curve even if reported. Selecting today shows its actual result with an In progress label. Numeric plots and activity totals include today's reported amount and identify it as in progress.

Build amounts below target are partial; at/above target is complete. Quit amounts at/below limit are complete; above limit is failed. No report is unlogged, never a successful zero. Unlogged elapsed days reduce recorded completion rate without claiming the activity definitely did not happen.

Numeric series preserve every calendar date on the x axis. Different tracking kinds, exact units and Build/Quit directions remain separate. The normal case has one graph without extra series controls. When the selected window contains different kinds or units, a series selector exposes each numeric group and the shared consistency view. Selecting a date governed by a different group explains the changed rules rather than labelling it an unknown legacy amount.

Every day uses `dayProgress`: its record's captured rules first, then effective-date revisions. Corrections update derived results; edits do not reinterpret older records. Numeric goals remain visible for eligible days without reported amounts. Explicit zeros are points at the baseline; legacy completions never become invented numeric amounts. Selected amounts/goals retain decimal precision with an Intl fallback, while axis labels are abbreviated/rounded for readability. Group totals include partial and failed activity; a group with no known amounts displays a dash and reports unknown older amounts separately under More details.

For a Monday/Friday habit, Monday → Friday → next Monday is an 8-day streak. On the intervening weekend it remains 5 until Monday completes. A missed scheduled date breaks the run. The best-in-period calculation clips a confirmed run at the selected period boundary, including confirmed intervening rest dates. Completion rates, rolling consistency and weekday denominators remain based on scheduled opportunities. Reward milestones follow the same confirmed calendar span; see [L01](L01-RELEASE-SCOPE.md).

## Boundaries and limitations

Analytics is a pure, local derivation. Opening or inspecting it does not write entries, reveal achievements, change rewards or call a service. This revision adds no dependencies, storage schema, background work or persisted preferences. Pro enforcement remains L05; verified purchases remain L19.

Existing data does not retain archive/restore interval history. A currently archived habit is capped at its archive date, but an earlier pause in a restored habit cannot reliably be excluded. Legacy schedules before migration cannot be reconstructed. The implementation does not invent pause dates, earlier schedules, amounts or occurrence times.

## Local verification

- `npm run typecheck -- --noUnusedLocals`.
- `npm run check:streaks`: shared calendar-day counting, rest-day confirmation, failures, schedule history, cross-screen/share values and reward-cycle boundaries.
- `npm run check:analytics`: immutable historical calculations; creation/schedule/today denominators; zero/partial/failed/legacy records; dated targets and units; streak clipping; rolling windows including pre-period context; no-history states; calendar spacing and mixed-unit gaps; exact line endpoints; sampled monotone cubic bounds with uneven spacing; step targets; habit/range/series choices; smooth/straight state; expanded details; selection bounds; theme plot colours; larger text; chart measurement; tap/horizontal/vertical gesture arbitration; accessibility actions. The suite also preserves regression coverage for the deferred domain calculations.
- Analytics checks run in UTC, Asia/Kolkata and America/New_York, including a leap-year window.
- `check:tracking`, `check:entry-ui`, `check:actions`, `check:rewards`, `check:feedback` and `check:i18n`. Catalog coverage includes 632 messages across twelve languages.
- iOS and Android source transforms using the installed Expo preset. No server or native build is started.

UI checks use mocked native components. They validate handlers, geometry and state, not physical rendering, actual native gesture negotiation or VoiceOver output.

## Remaining acceptance

- On iPhone and iPad, inspect both themes, portrait/landscape, narrow layouts, long names and the largest text settings. Confirm axes, amounts, target lines and controls fit.
- Verify tap/drag inspection, vertical scrolling, bottom-sheet dismissal and previous/next date controls. Check full-year responsiveness with substantial history and changed units. Confirm modal/tablet offsets select the intended date.
- With VoiceOver, verify the heading, habit/range choices, Smooth switch, adjustable graph, selected result/amount/target, More details and close action. Confirm status symbols and the dashed goal communicate meaning without colour.
- Correct old amounts, schedules and targets; reopen Charts and reconcile the result with the calendar, including zero-limit Quit, legacy data, archives, unknown amounts and unfinished today.
- Finish L02 migration/lifecycle acceptance and record device/build evidence before closing L03's accessibility item.

The next feature milestone remains L04 achievement animations and their reusable trigger system. It is outside this revision.
