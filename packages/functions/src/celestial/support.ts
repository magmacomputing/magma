/** Average duration of a complete lunar cycle (new moon to new moon) in days */
export const SYNODIC_MONTH = 29.53058867;

/** Known New Moon reference: Jan 6, 2000 18:14 UTC in milliseconds */
export const REF_NEW_MOON_MS = 947182440000;

/** Known Perigee reference: Jan 5, 2000 00:20 UTC in milliseconds */
export const REF_PERIGEE_MS = 947031600000;

/** Anomalistic Month length in days (perigee to perigee) */
export const ANOMALISTIC_MONTH = 27.55455;

export interface SolarOptions {
	latitude?: number;
	lat?: number;
	longitude?: number;
	long?: number;
	lng?: number;
	lon?: number;
	elevation?: number;
	geo?: {
		latitude?: number;
		longitude?: number;
		elevation?: number;
		[key: string]: any;
	};
}

export interface SolarTwilightWindow {
	sunriseMs: number | null;
	sunsetMs: number | null;
}

/**
 * Normalizes a Date object, ISO date string, or timestamp into milliseconds since the Unix epoch.
 *
 * @internal
 * @param dateInput - Date value, ISO date string, or epoch timestamp in milliseconds
 * @returns Timestamp in milliseconds since Unix epoch
 */
export function toEpochMs(dateInput: Date | number | string): number {
	return typeof dateInput === 'number'
		? dateInput
		: typeof dateInput === 'string'
			? new Date(dateInput).getTime()
			: dateInput.getTime();
}

/**
 * Resolves latitude, longitude, and elevation from positional arguments or a coordinate options object.
 *
 * @param latOrOptions - A latitude value or options containing coordinate fields
 * @param lngInput - The longitude used when `latOrOptions` is a numeric latitude
 * @returns An object containing the resolved `lat`, `lng`, and `elevation` values
 */
export function resolveCoordinates(latOrOptions: number | SolarOptions = 0, lngInput = 0): { lat: number; lng: number; elevation: number } {
	if (typeof latOrOptions === 'number')
		return { lat: latOrOptions, lng: lngInput, elevation: 0 };

	if (latOrOptions && typeof latOrOptions === 'object') {
		const geo = (latOrOptions as any).geo ?? latOrOptions;
		const lat = geo.latitude ?? geo.lat ?? (latOrOptions as any).latitude ?? (latOrOptions as any).lat ?? 0;
		const lng = geo.longitude ?? geo.lng ?? geo.lon ?? geo.long ?? (latOrOptions as any).longitude ?? (latOrOptions as any).lng ?? (latOrOptions as any).lon ?? (latOrOptions as any).long ?? 0;
		const rawElevation = geo.elevation ?? (latOrOptions as any).elevation;
		const elevation = typeof rawElevation === 'number' && Number.isFinite(rawElevation) ? rawElevation : 0;
		return { lat, lng, elevation };
	}
	return { lat: 0, lng: 0, elevation: 0 };
}

/**
 * Determines the UTC start of the calendar day at a specified longitude.
 *
 * @param epochMs - The input timestamp in milliseconds since the Unix epoch
 * @param lng - The longitude in degrees used to determine the local date
 * @returns The UTC start timestamp, local date, and longitude-adjusted timestamp
 */
export function getStartOfLocalDayMs(epochMs: number, lng: number): { startOfDayMs: number; localDate: Date; localMs: number } {
	const localMs = epochMs + (lng * 240000);
	const localDate = new Date(localMs);
	const startOfDay = new Date(Date.UTC(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate()));
	return { startOfDayMs: startOfDay.getTime(), localDate, localMs };
}

/**
 * Calculates the Moon's apparent position for a timestamp.
 *
 * @param epochMs - The timestamp in milliseconds since the Unix epoch
 * @returns The right ascension and declination in radians, and the horizontal parallax in degrees
 */
export function getMoonPosition(epochMs: number) {
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

	const hp = 0.9507 + 0.0518 * Math.cos(M * rad)
		+ 0.0095 * Math.cos((2 * D - M) * rad)
		+ 0.0078 * Math.cos(2 * D * rad);

	const eps = (23.439 - 0.0000004 * ((epochMs - 946728000000) / 86400000)) * rad;

	const lRad = lonDeg * rad;
	const bRad = latDeg * rad;

	const sinDec = Math.sin(bRad) * Math.cos(eps) + Math.cos(bRad) * Math.sin(eps) * Math.sin(lRad);
	const dec = Math.asin(sinDec);

	const y = Math.sin(lRad) * Math.cos(eps) - Math.tan(bRad) * Math.sin(eps);
	const x = Math.cos(lRad);
	const ra = Math.atan2(y, x);

	return { ra, dec, hp };
}

/**
 * Normalizes an angle in degrees to the range [0, 360).
 *
 * @internal
 * @param deg - Input angle in degrees
 * @returns Normalized angle in degrees in [0, 360)
 */
export function normalizeDegrees(deg: number): number {
	return ((deg % 360) + 360) % 360;
}

/**
 * Normalizes an angle in radians to the range [0, 2*PI).
 *
 * @internal
 * @param rad - Input angle in radians
 * @returns Normalized angle in radians in [0, 2*PI)
 */
export function normalizeRadians(rad: number): number {
	const tau = 2 * Math.PI;
	return ((rad % tau) + tau) % tau;
}

/**
 * Normalizes an hour angle in radians to the range [-PI, +PI].
 *
 * @internal
 * @param haRad - Input hour angle in radians
 * @returns Normalized hour angle in radians in [-PI, +PI]
 */
export function normalizeHourAngle(haRad: number): number {
	let ha = haRad % (2 * Math.PI);
	if (ha > Math.PI) ha -= 2 * Math.PI;
	if (ha < -Math.PI) ha += 2 * Math.PI;
	return ha;
}

/**
 * Calculates Local Sidereal Time (LST) in radians for an epoch timestamp and longitude in degrees.
 *
 * @internal
 * @param epochMs - Epoch timestamp in milliseconds
 * @param lngDeg - Observer longitude in degrees
 * @returns Local sidereal time in radians in [0, 2*PI)
 */
export function getLocalSiderealTime(epochMs: number, lngDeg: number): number {
	const d = (epochMs - 946728000000) / 86400000;
	const gstDeg = (280.46061837 + 360.98564736629 * d) % 360;
	return normalizeDegrees(gstDeg + lngDeg) * (Math.PI / 180);
}

/**
 * Calculates normalized lunar Hour Angle in radians (-PI..PI) for an instant and longitude.
 * @internal
 */
export function getMoonHourAngle(epochMs: number, lngDeg: number, raRad?: number): number {
	const lstRad = getLocalSiderealTime(epochMs, lngDeg);
	const ra = raRad ?? getMoonPosition(epochMs).ra;
	return normalizeHourAngle(lstRad - ra);
}

/**
 * Calculates topocentric/geocentric lunar distance in kilometers and apparent angular diameter in arcminutes.
 * @internal
 */
export function getLunarDistanceMetrics(hpDeg: number): { distanceKm: number; angularDiameterArcmin: number } {
	const hpRad = hpDeg * (Math.PI / 180);
	const distanceKm = Math.round((6378.14 / Math.sin(hpRad)) * 10) / 10;
	const angularDiameterArcmin = Math.round((2 * Math.asin(1737.4 / distanceKm) * (180 / Math.PI) * 60) * 100) / 100;
	return { distanceKm, angularDiameterArcmin };
}

/**
 * Calculates synodic lunar age in days (0..~29.53).
 *
 * @internal
 * @param epochMs - Epoch timestamp in milliseconds
 * @returns Lunar age in days since last New Moon
 */
export function getLunarAgeDays(epochMs: number): number {
	const elapsedDays = (epochMs - REF_NEW_MOON_MS) / 86400000;
	return ((elapsedDays % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
}

/**
 * Calculates the target lunar altitude threshold in degrees for horizon crossing (moonrise/moonset/visibility).
 *
 * @internal
 * @param hpDeg - Equatorial horizontal parallax in degrees
 * @returns Target altitude threshold in degrees
 */
export function getLunarHorizonThreshold(hpDeg: number): number {
	return 0.7275 * hpDeg - 0.5667;
}

/**
 * Calculates synodic lunar age, syzygy alignment metrics, perigee factor, and supermoon/micromoon flags.
 * @internal
 */
export function getLunarSyzygyMetrics(epochMs: number, distanceKm?: number) {
	const ageDays = getLunarAgeDays(epochMs);
	const alignmentDeg = (ageDays / SYNODIC_MONTH) * 360;

	const distFromSyzygy = Math.min(
		Math.abs(alignmentDeg),
		Math.abs(alignmentDeg - 180),
		Math.abs(alignmentDeg - 360)
	);

	const dist = distanceKm ?? getLunarDistanceMetrics(getMoonPosition(epochMs).hp).distanceKm;
	const rawFactor = (406700 - dist) / (406700 - 356400);
	const perigeeFactor = Math.round(Math.max(0, Math.min(1, rawFactor)) * 1000) / 1000;

	const isNearSyzygy = distFromSyzygy <= 35;
	const isSupermoon = isNearSyzygy && (dist <= 362000 || perigeeFactor >= 0.88);
	const isMicromoon = isNearSyzygy && (dist >= 404000 || perigeeFactor <= 0.12);

	return {
		ageDays,
		alignmentDeg: Math.round(alignmentDeg * 100) / 100,
		distFromSyzygy,
		perigeeFactor,
		isSupermoon,
		isMicromoon,
	};
}

/**
 * Calculates apparent solar Right Ascension and Declination in radians for an epoch timestamp.
 * @internal
 */
export function getSunCoordinates(epochMs: number): { raSun: number; decSun: number } {
	const rad = Math.PI / 180;
	const T = (epochMs - 946728000000) / 3155760000000;
	const L0 = (280.46646 + 36000.76983 * T) % 360;
	const M = (357.52911 + 35999.05029 * T) % 360;
	const C = (1.914602 - 0.004817 * T) * Math.sin(M * rad)
		+ (0.019993 - 0.000101 * T) * Math.sin(2 * M * rad)
		+ 0.000289 * Math.sin(3 * M * rad);
	const sunLonRad = ((L0 + C) % 360) * rad;
	const eps = (23.439291 - 0.0130042 * T) * rad;

	const sinDecSun = Math.sin(eps) * Math.sin(sunLonRad);
	const decSun = Math.asin(sinDecSun);
	const raSun = Math.atan2(Math.cos(eps) * Math.sin(sunLonRad), Math.cos(sunLonRad));

	return { raSun, decSun };
}

/**
 * Calculates normalized solar Hour Angle in radians (-PI..PI) for an instant and longitude.
 *
 * @internal
 * @param epochMs - Epoch timestamp in milliseconds
 * @param lngDeg - Observer longitude in degrees
 * @param raSunRad - Optional solar Right Ascension in radians
 * @returns Normalized hour angle in radians
 */
export function getSunHourAngle(epochMs: number, lngDeg: number, raSunRad?: number): number {
	const lstRad = getLocalSiderealTime(epochMs, lngDeg);
	const ra = raSunRad ?? getSunCoordinates(epochMs).raSun;
	return normalizeHourAngle(lstRad - ra);
}

/**
 * Calculates celestial altitude in radians using spherical trigonometry.
 *
 * @internal
 * @param latRad - Observer latitude in radians
 * @param decRad - Declination in radians
 * @param haRad - Hour angle in radians
 * @returns Altitude in radians in [-PI/2, +PI/2]
 */
export function calculateAltitudeRad(latRad: number, decRad: number, haRad: number): number {
	const sinAlt = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
	return Math.asin(Math.max(-1, Math.min(1, sinAlt)));
}

/**
 * Calculates lunar altitude angle and parallax target threshold in degrees.
 *
 * @param epochMs - The timestamp in milliseconds since the Unix epoch
 * @param latDeg - The latitude in degrees
 * @param lngDeg - The longitude in degrees
 * @returns The altitude and target altitude threshold for moonrise/moonset detection
 * @internal
 */
export function getMoonAltitude(epochMs: number, latDeg: number, lngDeg: number): { alt: number; targetAlt: number } {
	const rad = Math.PI / 180;
	const latRad = latDeg * rad;
	const { ra, dec, hp } = getMoonPosition(epochMs);
	const ha = getMoonHourAngle(epochMs, lngDeg, ra);

	const altRad = calculateAltitudeRad(latRad, dec, ha);
	const targetAlt = getLunarHorizonThreshold(hp);
	const alt = altRad / rad;

	return { alt, targetAlt };
}
