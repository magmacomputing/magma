import { defineTerm, getTermRange, defineRange, resolveCycleWindow } from '@magmacomputing/tempo/plugin/sdk';
import type { Tempo } from '@magmacomputing/tempo';

/** definition of daily time periods */
const groups = defineRange([
	{ key: 'Midnight', locale: { fr: 'Minuit', es: 'Medianoche', de: 'Mitternacht' }, hour: 0, group: 'standard' },
	{ key: 'Early', locale: { fr: 'Tôt', es: 'Temprano', de: 'Früh' }, hour: 4, group: 'standard' },
	{ key: 'Morning', locale: { fr: 'Matin', es: 'Mañana', de: 'Morgen' }, hour: 8, group: 'standard' },
	{ key: 'Midmorning', locale: { fr: 'Milieu de la matinée', es: 'Media mañana', de: 'Vormittag' }, hour: 10, group: 'standard' },
	{ key: 'Midday', locale: { fr: 'Midi', es: 'Mediodía', de: 'Mittag' }, hour: 12, group: 'standard' },
	{ key: 'Afternoon', locale: { fr: 'Après-midi', es: 'Tarde', de: 'Nachmittag' }, hour: 15, minute: 30, group: 'standard' },
	{ key: 'Evening', locale: { fr: 'Soir', es: 'Noche', de: 'Abend' }, hour: 18, group: 'standard' },
	{ key: 'Night', locale: { fr: 'Nuit', es: 'Noche', de: 'Nacht' }, hour: 20, group: 'standard' },
], 'group');

/**
 * Resolves daily time period candidates for the current time context.
 *
 * @param t - The source Tempo instance
 * @param anchor - Optional reference time override
 * @returns Array of matching time-of-day term definitions
 * @internal
 */
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

declare module '@magmacomputing/tempo' {
	interface TempoTermRegistry {
		tod: 'Midnight' | 'Early' | 'Morning' | 'Midmorning' | 'Midday' | 'Afternoon' | 'Evening' | 'Night';
		timeOfDay: {
			key: 'Midnight' | 'Early' | 'Morning' | 'Midmorning' | 'Midday' | 'Afternoon' | 'Evening' | 'Night';
			group: 'standard';
			hour: number;
			minute?: number;
			start: Tempo;
			end: Tempo;
		};
	}
}

