import { ownEntries } from '#library/primitive.library.js';
import { Token } from '#tempo/support/support.symbol.js';
import { resolveLayoutOrderPure } from '../engine/engine.resolver.js';
import type * as t from '../tempo.type.js';

export type LayoutEntry = [symbol, string];
export type LayoutController = Record<PropertyKey, (string | symbol)[]>;

const TOKEN_ALIAS = new Map<symbol, string>(
	(ownEntries(Token, true) as [string, symbol][]).map(([name, key]) => [key, name])
);

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

export function createLayoutController(layout: Record<symbol, string>): LayoutController {
	return {
		[DEFAULT_LAYOUT_CLASS]: getLayoutOrder(layout),
	}
}

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
		const isSym = typeof name === 'symbol';
		const description = isSym ? (name.description ?? '') : '';
		const alias = isSym ? TOKEN_ALIAS.get(name) : undefined;

		const resolvedName = !isSym ? (TOKEN_DESCRIPTION_BY_NAME.get(name) ?? name) : undefined;
		const entry = isSym
			? (byName.get(description) ?? (alias ? byName.get(alias) : undefined))
			: (byName.get(resolvedName!) ?? byName.get(name));

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

export function resolveLayoutOrder({ layout, monthDayLayouts, isMonthDay, layoutController, classification }: ResolveLayoutOrderArgs): Record<symbol, string> {
	const ordered = resolveLayoutClassificationOrder(
	 layout,
	 layoutController ?? createLayoutController(layout),
	 classification ?? DEFAULT_LAYOUT_CLASS,
	);

	const layouts = resolveLayoutOrderPure(ordered, monthDayLayouts, isMonthDay);
	const changed = layouts.some((entry, idx) => entry[0] !== (ownEntries(ordered)[idx] as LayoutEntry)[0]);

	if (changed) return Object.fromEntries(layouts) as Record<symbol, string>;
	return ordered;
}

export function getLayoutOrder(layout: Record<symbol, string>): string[] {
	return (ownEntries(layout) as LayoutEntry[])
		.map(([key]) => key.description ?? String(key));
}
