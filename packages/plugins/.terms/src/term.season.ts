import { getTermRange, defineTerm, defineRange, resolveCycleWindow, resolveRangeOrdinal, resolveRangeDiff, resolveRangeFormat, resolveTermSphere, COMPASS, TermHook, type TermSpan } from '@magmacomputing/tempo/plugin/sdk';
import type { Tempo } from '@magmacomputing/tempo';

export const SEASON_KEYS = Object.freeze(['Spring', 'Summer', 'Autumn', 'Winter', 'Dry', 'Wet'] as const);
export type SeasonKey = (typeof SEASON_KEYS)[number];

/** definition of meteorological season ranges */
const groups = defineRange([
	// Meteorological (North)
	{ key: 'Spring', day: 1, month: 3, symbol: 'Flower', group: 'meteorological', sphere: COMPASS.North },
	{ key: 'Summer', day: 1, month: 6, symbol: 'Sun', group: 'meteorological', sphere: COMPASS.North },
	{ key: 'Autumn', day: 1, month: 9, symbol: 'Leaf', group: 'meteorological', sphere: COMPASS.North },
	{ key: 'Winter', day: 1, month: 12, symbol: 'Snowflake', group: 'meteorological', sphere: COMPASS.North },

	// Meteorological (South)
	{ key: 'Spring', day: 1, month: 9, symbol: 'Flower', group: 'meteorological', sphere: COMPASS.South },
	{ key: 'Summer', day: 1, month: 12, symbol: 'Sun', group: 'meteorological', sphere: COMPASS.South },
	{ key: 'Autumn', day: 1, month: 3, symbol: 'Leaf', group: 'meteorological', sphere: COMPASS.South },
	{ key: 'Winter', day: 1, month: 6, symbol: 'Snowflake', group: 'meteorological', sphere: COMPASS.South },

	// Meteorological (Equator - bimodal tropical)
	{ key: 'Wet', day: 1, month: 3, symbol: 'CloudRain', group: 'meteorological', sphere: COMPASS.Equator, label: 'Long Wet' },
	{ key: 'Dry', day: 1, month: 6, symbol: 'Sun', group: 'meteorological', sphere: COMPASS.Equator, label: 'Long Dry' },
	{ key: 'Wet', day: 1, month: 10, symbol: 'CloudRain', group: 'meteorological', sphere: COMPASS.Equator, label: 'Short Wet' },
	{ key: 'Dry', day: 1, month: 12, symbol: 'Sun', group: 'meteorological', sphere: COMPASS.Equator, label: 'Short Dry' },
], 'group', 'sphere');

/**
 * Resolves meteorological season candidates matching the configured hemisphere.
 *
 * @param t - The source Tempo instance
 * @param anchor - Optional reference time override
 * @returns Array of matching season term definitions
 * @internal
 */
function resolve(t: Tempo, anchor?: any) {
	const sphere = resolveTermSphere(anchor?.sphere ?? t.sphere, 'SeasonTerm', t.config);
	if (!sphere) return [];

	const list = resolveCycleWindow(t, groups, { anchor, groupBy: ['group', 'sphere'], group: 'meteorological' });

	return list;
}

/**
 * ## SeasonTerm
 * Meteorological season
 */
export const SeasonTerm = defineTerm({
	key: 'szn',
	scope: 'season',
	description: 'Meteorological season',
	groups,
	keys: SEASON_KEYS,

	resolve(this: Tempo, anchor?: any) {
		return resolve(this, anchor);
	},

	define(this: Tempo, keyOnly?: boolean | number | string, anchor?: any) {
		const scope = getTermRange(this, resolve(this, anchor), keyOnly as any, anchor) as any;
		return (scope && typeof scope === 'object') ? { ...scope, keys: SEASON_KEYS } : scope;
	},

	[TermHook.ordinal](this: any, groups: Record<string, any>, anchor: Tempo) {
		return resolveRangeOrdinal(this, groups, anchor);
	},

	[TermHook.diff](this: any, other: Tempo, unit: string, tempo: Tempo) {
		return resolveRangeDiff(this, other, unit, tempo);
	},

	[TermHook.format](this: any, token: string, tempo: Tempo) {
		return resolveRangeFormat(this, token, tempo);
	}
});

declare module '@magmacomputing/tempo' {
	interface TempoTermRegistry {
		szn: SeasonKey;
		season: {
			key: SeasonKey;
			label?: string;
			symbol: 'Flower' | 'Sun' | 'Leaf' | 'Snowflake' | 'CloudRain';
			group: 'meteorological';
			sphere: COMPASS;
			keys: readonly SeasonKey[];
			span: TermSpan;
		};
	}
}

