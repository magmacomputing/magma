import { Tempo } from '@magmacomputing/tempo';
import { enums, getTermRange, defineTerm, enumify, type ValueOf } from '@magmacomputing/tempo/plugin-api';

declare module '@magmacomputing/tempo' {
	interface TempoTermRegistry {
		astro: 'Vernal' | 'Summer' | 'Autumnal' | 'Winter';
		astronomy: {
			key: 'Vernal' | 'Summer' | 'Autumnal' | 'Winter';
			strict: 'Vernal' | 'Summer' | 'Autumnal' | 'Winter';
			season: 'Spring' | 'Summer' | 'Autumn' | 'Winter';
			sphere: Tempo.COMPASS;
			event: 'Equinox' | 'Solstice';
			group: 'astronomy';
			year: number;
			month: number;
			day: number;
			hour: number;
			minute: number;
			second: number;
			millisecond: number;
			microsecond: number;
			nanosecond: number;
			start: Tempo;
			end: Tempo;
		}
	}
}

const ASTRO = enumify({ Vernal: 'vernal', Summer: 'summer', Autumnal: 'autumnal', Winter: 'winter' });
type ASTRO = ValueOf<typeof ASTRO>

const { COMPASS, DURATIONS } = enums;
const key = 'astro';
const scope = 'astronomy';

/**
 * ## calculateAstroMoment
 * Polynomial approximation for Equinoxes and Solstices (Jean Meeus algorithm, Ch 27).
 * Supported year range: -1000 to +3000.
 *
 * NOTE: This is a mean-polynomial approximation that does not include the 
 * periodic higher-order terms for exact apparent calculations.
 */
function calculateAstroMoment(year: number, quarter: ASTRO, timeZone: string) {
	if (year < -1000 || year > 3000)
		throw new RangeError(`AstroTerm: Year ${year} is outside the supported Meeus calculation range (-1000 to +3000).`);

	const y = (year - 2_000) / 1_000;
	let jde: number;

	switch (quarter) {
		case ASTRO.Vernal: jde = 2_451_623.80984 + 365_242.37404 * y + 0.05169 * y * y; break;
		case ASTRO.Summer: jde = 2_451_716.56767 + 365_241.62603 * y + 0.00325 * y * y; break;
		case ASTRO.Autumnal: jde = 2_451_810.21715 + 365_242.01767 * y - 0.11575 * y * y; break;
		case ASTRO.Winter: jde = 2_451_900.05952 + 365_242.74049 * y - 0.06223 * y * y; break;
	}

	// Use Tempo's native parser with the 'ms' timeStamp hint
	const epochMs = Math.trunc((jde - 2_440_587.5) * DURATIONS.days);
	return new Tempo(epochMs, { timeZone, timeStamp: 'ms' });
}

function resolve(t: Tempo, anchor?: any) {
	const sphere = t.config.sphere;
	if (!sphere) return [];

	const year = anchor?.yy ?? anchor?.year ?? t.yy;
	const timeZone = anchor?.timeZoneId ?? t.tz ?? 'UTC';
	const list: any[] = [];

	const labels = (sphere === COMPASS.South)
		? { vernal: 'Autumnal', summer: 'Winter', autumnal: 'Vernal', winter: 'Summer' } as const
		: { vernal: 'Vernal', summer: 'Summer', autumnal: 'Autumnal', winter: 'Winter' } as const

	const seasons = (sphere === COMPASS.South)
		? { vernal: 'Autumn', summer: 'Winter', autumnal: 'Spring', winter: 'Summer' } as const
		: { vernal: 'Spring', summer: 'Summer', autumnal: 'Autumn', winter: 'Winter' } as const

	for (const y of [year - 1, year, year + 1]) {
		const m = (y: number, t: any) => {
			const moment = calculateAstroMoment(y, t, timeZone);
			const dt = moment.toDateTime();

			return {
				year: dt.year, month: dt.month, day: dt.day,
				hour: dt.hour, minute: dt.minute, second: dt.second,
				millisecond: dt.millisecond, microsecond: dt.microsecond, nanosecond: dt.nanosecond
			}
		}

		list.push({ key: labels.vernal, season: seasons.vernal, sphere, ...m(y, ASTRO.Vernal), event: 'Equinox', group: 'astronomy' });
		list.push({ key: labels.summer, season: seasons.summer, sphere, ...m(y, ASTRO.Summer), event: 'Solstice', group: 'astronomy' });
		list.push({ key: labels.autumnal, season: seasons.autumnal, sphere, ...m(y, ASTRO.Autumnal), event: 'Equinox', group: 'astronomy' });
		list.push({ key: labels.winter, season: seasons.winter, sphere, ...m(y, ASTRO.Winter), event: 'Solstice', group: 'astronomy' });
	}

	return list;
}

/**
 * Resolve where a date falls by ignoring time components of boundary moments.
 */
function resolveDateBoundary(t: Tempo, anchor?: any) {
	const list = resolve(t, anchor);
	return list.map((item: any) => ({ ...item, hour: 0, minute: 0, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 }));
}

/**
 * Exposes precise astronomical calculations (equinoxes and solstices)
 * as a standard Tempo scope.
 */
export const AstroTerm = defineTerm({
	key,
	scope,
	description: 'Astronomical seasons and events',
	resolve(this: Tempo, anchor?: any) {
		return resolve(this, anchor);
	},
	define(this: Tempo, keyOnly?: boolean, anchor?: any) {
		const strictList = resolve(this, anchor);
		const dateBoundaryList = resolveDateBoundary(this, anchor);
		const zdt = anchor ?? (this as any).toDateTime();

		if (keyOnly === true || keyOnly === undefined) {
			const result = getTermRange(this, dateBoundaryList, true, anchor);
			return result;
		}

		const scoped = getTermRange(this, strictList, false, anchor) as any;
		if (!scoped) return scoped;

		const dateScoped = getTermRange(this, dateBoundaryList, false, anchor) as any;
		if (!dateScoped) return scoped;

		const strictBoundary = strictList.find((item: any) =>
			item.key === dateScoped.key &&
			item.year === dateScoped.year &&
			item.month === dateScoped.month &&
			item.day === dateScoped.day
		);

		if (!strictBoundary) {
			return {
				...dateScoped,
				strict: scoped.key
			};
		}

		const boundaryAnchor = zdt.with({
			year: strictBoundary.year,
			month: strictBoundary.month,
			day: strictBoundary.day,
			hour: strictBoundary.hour ?? 0,
			minute: strictBoundary.minute ?? 0,
			second: strictBoundary.second ?? 0,
			millisecond: strictBoundary.millisecond ?? 0,
			microsecond: strictBoundary.microsecond ?? 0,
			nanosecond: strictBoundary.nanosecond ?? 0
		}).add({ minutes: 1 });

		const keyedScope = getTermRange(this, strictList, false, boundaryAnchor) as any;
		if (!keyedScope) {
			return {
				...dateScoped,
				strict: scoped.key
			};
		}

		return {
			...keyedScope,
			strict: scoped.key
		};
	}
});

// Side-effect: Auto-register upon import
Tempo.extend(AstroTerm);
