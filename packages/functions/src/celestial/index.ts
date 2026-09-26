// --- Shared Constants & Types ---
export {
	SYNODIC_MONTH,
	REF_NEW_MOON_MS,
	REF_PERIGEE_MS,
	ANOMALISTIC_MONTH,
	type SolarOptions,
	type SolarTwilightWindow,
} from './support.js';

// --- Lunar Algorithms ---
export {
	LUNAR_PHASE_KEYS,
	getLunarPhase,
	getLunarPhaseRange,
	getMoonriseMoonset,
	getLunarTransit,
	getLunarDistance,
	getLunarPosition,
	getCrescentTilt,
	type LunarPhaseKey,
	type LunarPhaseName,
	type LunarPhaseResult,
	type LunarPhaseOptions,
	type LunarPhaseRange,
	type MoonriseMoonsetResult,
	type LunarPositionResult,
	type LunarDistanceResult,
	type CrescentTiltResult,
} from './lunar.js';

// --- Solar Algorithms ---
export {
	SOLAR_PHASE_STATES,
	SOLAR_PHASE_NAMES,
	getSolarEvents,
	getSunriseSunset,
	getSolarPosition,
	type SolarPhaseName,
	type SolarEventResult,
	type SunriseSunsetResult,
	type SolarPositionResult,
} from './solar.js';

// --- Tidal Algorithms ---
export {
	TIDAL_PHASE_STATES,
	getTidalState,
	type TidalState,
	type TidalRegime,
	type TidalOptions,
	type TidalResult,
} from './tidal.js';


// --- Eclipse Algorithms ---
export {
	getEclipse,
	type EclipseType,
	type EclipseResult,
} from './eclipse.js';

// --- Zodiac Algorithms ---
export {
	getZodiacSign,
	getChineseZodiac,
	type WesternZodiacSign,
	type ChineseZodiacResult,
} from './zodiac.js';
