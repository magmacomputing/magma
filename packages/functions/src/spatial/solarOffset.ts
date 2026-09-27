import type { SolarOffsetOptions } from './types.js';
import { coerceGeo, extractEpochMs } from './support.js';
import { isNumber, isReference, isFunction, isText, isDefined } from '../support/index.js';

/**
 * Resolves civil timezone offset in minutes for a given epoch timestamp.
 * Uses Temporal if present in runtime, with seamless fallback to Intl.DateTimeFormat.
 * @internal
 */
const resolveCivilTimezoneOffset = (tz: string, epochMs: number): number | undefined => {
	try {
		const globalTemporal = (globalThis as any).Temporal;
		if (globalTemporal && isFunction(globalTemporal.Instant?.fromEpochMilliseconds)) {
			const zdt = globalTemporal.Instant.fromEpochMilliseconds(epochMs).toZonedDateTimeISO(tz);
			return zdt.offsetNanoseconds / 60_000_000_000;
		}

		const parts = new Intl.DateTimeFormat('en-US', {
			timeZone: tz,
			timeZoneName: 'longOffset',
			year: 'numeric',
		}).formatToParts(new Date(epochMs));

		const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value;
		if (tzPart) {
			if (tzPart === 'GMT' || tzPart === 'UTC') return 0;
			const match = tzPart.match(/GMT([+-])(\d{2}):(\d{2})/);
			if (match) {
				const sign = match[1] === '-' ? -1 : 1;
				return sign * (parseInt(match[2], 10) * 60 + parseInt(match[3], 10));
			}
		}
	} catch {
		// Invalid timezone strings gracefully fall back to natural solar meridian
	}
	return undefined;
};

/**
 * Calculates the Natural Solar Time Offset between civil clock time and actual solar time.
 * Based on longitude (approx 4 minutes per 1° offset from standard timezone meridian).
 *
 * @param coords - Coordinate input, object, tuple, or instance exposing `.geo`
 * @param options - Configuration options for units, precision, apparent time, timezone, and date
 * @returns Solar offset in requested unit (default: minutes, rounded to 2 decimal places), or NaN if invalid
 *
 * @example
 * ```ts
 * const offset = solarOffset(
 *   { lat: 48.8584, lng: 2.2945, timezone: 'Europe/Paris' },
 *   { unit: 'minutes' }
 * ); // ~ -50.82 minutes (Paris is ~50 min behind its civil CET meridian)
 * ```
 */
export function solarOffset(coords: any, options?: SolarOffsetOptions): number {
	const geo = coerceGeo(coords);
	if (!geo || !isNumber(geo.latitude) || !isNumber(geo.longitude)) {
		return NaN;
	}

	const lng = geo.longitude;
	const tz =
		options?.timeZone ??
		(isReference(coords) ? ((coords as any).timezone ?? (coords as any).tz) : undefined) ??
		geo.timezone;

	const dateVal = options?.date ?? (isReference(coords) ? extractEpochMs(coords) : undefined);
	const epochMs = isDefined(dateVal) ? extractEpochMs(dateVal) : Date.now();

	if (!isNumber(epochMs)) return NaN;

	const offsetMinutes = isText(tz) ? resolveCivilTimezoneOffset(tz, epochMs) : undefined;

	// If no civil timezone, use natural solar timezone meridian (round(lng / 15) * 15)
	const refMeridian =
		offsetMinutes !== undefined
			? (offsetMinutes / 60) * 15
			: Math.round(lng / 15) * 15;

	const deltaLng = lng - refMeridian;
	let offsetMin = deltaLng * 4;

	if (options?.apparent) {
		const d = new Date(epochMs);
		const startOfYear = Date.UTC(d.getUTCFullYear(), 0, 1);
		const dayOfYear = Math.floor((epochMs - startOfYear) / 86400000) + 1;
		const gamma = ((2 * Math.PI) / 365) * (dayOfYear - 1);
		const eqTime =
			229.18 *
			(0.000075 +
				0.001868 * Math.cos(gamma) -
				0.032077 * Math.sin(gamma) -
				0.014615 * Math.cos(2 * gamma) -
				0.040849 * Math.sin(2 * gamma));
		offsetMin += eqTime;
	}

	const unit = options?.unit ?? 'mi';
	let res: number;
	if (unit === 'ss' || unit === 'seconds') {
		res = offsetMin * 60;
	} else if (unit === 'hh' || unit === 'hours') {
		res = offsetMin / 60;
	} else {
		res = offsetMin;
	}

	const precision = options?.precision ?? 2;
	const factor = Math.pow(10, precision);
	return Math.round(res * factor) / factor;
}
