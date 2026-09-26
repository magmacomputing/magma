import {
	SolarOptions,
	SolarTwilightWindow,
	resolveCoordinates,
	getStartOfLocalDayMs,
	getSunCoordinates,
	getSunHourAngle,
	calculateAltitudeRad,
	normalizeDegrees,
	toEpochMs,
} from './support.js';

/** Ordered array of solar phase state identifiers from darkest to brightest */
export const SOLAR_PHASE_STATES = Object.freeze([
	'night',
	'astronomical-twilight',
	'nautical-twilight',
	'civil-twilight',
	'daylight'
] as const);

export type SolarPhaseName =
	| 'Daylight'
	| 'Night'
	| 'Civil Twilight'
	| 'Nautical Twilight'
	| 'Astronomical Twilight';

/** Maps solar phase state keys to their human-readable display names */
export const SOLAR_PHASE_NAMES: Record<typeof SOLAR_PHASE_STATES[number], SolarPhaseName> = Object.freeze({
	'daylight': 'Daylight',
	'night': 'Night',
	'civil-twilight': 'Civil Twilight',
	'nautical-twilight': 'Nautical Twilight',
	'astronomical-twilight': 'Astronomical Twilight',
});

export interface SolarEventResult {
	key: 'Vernal' | 'Summer' | 'Autumnal' | 'Winter';
	event: 'Equinox' | 'Solstice';
	epochMs: number;
	year: number;
}

export interface SunriseSunsetResult {
	latitude: number;
	longitude: number;
	elevation?: number;
	sunriseMs: number | null;
	sunsetMs: number | null;
	solarNoonMs: number;
	daylightDurationMs: number;
	isDaylight: boolean;
	isMidnightSun: boolean;
	isPolarNight: boolean;
	solarPhaseState: 'daylight' | 'night' | 'civil-twilight' | 'nautical-twilight' | 'astronomical-twilight';
	/** 1-based solar phase index (1: night, 2: astronomical-twilight, 3: nautical-twilight, 4: civil-twilight, 5: daylight) */
	index: number;
	civil: SolarTwilightWindow;
	nautical: SolarTwilightWindow;
	astronomical: SolarTwilightWindow;
}

export interface SolarPositionResult {
	/** Solar altitude in degrees above (+) or below (-) horizon (-90°..+90°) */
	altitude: number;
	/** Compass bearing in degrees (0°..360°, where 0° = North, 90° = East, 180° = South, 270° = West) */
	azimuth: number;
	/** Angular distance from overhead zenith in degrees (90° - altitude) */
	zenith: number;
	/** True if solar altitude is between -4° and +6° (golden hour lighting) */
	isGoldenHour: boolean;
	/** True if solar altitude is between -6° and -4° (blue hour lighting) */
	isBlueHour: boolean;
	/** Object shadow length multiplier (cot(altitude)) when Sun is above horizon, or null */
	shadowRatio: number | null;
}

/**
 * Calculates the Julian Day Ephemeris time correction for solar events using Jean Meeus algorithms.
 * Applies periodic terms and corrections to refine the initial JDE estimation.
 *
 * @param JDE0 - The initial Julian Day Ephemeris estimate
 * @returns The refined Julian Day Ephemeris value
 * @internal
 */
function calculateMeeusJde(JDE0: number): number {
	const T = (JDE0 - 2451545.0) / 36525;
	const W = 359.9937 * T - 2.47;
	const Delta = 1 + 0.0334 * Math.cos((W * Math.PI) / 180) + 0.0007 * Math.cos((2 * W * Math.PI) / 180);

	const S =
		485 * Math.cos(((324.96 + 1934.136 * T) * Math.PI) / 180) +
		203 * Math.cos(((337.23 + 32668.776 * T) * Math.PI) / 180) +
		199 * Math.cos(((342.08 + 8933.040 * T) * Math.PI) / 180) +
		182 * Math.cos(((27.85 + 4183.998 * T) * Math.PI) / 180) +
		156 * Math.cos(((73.14 + 19353.473 * T) * Math.PI) / 180) +
		136 * Math.cos(((171.52 + 7299.049 * T) * Math.PI) / 180) +
		77 * Math.cos(((222.54 + 22812.296 * T) * Math.PI) / 180) +
		74 * Math.cos(((296.72 + 11726.159 * T) * Math.PI) / 180) +
		70 * Math.cos(((243.58 + 11848.293 * T) * Math.PI) / 180) +
		58 * Math.cos(((119.81 + 191.606 * T) * Math.PI) / 180) +
		52 * Math.cos(((297.17 + 4592.518 * T) * Math.PI) / 180) +
		50 * Math.cos(((21.02 + 4578.031 * T) * Math.PI) / 180) +
		45 * Math.cos(((247.54 + 29929.562 * T) * Math.PI) / 180) +
		44 * Math.cos(((325.15 + 31555.956 * T) * Math.PI) / 180) +
		29 * Math.cos(((60.93 + 4443.417 * T) * Math.PI) / 180) +
		18 * Math.cos(((155.12 + 67555.328 * T) * Math.PI) / 180) +
		17 * Math.cos(((288.79 + 4562.452 * T) * Math.PI) / 180) +
		16 * Math.cos(((198.04 + 62894.029 * T) * Math.PI) / 180) +
		14 * Math.cos(((199.76 + 31436.921 * T) * Math.PI) / 180) +
		12 * Math.cos(((95.39 + 14577.848 * T) * Math.PI) / 180) +
		12 * Math.cos(((287.11 + 31931.756 * T) * Math.PI) / 180) +
		12 * Math.cos(((320.81 + 34777.259 * T) * Math.PI) / 180) +
		9 * Math.cos(((227.73 + 1222.114 * T) * Math.PI) / 180) +
		8 * Math.cos(((15.45 + 16859.074 * T) * Math.PI) / 180);

	return JDE0 + (0.00001 * S) / Delta;
}

/**
 * Calculates the ΔT (Delta T) correction between Terrestrial Time and Universal Time for a given year.
 * Uses polynomial approximations derived from historical data spanning from -500 to +3000.
 *
 * @param year - The calendar year for which to calculate ΔT
 * @returns The ΔT correction value in seconds
 * @internal
 */
function getDeltaT(year: number): number {
	if (year < -500) {
		const u = (year - 1820) / 100;
		return -20 + 32 * u * u;
	}
	if (year < 500) {
		const u = year / 100;
		const u2 = u * u;
		const u3 = u2 * u;
		const u4 = u3 * u;
		const u5 = u4 * u;
		const u6 = u5 * u;
		return 10583.6 - 1014.41 * u + 33.78311 * u2 - 5.952053 * u3 - 0.1798452 * u4 + 0.022174192 * u5 + 0.0090316521 * u6;
	}
	if (year < 1600) {
		const u = (year - 1000) / 100;
		const u2 = u * u;
		const u3 = u2 * u;
		const u4 = u3 * u;
		const u5 = u4 * u;
		const u6 = u5 * u;
		return 1574.2 - 556.01 * u + 71.23472 * u2 + 0.319781 * u3 - 0.8503463 * u4 - 0.005050998 * u5 + 0.0083572073 * u6;
	}
	if (year < 1700) {
		const t = year - 1600;
		const t2 = t * t;
		const t3 = t2 * t;
		return 120 - 0.9808 * t - 0.01532 * t2 + t3 / 7129;
	}
	if (year < 1800) {
		const t = year - 1700;
		const t2 = t * t;
		const t3 = t2 * t;
		const t4 = t3 * t;
		return 8.83 + 0.1603 * t - 0.0059285 * t2 + 0.00013336 * t3 - t4 / 1174000;
	}
	if (year < 1860) {
		const t = year - 1800;
		const t2 = t * t;
		const t3 = t2 * t;
		const t4 = t3 * t;
		const t5 = t4 * t;
		const t6 = t5 * t;
		const t7 = t6 * t;
		return 13.72 - 0.332447 * t + 0.0068612 * t2 + 0.0041116 * t3 - 0.00037436 * t4 + 0.0000121272 * t5 - 0.0000001699 * t6 + 0.000000000875 * t7;
	}
	if (year < 1900) {
		const t = year - 1860;
		const t2 = t * t;
		const t3 = t2 * t;
		const t4 = t3 * t;
		const t5 = t4 * t;
		return 7.62 + 0.5737 * t - 0.251754 * t2 + 0.01680668 * t3 - 0.0004473624 * t4 + t5 / 233174;
	}
	if (year < 1920) {
		const t = year - 1900;
		const t2 = t * t;
		const t3 = t2 * t;
		const t4 = t3 * t;
		return -2.79 + 1.494119 * t - 0.0598939 * t2 + 0.0061966 * t3 - 0.000197 * t4;
	}
	if (year < 1941) {
		const t = year - 1920;
		const t2 = t * t;
		const t3 = t2 * t;
		return 21.20 + 0.84493 * t - 0.076100 * t2 + 0.0020936 * t3;
	}
	if (year < 1961) {
		const t = year - 1950;
		const t2 = t * t;
		const t3 = t2 * t;
		return 29.07 + 0.407 * t - t2 / 233 + t3 / 2547;
	}
	if (year < 1986) {
		const t = year - 1975;
		const t2 = t * t;
		const t3 = t2 * t;
		return 45.45 + 1.067 * t - t2 / 260 - t3 / 718;
	}
	if (year < 2005) {
		const t = year - 2000;
		const t2 = t * t;
		const t3 = t2 * t;
		const t4 = t3 * t;
		const t5 = t4 * t;
		return 63.86 + 0.3345 * t - 0.060374 * t2 + 0.0017275 * t3 + 0.000651814 * t4 + 0.00002373599 * t5;
	}
	if (year < 2050) {
		const t = year - 2000;
		const t2 = t * t;
		return 62.92 + 0.32217 * t + 0.005589 * t2;
	}
	if (year < 2150) {
		const u = (year - 1820) / 100;
		return -20 + 32 * u * u - 0.5628 * (2150 - year);
	}
	const u = (year - 1820) / 100;
	return -20 + 32 * u * u;
}

/**
 * Calculates exact equinox and solstice timestamps for a given year using Jean Meeus formulas (Ch 27).
 *
 * @param year - Target year (-1000 to +3000)
 * @returns Array of solar events (Vernal, Summer, Autumnal, Winter) with epoch timestamps
 */
export function getSolarEvents(year: number): SolarEventResult[] {
	if (year < -1000 || year > 3000) {
		throw new RangeError(`Year ${year} is outside the supported Meeus calculation range (-1000 to +3000).`);
	}

	let vernalJde0: number;
	let summerJde0: number;
	let autumnalJde0: number;
	let winterJde0: number;

	if (year <= 1000) {
		const y = year / 1000;
		const y2 = y * y;
		const y3 = y2 * y;
		const y4 = y3 * y;

		vernalJde0 = 1721139.29189 + 365242.13740 * y + 0.06791 * y2 - 0.00234 * y3 - 0.00111 * y4;
		summerJde0 = 1721233.25401 + 365241.72562 * y - 0.05323 * y2 + 0.00907 * y3 + 0.00025 * y4;
		autumnalJde0 = 1721325.70000 + 365242.49558 * y - 0.11677 * y2 - 0.00297 * y3 + 0.00074 * y4;
		winterJde0 = 1721414.39987 + 365242.88257 * y - 0.00769 * y2 - 0.00933 * y3 + 0.00060 * y4;
	} else {
		const y = (year - 2000) / 1000;
		const y2 = y * y;
		const y3 = y2 * y;
		const y4 = y3 * y;

		vernalJde0 = 2451623.80984 + 365242.37404 * y + 0.05169 * y2 - 0.00411 * y3 - 0.00057 * y4;
		summerJde0 = 2451716.56767 + 365241.62603 * y + 0.00325 * y2 + 0.00888 * y3 - 0.00030 * y4;
		autumnalJde0 = 2451810.21715 + 365242.01767 * y - 0.11575 * y2 + 0.00337 * y3 + 0.00078 * y4;
		winterJde0 = 2451900.05952 + 365242.74049 * y - 0.06223 * y2 - 0.00823 * y3 + 0.00032 * y4;
	}

	const deltaT = getDeltaT(year);
	const toMs = (jde0: number) => {
		const jde = calculateMeeusJde(jde0);
		const jdUtc = jde - deltaT / 86400;
		return Math.trunc((jdUtc - 2440587.5) * 86400000);
	};

	return [
		{ key: 'Vernal', event: 'Equinox', epochMs: toMs(vernalJde0), year },
		{ key: 'Summer', event: 'Solstice', epochMs: toMs(summerJde0), year },
		{ key: 'Autumnal', event: 'Equinox', epochMs: toMs(autumnalJde0), year },
		{ key: 'Winter', event: 'Solstice', epochMs: toMs(winterJde0), year },
	];
}

/**
 * Calculates sunrise, sunset, solar noon, twilight boundaries, and the solar phase for a date and location.
 * Handles polar phenomena (Midnight Sun and Polar Night) when the Sun remains continuously above or below the horizon.
 *
 * @param dateInput - Date value, date string, or epoch timestamp in milliseconds
 * @param latOrOptions - Latitude in degrees or coordinate options
 * @param lonInput - Longitude in degrees when `latOrOptions` is a latitude
 * @returns Solar event timestamps, daylight duration, phase classification, phase index, polar flags, and resolved coordinates
 */
export function getSunriseSunset(
	dateInput: Date | number | string,
	latOrOptions: number | SolarOptions = 0,
	lonInput = 0
): SunriseSunsetResult {
	const epochMs = toEpochMs(dateInput);

	const { lat, lng, elevation } = resolveCoordinates(latOrOptions, lonInput);
	const { startOfDayMs, localDate, localMs } = getStartOfLocalDayMs(epochMs, lng);

	// Solar calculations using standard zenith (90.833°) adjusted for atmospheric horizon dip
	const dipDeg = elevation > 0 ? 0.0347 * Math.sqrt(elevation) : 0;
	const dayOfYear = Math.floor((localMs - Date.UTC(localDate.getUTCFullYear(), 0, 0)) / 86400000);
	const gamma = (2 * Math.PI / 365) * (dayOfYear - 1);

	// Equation of time in minutes
	const eqTime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
	// Solar declination in radians
	const decl = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma) - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma) - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);

	const latRad = lat * (Math.PI / 180);

	// Solar noon in UTC minutes from start of UTC day
	const solarNoonMin = 720 - (4 * lng) - eqTime;
	const solarNoonMs = startOfDayMs + (solarNoonMin * 60000);

	const cosHAHorizon = (Math.cos((90.833 + dipDeg) * Math.PI / 180) / (Math.cos(latRad) * Math.cos(decl))) - (Math.tan(latRad) * Math.tan(decl));

	let sunriseMs: number | null = null;
	let sunsetMs: number | null = null;
	let isMidnightSun = false;
	let isPolarNight = false;
	let daylightDurationMs = 0;
	let isDaylight = false;

	if (cosHAHorizon <= -1) {
		// Sun never sets below horizon for 24h: Midnight Sun
		isMidnightSun = true;
		isDaylight = true;
		daylightDurationMs = 86400000;
	} else if (cosHAHorizon >= 1) {
		// Sun never rises above horizon for 24h: Polar Night
		isPolarNight = true;
		isDaylight = false;
		daylightDurationMs = 0;
	} else {
		const haDeg = Math.acos(cosHAHorizon) * (180 / Math.PI);
		const haMin = haDeg * 4;
		sunriseMs = startOfDayMs + ((solarNoonMin - haMin) * 60000);
		sunsetMs = startOfDayMs + ((solarNoonMin + haMin) * 60000);
		daylightDurationMs = Math.max(0, sunsetMs - sunriseMs);
		isDaylight = epochMs >= sunriseMs && epochMs <= sunsetMs;
	}

	const getTwilightWindow = (zenithDeg: number): SolarTwilightWindow => {
		const cosHA = (Math.cos(zenithDeg * Math.PI / 180) / (Math.cos(latRad) * Math.cos(decl))) - (Math.tan(latRad) * Math.tan(decl));
		if (cosHA >= 1 || cosHA <= -1) {
			return { sunriseMs: null, sunsetMs: null };
		}
		const haDeg = Math.acos(cosHA) * (180 / Math.PI);
		return {
			sunriseMs: startOfDayMs + ((solarNoonMin - (haDeg * 4)) * 60000),
			sunsetMs: startOfDayMs + ((solarNoonMin + (haDeg * 4)) * 60000),
		};
	};

	const civil = getTwilightWindow(96);
	const nautical = getTwilightWindow(102);
	const astronomical = getTwilightWindow(108);

	let solarPhaseState: SunriseSunsetResult['solarPhaseState'] = 'night';
	let index = 1;

	if (isDaylight) {
		solarPhaseState = 'daylight';
		index = 5;
	} else if (civil.sunriseMs !== null && civil.sunsetMs !== null && ((epochMs >= civil.sunriseMs && (sunriseMs === null || epochMs < sunriseMs)) || ((sunsetMs !== null && epochMs > sunsetMs) && epochMs <= civil.sunsetMs) || (sunriseMs === null && sunsetMs === null && epochMs >= civil.sunriseMs && epochMs <= civil.sunsetMs))) {
		solarPhaseState = 'civil-twilight';
		index = 4;
	} else if (nautical.sunriseMs !== null && nautical.sunsetMs !== null && ((epochMs >= nautical.sunriseMs && (civil.sunriseMs === null || epochMs < civil.sunriseMs)) || ((civil.sunsetMs !== null && epochMs > civil.sunsetMs) && epochMs <= nautical.sunsetMs) || (civil.sunriseMs === null && civil.sunsetMs === null && epochMs >= nautical.sunriseMs && epochMs <= nautical.sunsetMs))) {
		solarPhaseState = 'nautical-twilight';
		index = 3;
	} else if (astronomical.sunriseMs !== null && astronomical.sunsetMs !== null && ((epochMs >= astronomical.sunriseMs && (nautical.sunriseMs === null || epochMs < nautical.sunriseMs)) || ((nautical.sunsetMs !== null && epochMs > nautical.sunsetMs) && epochMs <= astronomical.sunsetMs) || (nautical.sunriseMs === null && nautical.sunsetMs === null && epochMs >= astronomical.sunriseMs && epochMs <= astronomical.sunsetMs))) {
		solarPhaseState = 'astronomical-twilight';
		index = 2;
	} else {
		solarPhaseState = 'night';
		index = 1;
	}

	return {
		latitude: lat,
		longitude: lng,
		elevation,
		sunriseMs,
		sunsetMs,
		solarNoonMs,
		daylightDurationMs,
		isDaylight,
		isMidnightSun,
		isPolarNight,
		solarPhaseState,
		index,
		civil,
		nautical,
		astronomical,
	};
}

/**
 * Calculates topocentric horizontal solar coordinates (altitude, azimuth, zenith) and photometric hours.
 *
 * @param dateInput - Date value, date string, or epoch timestamp in milliseconds
 * @param latOrOptions - Latitude in degrees or coordinate options
 * @param lonInput - Longitude in degrees when `latOrOptions` is a latitude
 * @returns Solar altitude, azimuth, zenith, golden hour flag, blue hour flag, and shadow length ratio
 */
export function getSolarPosition(
	dateInput: Date | number | string,
	latOrOptions: number | SolarOptions = 0,
	lonInput = 0
): SolarPositionResult {
	const epochMs = toEpochMs(dateInput);

	const { lat, lng } = resolveCoordinates(latOrOptions, lonInput);
	const rad = Math.PI / 180;
	const latRad = lat * rad;

	const { raSun, decSun } = getSunCoordinates(epochMs);
	const ha = getSunHourAngle(epochMs, lng, raSun);

	const rawAltRad = calculateAltitudeRad(latRad, decSun, ha);
	let altDeg = rawAltRad * (180 / Math.PI);

	// Atmospheric refraction correction for observed altitude
	if (altDeg > -1) {
		const r = 1.02 / Math.tan((altDeg + 10.3 / (altDeg + 5.11)) * rad) / 60;
		altDeg += r;
	}

	const altitude = Math.round(altDeg * 100) / 100;
	const zenith = Math.round((90 - altitude) * 100) / 100;

	// Solar azimuth from North (0°) eastward (90° = East, 180° = South, 270° = West)
	const y = -Math.cos(decSun) * Math.sin(ha);
	const x = Math.sin(decSun) * Math.cos(latRad) - Math.cos(decSun) * Math.sin(latRad) * Math.cos(ha);
	const azRad = Math.atan2(y, x);
	const azimuth = Math.round(normalizeDegrees(azRad * (180 / Math.PI)) * 100) / 100;

	const isGoldenHour = altitude >= -4.0 && altitude <= 6.0;
	const isBlueHour = altitude >= -6.0 && altitude < -4.0;
	const shadowRatio = altitude > 0.1
		? Math.round((1 / Math.tan(altitude * rad)) * 100) / 100
		: null;

	return {
		altitude,
		azimuth,
		zenith,
		isGoldenHour,
		isBlueHour,
		shadowRatio,
	};
}

