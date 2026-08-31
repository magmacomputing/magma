import { Tempo } from '@magmacomputing/tempo';
import { enums, getTermRange, defineTerm, enumify, type ValueOf } from '@magmacomputing/tempo/plugin/sdk';

export type LunarPhaseKey =
	| 'new-moon'
	| 'waxing-crescent'
	| 'first-quarter'
	| 'waxing-gibbous'
	| 'full-moon'
	| 'waning-gibbous'
	| 'third-quarter'
	| 'waning-crescent';

export type LunarPhaseName =
	| 'New Moon'
	| 'Waxing Crescent'
	| 'First Quarter'
	| 'Waxing Gibbous'
	| 'Full Moon'
	| 'Waning Gibbous'
	| 'Third Quarter'
	| 'Waning Crescent';

export interface LunarPhaseDetails {
	/** Short machine-friendly key string (e.g. 'full-moon', 'new-moon') */
	key: LunarPhaseKey;
	/** Human-readable lunar phase name (e.g. 'Full Moon', 'New Moon') */
	phase: LunarPhaseName;
	/** 1-based lunar phase index (1: New Moon ... 5: Full Moon ... 8: Waning Crescent) */
	index: number;
	/** Fraction of the Moon's disk illuminated (0.0 to 1.0) */
	illumination: number;
	/** Age of the moon in days into the current synodic month (0.0 to ~29.53) */
	ageDays: number;
	/** True if the moon is growing (waxing), false if shrinking (waning) */
	isWaxing: boolean;
	/** Unicode emoji representation of the lunar phase, or undefined if sphere is not configured */
	emoji?: string | undefined;
}

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
		};
		moon: LunarPhaseKey;
		lunar: {
			key: LunarPhaseKey;
			phase: LunarPhaseName;
			index: number;
			illumination: number;
			ageDays: number;
			isWaxing: boolean;
			emoji?: string | undefined;
			group: 'lunar';
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
		};
	}
}

const SYNODIC_MONTH = 29.53058770576;
const REF_NEW_MOON_MS = 947_182_440_000; // 2000-01-06T18:14:00Z

/**
 * Calculates lunar phase details (short key, phase name, 1-based index, illumination percentage, age in days, waxing status, emoji)
 * for a given Tempo instance. Returns `emoji: undefined` if `t.sphere` is not specified.
 *
 * @param t - The Tempo instance
 * @returns LunarPhaseDetails object
 */
export function getLunarPhase(t: Tempo): LunarPhaseDetails {
	const currentMs = t.epoch.ms;
	const elapsedDays = (currentMs - REF_NEW_MOON_MS) / 86_400_000;
	const ageDays = ((elapsedDays % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
	const phaseAngle = (ageDays / SYNODIC_MONTH) * 2 * Math.PI;
	const illumination = Math.round(((1 - Math.cos(phaseAngle)) / 2) * 10000) / 10000;
	const isWaxing = ageDays < (SYNODIC_MONTH / 2);
	const sphere = t.sphere;

	let key: LunarPhaseKey;
	let phase: LunarPhaseName;
	let index: number;
	let emoji: string | undefined;

	const step = SYNODIC_MONTH / 16;

	if (ageDays < step || ageDays >= SYNODIC_MONTH - step) {
		key = 'new-moon';
		phase = 'New Moon';
		index = 1;
		if (sphere) emoji = '🌑';
	} else if (ageDays < 3 * step) {
		key = 'waxing-crescent';
		phase = 'Waxing Crescent';
		index = 2;
		if (sphere === enums.COMPASS.South) emoji = '🌘';
		else if (sphere === enums.COMPASS.North) emoji = '🌒';
	} else if (ageDays < 5 * step) {
		key = 'first-quarter';
		phase = 'First Quarter';
		index = 3;
		if (sphere === enums.COMPASS.South) emoji = '🌗';
		else if (sphere === enums.COMPASS.North) emoji = '🌓';
	} else if (ageDays < 7 * step) {
		key = 'waxing-gibbous';
		phase = 'Waxing Gibbous';
		index = 4;
		if (sphere === enums.COMPASS.South) emoji = '🌖';
		else if (sphere === enums.COMPASS.North) emoji = '🌔';
	} else if (ageDays < 9 * step) {
		key = 'full-moon';
		phase = 'Full Moon';
		index = 5;
		if (sphere) emoji = '🌕';
	} else if (ageDays < 11 * step) {
		key = 'waning-gibbous';
		phase = 'Waning Gibbous';
		index = 6;
		if (sphere === enums.COMPASS.South) emoji = '🌔';
		else if (sphere === enums.COMPASS.North) emoji = '🌖';
	} else if (ageDays < 13 * step) {
		key = 'third-quarter';
		phase = 'Third Quarter';
		index = 7;
		if (sphere === enums.COMPASS.South) emoji = '🌓';
		else if (sphere === enums.COMPASS.North) emoji = '🌗';
	} else {
		key = 'waning-crescent';
		phase = 'Waning Crescent';
		index = 8;
		if (sphere === enums.COMPASS.South) emoji = '🌒';
		else if (sphere === enums.COMPASS.North) emoji = '🌘';
	}

	return {
		key,
		phase,
		index,
		illumination,
		ageDays: Math.round(ageDays * 100) / 100,
		isWaxing,
		...(emoji !== undefined ? { emoji } : {}),
	};
}

function getLunarScopeRange(t: Tempo, anchor?: any) {
	const refTempo = anchor ?? t;
	const currentMs = refTempo.epoch.ms;
	const timeZone = refTempo.tz ?? 'UTC';

	const elapsedDays = (currentMs - REF_NEW_MOON_MS) / 86_400_000;
	const ageDays = ((elapsedDays % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;

	const step = SYNODIC_MONTH / 8;
	const rawBucket = Math.floor((ageDays + step / 2) / step);
	const phaseIndex = rawBucket % 8;

	const phaseStartDaysOffset = (rawBucket * step) - (step / 2) - ageDays;
	const phaseEndDaysOffset = phaseStartDaysOffset + step;

	const startMs = Math.trunc(currentMs + (phaseStartDaysOffset * 86_400_000));
	const endMs = Math.trunc(currentMs + (phaseEndDaysOffset * 86_400_000));

	const startTempo = new Tempo(startMs, { timeZone, timeStamp: 'ms', sphere: refTempo.sphere });
	const endTempo = new Tempo(endMs, { timeZone, timeStamp: 'ms', sphere: refTempo.sphere });

	const details = getLunarPhase(refTempo);
	const dt = startTempo.toDateTime();

	return {
		key: details.key,
		phase: details.phase,
		index: details.index,
		illumination: details.illumination,
		ageDays: details.ageDays,
		isWaxing: details.isWaxing,
		...(details.emoji !== undefined ? { emoji: details.emoji } : {}),
		group: 'lunar',
		year: dt.year,
		month: dt.month,
		day: dt.day,
		hour: dt.hour,
		minute: dt.minute,
		second: dt.second,
		millisecond: dt.millisecond,
		microsecond: dt.microsecond,
		nanosecond: dt.nanosecond,
		start: startTempo,
		end: endTempo,
	};
}

/**
 * Exposes lunar phase cycle keys (`t.term.moon`) and range scopes (`t.term.lunar`).
 */
export const LunarTerm = defineTerm({
	key: 'moon',
	scope: 'lunar',
	description: 'Lunar phase cycle and range resolution',
	resolve(this: Tempo, anchor?: any) {
		return [getLunarScopeRange(this, anchor)];
	},
	define(this: Tempo, keyOnly?: boolean, anchor?: any) {
		const scopeObj = getLunarScopeRange(this, anchor);
		if (keyOnly === true || keyOnly === undefined) {
			return scopeObj.key;
		}
		return scopeObj;
	},
});

const ASTRO = enumify({ Vernal: 'vernal', Summer: 'summer', Autumnal: 'autumnal', Winter: 'winter' });
type ASTRO = ValueOf<typeof ASTRO>;

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
	let jde = 0;

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
	const sphere = t.sphere;
	if (!sphere) return [];

	const year = anchor?.yy ?? anchor?.year ?? t.yy;
	const timeZone = anchor?.timeZoneId ?? t.tz ?? 'UTC';
	const list: any[] = [];

	const labels = (sphere === COMPASS.South)
		? { vernal: 'Autumnal', summer: 'Winter', autumnal: 'Vernal', winter: 'Summer' } as const
		: { vernal: 'Vernal', summer: 'Summer', autumnal: 'Autumnal', winter: 'Winter' } as const;

	const seasons = (sphere === COMPASS.South)
		? { vernal: 'Autumn', summer: 'Winter', autumnal: 'Spring', winter: 'Summer' } as const
		: { vernal: 'Spring', summer: 'Summer', autumnal: 'Autumn', winter: 'Winter' } as const;

	for (const y of [year - 1, year, year + 1]) {
		const m = (y: number, t: any) => {
			const moment = calculateAstroMoment(y, t, timeZone);
			const dt = moment.toDateTime();

			return {
				year: dt.year, month: dt.month, day: dt.day,
				hour: dt.hour, minute: dt.minute, second: dt.second,
				millisecond: dt.millisecond, microsecond: dt.microsecond, nanosecond: dt.nanosecond,
			};
		};

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
				strict: scoped.key,
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
			nanosecond: strictBoundary.nanosecond ?? 0,
		}).add({ minutes: 1 });

		const keyedScope = getTermRange(this, strictList, false, boundaryAnchor) as any;
		if (!keyedScope) {
			return {
				...dateScoped,
				strict: scoped.key,
			};
		}

		return {
			...keyedScope,
			strict: scoped.key,
		};
	}
});

export const AstroPlugin = [AstroTerm, LunarTerm];
export default AstroPlugin;

// Side-effect: Auto-register upon import
Tempo.extend(AstroPlugin);
