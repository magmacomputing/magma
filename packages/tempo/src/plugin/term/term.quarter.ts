import { defineTerm, getTermRange, defineRange, resolveCycleWindow } from '../term.util.js';
import { COMPASS } from '../../tempo.enum.js';
import { type Tempo } from '../../tempo.class.js';
import { isNumber } from '#library/type.library.js';
import { asArray } from '#library';

/** definition of fiscal quarter ranges */
const groups = defineRange([
	{ key: 'Q1', day: 1, month: 1, fiscal: 0, sphere: COMPASS.North, label: 'First Quarter' },
	{ key: 'Q2', day: 1, month: 4, fiscal: 0, sphere: COMPASS.North, label: 'Second Quarter' },
	{ key: 'Q3', day: 1, month: 7, fiscal: 0, sphere: COMPASS.North, label: 'Third Quarter' },
	{ key: 'Q4', day: 1, month: 10, fiscal: 0, sphere: COMPASS.North, label: 'Fourth Quarter' },

	{ key: 'Q1', day: 1, month: 7, fiscal: 1, sphere: COMPASS.South, label: 'First Quarter' },
	{ key: 'Q2', day: 1, month: 10, fiscal: 1, sphere: COMPASS.South, label: 'Second Quarter' },
	{ key: 'Q3', day: 1, month: 1, year: 1, fiscal: 0, sphere: COMPASS.South, label: 'Third Quarter' },
	{ key: 'Q4', day: 1, month: 4, year: 1, fiscal: 0, sphere: COMPASS.South, label: 'Fourth Quarter' },
], 'sphere');

/** resolve the full candidate list for the current context */
function resolve(t: Tempo, anchor?: any): any[] {
	const list = resolveCycleWindow(t, groups, { anchor, groupBy: ['sphere'] });

	list.forEach(itm => {
		if (isNumber(itm.fiscal)) itm.fiscal += itm.year;
	});

	return list;
}

/**
 * ## QuarterTerm
 */
export const QuarterTerm = defineTerm({
	key: 'qtr',
	scope: 'quarter',
	description: 'Fiscal Quarter',
	groups,

	resolve(this: Tempo, anchor?: any) {
		return resolve(this, anchor);
	},

	/** determine where the current Tempo instance fits within the above range */
	define(this: Tempo, keyOnly?: boolean, anchor?: any) {
		const res = resolve(this, anchor);
		return getTermRange(this, asArray(res), keyOnly, anchor) as any;
	}
});
