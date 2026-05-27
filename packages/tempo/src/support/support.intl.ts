import type { IntlOptions } from '../tempo.type.js';

/** @internal baseline Intl settings */
export const IntlDefault: IntlOptions = {
	relativeTimeFormat: {
		style: 'narrow',
	},
	durationFormat: {
		style: 'long',
	}
}

/**
 * @internal 
 * Probe the runtime to see if the locale defaults to Month-Day-Year order.
 * This is a heuristic check used during Tempo.init().
 */
export function probeMDY(locale: string): boolean {
	try {
		// Use Dec 24th to check if '12' comes first
		const date = new Date(2024, 11, 24);
		const parts = new Intl.DateTimeFormat(locale).formatToParts(date);
		return parts[0].type === 'month' && parts[0].value === '12';
	} catch {
		return false;
	}
}

/**
 * @internal
 * Normalize and merge Intl configuration options.
 * @param value The user-supplied options to merge.
 * @param base The base configuration to merge against.
 */
export function resolveIntl(value: IntlOptions = {}, base: IntlOptions = IntlDefault): IntlOptions {
	const result = { ...base } as Record<string, any>;

	Object.entries(value).forEach(([k, v]) => {
		if ((k === 'relativeTime' || k === 'relativeTimeFormat' || k === 'numberFormat' || k === 'durationFormat') && typeof v === 'object' && v !== null && typeof v !== 'function') {
			const current = result[k];
			const isObj = (val: any) => typeof val === 'object' && val !== null && typeof val !== 'function';

			result[k] = {
				...(isObj(current) ? current as object : {}),
				...v as any
			};
		} else {
			result[k] = v;
		}
	});

	// Sync relativeTime and relativeTimeFormat (with precedence to relativeTimeFormat)
	if (result.relativeTimeFormat !== undefined) {
		result.relativeTime = result.relativeTimeFormat;
	} else if (result.relativeTime !== undefined) {
		result.relativeTimeFormat = result.relativeTime;
	}

	return result;
}
