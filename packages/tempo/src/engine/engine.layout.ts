import { ownEntries } from '#library/primitive.library.js';
import type * as t from '../tempo.type.js';

export type LayoutEntry = [symbol, string];
export type LayoutController = Record<PropertyKey, string[]>;

export const DEFAULT_LAYOUT_CLASS: unique symbol = Symbol('default');

export interface ResolveLayoutOrderArgs {
	layout: Record<symbol, string>;
	mdyLayouts: t.Pair[];
	isMonthDay: boolean;
	layoutController?: LayoutController;
	classification?: PropertyKey;
}

/**
 * Build the minimum controller map from the current layout order.
 * This is the baseline framework entry until additional classifications are added.
 */
export function createLayoutController(layout: Record<symbol, string>): LayoutController {
	return {
		[DEFAULT_LAYOUT_CLASS]: getLayoutOrder(layout),
	};
}

/**
 * Reorder layouts according to a classification entry.
 * Unknown layout names are appended in their original relative order.
 */
export function resolveLayoutClassificationOrder(layout: Record<symbol, string>, controller: LayoutController, classification: PropertyKey = DEFAULT_LAYOUT_CLASS): Record<symbol, string> {
	const preferred = controller[classification] ?? [];
	if (preferred.length === 0) return layout;

	const entries = ownEntries(layout) as LayoutEntry[];
	const byName = new Map(entries.map(([key, value]) => [key.description ?? '', [key, value] as LayoutEntry]));
	const next: LayoutEntry[] = [];
	const seen = new Set<symbol>();

	preferred.forEach(name => {
		const entry = byName.get(name);
		if (!entry) return;
		seen.add(entry[0]);
		next.push(entry);
	});

	entries.forEach(entry => {
		if (!seen.has(entry[0])) next.push(entry);
	});

	const changed = next.length === entries.length && next.some((entry, idx) => entry[0] !== entries[idx][0]);
	return changed ? Object.fromEntries(next) as Record<symbol, string> : layout;
}

/**
 * Resolve parse layout order based on locale preference while preserving
 * existing pair-swap semantics used by Tempo.
 */
export function resolveLayoutOrder({ layout, mdyLayouts, isMonthDay, layoutController, classification }: ResolveLayoutOrderArgs): Record<symbol, string> {
	const ordered = resolveLayoutClassificationOrder(
		layout,
		layoutController ?? createLayoutController(layout),
		classification ?? DEFAULT_LAYOUT_CLASS,
	);

	const layouts = ownEntries(ordered) as LayoutEntry[];
	let changed = false;

	mdyLayouts.forEach(([dmy, mdy]) => {
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

	if (changed) return Object.fromEntries(layouts) as Record<symbol, string>;
	return ordered;
}

/** return the current symbol-descriptions in parse order for debug diagnostics */
export function getLayoutOrder(layout: Record<symbol, string>): string[] {
	return (ownEntries(layout) as LayoutEntry[])
		.map(([key]) => key.description ?? String(key));
}
