import { defineTerm, WeakCache } from '@magmacomputing/tempo/plugin/sdk';
import {
	getLunarPhaseRange,
	getMoonriseMoonset,
	getLunarPosition,
	getLunarDistance,
	getCrescentTilt,
	getEclipse,
	LUNAR_PHASE_KEYS,
} from '@magmacomputing/tempo-fns';
import { Tempo } from '@magmacomputing/tempo';
import type { LunarPhaseKey, LunarPhaseName } from '@magmacomputing/tempo-fns';
import { getCelestialCoordinates, toDateTimeFields, toTempoOrNull, getLunarDetails, createCelestialTermHandlers } from './util.js';

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

const LUNAR_PHASE_RANGE_CACHE = new WeakCache<string, { startMs: number; endMs: number }>();
const MOON_EVENTS_CACHE = new WeakCache<string, ReturnType<typeof getMoonriseMoonset>>();
const LUNAR_POSITION_CACHE = new WeakCache<string, ReturnType<typeof getLunarPosition>>();

/**
 * Returns the lunar phase range, weakly cached by timestamp and hemisphere.
 *
 * @param epochMs - The reference time in milliseconds since the Unix epoch
 * @param sphere - The optional hemisphere for the lunar phase calculation
 * @returns The phase range's start and end timestamps in milliseconds
 */
export function cachedLunarPhaseRange(epochMs: number, sphere?: 'north' | 'south') {
	const key = `${epochMs}:${sphere ?? ''}`;
	let res = LUNAR_PHASE_RANGE_CACHE.get(key);
	if (!res) {
		res = getLunarPhaseRange(epochMs, { sphere });
		LUNAR_PHASE_RANGE_CACHE.set(key, res);
	}
	return res;
}

/**
 * Returns moonrise and moonset data, weakly cached by timestamp and location.
 *
 * @param epochMs - The reference time in milliseconds since the Unix epoch
 * @param lat - The observer's latitude in degrees
 * @param lng - The observer's longitude in degrees
 * @returns The cached or newly calculated lunar events
 */
export function cachedMoonEvents(epochMs: number, lat: number, lng: number) {
	const key = `${epochMs}:${lat}:${lng}`;
	let res = MOON_EVENTS_CACHE.get(key);
	if (!res) {
		res = getMoonriseMoonset(epochMs, lat, lng);
		MOON_EVENTS_CACHE.set(key, res);
	}
	return res;
}

/**
 * Returns the moon's position, weakly cached by timestamp and location.
 *
 * @param epochMs - The reference time in milliseconds since the Unix epoch
 * @param lat - The observer's latitude in degrees
 * @param lng - The observer's longitude in degrees
 * @returns The cached or newly calculated lunar position
 */
export function cachedLunarPosition(epochMs: number, lat: number, lng: number) {
	const key = `${epochMs}:${lat}:${lng}`;
	let res = LUNAR_POSITION_CACHE.get(key);
	if (!res) {
		res = getLunarPosition(epochMs, lat, lng);
		LUNAR_POSITION_CACHE.set(key, res);
	}
	return res;
}

/**
 * Resolves lunar phase details, lunar events, geolocation, and the containing time range.
 *
 * @param t - Tempo context used to determine the reference time and lunar details
 * @param anchor - Optional anchor used to resolve celestial context
 * @returns Lunar scope data with phase metadata, optional moonrise and moonset times, topocentric ephemeris, and start/end boundaries
 */
export function getLunarScopeRange(t: Tempo, anchor?: any) {
	const coords = getCelestialCoordinates(t, anchor);
	const { refTempo, lat, lng, hasGeo, geo, timeZone, sphere } = coords;

	const lunarDetails = getLunarDetails(t, coords);

	const moonEvents = hasGeo ? cachedMoonEvents(refTempo.epoch.ms, lat!, lng!) : null;
	const moonrise = moonEvents ? toTempoOrNull(moonEvents.moonriseMs, timeZone, sphere) : null;
	const moonset = moonEvents ? toTempoOrNull(moonEvents.moonsetMs, timeZone, sphere) : null;

	const position = hasGeo ? cachedLunarPosition(refTempo.epoch.ms, lat!, lng!) : null;
	const distance = hasGeo ? getLunarDistance(refTempo.epoch.ms) : null;
	const crescentTilt = hasGeo ? getCrescentTilt(refTempo.epoch.ms, lat!, lng!) : null;
	const eclipseRes = hasGeo ? getEclipse(refTempo.epoch.ms, lat!, lng!) : null;

	const transit = position?.transitMs ? toTempoOrNull(position.transitMs, timeZone, sphere) : null;
	const nadir = position?.antiTransitMs ? toTempoOrNull(position.antiTransitMs, timeZone, sphere) : null;
	const altitude = position ? position.altitude : null;
	const azimuth = position ? position.azimuth : null;
	const zenith = position ? position.zenith : null;
	const isAboveHorizon = position ? position.isAboveHorizon : null;
	const crescentTiltDeg = crescentTilt ? crescentTilt.crescentTiltDeg : null;
	const distanceKm = distance ? distance.distanceKm : null;
	const angularDiameterArcmin = distance ? distance.angularDiameterArcmin : null;
	const isSupermoon = distance ? distance.isSupermoon : null;
	const isMicromoon = distance ? distance.isMicromoon : null;
	const eclipse = eclipseRes ? eclipseRes.type : null;
	const obscuration = eclipseRes ? eclipseRes.obscuration : null;

	const { startMs, endMs } = cachedLunarPhaseRange(refTempo.epoch.ms, sphere);
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
		nadir,
		altitude,
		azimuth,
		zenith,
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
