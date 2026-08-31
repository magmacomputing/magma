import { defineTerm } from '@magmacomputing/tempo/plugin/sdk';
import { getLunarPhase, getLunarPhaseRange, getSunriseSunset } from '@magmacomputing/tempo-fns';
import { Tempo } from '@magmacomputing/tempo';
import type { LunarPhaseKey, LunarPhaseName } from '@magmacomputing/tempo-fns';

export type { LunarPhaseKey, LunarPhaseName };

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
}

export type SolarPhaseState = 'daylight' | 'night' | 'civil-twilight' | 'nautical-twilight' | 'astronomical-twilight';

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
			group: 'lunar';
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
		sun: SolarPhaseState;
		solar: {
			key: SolarPhaseState;
			index: number;
			group: 'solar';
			year: number;
			month: number;
			day: number;
			hour: number;
			minute: number;
			second: number;
			millisecond: number;
			microsecond: number;
			nanosecond: number;
			sunrise: Tempo;
			sunset: Tempo;
			solarNoon: Tempo;
			daylightDurationMs: number;
			isDaylight: boolean;
			start: Tempo;
			end: Tempo;
		};
	}
}

/** Internal helper: Computes formatted lunar details for a given Tempo instance */
function getLunarDetails(t: Tempo): LunarPhaseResult {
	const sphere = (t as any).sphere;
	const res = getLunarPhase(t.epoch.ms, { sphere: sphere ? sphere : undefined });
	return {
		key: res.key,
		phase: res.phase,
		index: res.index,
		illumination: Math.round(res.illumination * 10000) / 10000,
		ageDays: Math.round(res.ageDays * 100) / 100,
		isWaxing: res.isWaxing,
		...(sphere && res.emoji !== undefined ? { emoji: res.emoji } : {}),
	};
}

/** Internal helper: Resolves full lunar scope range with start/end Tempo boundaries */
function getLunarScopeRange(t: Tempo, anchor?: any) {
	const refTempo = anchor ?? t;
	const currentMs = refTempo.epoch.ms;
	const timeZone = refTempo.tz ?? 'UTC';

	const range = getLunarPhaseRange(currentMs, { sphere: (refTempo as any).sphere ? (refTempo as any).sphere : undefined });

	const startTempo = new Tempo(range.startMs, { timeZone, timeStamp: 'ms', sphere: (refTempo as any).sphere });
	const endTempo = new Tempo(range.endMs, { timeZone, timeStamp: 'ms', sphere: (refTempo as any).sphere });

	const details = getLunarDetails(refTempo);
	const dt = startTempo.toDateTime();

	return {
		key: details.key,
		phase: details.phase,
		index: details.index,
		illumination: details.illumination,
		ageDays: details.ageDays,
		isWaxing: details.isWaxing,
		...(details.emoji !== undefined ? { emoji: details.emoji } : {}),
		group: 'lunar' as const,
		year: dt.year,
		month: dt.month,
		day: dt.day,
		hour: dt.hour,
		minute: dt.minute,
		second: dt.second,
		millisecond: dt.millisecond,
		microsecond: dt.microsecond,
		nanosecond: dt.nanosecond,
		start: startTempo,
		end: endTempo,
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

	resolve(this: Tempo, anchor?: any) {
		return [getLunarScopeRange(this, anchor)];
	},

	define(this: Tempo, keyOnly?: boolean, anchor?: any) {
		const scopeObj = getLunarScopeRange(this, anchor);
		if (keyOnly === true || keyOnly === undefined) {
			return scopeObj.key;
		}
		return scopeObj;
	},
});

/** Internal helper: Resolves daily solar scope range for a location */
function getSolarScopeRange(t: Tempo, anchor?: any) {
	const refTempo = anchor ?? t;
	const timeZone = refTempo.tz ?? 'UTC';

	const cfg = (refTempo as any).config ?? {};
	const lat = cfg.latitude ?? cfg.lat ?? (refTempo as any).latitude ?? (refTempo as any).lat ?? 0;
	const lon = cfg.longitude ?? cfg.long ?? cfg.lng ?? (refTempo as any).longitude ?? (refTempo as any).long ?? (refTempo as any).lng ?? 0;

	const res = getSunriseSunset(refTempo.epoch.ms, lat, lon);

	const sunrise = new Tempo(res.sunriseMs, { timeZone, timeStamp: 'ms' });
	const sunset = new Tempo(res.sunsetMs, { timeZone, timeStamp: 'ms' });
	const solarNoon = new Tempo(res.solarNoonMs, { timeZone, timeStamp: 'ms' });

	const start = res.isDaylight ? sunrise : sunset;
	const end = res.isDaylight ? sunset : new Tempo(res.sunriseMs + 86400000, { timeZone, timeStamp: 'ms' });

	const dt = start.toDateTime();

	return {
		key: res.solarPhaseState,
		index: res.index,
		group: 'solar' as const,
		year: dt.year,
		month: dt.month,
		day: dt.day,
		hour: dt.hour,
		minute: dt.minute,
		second: dt.second,
		millisecond: dt.millisecond,
		microsecond: dt.microsecond,
		nanosecond: dt.nanosecond,
		sunrise,
		sunset,
		solarNoon,
		daylightDurationMs: res.daylightDurationMs,
		isDaylight: res.isDaylight,
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

	resolve(this: Tempo, anchor?: any) {
		return [getSolarScopeRange(this, anchor)];
	},

	define(this: Tempo, keyOnly?: boolean, anchor?: any) {
		const scopeObj = getSolarScopeRange(this, anchor);
		if (keyOnly === true || keyOnly === undefined) {
			return scopeObj.key;
		}
		return scopeObj;
	},
});

/**
 * ## CelestialPlugin
 * Plugin bundling SolarTerm (`sun`/`solar`) and LunarTerm (`moon`/`lunar`).
 */
export const CelestialPlugin = [SolarTerm, LunarTerm];

export default CelestialPlugin;

Tempo.extend(CelestialPlugin);
