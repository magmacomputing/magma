export const SYNODIC_MONTH = 29.53058867;

/** Known New Moon reference: Jan 6, 2000 18:14 UTC in milliseconds */
export const REF_NEW_MOON_MS = 947182440000;

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
}

export interface LunarPhaseOptions {
	sphere?: 'north' | 'south' | 'North' | 'South' | string | undefined;
}

/**
 * Calculates the lunar phase for a date or numeric timestamp.
 *
 * @param dateInput - Date, Temporal object, or epoch timestamp in ms
 * @param options - Options including hemisphere (`sphere: 'north' | 'south'`)
 * @returns Lunar phase object with age, illumination, phase name, index, and emoji
 */
export function getLunarPhase(dateInput: Date | number | string, options: LunarPhaseOptions = {}): LunarPhaseResult {
	const epochMs = typeof dateInput === 'number'
		? dateInput
		: typeof dateInput === 'string'
			? new Date(dateInput).getTime()
			: dateInput.getTime();

	const elapsedDays = (epochMs - REF_NEW_MOON_MS) / 86400000;
	let ageDays = elapsedDays % SYNODIC_MONTH;
	if (ageDays < 0) ageDays += SYNODIC_MONTH;

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

	return { key, phase, index, illumination, ageDays, isWaxing, emoji };
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
	const epochMs = typeof dateInput === 'number'
		? dateInput
		: typeof dateInput === 'string'
			? new Date(dateInput).getTime()
			: dateInput.getTime();

	const phase = getLunarPhase(epochMs, options);
	const elapsedDays = (epochMs - REF_NEW_MOON_MS) / 86400000;
	const ageDays = ((elapsedDays % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;

	const rawBucket = Math.floor((ageDays + SYNODIC_MONTH / 16) / (SYNODIC_MONTH / 8));
	const phaseStartDaysOffset = rawBucket === 0 ? -SYNODIC_MONTH / 16 : (rawBucket * (SYNODIC_MONTH / 8)) - (SYNODIC_MONTH / 16);
	const phaseEndDaysOffset = phaseStartDaysOffset + (SYNODIC_MONTH / 8);

	const cycleStartMs = epochMs - (ageDays * 86400000);
	const startMs = Math.round(cycleStartMs + (phaseStartDaysOffset * 86400000));
	const endMs = Math.round(cycleStartMs + (phaseEndDaysOffset * 86400000));

	return { startMs, endMs, phase };
}

// --- Meeus Solar Algorithms ---

export interface SolarEventResult {
	key: 'Vernal' | 'Summer' | 'Autumnal' | 'Winter';
	event: 'Equinox' | 'Solstice';
	epochMs: number;
	year: number;
}

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

// --- Sunrise / Sunset / Solar Day Algorithms ---

export interface SolarOptions {
	latitude?: number;
	lat?: number;
	longitude?: number;
	long?: number;
	lng?: number;
	lon?: number;
}

export interface SolarTwilightWindow {
	sunriseMs: number;
	sunsetMs: number;
}

export interface SunriseSunsetResult {
	latitude: number;
	longitude: number;
	sunriseMs: number;
	sunsetMs: number;
	solarNoonMs: number;
	daylightDurationMs: number;
	isDaylight: boolean;
	solarPhaseState: 'daylight' | 'night' | 'civil-twilight' | 'nautical-twilight' | 'astronomical-twilight';
	/** 1-based solar phase index (1: night, 2: astronomical-twilight, 3: nautical-twilight, 4: civil-twilight, 5: daylight) */
	index: number;
	civil: SolarTwilightWindow;
	nautical: SolarTwilightWindow;
	astronomical: SolarTwilightWindow;
}

/** Internal helper: Normalizes latitude and longitude from positional arguments or options object */
function resolveCoordinates(latOrOptions: number | SolarOptions = 0, lngInput = 0): { lat: number; lng: number } {
	if (typeof latOrOptions === 'number') {
		return { lat: latOrOptions, lng: lngInput };
	}
	if (latOrOptions && typeof latOrOptions === 'object') {
		const lat = latOrOptions.latitude ?? latOrOptions.lat ?? 0;
		const lng = latOrOptions.longitude ?? latOrOptions.lng ?? latOrOptions.lon ?? latOrOptions.long ?? 0;
		return { lat, lng };
	}
	return { lat: 0, lng: 0 };
}

/** Internal helper: Calculates the UTC millisecond timestamp for the start of the local day at a given longitude */
function getStartOfLocalDayMs(epochMs: number, lng: number): { startOfDayMs: number; localDate: Date; localMs: number } {
	const localMs = epochMs + (lng * 240000);
	const localDate = new Date(localMs);
	const startOfDay = new Date(Date.UTC(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate()));
	return { startOfDayMs: startOfDay.getTime(), localDate, localMs };
}

/**
 * Calculates Sunrise, Sunset, Solar Noon, and Solar Phase State for a given date and coordinates.
 * Accepts latitude and longitude as numbers or via a configuration object (`{ latitude, lat, longitude, long, lng }`).
 * Defaults to Equator / Prime Meridian (0, 0) if coordinates are omitted.
 *
 * @param dateInput - Date, Temporal object, or epoch timestamp in ms
 * @param latOrOptions - Latitude in degrees or options object
 * @param lngInput - Longitude in degrees if latitude is passed as a number
 * @returns Sunrise/Sunset calculations with timestamps, solar phase state, and 1-based index
 */
export function getSunriseSunset(
	dateInput: Date | number | string,
	latOrOptions: number | SolarOptions = 0,
	lonInput = 0
): SunriseSunsetResult {
	const epochMs = typeof dateInput === 'number'
		? dateInput
		: typeof dateInput === 'string'
			? new Date(dateInput).getTime()
			: dateInput.getTime();

	const { lat, lng } = resolveCoordinates(latOrOptions, lonInput);
	const { startOfDayMs, localDate, localMs } = getStartOfLocalDayMs(epochMs, lng);

	// Solar calculations using standard zenith (90.833°)
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

	// Hour angle function helper
	const calcHaDeg = (zenithDeg: number) => {
		const cosHA = (Math.cos(zenithDeg * Math.PI / 180) / (Math.cos(latRad) * Math.cos(decl))) - (Math.tan(latRad) * Math.tan(decl));
		if (cosHA >= 1) return 0;
		if (cosHA <= -1) return 180;
		return Math.acos(cosHA) * (180 / Math.PI);
	};

	const haDeg = calcHaDeg(90.833);
	const haMin = haDeg * 4;
	const sunriseMs = startOfDayMs + ((solarNoonMin - haMin) * 60000);
	const sunsetMs = startOfDayMs + ((solarNoonMin + haMin) * 60000);
	const daylightDurationMs = Math.max(0, sunsetMs - sunriseMs);

	const isDaylight = epochMs >= sunriseMs && epochMs <= sunsetMs;

	// Civil twilight angle (96°)
	const haDegCivil = calcHaDeg(96);
	const civilSunriseMs = startOfDayMs + ((solarNoonMin - (haDegCivil * 4)) * 60000);
	const civilSunsetMs = startOfDayMs + ((solarNoonMin + (haDegCivil * 4)) * 60000);

	// Nautical twilight angle (102°)
	const haDegNautical = calcHaDeg(102);
	const nauticalSunriseMs = startOfDayMs + ((solarNoonMin - (haDegNautical * 4)) * 60000);
	const nauticalSunsetMs = startOfDayMs + ((solarNoonMin + (haDegNautical * 4)) * 60000);

	// Astronomical twilight angle (108°)
	const haDegAstro = calcHaDeg(108);
	const astroSunriseMs = startOfDayMs + ((solarNoonMin - (haDegAstro * 4)) * 60000);
	const astroSunsetMs = startOfDayMs + ((solarNoonMin + (haDegAstro * 4)) * 60000);

	let solarPhaseState: SunriseSunsetResult['solarPhaseState'] = 'night';
	let index = 1;

	if (isDaylight) {
		solarPhaseState = 'daylight';
		index = 5;
	} else if ((epochMs >= civilSunriseMs && epochMs < sunriseMs) || (epochMs > sunsetMs && epochMs <= civilSunsetMs)) {
		solarPhaseState = 'civil-twilight';
		index = 4;
	} else if ((epochMs >= nauticalSunriseMs && epochMs < civilSunriseMs) || (epochMs > civilSunsetMs && epochMs <= nauticalSunsetMs)) {
		solarPhaseState = 'nautical-twilight';
		index = 3;
	} else if ((epochMs >= astroSunriseMs && epochMs < nauticalSunriseMs) || (epochMs > nauticalSunsetMs && epochMs <= astroSunsetMs)) {
		solarPhaseState = 'astronomical-twilight';
		index = 2;
	} else {
		solarPhaseState = 'night';
		index = 1;
	}

	return {
		latitude: lat,
		longitude: lng,
		sunriseMs,
		sunsetMs,
		solarNoonMs,
		daylightDurationMs,
		isDaylight,
		solarPhaseState,
		index,
		civil: { sunriseMs: civilSunriseMs, sunsetMs: civilSunsetMs },
		nautical: { sunriseMs: nauticalSunriseMs, sunsetMs: nauticalSunsetMs },
		astronomical: { sunriseMs: astroSunriseMs, sunsetMs: astroSunsetMs },
	};
}

// --- Zodiac Algorithms ---

export type WesternZodiacSign =
	| 'Aries' | 'Taurus' | 'Gemini' | 'Cancer'
	| 'Leo' | 'Virgo' | 'Libra' | 'Scorpio'
	| 'Sagittarius' | 'Capricorn' | 'Aquarius' | 'Pisces';

export interface ChineseZodiacResult {
	animal: string;
	element: string;
	yinYang: 'Yin' | 'Yang';
}

/**
 * Calculates the Western Tropical Zodiac sign for a given date.
 *
 * @param dateInput - Date, Temporal object, or epoch timestamp in ms
 * @returns Western Zodiac sign string name
 */
export function getZodiacSign(dateInput: Date | number | string): WesternZodiacSign {
	const date = typeof dateInput === 'object' && 'getMonth' in dateInput ? dateInput : new Date(dateInput);
	const month = date.getUTCMonth() + 1;
	const day = date.getUTCDate();

	if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Aries';
	if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Taurus';
	if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gemini';
	if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Cancer';
	if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo';
	if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgo';
	if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra';
	if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Scorpio';
	if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Sagittarius';
	if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Capricorn';
	if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Aquarius';
	return 'Pisces';
}

/**
 * Calculates the Chinese Zodiac animal, element, and Yin/Yang state for a given year.
 *
 * @param year - Year (e.g. 2026)
 * @returns Chinese Zodiac object with animal, element, and yinYang
 */
export function getChineseZodiac(year: number): ChineseZodiacResult {
	const animals = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];
	const elements = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];

	const animalIndex = ((year - 4) % 12 + 12) % 12;
	const elementIndex = Math.floor((((year - 4) % 10) + 10) % 10 / 2);
	const yinYang: 'Yin' | 'Yang' = year % 2 === 0 ? 'Yang' : 'Yin';

	return {
		animal: animals[animalIndex]!,
		element: elements[elementIndex]!,
		yinYang,
	};
}

// --- Moonrise / Moonset Algorithms ---

export interface MoonriseMoonsetResult {
	latitude: number;
	longitude: number;
	moonriseMs?: number | undefined;
	moonsetMs?: number | undefined;
}

/** Internal helper: Calculates lunar position (Right Ascension & Declination in radians) */
function getMoonPosition(epochMs: number) {
	const T = (epochMs - 946728000000) / 3155760000000;
	const rad = Math.PI / 180;

	const L = (218.316 + 481267.8813 * T) % 360;
	const M = (134.963 + 477198.8676 * T) % 360;
	const Msun = (357.529 + 35999.0503 * T) % 360;
	const D = (297.850 + 445267.1114 * T) % 360;
	const F = (93.272 + 483202.0175 * T) % 360;

	const lonDeg = L + 6.289 * Math.sin(M * rad)
		+ 1.274 * Math.sin((2 * D - M) * rad)
		+ 0.658 * Math.sin(2 * D * rad)
		+ 0.214 * Math.sin(2 * M * rad)
		- 0.186 * Math.sin(Msun * rad);

	const latDeg = 5.128 * Math.sin(F * rad)
		+ 0.280 * Math.sin((M + F) * rad)
		+ 0.277 * Math.sin((M - F) * rad)
		+ 0.173 * Math.sin((2 * D - F) * rad);

	const eps = (23.439 - 0.0000004 * ((epochMs - 946728000000) / 86400000)) * rad;

	const lRad = lonDeg * rad;
	const bRad = latDeg * rad;

	const sinDec = Math.sin(bRad) * Math.cos(eps) + Math.cos(bRad) * Math.sin(eps) * Math.sin(lRad);
	const dec = Math.asin(sinDec);

	const y = Math.sin(lRad) * Math.cos(eps) - Math.tan(bRad) * Math.sin(eps);
	const x = Math.cos(lRad);
	const ra = Math.atan2(y, x);

	return { ra, dec };
}

/** Internal helper: Calculates lunar altitude angle in degrees at a specific timestamp and location */
function getMoonAltitude(epochMs: number, latDeg: number, lngDeg: number): number {
	const rad = Math.PI / 180;
	const latRad = latDeg * rad;

	const d = (epochMs - 946728000000) / 86400000;
	const gstDeg = (280.46061837 + 360.98564736629 * d) % 360;
	const lstRad = (gstDeg + lngDeg) * rad;

	const { ra, dec } = getMoonPosition(epochMs);
	const ha = lstRad - ra;

	const sinAlt = Math.sin(latRad) * Math.sin(dec) + Math.cos(latRad) * Math.cos(dec) * Math.cos(ha);
	return Math.asin(Math.max(-1, Math.min(1, sinAlt))) / rad;
}

/**
 * Calculates Moonrise and Moonset timestamps for a given date and geographic coordinates.
 * Returns undefined for moonrise or moonset if no rise or set occurs on that calendar date.
 *
 * @param dateInput - Date, Temporal object, or epoch timestamp in ms
 * @param latOrOptions - Latitude in degrees or options object
 * @param lonInput - Longitude in degrees if latitude is passed as a number
 * @returns Object containing latitude, longitude, optional `moonriseMs`, and optional `moonsetMs`
 */
export function getMoonriseMoonset(
	dateInput: Date | number | string,
	latOrOptions: number | SolarOptions = 0,
	lonInput = 0
): MoonriseMoonsetResult {
	const epochMs = typeof dateInput === 'number'
		? dateInput
		: typeof dateInput === 'string'
			? new Date(dateInput).getTime()
			: dateInput.getTime();

	const { lat, lng } = resolveCoordinates(latOrOptions, lonInput);
	const { startOfDayMs } = getStartOfLocalDayMs(epochMs, lng);
	const moonDayStartMs = startOfDayMs - (lng * 240000);

	const targetAltitude = -0.5667;
	let moonriseMs: number | undefined = undefined;
	let moonsetMs: number | undefined = undefined;

	let prevAlt = getMoonAltitude(moonDayStartMs, lat, lng) - targetAltitude;

	for (let i = 1; i <= 24; i++) {
		const currentMs = moonDayStartMs + (i * 3600000);
		const currAlt = getMoonAltitude(currentMs, lat, lng) - targetAltitude;

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
