import { ownEntries } from '#library/primitive.library.js';
import { Token } from '#tempo/support/tempo.symbol.js';
import type * as t from '../tempo.type.js';

export type LayoutEntry = [symbol, string];
export type LayoutController = Record<PropertyKey, string[]>;

const TOKEN_ALIAS = new Map<symbol, string>(
	(ownEntries(Token, true) as [string, symbol][]).map(([name, key]) => [key, name])
);

// Support alias-driven ordering regardless of symbol identity by resolving
// token names (e.g. dt, wkd, tm) to their symbol descriptions.
const TOKEN_DESCRIPTION_BY_NAME = new Map<string, string>(
	(ownEntries(Token, true) as [string, symbol][])
		.map(([name, key]) => [name, key.description ?? ''] as const)
		.filter(([, description]) => description.length > 0)
);

export const DEFAULT_LAYOUT_CLASS: unique symbol = Symbol('default');

export interface ResolveLayoutOrderArgs {
	layout: Record<symbol, string>;
	monthDayLayouts: t.LayoutPair[] | readonly t.LayoutPair[];
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
	}
}

/**
 * Reorder layouts according to a classification entry.
 * Unknown layout names are appended in their original relative order.
 * 
 * @remarks
 * Must return the original layout reference when no reordering occurs (no-op paths).
 * This preserves referential equality for consumers expecting `resolvedLayout === originalLayout`
 * when the classification is missing or causes no changes.
 */
export function resolveLayoutClassificationOrder(layout: Record<symbol, string>, controller: LayoutController, classification: PropertyKey = DEFAULT_LAYOUT_CLASS): Record<symbol, string> {
	const preferred = controller[classification] ?? [];
	if (preferred.length === 0) return layout;

	const entries = ownEntries(layout) as LayoutEntry[];
	const byName = new Map<string, LayoutEntry>();
	entries.forEach(([key, value]) => {
		const description = key.description ?? '';
		if (description) byName.set(description, [key, value]);
		const alias = TOKEN_ALIAS.get(key);
		if (alias) byName.set(alias, [key, value]);
	});
	const next: LayoutEntry[] = [];
	const seen = new Set<symbol>();

	preferred.forEach(name => {
		const resolvedName = TOKEN_DESCRIPTION_BY_NAME.get(name) ?? name;
		const entry = byName.get(resolvedName) ?? byName.get(name);
		if (!entry) return;
		if (seen.has(entry[0])) return;
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
 * 
 * @remarks
 * Must return the original layout reference when no reordering or swaps occur (no-op paths).
 * This preserves referential equality for consumers expecting `resolvedLayout === originalLayout`
 * when the locale preference matches existing order or no swap pairs are found.
 */
export function resolveLayoutOrder({ layout, monthDayLayouts, isMonthDay, layoutController, classification }: ResolveLayoutOrderArgs): Record<symbol, string> {
	const ordered = resolveLayoutClassificationOrder(
		layout,
		layoutController ?? createLayoutController(layout),
		classification ?? DEFAULT_LAYOUT_CLASS,
	);

	const layouts = ownEntries(ordered) as LayoutEntry[];
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

	if (changed) return Object.fromEntries(layouts) as Record<symbol, string>;
	return ordered;
}

/** return the current symbol-descriptions in parse order for debug diagnostics */
export function getLayoutOrder(layout: Record<symbol, string>): string[] {
	return (ownEntries(layout) as LayoutEntry[])
		.map(([key]) => key.description ?? String(key));
}
