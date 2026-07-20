import { defineTerm, getTermRange, defineRange, resolveCycleWindow, COMPASS } from '@magmacomputing/tempo/plugin-api';
import { logWarn } from '@magmacomputing/tempo/plugin-api';
import { isNumber, asArray } from '@magmacomputing/library';
import type { Tempo } from '@magmacomputing/tempo';

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
	if (t.config.sphere === undefined && anchor?.sphere === undefined) {
		logWarn(`[tempo] QuarterTerm requires 'sphere' configuration (e.g. Tempo.init({ sphere: 'north' }) or { sphere: 'south' }).`, t.config);
		return [];
	}

	const list = resolveCycleWindow(t, groups, { anchor, groupBy: ['sphere'] });

	list.forEach((itm: any) => {
		if (isNumber(itm.fiscal)) itm.fiscal += isNumber(itm.year) ? itm.year : 0;
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

declare module '@magmacomputing/tempo' {
	interface TempoTermRegistry {
		qtr: 'Q1' | 'Q2' | 'Q3' | 'Q4';
		quarter: {
			key: 'Q1' | 'Q2' | 'Q3' | 'Q4';
			label: 'First Quarter' | 'Second Quarter' | 'Third Quarter' | 'Fourth Quarter';
			fiscal: number;
			sphere: COMPASS;
			day: number;
			month: number;
			year?: number;
			start: Tempo;
			end: Tempo;
		};
	}
}

