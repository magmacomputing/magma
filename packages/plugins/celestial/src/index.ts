import { defineTerm } from '@magmacomputing/tempo/plugin/sdk';
import { getLunarPhase, getLunarPhaseRange, getMoonriseMoonset, getSunriseSunset, LUNAR_PHASE_KEYS, SOLAR_PHASE_STATES, SOLAR_PHASE_NAMES } from '@magmacomputing/tempo-fns';
import { Tempo } from '@magmacomputing/tempo';
import type { LunarPhaseKey, LunarPhaseName, SolarPhaseName } from '@magmacomputing/tempo-fns';

export type { LunarPhaseKey, LunarPhaseName, SolarPhaseName };
export { LUNAR_PHASE_KEYS, SOLAR_PHASE_STATES, SOLAR_PHASE_NAMES };

export interface LunarPhaseOptions {
	sphere?: 'north' | 'south' | undefined;
}

export interface LunarPhaseResult {
	key: LunarPhaseKey;
	phase: LunarPhaseName;
	index: number;
	illumination: number;
	ageDays: number;
	isWaxing: boolean;
	emoji?: string | undefined;
	phases: readonly LunarPhaseKey[];
}

export type SolarPhaseState = 'daylight' | 'night' | 'civil-twilight' | 'nautical-twilight' | 'astronomical-twilight';

declare module '@magmacomputing/tempo' {
	interface TempoTermRegistry {
		moon: LunarPhaseKey;
		lunar: {
			key: LunarPhaseKey;
			phase: LunarPhaseName;
			index: number;
			illumination: number;
			ageDays: number;
			isWaxing: boolean;
			emoji?: string | undefined;
			phases: readonly LunarPhaseKey[];
			moonrise?: Tempo | undefined;
			moonset?: Tempo | undefined;
			group: 'lunar';
			geo?: any;
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
		sun: SolarPhaseState;
		solar: {
			key: SolarPhaseState;
			phase: SolarPhaseName;
			phases: readonly SolarPhaseState[];
			index: number;
			group: 'solar';
			geo?: any;
			year: number;
			month: number;
			day: number;
			hour: number;
			minute: number;
			second: number;
			millisecond: number;
			microsecond: number;
			nanosecond: number;
			sunrise: Tempo;
			sunset: Tempo;
			noon: Tempo;
			daylightDurationMs: number;
			isDaylight: boolean;
			civil: { sunrise: Tempo; sunset: Tempo };
			nautical: { sunrise: Tempo; sunset: Tempo };
			astronomical: { sunrise: Tempo; sunset: Tempo };
			start: Tempo;
			end: Tempo;
		};
	}
}

/** Internal helper: Computes formatted lunar details for a given Tempo instance */
function getLunarDetails(t: Tempo, anchor?: any): LunarPhaseResult {
	const { refTempo, lat, sphere } = getCelestialCoordinates(t, anchor);
	const res = getLunarPhase(refTempo.epoch.ms, { sphere });
	return {
		key: res.key,
		phase: res.phase,
		index: res.index,
		illumination: Math.round(res.illumination * 10000) / 10000,
		ageDays: Math.round(res.ageDays * 100) / 100,
		isWaxing: res.isWaxing,
		...(sphere && res.emoji !== undefined ? { emoji: res.emoji } : {}),
		phases: res.phases,
	};
}

/** Internal helper: Resolves latitude, longitude, and hemisphere sphere from a Tempo instance or anchor */
function getCelestialCoordinates(t: Tempo, anchor?: any): { refTempo: Tempo; lat: number; lng: number; sphere?: 'north' | 'south' } {
	const refTempo = (anchor instanceof Tempo)
		? anchor
		: (anchor != null
			? new Tempo(typeof anchor === 'number' ? new Date(anchor) : anchor, (t as any).config)
			: t);
	const geo = refTempo.geo ?? (t as any).geo;
	const latVal = geo?.latitude;
	const lng = geo?.longitude ?? 0;
	
	const explicitSphere = (refTempo as any).sphere ?? (t as any).sphere;
	const sphere: 'north' | 'south' | undefined = explicitSphere
		? explicitSphere
		: (latVal !== undefined ? (latVal >= 0 ? 'north' : 'south') : undefined);

	return { refTempo, lat: latVal ?? 0, lng, ...(sphere ? { sphere } : {}) };
}

/** Internal helper: Resolves full lunar scope range with start/end Tempo boundaries */
function getLunarScopeRange(t: Tempo, anchor?: any) {
	const { refTempo, lat, lng, sphere } = getCelestialCoordinates(t, anchor);
	const currentMs = refTempo.epoch.ms;
	const timeZone = refTempo.tz ?? 'UTC';

	const range = getLunarPhaseRange(currentMs, { sphere });
	const moonEvents = getMoonriseMoonset(currentMs, lat, lng);

	const startTempo = new Tempo(range.startMs, { timeZone, timeStamp: 'ms', sphere });
	const endTempo = new Tempo(range.endMs, { timeZone, timeStamp: 'ms', sphere });
	const moonrise = moonEvents.moonriseMs !== undefined ? new Tempo(moonEvents.moonriseMs, { timeZone, timeStamp: 'ms' }) : undefined;
	const moonset = moonEvents.moonsetMs !== undefined ? new Tempo(moonEvents.moonsetMs, { timeZone, timeStamp: 'ms' }) : undefined;

	const details = getLunarDetails(t, refTempo);
	const dt = startTempo.toDateTime();

	return {
		key: details.key,
		phase: details.phase,
		index: details.index,
		illumination: details.illumination,
		ageDays: details.ageDays,
		isWaxing: details.isWaxing,
		...(details.emoji !== undefined ? { emoji: details.emoji } : {}),
		phases: LUNAR_PHASE_KEYS,
		moonrise,
		moonset,
		group: 'lunar' as const,
		geo: refTempo.geo ?? (t as any).geo,
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
 * ## LunarTerm
 * Term definition for lunar phase resolution (`t.term.moon`, `t.term.lunar`).
 */
export const LunarTerm = defineTerm({
	key: 'moon',
	scope: 'lunar',
	description: 'Lunar phase cycle and range resolution',
	phases: LUNAR_PHASE_KEYS,

	resolve(this: Tempo, anchor?: any) {
		return [getLunarScopeRange(this, anchor)];
	},

	define(this: Tempo, keyOnly?: boolean, anchor?: any) {
		const scopeObj = getLunarScopeRange(this, anchor);

		return (keyOnly === true || keyOnly === undefined)
			? scopeObj.key
			: scopeObj;
	},
});

/** Internal helper: Resolves daily solar scope range for a location */
function getSolarScopeRange(t: Tempo, anchor?: any) {
	const { refTempo, lat, lng } = getCelestialCoordinates(t, anchor);
	const timeZone = refTempo.tz ?? 'UTC';

	const res = getSunriseSunset(refTempo.epoch.ms, lat, lng);

	const sunrise = new Tempo(res.sunriseMs, { timeZone, timeStamp: 'ms' });
	const sunset = new Tempo(res.sunsetMs, { timeZone, timeStamp: 'ms' });
	const solarNoon = new Tempo(res.solarNoonMs, { timeZone, timeStamp: 'ms' });

	const civilSunrise = new Tempo(res.civil.sunriseMs, { timeZone, timeStamp: 'ms' });
	const civilSunset = new Tempo(res.civil.sunsetMs, { timeZone, timeStamp: 'ms' });
	const nauticalSunrise = new Tempo(res.nautical.sunriseMs, { timeZone, timeStamp: 'ms' });
	const nauticalSunset = new Tempo(res.nautical.sunsetMs, { timeZone, timeStamp: 'ms' });
	const astroSunrise = new Tempo(res.astronomical.sunriseMs, { timeZone, timeStamp: 'ms' });
	const astroSunset = new Tempo(res.astronomical.sunsetMs, { timeZone, timeStamp: 'ms' });

	let start: Tempo;
	let end: Tempo;

	const epochMs = refTempo.epoch.ms;

	if (res.solarPhaseState === 'daylight') {
		start = sunrise;
		end = sunset;
	} else if (res.solarPhaseState === 'civil-twilight') {
		if (epochMs < res.sunriseMs) {
			start = civilSunrise;
			end = sunrise;
		} else {
			start = sunset;
			end = civilSunset;
		}
	} else if (res.solarPhaseState === 'nautical-twilight') {
		if (epochMs < res.civil.sunriseMs) {
			start = nauticalSunrise;
			end = civilSunrise;
		} else {
			start = civilSunset;
			end = nauticalSunset;
		}
	} else if (res.solarPhaseState === 'astronomical-twilight') {
		if (epochMs < res.nautical.sunriseMs) {
			start = astroSunrise;
			end = nauticalSunrise;
		} else {
			start = nauticalSunset;
			end = astroSunset;
		}
	} else {
		start = sunset;
		end = new Tempo(res.sunriseMs + 86400000, { timeZone, timeStamp: 'ms' });
	}

	const dt = start.toDateTime();

	return {
		key: res.solarPhaseState,
		phase: SOLAR_PHASE_NAMES[res.solarPhaseState],
		phases: SOLAR_PHASE_STATES,
		index: res.index,
		group: 'solar' as const,
		geo: refTempo.geo ?? (t as any).geo,
		year: dt.year,
		month: dt.month,
		day: dt.day,
		hour: dt.hour,
		minute: dt.minute,
		second: dt.second,
		millisecond: dt.millisecond,
		microsecond: dt.microsecond,
		nanosecond: dt.nanosecond,
		sunrise,
		sunset,
		noon: solarNoon,
		daylightDurationMs: res.daylightDurationMs,
		isDaylight: res.isDaylight,
		civil: { sunrise: civilSunrise, sunset: civilSunset },
		nautical: { sunrise: nauticalSunrise, sunset: nauticalSunset },
		astronomical: { sunrise: astroSunrise, sunset: astroSunset },
		start,
		end,
	};
}

/**
 * ## SolarTerm
 * Term definition for solar day events and twilight phases (`t.term.sun`, `t.term.solar`).
 */
export const SolarTerm = defineTerm({
	key: 'sun',
	scope: 'solar',
	description: 'Local solar day cycle and twilight range resolution',
	phases: SOLAR_PHASE_STATES,

	resolve(this: Tempo, anchor?: any) {
		return [getSolarScopeRange(this, anchor)];
	},

	define(this: Tempo, keyOnly?: boolean, anchor?: any) {
		const scopeObj = getSolarScopeRange(this, anchor);

		return (keyOnly === true || keyOnly === undefined)
			? scopeObj.key
			: scopeObj;
	},
});

/**
 * ## CelestialPlugin
 * Plugin bundling SolarTerm (`sun`/`solar`) and LunarTerm (`moon`/`lunar`).
 */
export const CelestialPlugin = [SolarTerm, LunarTerm];

export default CelestialPlugin;

Tempo.extend(CelestialPlugin);
