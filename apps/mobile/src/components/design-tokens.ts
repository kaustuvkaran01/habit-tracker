// One spacing and control-size scale for interactive app UI. Artwork, graphs,
// calendar tiles and optical icon details keep their own geometry.
export const space = { hair: 2, xxs: 4, compact: 6, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 40 } as const;
export const layout = { inset: space.md, section: space.lg, group: space.md, row: space.sm, content: 600, form: 560, preview: 440 } as const;
export const control = {
  touch: 44, regular: 48, primary: 56, row: 56, roomyRow: 64,
  // Preserve the app's established optical size and larger, separate hit area.
  roundTarget: 46, round: 46, roundCompact: 42,
  icon: 20, compactIcon: 16, largeIcon: 24,
} as const;
export const radius = { small: 12, control: 16, card: 24, primary: 28, pill: 999 } as const;
export const typeSize = { caption: 12, compact: 13, label: 14, body: 16, action: 17, title: 21 } as const;
export const habitChip = { height: control.touch, icon: 30, font: typeSize.compact, maxWidth: 196, inset: space.compact, gap: space.xs } as const;

// Distribute dense choices without shrinking targets or stretching swatches
// indefinitely on tablets. Recalculate from the actual available container.
export function choiceGrid(width: number, maxColumns = 7, gap: number = space.xxs) {
  const available = Math.max(control.touch, width);
  const columns = Math.max(1, Math.min(maxColumns, Math.floor((available + gap) / (control.touch + gap))));
  return { columns, size: Math.min(control.primary, (available - (columns - 1) * gap) / columns) };
}
