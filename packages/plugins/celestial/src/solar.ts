import { defineTerm, WeakCache } from '@magmacomputing/tempo/plugin/sdk';
import {
	getSunriseSunset,
	getSolarPosition,
	getEclipse,
	SOLAR_PHASE_STATES,
	SOLAR_PHASE_NAMES,
	HALF_DAY_MS,
	DAY_MS,
} from '@magmacomputing/tempo-fns';
import { Tempo } from '@magmacomputing/tempo';
import { isNumber } from '@magmacomputing/tempo/library';
import { getCelestialCoordinates, toDateTimeFields, toTempoOrNull, createCelestialTermHandlers } from './util.js';

export type SolarPhaseState = 'daylight' | 'night' | 'civil-twilight' | 'nautical-twilight' | 'astronomical-twilight';

const SUNRISE_SUNSET_CACHE = new WeakCache<string, ReturnType<typeof getSunriseSunset>>();
const SOLAR_POSITION_CACHE = new WeakCache<string, ReturnType<typeof getSolarPosition>>();

/**
 * Returns sunrise, sunset, and twilight data, weakly cached by timestamp, location, and elevation.
 *
 * @param epochMs - The reference time in milliseconds since the Unix epoch
 * @param options - Observer coordinates in degrees and optional elevation in meters
 * @returns The cached or newly calculated solar events
 */
export function cachedSunriseSunset(epochMs: number, options: { latitude: number; longitude: number; elevation?: number }) {
	const key = `${epochMs}:${options.latitude}:${options.longitude}:${options.elevation ?? 0}`;
	let res = SUNRISE_SUNSET_CACHE.get(key);
	if (!res) {
		res = getSunriseSunset(epochMs, options);
		SUNRISE_SUNSET_CACHE.set(key, res);
	}
	return res;
}

/**
 * Returns the sun's position, weakly cached by timestamp, location, and elevation.
 *
 * @param epochMs - The reference time in milliseconds since the Unix epoch
 * @param options - Observer coordinates in degrees and optional elevation in meters
 * @returns The cached or newly calculated solar position
 */
export function cachedSolarPosition(epochMs: number, options: { latitude: number; longitude: number; elevation?: number }) {
	const key = `${epochMs}:${options.latitude}:${options.longitude}:${options.elevation ?? 0}`;
	let res = SOLAR_POSITION_CACHE.get(key);
	if (!res) {
		res = getSolarPosition(epochMs, options);
		SOLAR_POSITION_CACHE.set(key, res);
	}
	return res;
}

/**
 * Determines the current solar phase and its daily time range for a reference time and location.
 *
 * @param t - The Tempo context used to resolve the reference time and location
 * @param anchor - Optional anchor used when resolving the reference time and location
 * @returns Solar phase metadata, sunrise and sunset events, twilight events, and the applicable time range
 */
export function getSolarScopeRange(t: Tempo, anchor?: any) {
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
			nadir: null,
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
	const res = cachedSunriseSunset(epochMs, {
		latitude: lat!,
		longitude: lng!,
		...(elevation !== undefined ? { elevation } : {}),
	});

	const position = cachedSolarPosition(epochMs, {
		latitude: lat!,
		longitude: lng!,
		...(elevation !== undefined ? { elevation } : {}),
	});

	const sunrise = toTempoOrNull(res.sunriseMs, timeZone);
	const sunset = toTempoOrNull(res.sunsetMs, timeZone);
	const solarNoon = toTempoOrNull(res.solarNoonMs, timeZone);
	const solarNadir = toTempoOrNull(res.solarNadirMs, timeZone);

	const localSolarDayStartMs = Date.UTC(
		new Date(epochMs + (lng! * 240000)).getUTCFullYear(),
		new Date(epochMs + (lng! * 240000)).getUTCMonth(),
		new Date(epochMs + (lng! * 240000)).getUTCDate()
	);
	const solarTimeMs = Math.round(epochMs + (localSolarDayStartMs + HALF_DAY_MS - res.solarNoonMs));
	const solarTime = toTempoOrNull(solarTimeMs, 'UTC');

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
		start = new Tempo(res.solarNoonMs - HALF_DAY_MS, { timeZone, timeStamp: 'ms' });
		end = new Tempo(res.solarNoonMs + HALF_DAY_MS, { timeZone, timeStamp: 'ms' });
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
		end = new Tempo(res.sunriseMs! + DAY_MS, { timeZone, timeStamp: 'ms' });
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
		nadir: solarNadir,
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
