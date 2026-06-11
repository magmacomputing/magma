import { defineTerm, getTermRange, defineRange, resolveCycleWindow } from './term.util.js';
import type { Tempo } from '../../tempo.class.js';

/** definition of daily time periods */
const groups = defineRange([
	{ key: 'Midnight', hour: 0, group: 'standard' },
	{ key: 'Early', hour: 4, group: 'standard' },
	{ key: 'Morning', hour: 8, group: 'standard' },
	{ key: 'Midmorning', hour: 10, group: 'standard' },
	{ key: 'Midday', hour: 12, group: 'standard' },
	{ key: 'Afternoon', hour: 15, minute: 30, group: 'standard' },
	{ key: 'Evening', hour: 18, group: 'standard' },
	{ key: 'Night', hour: 20, group: 'standard' },
], 'group');

function resolve(t: Tempo, anchor?: any) {
	return resolveCycleWindow(t, groups, { anchor, groupBy: ['group'], group: 'standard' });
}

export const TimelineTerm = defineTerm({
	key: 'tod',
	scope: 'timeOfDay',
	description: 'Daily time period',
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
		tod: 'Midnight' | 'Early' | 'Morning' | 'Midmorning' | 'Midday' | 'Afternoon' | 'Evening' | 'Night';
		timeOfDay: {
			key: 'Midnight' | 'Early' | 'Morning' | 'Midmorning' | 'Midday' | 'Afternoon' | 'Evening' | 'Night';
			group: 'standard';
			hour: number;
			minute?: number;
		};
	}
}

