import {
	SYNODIC_MONTH,
	REF_NEW_MOON_MS,
	SolarOptions,
	resolveCoordinates,
	getStartOfLocalDayMs,
	getMoonPosition,
	getMoonHourAngle,
	getLunarDistanceMetrics,
	getLunarSyzygyMetrics,
	getSunCoordinates,
	getMoonAltitude,
	getLunarAgeDays,
	getLunarHorizonThreshold,
	calculateAltitudeRad,
	normalizeDegrees,
	toEpochMs,
} from './support.js';

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

/** Ordered array of all eight lunar phase identifier keys */
export const LUNAR_PHASE_KEYS = Object.freeze([
	'new-moon',
	'waxing-crescent',
	'first-quarter',
	'waxing-gibbous',
	'full-moon',
	'waning-gibbous',
	'third-quarter',
	'waning-crescent'
] as const);

export interface LunarPhaseResult {
	key: LunarPhaseKey;
	phase: LunarPhaseName;
	/** 1-based phase index (1..8) */
	index: number;
	/** Fraction of lunar disk illuminated (0.0 to 1.0) */
	illumination: number;
	/** Age of moon in days (0.0 to ~29.53) */
	ageDays: number;
	/** True if waxing, false if waning */
	isWaxing: boolean;
	/** Unicode emoji representation based on hemisphere */
	emoji?: string | undefined;
	/** Ordered list of all 8 lunar phase keys */
	phases: readonly LunarPhaseKey[];
}

export interface LunarPhaseOptions {
	sphere?: 'north' | 'south' | 'North' | 'South' | string | undefined;
}

/**
 * Determines the lunar phase for a date or epoch timestamp.
 *
 * @param dateInput - Date, ISO date string, or epoch timestamp in milliseconds
 * @param options - Optional hemisphere used to select the phase emoji
 * @returns Lunar phase details including age, illumination, phase name, index, waxing status, emoji, and ordered phase keys
 */
export function getLunarPhase(dateInput: Date | number | string, options: LunarPhaseOptions = {}): LunarPhaseResult {
	const epochMs = toEpochMs(dateInput);
	const ageDays = getLunarAgeDays(epochMs);

	const angle = (ageDays / SYNODIC_MONTH) * 2 * Math.PI;
	const illumination = (1 - Math.cos(angle)) / 2;
	const isWaxing = ageDays < SYNODIC_MONTH / 2;

	let sphereVal = options.sphere;
	let isNorth = false;
	let isSouth = false;
	if (typeof sphereVal === 'string') {
		const s = sphereVal.toLowerCase();
		if (s === 'north') isNorth = true;
		else if (s === 'south') isSouth = true;
	}

	let key: LunarPhaseKey;
	let phase: LunarPhaseName;
	let index: number;
	let emoji: string | undefined;

	const step = SYNODIC_MONTH / 16;

	if (ageDays < step || ageDays >= SYNODIC_MONTH - step) {
		key = 'new-moon';
		phase = 'New Moon';
		index = 1;
		if (isNorth || isSouth) emoji = '🌑';
	} else if (ageDays < 3 * step) {
		key = 'waxing-crescent';
		phase = 'Waxing Crescent';
		index = 2;
		if (isSouth) emoji = '🌘';
		else if (isNorth) emoji = '🌒';
	} else if (ageDays < 5 * step) {
		key = 'first-quarter';
		phase = 'First Quarter';
		index = 3;
		if (isSouth) emoji = '🌗';
		else if (isNorth) emoji = '🌓';
	} else if (ageDays < 7 * step) {
		key = 'waxing-gibbous';
		phase = 'Waxing Gibbous';
		index = 4;
		if (isSouth) emoji = '🌖';
		else if (isNorth) emoji = '🌔';
	} else if (ageDays < 9 * step) {
		key = 'full-moon';
		phase = 'Full Moon';
		index = 5;
		if (isNorth || isSouth) emoji = '🌕';
	} else if (ageDays < 11 * step) {
		key = 'waning-gibbous';
		phase = 'Waning Gibbous';
		index = 6;
		if (isSouth) emoji = '🌔';
		else if (isNorth) emoji = '🌖';
	} else if (ageDays < 13 * step) {
		key = 'third-quarter';
		phase = 'Third Quarter';
		index = 7;
		if (isSouth) emoji = '🌓';
		else if (isNorth) emoji = '🌗';
	} else {
		key = 'waning-crescent';
		phase = 'Waning Crescent';
		index = 8;
		if (isSouth) emoji = '🌒';
		else if (isNorth) emoji = '🌘';
	}

	return { key, phase, index, illumination, ageDays, isWaxing, emoji, phases: LUNAR_PHASE_KEYS };
}

export interface LunarPhaseRange {
	startMs: number;
	endMs: number;
	phase: LunarPhaseResult;
}

/**
 * Calculates start and end timestamps for the active lunar phase window.
 *
 * @param dateInput - Date, Temporal object, or epoch timestamp in ms
 * @param options - Options including hemisphere
 * @returns Object with `startMs`, `endMs`, and phase details
 */
export function getLunarPhaseRange(dateInput: Date | number | string, options: LunarPhaseOptions = {}): LunarPhaseRange {
	const epochMs = toEpochMs(dateInput);

	const phase = getLunarPhase(epochMs, options);
	const ageDays = getLunarAgeDays(epochMs);

	const rawBucket = Math.floor((ageDays + SYNODIC_MONTH / 16) / (SYNODIC_MONTH / 8));
	const phaseStartDaysOffset = rawBucket === 0 ? -SYNODIC_MONTH / 16 : (rawBucket * (SYNODIC_MONTH / 8)) - (SYNODIC_MONTH / 16);
	const phaseEndDaysOffset = phaseStartDaysOffset + (SYNODIC_MONTH / 8);

	const cycleStartMs = epochMs - (ageDays * 86400000);
	const startMs = Math.round(cycleStartMs + (phaseStartDaysOffset * 86400000));
	const endMs = Math.round(cycleStartMs + (phaseEndDaysOffset * 86400000));

	return { startMs, endMs, phase };
}

export interface MoonriseMoonsetResult {
	latitude: number;
	longitude: number;
	moonriseMs?: number | undefined;
	moonsetMs?: number | undefined;
}

/**
 * Calculates moonrise and moonset times for a date and geographic location.
 * A time is undefined when the Moon does not cross the rise or set threshold during that local calendar day.
 *
 * @param dateInput - Date string, `Date`, or epoch timestamp in milliseconds
 * @param latOrOptions - Latitude in degrees or geographic options
 * @param lonInput - Longitude in degrees when `latOrOptions` is a latitude
 * @returns The resolved coordinates and optional moonrise and moonset timestamps in milliseconds
 */
export function getMoonriseMoonset(
	dateInput: Date | number | string,
	latOrOptions: number | SolarOptions = 0,
	lonInput = 0
): MoonriseMoonsetResult {
	const epochMs = toEpochMs(dateInput);

	const { lat, lng } = resolveCoordinates(latOrOptions, lonInput);
	const { startOfDayMs } = getStartOfLocalDayMs(epochMs, lng);
	const moonDayStartMs = startOfDayMs - (lng * 240000);

	let moonriseMs: number | undefined = undefined;
	let moonsetMs: number | undefined = undefined;

	const initial = getMoonAltitude(moonDayStartMs, lat, lng);
	let prevAlt = initial.alt - initial.targetAlt;

	for (let i = 1; i <= 24; i++) {
		const currentMs = moonDayStartMs + (i * 3600000);
		const { alt, targetAlt } = getMoonAltitude(currentMs, lat, lng);
		const currAlt = alt - targetAlt;

		if (prevAlt < 0 && currAlt >= 0) {
			const fraction = -prevAlt / (currAlt - prevAlt);
			moonriseMs = Math.round(moonDayStartMs + ((i - 1 + fraction) * 3600000));
		} else if (prevAlt > 0 && currAlt <= 0) {
			const fraction = prevAlt / (prevAlt - currAlt);
			moonsetMs = Math.round(moonDayStartMs + ((i - 1 + fraction) * 3600000));
		}

		prevAlt = currAlt;
	}

	return {
		latitude: lat,
		longitude: lng,
		moonriseMs,
		moonsetMs,
	};
}

export interface LunarPositionResult {
	latitude: number;
	longitude: number;
	/** Topocentric altitude above (+) or below (-) horizon in degrees (-90..90) */
	altitude: number;
	/** Compass azimuth bearing in degrees from True North (0..360, North=0, East=90) */
	azimuth: number;
	/** True if Moon is above observer's horizon accounting for horizontal parallax and refraction */
	isAboveHorizon: boolean;
	/** Epoch millisecond of upper meridian culmination (transit) during the observer's local calendar day, or undefined */
	transitMs?: number | undefined;
	/** Apparent right ascension in degrees (0..360) */
	rightAscensionDeg: number;
	/** Apparent declination in degrees (-90..90) */
	declinationDeg: number;
	/** Distance from observer to Moon in kilometers */
	distanceKm: number;
	/** Apparent angular diameter in arcminutes */
	angularDiameterArcmin: number;
}

export interface LunarDistanceResult {
	/** Distance from Earth to Moon in kilometers */
	distanceKm: number;
	/** Apparent angular diameter in arcminutes */
	angularDiameterArcmin: number;
	/** Equatorial horizontal parallax in degrees */
	horizontalParallaxDeg: number;
	/** Proximity factor to lunar perigee (0.0 = apogee, 1.0 = perigee) */
	perigeeFactor: number;
	/** True if Full Moon or New Moon occurs near perigee (supermoon) */
	isSupermoon: boolean;
	/** True if Full Moon or New Moon occurs near apogee (micromoon) */
	isMicromoon: boolean;
}

export interface CrescentTiltResult {
	/** Apparent tilt angle of bright illuminated limb relative to local zenith in degrees (0..360) */
	crescentTiltDeg: number;
	/** Position angle of bright limb relative to North celestial pole in degrees (0..360) */
	brightLimbAngleDeg: number;
	/** Parallactic angle between celestial pole, Moon, and local zenith in degrees (0..360) */
	parallacticAngleDeg: number;
}

/**
 * Calculates the local meridian transit (upper culmination / highest sky altitude) timestamp for a date and location.
 *
 * @param dateInput - Date value, ISO date string, or epoch timestamp in milliseconds
 * @param latOrOptions - Latitude in degrees or coordinate options
 * @param lonInput - Longitude in degrees when `latOrOptions` is a latitude
 * @returns Epoch millisecond timestamp of upper meridian transit, or undefined if no transit occurs on the local calendar day
 */
export function getLunarTransit(
	dateInput: Date | number | string,
	latOrOptions: number | SolarOptions = 0,
	lonInput = 0
): number | undefined {
	const epochMs = toEpochMs(dateInput);

	const { lng } = resolveCoordinates(latOrOptions, lonInput);
	const { startOfDayMs } = getStartOfLocalDayMs(epochMs, lng);
	const dayStartMs = startOfDayMs - (lng * 240000);

	let prevHa = getMoonHourAngle(dayStartMs, lng);

	for (let i = 1; i <= 24; i++) {
		const currentMs = dayStartMs + (i * 3600000);
		const currHa = getMoonHourAngle(currentMs, lng);

		if (prevHa < 0 && currHa >= 0) {
			const fraction = -prevHa / (currHa - prevHa);
			let transitEst = Math.round(dayStartMs + ((i - 1 + fraction) * 3600000));
			// Refinement step
			const refinedHa = getMoonHourAngle(transitEst, lng);
			const rate = (currHa - prevHa) / 3600000;

			if (rate !== 0)
				transitEst = Math.round(transitEst - (refinedHa / rate));

			return transitEst;
		}

		prevHa = currHa;
	}

	return undefined;
}

/**
 * Calculates lunar distance, horizontal parallax, apparent angular diameter, and supermoon/micromoon status.
 *
 * @param dateInput - Date value, ISO date string, or epoch timestamp in milliseconds
 * @returns Lunar distance metrics in km, angular diameter in arcmin, perigee factor, and supermoon/micromoon indicators
 */
export function getLunarDistance(dateInput: Date | number | string): LunarDistanceResult {
	const epochMs = toEpochMs(dateInput);

	const { hp } = getMoonPosition(epochMs);
	const { distanceKm, angularDiameterArcmin } = getLunarDistanceMetrics(hp);
	const { perigeeFactor, isSupermoon, isMicromoon } = getLunarSyzygyMetrics(epochMs, distanceKm);

	return {
		distanceKm,
		angularDiameterArcmin,
		horizontalParallaxDeg: Math.round(hp * 10000) / 10000,
		perigeeFactor,
		isSupermoon,
		isMicromoon,
	};
}

/**
 * Calculates topocentric altitude, azimuth, meridian transit, and apparent visual coordinates of the Moon.
 *
 * @param dateInput - Date value, ISO date string, or epoch timestamp in milliseconds
 * @param latOrOptions - Latitude in degrees or coordinate options
 * @param lonInput - Longitude in degrees when `latOrOptions` is a latitude
 * @returns Real-time topocentric position (altitude, azimuth, visibility, transit, RA, Dec, distance)
 */
export function getLunarPosition(
	dateInput: Date | number | string,
	latOrOptions: number | SolarOptions = 0,
	lonInput = 0
): LunarPositionResult {
	const epochMs = toEpochMs(dateInput);

	const { lat, lng } = resolveCoordinates(latOrOptions, lonInput);
	const rad = Math.PI / 180;
	const latRad = lat * rad;

	const { ra, dec, hp } = getMoonPosition(epochMs);
	const ha = getMoonHourAngle(epochMs, lng, ra);

	const altGeoRad = calculateAltitudeRad(latRad, dec, ha);

	// Topocentric parallax correction on altitude
	const altTopoRad = altGeoRad - (hp * rad) * Math.cos(altGeoRad);
	const altDeg = altTopoRad / rad;

	// Azimuth measured North through East (0..360°)
	const yAz = -Math.sin(ha);
	const xAz = Math.cos(latRad) * Math.tan(dec) - Math.sin(latRad) * Math.cos(ha);
	const azDeg = normalizeDegrees(Math.atan2(yAz, xAz) / rad);

	const targetAlt = getLunarHorizonThreshold(hp);
	const isAboveHorizon = altDeg >= targetAlt;

	const { distanceKm, angularDiameterArcmin } = getLunarDistanceMetrics(hp);
	const transitMs = getLunarTransit(epochMs, lat, lng);

	return {
		latitude: lat,
		longitude: lng,
		altitude: Math.round(altDeg * 100) / 100,
		azimuth: Math.round(azDeg * 100) / 100,
		isAboveHorizon,
		transitMs,
		rightAscensionDeg: Math.round(normalizeDegrees(ra * 180 / Math.PI) * 100) / 100,
		declinationDeg: Math.round((dec * 180 / Math.PI) * 100) / 100,
		distanceKm,
		angularDiameterArcmin,
	};
}

/**
 * Calculates the crescent tilt angle (position angle of the bright limb relative to local zenith).
 *
 * In tropical latitudes, this captures the "Wet Moon" / horizontal crescent orientation.
 *
 * @param dateInput - Date value, ISO date string, or epoch timestamp in milliseconds
 * @param latOrOptions - Latitude in degrees or coordinate options
 * @param lonInput - Longitude in degrees when `latOrOptions` is a latitude
 * @returns Crescent tilt angle relative to zenith, bright limb position angle, and parallactic angle
 */
export function getCrescentTilt(
	dateInput: Date | number | string,
	latOrOptions: number | SolarOptions = 0,
	lonInput = 0
): CrescentTiltResult {
	const epochMs = toEpochMs(dateInput);

	const { lat, lng } = resolveCoordinates(latOrOptions, lonInput);
	const rad = Math.PI / 180;
	const latRad = lat * rad;

	const { ra, dec } = getMoonPosition(epochMs);
	const { raSun, decSun } = getSunCoordinates(epochMs);

	// Position angle of illuminated limb relative to North celestial pole
	const yP = Math.cos(decSun) * Math.sin(raSun - ra);
	const xP = Math.sin(decSun) * Math.cos(dec) - Math.cos(decSun) * Math.sin(dec) * Math.cos(raSun - ra);
	const brightLimbAngleDeg = normalizeDegrees(Math.atan2(yP, xP) / rad);

	// Parallactic angle q (angle between North celestial pole and zenith)
	const ha = getMoonHourAngle(epochMs, lng, ra);
	const yQ = Math.sin(ha);
	const xQ = Math.tan(latRad) * Math.cos(dec) - Math.sin(dec) * Math.cos(ha);
	const parallacticAngleDeg = normalizeDegrees(Math.atan2(yQ, xQ) / rad);

	// Crescent tilt relative to local zenith
	const crescentTiltDeg = normalizeDegrees(brightLimbAngleDeg - parallacticAngleDeg);

	return {
		crescentTiltDeg: Math.round(crescentTiltDeg * 100) / 100,
		brightLimbAngleDeg: Math.round(brightLimbAngleDeg * 100) / 100,
		parallacticAngleDeg: Math.round(parallacticAngleDeg * 100) / 100,
	};
}
