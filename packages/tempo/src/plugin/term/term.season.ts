import { getTermRange, defineTerm, defineRange, resolveCycleWindow } from './term.util.js';
import { logWarn } from '../../support/support.util.js';
import { COMPASS } from '../../support/support.enum.js';
import type { Tempo } from '../../tempo.class.js';

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
], 'group', 'sphere');

/** resolve the full candidate list for the current context */
function resolve(t: Tempo, anchor?: any) {
	if (t.config.sphere === undefined && anchor?.sphere === undefined) {
		logWarn(`[tempo] SeasonTerm requires 'sphere' configuration (e.g. Tempo.init({ sphere: 'north' }) or { sphere: 'south' }).`, t.config);
		return [];
	}

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

	resolve(this: Tempo, anchor?: any) {
		return resolve(this, anchor);
	},

	define(this: Tempo, keyOnly?: boolean, anchor?: any) {
		return getTermRange(this, resolve(this, anchor), keyOnly, anchor);
	}
});

declare module '../../tempo.class.js' {
	interface TempoTermRegistry {
		szn: 'Spring' | 'Summer' | 'Autumn' | 'Winter';
		season: {
			key: 'Spring' | 'Summer' | 'Autumn' | 'Winter';
			symbol: 'Flower' | 'Sun' | 'Leaf' | 'Snowflake';
			group: 'meteorological';
			sphere: COMPASS;
			day: number;
			month: number;
			start: Tempo;
			end: Tempo;
		};
	}
}

