# UI sizing and spacing

Applied 8 November 2026. Use the shared values in `apps/mobile/src/components/design-tokens.ts` for new or edited app controls. Preserve the existing Light/Dark palettes and the user's established home/calendar layouts.

## Size by role

| Role | Size / treatment |
|---|---|
| Minimum standalone target | 44 × 44 points; visible content can be smaller |
| Compact habit selector | 44-point minimum height, 30-point icon, 13-point label, 6-point padding, 8-point content gap; width capped at 196 |
| Standard control | 48-point minimum height |
| Primary action / full text field | 56-point minimum height; primary actions have a 28-point corner radius |
| Settings row | 56-point minimum; 64 when the content needs more room |
| Existing round navigation | Preserve 46-point targets and 42-point compact circles; these are optical exceptions to the spacing scale |
| Secondary control radius | 16 points; 12 inside segmented controls |
| Panel radius | 24 points |

Sizes are minimums rather than fixed heights for text-bearing controls. Text can scale and wrap. Do not shrink the entire view with a transform: that reduces legibility without reliably fixing layout or touch geometry. Pure icon-only controls can retain fixed equal width/height. Labels are normally 14–16 points, primary actions 17 and captions 12; compact habit names use 13. Dense chart annotations and metadata may retain their existing 11-point sizes. Artwork, mini calendars, graph axes and the small PRO mark use their own optical typography.

## Spacing rhythm

Use 8/16/24/32 points for related controls, inner padding, section breaks and large separations. Use 4/12 where intermediate spacing is needed. Two- and six-point values are reserved for optical/dense details, including the compact chip padding and existing bottom switcher.

- Standard page inset: 16 points plus safe-area insets when needed.
- Related controls: 8 points. Row content: 12. Panel padding: 16. Independent sections: 24.
- Standard content width: at most 600 points, centred on iPad. Forms/share controls use 560 and collection previews use 440. A sticky footer uses the same inset and width as its associated content.
- Use wrapping layouts for long labels and narrow containers. Full accessible names remain available when a compact habit label is visually truncated.
- Segmented selectors share a track with 4-point inner padding and 44-point minimum targets. Dense weekday/number options wrap and centre rather than shrinking below the touch minimum or stretching a final choice across a whole row.

## Analytics habit selectors

The requested 75% reduction is applied by component, with optical rounding: the icon changes from 40 to 30, label from 17 to 13, minimum height from 58 to 44 and width cap from 260 to 196. Normal names use a single line, long names truncate at the end, and the accessible button retains the full habit name. The row has 8-point gaps and stays horizontally scrollable for five or more habits. Larger text can increase button height.

The collection's habit picker uses the same compact role. This does not apply a global 25% reduction to every app button.

## Dense choices and quantitative marks

`HabitColorPalette` is shared by Add/Edit and Share. `choiceGrid` calculates columns from the measured container. Targets remain at least 44 points, swatches stop growing at 56 and the seven-column palette has a maximum width. Narrow screens use more rows. Selection, busy/disabled states, colour names and haptics remain connected.

Do not apply generic target sizing to quantitative geometry such as history cells, calendar columns, checklist squares, progress rings or wallpaper artwork. Keep their equal/aspect-ratio dimensions and their containing target where applicable. In particular, the tablet checklist retains its explicit 28 × 28 rounded squares and separate row touch area. Native switches retain platform sizing. The colour grid and dense date grids are distinct layout roles.

## Coverage

Shared controls, headers and bottom drawers; Home filters/navigation/cards; habit details and calendar controls; Add/Edit; icon/emoji selection; Settings and its submenus; reminders and entry drawers; onboarding; Pro; Analytics; sharing; and wallpaper/collection controls use these roles. The gallery's width calculations and visible gaps are updated together. Exported artwork and tracking/reward rules are not changed by this pass.

## Verification and remaining device review

- TypeScript and the existing local regression scripts remain the baseline.
- Analytics handler checks cover five habits, a long name, full accessible labels, compact geometry, dynamic height and selecting the final habit.
- Entry/form checks cover the shared palette's selection and disabled states, all 21 colours, and fitting 180/248/288/320/361/416/600-point containers without undersized targets or excessive tablet growth.
- Source transforms check iOS and Android using the installed Expo preset.

Mocked checks cannot certify native rendering. On iPhone and iPad, inspect both themes, landscape, large text and longer translations. Confirm weekday wrapping, palette rows, five-habit scrolling, footer/content alignment, keyboard clearance, header/menu spacing and touch selection. Check that calendar/checklist squares, swipe navigation, menu dismissal and exported images remain correct. Record that evidence under L15/L19. No packages, servers, simulators or native builds are required or started for the local pass.
