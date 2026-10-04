import { Tempo } from '@magmacomputing/tempo';
import {
	LUNAR_PHASE_KEYS,
	SOLAR_PHASE_STATES,
	SOLAR_PHASE_NAMES,
	TIDAL_PHASE_STATES,
	HALF_DAY_MS,
	DAY_MS,
	getEclipse,
	getSolarPosition,
} from '@magmacomputing/tempo-fns';
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

import { LunarTerm, type LunarPhaseOptions, type LunarPhaseResult } from './lunar.js';
import { SolarTerm, type SolarPhaseState } from './solar.js';
import { TidalTerm } from './tidal.js';
import { AstroTerm, type AstroTermOptions } from './astro.js';

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
	LunarPhaseOptions,
	LunarPhaseResult,
	SolarPhaseState,
	AstroTermOptions,
};

export {
	LUNAR_PHASE_KEYS,
	SOLAR_PHASE_STATES,
	SOLAR_PHASE_NAMES,
	TIDAL_PHASE_STATES,
	HALF_DAY_MS,
	DAY_MS,
	getEclipse,
	getSolarPosition,
	LunarTerm,
	SolarTerm,
	TidalTerm,
	AstroTerm,
};

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
			nadir: Tempo | null;
			altitude: number | null;
			azimuth: number | null;
			zenith: number | null;
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
			nadir: Tempo | null;
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
		astro: 'Vernal' | 'Summer' | 'Autumnal' | 'Winter';
		equinox: 'Vernal' | 'Autumnal';
		solstice: 'Summer' | 'Winter';
		astronomy: {
			key: 'Vernal' | 'Summer' | 'Autumnal' | 'Winter';
			strict: 'Vernal' | 'Summer' | 'Autumnal' | 'Winter';
			season: 'Spring' | 'Summer' | 'Autumn' | 'Winter';
			sphere: Tempo.COMPASS;
			event: 'Equinox' | 'Solstice';
			group: 'astronomy';
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
 * ## CelestialPlugin
 * Plugin bundling SolarTerm (`sun`/`solar`), LunarTerm (`moon`/`lunar`), TidalTerm (`tide`/`tides`), and AstroTerm (`astro`/`equinox`/`solstice`).
 */
export const CelestialPlugin = [SolarTerm, LunarTerm, TidalTerm, AstroTerm];

export default CelestialPlugin;
