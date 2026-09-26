import {
	REF_PERIGEE_MS,
	ANOMALISTIC_MONTH,
	SolarOptions,
	resolveCoordinates,
	getMoonHourAngle,
	getLunarSyzygyMetrics,
	normalizeRadians,
	toEpochMs,
} from './support.js';

export type TidalState = 'spring' | 'neap' | 'normal';
export type TidalRegime = 'semi-diurnal' | 'diurnal' | 'mixed';

/** Ordered array of all tidal state identifiers */
export const TIDAL_PHASE_STATES = Object.freeze(['spring', 'neap', 'normal'] as const);

export interface TidalOptions extends SolarOptions {
	/** Port-specific hydrodynamic phase lag offset in minutes (lunitidal interval) */
	lunitidalIntervalMin?: number;
	/** Tidal regime override or classification */
	regime?: TidalRegime;
}

export interface TidalResult {
	/** Tidal state category based on solar/lunar alignment */
	state: TidalState;
	/** Solar-lunar ecliptic longitude difference in degrees (0..360) */
	alignmentDeg: number;
	/** True if Sun and Moon are in Syzygy (New or Full Moon) */
	isSpringTide: boolean;
	/** True if Sun and Moon are in Quadrature (1st or 3rd Quarter) */
	isNeapTide: boolean;
	/** True if Spring Tide coincides with Lunar Perigee (King Tide) */
	isKingTide: boolean;
	/** Proximity factor to lunar perigee (0.0 = apogee, 1.0 = perigee) */
	perigeeFactor: number;
	/** Approximate minute offset into current semi-diurnal lunar tide cycle (~12h 25m) */
	lunarTideMinute: number;
	/** Ordered list of all tidal state keys */
	states: readonly TidalState[];
	/** Epoch timestamp in ms of the next estimated local high tide, if coordinates provided */
	nextHighTideMs?: number;
	/** Epoch timestamp in ms of the next estimated local low tide, if coordinates provided */
	nextLowTideMs?: number;
	/** Lunitidal interval offset in minutes used for coastal calibration */
	lunitidalIntervalMin?: number;
	/** Tidal regime classification */
	regime?: TidalRegime;
}

/**
 * Classifies tidal conditions, estimates lunar alignment, perigee proximity, and resolves local coastal high/low tide predictions.
 *
 * @param dateInput - Date, ISO date string, or epoch timestamp in milliseconds
 * @param latOrOptions - Latitude in degrees or coordinate/tidal options
 * @param lonInput - Longitude in degrees when `latOrOptions` is a latitude
 * @returns Tidal state, lunar alignment in degrees, perigee proximity factor, lunar tide-cycle minute, and local high/low tide predictions
 */
export function getTidalState(
	dateInput: Date | number | string,
	latOrOptions: number | TidalOptions = 0,
	lonInput = 0
): TidalResult {
	const epochMs = toEpochMs(dateInput);
	const { alignmentDeg, distFromSyzygy } = getLunarSyzygyMetrics(epochMs);
	const distFromQuadrature = Math.min(
		Math.abs(alignmentDeg - 90),
		Math.abs(alignmentDeg - 270)
	);

	const isSpringTide = distFromSyzygy <= 35;
	const isNeapTide = !isSpringTide && distFromQuadrature <= 35;
	const state: TidalState = isSpringTide ? 'spring' : (isNeapTide ? 'neap' : 'normal');

	const perigeeElapsedDays = (epochMs - REF_PERIGEE_MS) / 86400000;
	const perigeeDays = ((perigeeElapsedDays % ANOMALISTIC_MONTH) + ANOMALISTIC_MONTH) % ANOMALISTIC_MONTH;
	const perigeeFactor = Math.round((0.5 + 0.5 * Math.cos((perigeeDays / ANOMALISTIC_MONTH) * 2 * Math.PI)) * 1000) / 1000;

	const isKingTide = isSpringTide && perigeeFactor >= 0.75;

	const lunarTideCycleMins = 745.2;
	const minsSinceEpoch = Math.floor(epochMs / 60000);
	const lunarTideMinute = Math.floor(((minsSinceEpoch % lunarTideCycleMins) + lunarTideCycleMins) % lunarTideCycleMins);

	const result: TidalResult = {
		state,
		alignmentDeg,
		isSpringTide,
		isNeapTide,
		isKingTide,
		perigeeFactor,
		lunarTideMinute,
		states: TIDAL_PHASE_STATES,
	};

	const hasGeo = (typeof latOrOptions === 'object' && latOrOptions !== null) || (typeof latOrOptions === 'number' && (latOrOptions !== 0 || lonInput !== 0));

	if (hasGeo) {
		const { lat, lng } = resolveCoordinates(latOrOptions, lonInput);
		const lunitidalIntervalMin = typeof latOrOptions === 'object' && typeof (latOrOptions as TidalOptions).lunitidalIntervalMin === 'number'
			? (latOrOptions as TidalOptions).lunitidalIntervalMin!
			: 0;

		const regime: TidalRegime = typeof latOrOptions === 'object' && (latOrOptions as TidalOptions).regime
			? (latOrOptions as TidalOptions).regime!
			: (Math.abs(lat) > 65 ? 'mixed' : 'semi-diurnal');

		// Approximate lunar day period in milliseconds (~24h 50.4m)
		const LUNAR_DAY_MS = 89428200;
		const h0 = getMoonHourAngle(epochMs, lng);

		// Distance in radians to next upper transit (h = 0) and lower transit (|h| = PI)
		const dUpper = normalizeRadians(-h0);
		const dLower = normalizeRadians(Math.PI - h0);

		// Refine upper transit
		let tUpper = epochMs + (dUpper * (LUNAR_DAY_MS / (2 * Math.PI)));
		const hUpperRefine = getMoonHourAngle(tUpper, lng);
		tUpper -= hUpperRefine * (LUNAR_DAY_MS / (2 * Math.PI));

		// Refine lower transit
		let tLower = epochMs + (dLower * (LUNAR_DAY_MS / (2 * Math.PI)));
		const hLowerRefine = getMoonHourAngle(tLower, lng);
		const errLower = hLowerRefine > 0 ? hLowerRefine - Math.PI : hLowerRefine + Math.PI;
		tLower -= errLower * (LUNAR_DAY_MS / (2 * Math.PI));

		// Apply lunitidal interval offset
		const offsetMs = lunitidalIntervalMin * 60000;
		let high1 = Math.round(tUpper + offsetMs);
		let high2 = Math.round(tLower + offsetMs);

		while (high1 < epochMs) high1 += Math.round(LUNAR_DAY_MS);
		while (high1 - Math.round(LUNAR_DAY_MS) >= epochMs) high1 -= Math.round(LUNAR_DAY_MS);
		while (high2 < epochMs) high2 += Math.round(LUNAR_DAY_MS);
		while (high2 - Math.round(LUNAR_DAY_MS) >= epochMs) high2 -= Math.round(LUNAR_DAY_MS);

		const nextHighTideMs = Math.min(high1, high2);

		// Low tide is approximately a quarter lunar cycle (~6h 12.6m) from high tide
		const quarterCycleMs = Math.round(LUNAR_DAY_MS / 4);
		let nextLowTideMs = nextHighTideMs - quarterCycleMs;
		if (nextLowTideMs < epochMs) {
			nextLowTideMs = nextHighTideMs + quarterCycleMs;
		}

		result.nextHighTideMs = nextHighTideMs;
		result.nextLowTideMs = nextLowTideMs;
		result.lunitidalIntervalMin = lunitidalIntervalMin;
		result.regime = regime;
	}

	return result;
}

