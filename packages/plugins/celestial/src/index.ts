import { defineTerm } from '@magmacomputing/tempo/plugin/sdk';
import { getLunarPhase, getLunarPhaseRange, getMoonriseMoonset, getSunriseSunset } from '@magmacomputing/tempo-fns';
import { Tempo } from '@magmacomputing/tempo';
import type { LunarPhaseKey, LunarPhaseName } from '@magmacomputing/tempo-fns';

export type { LunarPhaseKey, LunarPhaseName };

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
			moonrise?: Tempo | undefined;
			moonset?: Tempo | undefined;
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
		sun: SolarPhaseState;
		solar: {
			key: SolarPhaseState;
			index: number;
			group: 'solar';
			latitude: number;
			longitude: number;
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
			solarNoon: Tempo;
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
	};
}

/** Internal helper: Resolves latitude, longitude, and hemisphere sphere from a Tempo instance or anchor */
function getCelestialCoordinates(t: Tempo, anchor?: any): { refTempo: Tempo; lat: number; lng: number; sphere?: 'north' | 'south' } {
	const refTempo = (anchor instanceof Tempo) ? anchor : (anchor ? new Tempo(anchor, (t as any).config) : t);
	const cfg = (refTempo as any).config ?? (t as any).config ?? {};
	const latVal = cfg.latitude ?? cfg.lat ?? (refTempo as any).latitude ?? (refTempo as any).lat;
	const lng = cfg.longitude ?? cfg.lng ?? cfg.lon ?? cfg.long ?? (refTempo as any).longitude ?? (refTempo as any).lng ?? (refTempo as any).lon ?? (refTempo as any).long ?? 0;
	
	const explicitSphere = (refTempo as any).sphere ?? (t as any).sphere ?? cfg.sphere;
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
	const moonrise = moonEvents.moonriseMs ? new Tempo(moonEvents.moonriseMs, { timeZone, timeStamp: 'ms' }) : undefined;
	const moonset = moonEvents.moonsetMs ? new Tempo(moonEvents.moonsetMs, { timeZone, timeStamp: 'ms' }) : undefined;

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
		moonrise,
		moonset,
		group: 'lunar' as const,
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
		index: res.index,
		group: 'solar' as const,
		latitude: lat,
		longitude: lng,
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
		solarNoon,
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
