import { Tempo } from '@magmacomputing/tempo';
import { getLunarPhase } from '@magmacomputing/tempo-fns';
import type { LunarPhaseResult } from './index.js';

/**
 * Resolves reference Tempo instance, geo coordinates, hemisphere, timezone, and debug flags.
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
	const geo = refTempo.geo ?? (t as any).geo ?? null;
	const latVal = geo?.latitude;
	const lngVal = geo?.longitude;
	const hasGeo = latVal !== undefined && lngVal !== undefined;
	const timeZone = refTempo.tz ?? 'UTC';

	const explicitSphere = (refTempo as any).sphere ?? (t as any).sphere;
	const sphere: 'north' | 'south' | undefined = explicitSphere
		? explicitSphere
		: (latVal !== undefined ? (latVal >= 0 ? 'north' : 'south') : undefined);

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
 * Converts an epoch millisecond timestamp to a Tempo instance or null.
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
 * Computes formatted lunar details for a given Tempo instance or coordinate context.
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
