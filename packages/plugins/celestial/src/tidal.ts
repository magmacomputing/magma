import { defineTerm, WeakCache, TermHook } from '@magmacomputing/tempo/plugin/sdk';
import { getTidalState, TIDAL_PHASE_STATES } from '@magmacomputing/tempo-fns';
import { Tempo } from '@magmacomputing/tempo';
import { isNumber } from '@magmacomputing/tempo/library';
import type { TidalOptions } from '@magmacomputing/tempo-fns';
import { getCelestialCoordinates, toDateTimeFields, toTempoOrNull, createCelestialTermHandlers } from './util.js';

const TIDAL_STATE_CACHE = new WeakCache<string, ReturnType<typeof getTidalState>>();

/**
 * Returns the tidal state, weakly cached by timestamp and tidal calculation options.
 *
 * @param epochMs - The reference time in milliseconds since the Unix epoch
 * @param options - Observer and tidal model options, or latitude in degrees with longitude defaulting to zero
 * @returns The cached or newly calculated tidal state
 */
export function cachedTidalState(epochMs: number, options: TidalOptions | number) {
	const key = typeof options === 'number' ? `${epochMs}:${options}` : `${epochMs}:${options.latitude}:${options.longitude}:${options.lunitidalIntervalMin ?? 0}:${options.regime ?? ''}`;
	let res = TIDAL_STATE_CACHE.get(key);
	if (!res) {
		res = getTidalState(epochMs, options);
		TIDAL_STATE_CACHE.set(key, res);
	}
	return res;
}

/**
 * Computes tidal state and timing information for the resolved location and reference time.
 *
 * @param anchor - Optional anchor used to resolve the location and reference time.
 * @returns Tidal state details, lunar alignment, tide indicators, geographic data, date-time fields, and a 745-minute range.
 */
export function getTidalScopeRange(t: Tempo, anchor?: any) {
	const { refTempo, lat, lng, hasGeo, geo, timeZone } = getCelestialCoordinates(t, anchor);
	const lunitidalIntervalMin = isNumber((geo as any)?.lunitidalIntervalMin)
		? (geo as any).lunitidalIntervalMin
		: (isNumber((t.config?.geo as any)?.lunitidalIntervalMin) ? (t.config?.geo as any).lunitidalIntervalMin : undefined);
	const regime = (geo as any)?.regime ?? (t.config?.geo as any)?.regime;

	const res = cachedTidalState(refTempo.epoch.ms, hasGeo ? {
		latitude: lat!,
		longitude: lng!,
		...(lunitidalIntervalMin !== undefined ? { lunitidalIntervalMin } : {}),
		...(regime ? { regime } : {}),
	} : 0);

	const nextHighTide = res.nextHighTideMs ? toTempoOrNull(res.nextHighTideMs, timeZone) : null;
	const nextLowTide = res.nextLowTideMs ? toTempoOrNull(res.nextLowTideMs, timeZone) : null;

	return {
		key: res.state,
		state: res.state,
		group: 'tide' as const,
		alignmentDeg: res.alignmentDeg,
		isSpringTide: res.isSpringTide,
		isNeapTide: res.isNeapTide,
		isKingTide: hasGeo ? res.isKingTide : null,
		perigeeFactor: res.perigeeFactor,
		lunarTideMinute: hasGeo ? res.lunarTideMinute : null,
		nextHighTide,
		nextLowTide,
		lunitidalIntervalMin: res.lunitidalIntervalMin ?? null,
		regime: res.regime ?? null,
		states: TIDAL_PHASE_STATES,
		geo,
		...toDateTimeFields(refTempo),
		start: refTempo,
		end: refTempo.add({ minutes: 745 }),
	};
}

/**
 * ## TidalTerm
 * Term definition for astronomical tide phase resolution (`t.term.tide`, `t.term.tides`).
 */
export const TidalTerm = defineTerm({
	key: 'tide',
	aliases: ['tides', 'tidal'],
	scope: 'tides',
	description: 'Astronomical tidal state, alignment, and perigee factor',
	phases: TIDAL_PHASE_STATES,
	...createCelestialTermHandlers(getTidalScopeRange),

	[TermHook.step](_unit: string, count: number, tempo: Tempo) {
		return tempo.add({ minutes: count * 745 });
	},

	[TermHook.bound](boundary: 'start' | 'mid' | 'end', _unit: string, tempo: Tempo) {
		const scope = getTidalScopeRange(tempo);
		const high = scope.nextHighTide ?? scope.start;
		let low = scope.nextLowTide;
		if (!low) {
			low = high.add({ minutes: 372.5 });
		} else if (low.epoch.ms <= high.epoch.ms) {
			low = low.add({ minutes: 745 });
		}

		if (boundary === 'start') return high;
		if (boundary === 'end') return low;
		if (boundary === 'mid') {
			const midMs = Math.round((high.epoch.ms + low.epoch.ms) / 2);
			return new Tempo(midMs, { timeZone: high.tz, timeStamp: 'ms' });
		}
		return undefined;
	},

	[TermHook.diff](other: Tempo, _unit: string, tempo: Tempo) {
		return Math.round((other.epoch.ms - tempo.epoch.ms) / (745 * 60 * 1000));
	},

	[TermHook.format](token: string, tempo: Tempo) {
		const t = token.toLowerCase();
		if (t === '#tide' || t === '#tides' || t.startsWith('#tide.') || t.startsWith('#tides.')) {
			const scope = getTidalScopeRange(tempo);
			if (t === '#tide.state' || t === '#tides.state' || t === '#tide' || t === '#tides') return scope.state;
			if (t === '#tide.alignment' || t === '#tides.alignment') return `${scope.alignmentDeg}°`;
		}
		return undefined;
	},
});
