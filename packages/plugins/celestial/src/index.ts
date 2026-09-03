import { defineTerm } from '@magmacomputing/tempo/plugin/sdk';
import { getLunarPhaseRange, getMoonriseMoonset, getSunriseSunset, getTidalState, LUNAR_PHASE_KEYS, SOLAR_PHASE_STATES, SOLAR_PHASE_NAMES, TIDAL_PHASE_STATES } from '@magmacomputing/tempo-fns';
import { Tempo } from '@magmacomputing/tempo';
import type { LunarPhaseKey, LunarPhaseName, SolarPhaseName, TidalState, TidalResult } from '@magmacomputing/tempo-fns';
import { getCelestialCoordinates, toDateTimeFields, toTempoOrNull, getLunarDetails, createCelestialTermHandlers } from './util.js';

export type { LunarPhaseKey, LunarPhaseName, SolarPhaseName, TidalState, TidalResult };
export { LUNAR_PHASE_KEYS, SOLAR_PHASE_STATES, SOLAR_PHASE_NAMES, TIDAL_PHASE_STATES };

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
			moonrise: Tempo | null;
			moonset: Tempo | null;
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
		sun: SolarPhaseState | null;
		solar: {
			key: SolarPhaseState | null;
			phase: SolarPhaseName | null;
			phases: readonly SolarPhaseState[];
			index: number | null;
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
			sunrise: Tempo | null;
			sunset: Tempo | null;
			noon: Tempo | null;
			daylightDurationMs: number | null;
			isDaylight: boolean | null;
			civil: { sunrise: Tempo | null; sunset: Tempo | null };
			nautical: { sunrise: Tempo | null; sunset: Tempo | null };
			astronomical: { sunrise: Tempo | null; sunset: Tempo | null };
			start: Tempo;
			end: Tempo;
		};
		tide: TidalState;
		tides: {
			key: TidalState;
			state: TidalState;
			group: 'tide';
			alignmentDeg: number;
			isSpringTide: boolean;
			isNeapTide: boolean;
			isKingTide: boolean | null;
			perigeeFactor: number;
			lunarTideMinute: number | null;
			states: readonly TidalState[];
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
	}
}

/**
 * Resolves lunar phase details, lunar events, geolocation, and the containing time range.
 *
 * @param t - Tempo context used to determine the reference time and lunar details
 * @param anchor - Optional anchor used to resolve celestial context
 * @returns Lunar scope data with phase metadata, optional moonrise and moonset times, and start and end boundaries
 */
function getLunarScopeRange(t: Tempo, anchor?: any) {
	const coords = getCelestialCoordinates(t, anchor);
	const { refTempo, lat, lng, hasGeo, geo, timeZone, sphere } = coords;
	const currentMs = refTempo.epoch.ms;

	const range = getLunarPhaseRange(currentMs, { sphere });
	const moonEvents = hasGeo ? getMoonriseMoonset(currentMs, lat!, lng!) : { moonriseMs: undefined, moonsetMs: undefined };

	const startTempo = new Tempo(range.startMs, { timeZone, timeStamp: 'ms', sphere });
	const endTempo = new Tempo(range.endMs, { timeZone, timeStamp: 'ms', sphere });
	const moonrise = hasGeo ? toTempoOrNull(moonEvents.moonriseMs, timeZone) : null;
	const moonset = hasGeo ? toTempoOrNull(moonEvents.moonsetMs, timeZone) : null;

	const details = getLunarDetails(t, coords);

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
		geo,
		...toDateTimeFields(startTempo),
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
	...createCelestialTermHandlers(getLunarScopeRange),
});

/**
 * Determines the current solar phase and its daily time range for a reference time and location.
 *
 * @param t - The Tempo context used to resolve the reference time and location
 * @param anchor - Optional anchor used when resolving the reference time and location
 * @returns Solar phase metadata, sunrise and sunset events, twilight events, and the applicable time range
 */
function getSolarScopeRange(t: Tempo, anchor?: any) {
	const { refTempo, lat, lng, hasGeo, geo, timeZone } = getCelestialCoordinates(t, anchor);

	if (!hasGeo) {
		return {
			key: null,
			phase: null,
			phases: SOLAR_PHASE_STATES,
			index: null,
			group: 'solar' as const,
			geo: null,
			...toDateTimeFields(refTempo),
			sunrise: null,
			sunset: null,
			noon: null,
			daylightDurationMs: null,
			isDaylight: null,
			civil: { sunrise: null, sunset: null },
			nautical: { sunrise: null, sunset: null },
			astronomical: { sunrise: null, sunset: null },
			start: refTempo,
			end: refTempo,
		};
	}

	const res = getSunriseSunset(refTempo.epoch.ms, lat!, lng!);

	const sunrise = toTempoOrNull(res.sunriseMs, timeZone)!;
	const sunset = toTempoOrNull(res.sunsetMs, timeZone)!;
	const solarNoon = toTempoOrNull(res.solarNoonMs, timeZone)!;

	const civilSunrise = toTempoOrNull(res.civil.sunriseMs, timeZone)!;
	const civilSunset = toTempoOrNull(res.civil.sunsetMs, timeZone)!;
	const nauticalSunrise = toTempoOrNull(res.nautical.sunriseMs, timeZone)!;
	const nauticalSunset = toTempoOrNull(res.nautical.sunsetMs, timeZone)!;
	const astroSunrise = toTempoOrNull(res.astronomical.sunriseMs, timeZone)!;
	const astroSunset = toTempoOrNull(res.astronomical.sunsetMs, timeZone)!;

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
			start = astroSunset;
			end = astroSunset;
		}
	} else {
		start = sunset;
		end = new Tempo(res.sunriseMs + 86400000, { timeZone, timeStamp: 'ms' });
	}

	return {
		key: res.solarPhaseState,
		phase: SOLAR_PHASE_NAMES[res.solarPhaseState],
		phases: SOLAR_PHASE_STATES,
		index: res.index,
		group: 'solar' as const,
		geo,
		...toDateTimeFields(start),
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
	...createCelestialTermHandlers(getSolarScopeRange),
});

/**
 * Computes tidal state and timing information for the resolved location and reference time.
 *
 * @param anchor - Optional anchor used to resolve the location and reference time.
 * @returns Tidal state details, lunar alignment, tide indicators, geographic data, date-time fields, and a 745-minute range.
 */
function getTidalScopeRange(t: Tempo, anchor?: any) {
	const { refTempo, lat, lng, hasGeo, geo } = getCelestialCoordinates(t, anchor);
	const res = getTidalState(refTempo.epoch.ms, lat ?? 0, lng ?? 0);

	return {
		key: res.state,
		state: res.state,
		group: 'tide' as const,
		alignmentDeg: res.alignmentDeg,
		isSpringTide: res.isSpringTide,
		isNeapTide: res.isNeapTide,
		isKingTide: hasGeo ? res.isKingTide : null,
		perigeeFactor: res.perigeeFactor,
		lunarTideMinute: hasGeo ? res.lunarTideMinute : null,
		states: TIDAL_PHASE_STATES,
		geo,
		...toDateTimeFields(refTempo),
		start: refTempo,
		end: refTempo.add({ minutes: 745 }),
	};
}

/**
 * ## TidalTerm
 * Term definition for astronomical tide phase resolution (`t.term.tide`, `t.term.tides`).
 */
export const TidalTerm = defineTerm({
	key: 'tide',
	aliases: ['tides', 'tidal'],
	scope: 'tides',
	description: 'Astronomical tidal state, alignment, and perigee factor',
	phases: TIDAL_PHASE_STATES,
	...createCelestialTermHandlers(getTidalScopeRange),
});

/**
 * ## CelestialPlugin
 * Plugin bundling SolarTerm (`sun`/`solar`), LunarTerm (`moon`/`lunar`), and TidalTerm (`tide`/`tides`).
 */
export const CelestialPlugin = [SolarTerm, LunarTerm, TidalTerm];

export default CelestialPlugin;

Tempo.extend(CelestialPlugin);
