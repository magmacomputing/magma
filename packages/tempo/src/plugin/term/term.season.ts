import { getTermRange, defineTerm, defineRange, resolveCycleWindow } from '../term.util.js';
import { COMPASS } from '../../support/tempo.enum.js';
import type { Tempo } from '../../tempo.class.js';

/** definition of meteorological season ranges */
const ranges = [
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
];

/** definition of meteorological season ranges */
const groups = defineRange(ranges, 'group', 'sphere');

/** resolve the full candidate list for the current context */
function resolve(t: Tempo, anchor?: any) {
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

	/** determine where the current Tempo instance fits within the above range */
	define(this: Tempo, keyOnly?: boolean, anchor?: any) {
		return getTermRange(this, resolve(this, anchor), keyOnly, anchor);
	}
});
