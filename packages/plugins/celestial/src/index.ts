import { defineTerm } from '@magmacomputing/tempo/plugin/sdk';
import {
	getLunarPhaseRange,
	getMoonriseMoonset,
	getLunarPosition,
	getLunarDistance,
	getCrescentTilt,
	getEclipse,
	getSunriseSunset,
	getSolarPosition,
	getTidalState,
	LUNAR_PHASE_KEYS,
	SOLAR_PHASE_STATES,
	SOLAR_PHASE_NAMES,
	TIDAL_PHASE_STATES,
} from '@magmacomputing/tempo-fns';
import { Tempo } from '@magmacomputing/tempo';
import { isNumber } from '@magmacomputing/tempo/library';
import type {
	LunarPhaseKey,
	LunarPhaseName,
	SolarPhaseName,
	TidalState,
	TidalRegime,
	TidalOptions,
	TidalResult,
	LunarPositionResult,
	LunarDistanceResult,
	CrescentTiltResult,
	SolarPositionResult,
	EclipseType,
	EclipseResult,
} from '@magmacomputing/tempo-fns';
import { getCelestialCoordinates, toDateTimeFields, toTempoOrNull, getLunarDetails, createCelestialTermHandlers } from './util.js';


export type {
	LunarPhaseKey,
	LunarPhaseName,
	SolarPhaseName,
	TidalState,
	TidalRegime,
	TidalOptions,
	TidalResult,
	LunarPositionResult,
	LunarDistanceResult,
	CrescentTiltResult,
	SolarPositionResult,
	EclipseType,
	EclipseResult,
};
export { LUNAR_PHASE_KEYS, SOLAR_PHASE_STATES, SOLAR_PHASE_NAMES, TIDAL_PHASE_STATES, getEclipse, getSolarPosition };

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
			transit: Tempo | null;
			altitude: number | null;
			azimuth: number | null;
			isAboveHorizon: boolean | null;
			crescentTiltDeg: number | null;
			distanceKm: number | null;
			angularDiameterArcmin: number | null;
			isSupermoon: boolean | null;
			isMicromoon: boolean | null;
			eclipse: EclipseType | null;
			obscuration: number | null;
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
			elevation: number | null;
			sunrise: Tempo | null;
			sunset: Tempo | null;
			noon: Tempo | null;
			solarTime: Tempo | null;
			altitude: number | null;
			azimuth: number | null;
			zenith: number | null;
			isGoldenHour: boolean | null;
			isBlueHour: boolean | null;
			shadowRatio: number | null;
			isMidnightSun: boolean | null;
			isPolarNight: boolean | null;
			daylightDurationMs: number | null;
			isDaylight: boolean | null;
			civil: { sunrise: Tempo | null; sunset: Tempo | null };
			nautical: { sunrise: Tempo | null; sunset: Tempo | null };
			astronomical: { sunrise: Tempo | null; sunset: Tempo | null };
			eclipse: EclipseType | null;
			obscuration: number | null;
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
			nextHighTide: Tempo | null;
			nextLowTide: Tempo | null;
			lunitidalIntervalMin: number | null;
			regime: TidalRegime | null;
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
 * @returns Lunar scope data with phase metadata, optional moonrise and moonset times, topocentric ephemeris, and start/end boundaries
 */
function getLunarScopeRange(t: Tempo, anchor?: any) {
	const coords = getCelestialCoordinates(t, anchor);
	const { refTempo, lat, lng, hasGeo, geo, timeZone, sphere } = coords;

	const lunarDetails = getLunarDetails(t, coords);

	const moonEvents = hasGeo ? getMoonriseMoonset(refTempo.epoch.ms, lat!, lng!) : null;
	const moonrise = moonEvents ? toTempoOrNull(moonEvents.moonriseMs, timeZone, sphere) : null;
	const moonset = moonEvents ? toTempoOrNull(moonEvents.moonsetMs, timeZone, sphere) : null;

	const position = hasGeo ? getLunarPosition(refTempo.epoch.ms, lat!, lng!) : null;
	const distance = hasGeo ? getLunarDistance(refTempo.epoch.ms) : null;
	const crescentTilt = hasGeo ? getCrescentTilt(refTempo.epoch.ms, lat!, lng!) : null;
	const eclipseRes = hasGeo ? getEclipse(refTempo.epoch.ms, lat!, lng!) : null;

	const transit = position?.transitMs ? toTempoOrNull(position.transitMs, timeZone, sphere) : null;
	const altitude = position ? position.altitude : null;
	const azimuth = position ? position.azimuth : null;
	const isAboveHorizon = position ? position.isAboveHorizon : null;
	const crescentTiltDeg = crescentTilt ? crescentTilt.crescentTiltDeg : null;
	const distanceKm = distance ? distance.distanceKm : null;
	const angularDiameterArcmin = distance ? distance.angularDiameterArcmin : null;
	const isSupermoon = distance ? distance.isSupermoon : null;
	const isMicromoon = distance ? distance.isMicromoon : null;
	const eclipse = eclipseRes ? eclipseRes.type : null;
	const obscuration = eclipseRes ? eclipseRes.obscuration : null;

	const { startMs, endMs } = getLunarPhaseRange(refTempo.epoch.ms, { sphere });
	const start = new Tempo(startMs, { timeZone, timeStamp: 'ms', ...(sphere ? { sphere } : {}) });
	const end = new Tempo(endMs, { timeZone, timeStamp: 'ms', ...(sphere ? { sphere } : {}) });

	return {
		...lunarDetails,
		group: 'lunar' as const,
		geo: hasGeo ? geo : null,
		...toDateTimeFields(start),
		moonrise,
		moonset,
		transit,
		altitude,
		azimuth,
		isAboveHorizon,
		crescentTiltDeg,
		distanceKm,
		angularDiameterArcmin,
		isSupermoon,
		isMicromoon,
		eclipse,
		obscuration,
		start,
		end,
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
			elevation: null,
			sunrise: null,
			sunset: null,
			noon: null,
			solarTime: null,
			altitude: null,
			azimuth: null,
			zenith: null,
			isGoldenHour: null,
			isBlueHour: null,
			shadowRatio: null,
			isMidnightSun: null,
			isPolarNight: null,
			daylightDurationMs: null,
			isDaylight: null,
			civil: { sunrise: null, sunset: null },
			nautical: { sunrise: null, sunset: null },
			astronomical: { sunrise: null, sunset: null },
			eclipse: null,
			obscuration: null,
			start: refTempo,
			end: refTempo,
		};
	}

	const elevation = isNumber((geo as any)?.elevation)
		? (geo as any).elevation
		: (isNumber((t.config?.geo as any)?.elevation) ? (t.config?.geo as any).elevation : undefined);

	const epochMs = refTempo.epoch.ms;
	const res = getSunriseSunset(epochMs, {
		latitude: lat!,
		longitude: lng!,
		...(elevation !== undefined ? { elevation } : {}),
	});

	const position = getSolarPosition(epochMs, {
		latitude: lat!,
		longitude: lng!,
		...(elevation !== undefined ? { elevation } : {}),
	});

	const sunrise = toTempoOrNull(res.sunriseMs, timeZone);
	const sunset = toTempoOrNull(res.sunsetMs, timeZone);
	const solarNoon = toTempoOrNull(res.solarNoonMs, timeZone)!;

	const localSolarDayStartMs = Date.UTC(
		new Date(epochMs + (lng! * 240000)).getUTCFullYear(),
		new Date(epochMs + (lng! * 240000)).getUTCMonth(),
		new Date(epochMs + (lng! * 240000)).getUTCDate()
	);
	const solarTimeMs = Math.round(epochMs + (localSolarDayStartMs + 43200000 - res.solarNoonMs));
	const solarTime = toTempoOrNull(solarTimeMs, 'UTC')!;

	const civilSunrise = toTempoOrNull(res.civil.sunriseMs, timeZone);
	const civilSunset = toTempoOrNull(res.civil.sunsetMs, timeZone);
	const nauticalSunrise = toTempoOrNull(res.nautical.sunriseMs, timeZone);
	const nauticalSunset = toTempoOrNull(res.nautical.sunsetMs, timeZone);
	const astroSunrise = toTempoOrNull(res.astronomical.sunriseMs, timeZone);
	const astroSunset = toTempoOrNull(res.astronomical.sunsetMs, timeZone);

	const eclipseRes = getEclipse(epochMs, lat!, lng!);
	const eclipse = eclipseRes.type && eclipseRes.type.endsWith('-solar') ? eclipseRes.type : null;
	const obscuration = eclipseRes.type && eclipseRes.type.endsWith('-solar') ? eclipseRes.obscuration : 0;

	let start: Tempo;
	let end: Tempo;

	if (res.isMidnightSun || res.isPolarNight || !sunrise || !sunset) {
		start = new Tempo(res.solarNoonMs - 43200000, { timeZone, timeStamp: 'ms' });
		end = new Tempo(res.solarNoonMs + 43200000, { timeZone, timeStamp: 'ms' });
	} else if (res.solarPhaseState === 'daylight') {
		start = sunrise;
		end = sunset;
	} else if (res.solarPhaseState === 'civil-twilight') {
		if (civilSunrise && epochMs < res.sunriseMs!) {
			start = civilSunrise;
			end = sunrise;
		} else {
			start = sunset;
			end = civilSunset ?? sunset;
		}
	} else if (res.solarPhaseState === 'nautical-twilight') {
		if (nauticalSunrise && civilSunrise && epochMs < res.civil.sunriseMs!) {
			start = nauticalSunrise;
			end = civilSunrise;
		} else {
			start = civilSunset ?? sunset;
			end = nauticalSunset ?? sunset;
		}
	} else if (res.solarPhaseState === 'astronomical-twilight') {
		if (astroSunrise && nauticalSunrise && epochMs < res.nautical.sunriseMs!) {
			start = astroSunrise;
			end = nauticalSunrise;
		} else {
			start = nauticalSunset ?? sunset;
			end = astroSunset ?? sunset;
		}
	} else {
		start = sunset;
		end = new Tempo(res.sunriseMs! + 86400000, { timeZone, timeStamp: 'ms' });
	}

	return {
		key: res.solarPhaseState,
		phase: SOLAR_PHASE_NAMES[res.solarPhaseState],
		phases: SOLAR_PHASE_STATES,
		index: res.index,
		group: 'solar' as const,
		geo,
		elevation: isNumber(geo?.elevation) ? geo.elevation : (isNumber((t.config?.geo as any)?.elevation) ? (t.config?.geo as any).elevation : null),
		...toDateTimeFields(start),
		sunrise,
		sunset,
		noon: solarNoon,
		solarTime,
		altitude: position.altitude,
		azimuth: position.azimuth,
		zenith: position.zenith,
		isGoldenHour: position.isGoldenHour,
		isBlueHour: position.isBlueHour,
		shadowRatio: position.shadowRatio,
		isMidnightSun: res.isMidnightSun,
		isPolarNight: res.isPolarNight,
		daylightDurationMs: res.daylightDurationMs,
		isDaylight: res.isDaylight,
		civil: { sunrise: civilSunrise, sunset: civilSunset },
		nautical: { sunrise: nauticalSunrise, sunset: nauticalSunset },
		astronomical: { sunrise: astroSunrise, sunset: astroSunset },
		eclipse,
		obscuration,
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
	const { refTempo, lat, lng, hasGeo, geo, timeZone } = getCelestialCoordinates(t, anchor);
	const lunitidalIntervalMin = isNumber((geo as any)?.lunitidalIntervalMin)
		? (geo as any).lunitidalIntervalMin
		: (isNumber((t.config?.geo as any)?.lunitidalIntervalMin) ? (t.config?.geo as any).lunitidalIntervalMin : undefined);
	const regime = (geo as any)?.regime ?? (t.config?.geo as any)?.regime;

	const res = getTidalState(refTempo.epoch.ms, hasGeo ? {
		latitude: lat!,
		longitude: lng!,
		...(lunitidalIntervalMin !== undefined ? { lunitidalIntervalMin } : {}),
		...(regime ? { regime } : {}),
	} : 0);

	const nextHighTide = res.nextHighTideMs ? toTempoOrNull(res.nextHighTideMs, timeZone) : null;
	const nextLowTide = res.nextLowTideMs ? toTempoOrNull(res.nextLowTideMs, timeZone) : null;

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
		nextHighTide,
		nextLowTide,
		lunitidalIntervalMin: res.lunitidalIntervalMin ?? null,
		regime: res.regime ?? null,
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

