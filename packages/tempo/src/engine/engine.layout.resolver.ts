import { ownEntries } from '#library/primitive.library.js';
import type * as t from '../tempo.type.js';

export type LayoutEntry = [symbol, string];

/**
 * Pure layout order resolver: returns a new layout order array based on input and swap rules.
 * This function is side-effect free and does not mutate its arguments.
 *
 * @param layout The layout record to order
 * @param monthDayLayouts The DMY/MDY swap pairs
 * @param isMonthDay Whether to apply month-day swap
 * @returns Ordered array of [symbol, string] pairs
 */
export function resolveLayoutOrderPure(
  layout: Record<symbol, string>,
  monthDayLayouts: t.LayoutPair[] | readonly t.LayoutPair[],
  isMonthDay: boolean
): LayoutEntry[] {
  const layouts = ownEntries(layout) as LayoutEntry[];
  let changed = false;

  monthDayLayouts.forEach(([dmy, mdy]) => {
    const idx1 = layouts.findIndex(([key]) => key.description === dmy);
    const idx2 = layouts.findIndex(([key]) => key.description === mdy);
    if (idx1 === -1 || idx2 === -1) return;
    const swap1 = idx1 < idx2 && isMonthDay;
    const swap2 = idx1 > idx2 && !isMonthDay;
    if (swap1 || swap2) {
      [layouts[idx1], layouts[idx2]] = [layouts[idx2], layouts[idx1]];
      changed = true;
    }
  });

  return layouts;
}
