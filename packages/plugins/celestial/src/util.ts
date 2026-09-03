import { Tempo } from '@magmacomputing/tempo';
import { getLunarPhase } from '@magmacomputing/tempo-fns';
import type { LunarPhaseResult } from './index.js';

/**
 * Resolves the reference time, geographic coordinates, timezone, and hemisphere used for celestial calculations.
 *
 * @param t - The input `Tempo` instance used as the fallback reference and source of configuration
 * @param anchor - Optional reference accepted as a `Tempo`, timestamp, or date-like value
 * @returns The resolved reference `Tempo`, geographic coordinates, timezone, hemisphere, and coordinate availability
 * @internal
 */
export function getCelestialCoordinates(t: Tempo, anchor?: any): {
	refTempo: Tempo;
	lat?: number | undefined;
	lng?: number | undefined;
	hasGeo: boolean;
	geo: any;
	timeZone: string;
	sphere?: 'north' | 'south' | undefined;
} {
	const refTempo = (anchor instanceof Tempo)
		? anchor
		: (anchor != null
			? new Tempo(typeof anchor === 'number' ? new Date(anchor) : anchor, (t as any).config)
			: t);

	const geo = refTempo.geo ?? null;
	const latVal = geo?.latitude;
	const lngVal = geo?.longitude;
	const hasGeo = latVal !== undefined && lngVal !== undefined;
	const timeZone = refTempo.tz ?? 'UTC';

	const sphere = refTempo.sphere as 'north' | 'south' | undefined;

	if (!hasGeo && ((refTempo as any).config?.debug ?? 0) >= 1)
		console.warn("[Tempo Warning] CelestialPlugin: 'geo' coordinates (latitude/longitude) were not provided; geo-dependent properties evaluate to null.");

	return { refTempo, lat: latVal, lng: lngVal, hasGeo, geo, timeZone, ...(sphere ? { sphere } : {}) };
}

/**
 * Extracts 9 discrete DateTime units (year through nanosecond) into a spreadable object.
 * @internal
 */
export function toDateTimeFields(t: Tempo) {
	const dt = t.toDateTime();

	return {
		year: dt.year,
		month: dt.month,
		day: dt.day,
		hour: dt.hour,
		minute: dt.minute,
		second: dt.second,
		millisecond: dt.millisecond,
		microsecond: dt.microsecond,
		nanosecond: dt.nanosecond,
	}
}

/**
 * Creates a `Tempo` instance from an epoch-millisecond timestamp when provided.
 *
 * @param ms - The epoch-millisecond timestamp, or `null`/`undefined`
 * @param timeZone - The timezone to configure on the `Tempo` instance
 * @param sphere - The optional hemisphere to configure on the `Tempo` instance
 * @returns A configured `Tempo` instance, or `null` when `ms` is `null` or `undefined`
 * @internal
 */
export function toTempoOrNull(
	ms: number | undefined | null,
	timeZone: string,
	sphere?: 'north' | 'south'
): Tempo | null {
	return ms != null
		? new Tempo(ms, { timeZone, timeStamp: 'ms', ...(sphere ? { sphere } : {}) })
		: null;
}

/**
 * Computes lunar phase details for the reference time and hemisphere.
 *
 * @returns Lunar phase identifiers, illumination, age, waxing status, optional hemisphere-specific emoji, and phase transition data
 * @internal
 */
export function getLunarDetails(t: Tempo, coords?: ReturnType<typeof getCelestialCoordinates>): LunarPhaseResult {
	const { refTempo, sphere } = coords ?? getCelestialCoordinates(t);
	const res = getLunarPhase(refTempo.epoch.ms, { sphere });

	return {
		key: res.key,
		phase: res.phase,
		index: res.index,
		illumination: Math.round(res.illumination * 10000) / 10000,
		ageDays: Math.round(res.ageDays * 100) / 100,
		isWaxing: res.isWaxing,
		...(sphere && res.emoji !== undefined ? { emoji: res.emoji } : {}),
		phases: res.phases,
	}
}

/**
 * Creates standard resolve/define term handlers for a celestial scope range resolver.
 * @internal

 */
export function createCelestialTermHandlers<T extends { key: any }>(
	getScopeRange: (t: Tempo, anchor?: any) => T
) {
	return {
		resolve(this: Tempo, anchor?: any) {
			return [getScopeRange(this, anchor)];
		},
		define(this: Tempo, keyOnly?: boolean, anchor?: any) {
			const scopeObj = getScopeRange(this, anchor);
			return (keyOnly === true || keyOnly === undefined)
				? scopeObj.key
				: scopeObj;
		},
	}
}
