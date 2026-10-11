import { defineTerm, WeakCache, TermHook } from '@magmacomputing/tempo/plugin/sdk';
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
	aliases: ['solar'],
	scope: 'solar',
	description: 'Local solar day cycle and twilight range resolution',
	phases: SOLAR_PHASE_STATES,
	...createCelestialTermHandlers(getSolarScopeRange),

	[TermHook.bound](boundary: 'start' | 'mid' | 'end', _unit: string, tempo: Tempo) {
		const scope = getSolarScopeRange(tempo);
		if (boundary === 'start') return scope.sunrise ?? scope.start;
		if (boundary === 'end') return scope.sunset ?? scope.end;
		if (boundary === 'mid') return scope.noon ?? tempo.set({ hour: 12, minute: 0, second: 0, millisecond: 0 });
		return undefined;
	},

	[TermHook.parse](input: string, context?: any) {
		const lower = input.toLowerCase();
		if (lower.startsWith('#sun.') || lower.startsWith('#solar.')) {
			const sub = lower.split('.')[1];
			const anchor = context?.anchor;
			const geo = context?.geo ?? context?.config?.geo;
			const target = anchor ? (anchor.geo ? anchor : (geo ? new Tempo(anchor, { ...anchor.config, geo }) : anchor)) : new Tempo(undefined, { ...(context?.config ?? {}), ...(geo ? { geo } : {}) });
			const coords = getCelestialCoordinates(target, anchor);
			if (!coords.hasGeo) return undefined;
			const scope = getSolarScopeRange(coords.refTempo, anchor);

			if (sub === 'sunrise') return scope.sunrise ?? undefined;
			if (sub === 'sunset') return scope.sunset ?? undefined;
			if (sub === 'noon') return scope.noon ?? undefined;
			if (sub === 'nadir') return scope.nadir ?? undefined;
			if (sub === 'dawn') return scope.civil.sunrise ?? undefined;
			if (sub === 'dusk') return scope.civil.sunset ?? undefined;
			if (sub === 'start') return scope.sunrise ?? scope.start;
			if (sub === 'end') return scope.sunset ?? scope.end;
			if (sub === 'mid') return scope.noon ?? undefined;
		}
		return undefined;
	},

	[TermHook.format](token: string, tempo: Tempo) {
		const t = token.toLowerCase();
		if (t === '#sun' || t === '#solar' || t.startsWith('#sun.') || t.startsWith('#solar.')) {
			const scope = getSolarScopeRange(tempo);
			if (t === '#solar.phase' || t === '#sun.phase' || t === '#sun' || t === '#solar') return scope.phase ?? '';
			if (t === '#solar.key' || t === '#sun.key') return scope.key ?? '';
			const elev = scope.altitude ?? scope.elevation;
			if (t === '#solar.elevation' || t === '#sun.elevation' || t === '#solar.altitude' || t === '#sun.altitude') {
				return elev != null ? `${Math.round(elev * 10) / 10}°` : '';
			}
			if (t === '#solar.azimuth' || t === '#sun.azimuth') return scope.azimuth != null ? `${Math.round(scope.azimuth * 10) / 10}°` : '';
			if (t === '#solar.zenith' || t === '#sun.zenith') return scope.zenith != null ? `${Math.round(scope.zenith * 10) / 10}°` : '';
		}
		return undefined;
	},
});
