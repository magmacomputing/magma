import { defineTerm, getTermRange, defineRange, resolveCycleWindow, resolveRangeOrdinal, resolveRangeDiff, resolveRangeFormat, TermHook, type TermSpan } from '@magmacomputing/tempo/plugin/sdk';
import { asArray } from '@magmacomputing/library';
import type { Tempo } from '@magmacomputing/tempo';

export const QUARTER_KEYS = Object.freeze(['Q1', 'Q2', 'Q3', 'Q4'] as const);
export type QuarterKey = (typeof QUARTER_KEYS)[number];

/** definition of ISO calendar quarter ranges */
const groups = defineRange([
	{ key: 'Q1', day: 1, month: 1, label: 'First Quarter' },
	{ key: 'Q2', day: 1, month: 4, label: 'Second Quarter' },
	{ key: 'Q3', day: 1, month: 7, label: 'Third Quarter' },
	{ key: 'Q4', day: 1, month: 10, label: 'Fourth Quarter' },
]);

/**
 * Projects a Tempo or anchor instance into the ISO 8601 calendar,
 * preserving the target instant and time zone.
 */
function toIsoTempo(target: any, fallback: Tempo): Tempo {
	const ref = target ?? fallback;
	const zdt = typeof ref?.toDateTime === 'function'
		? ref.toDateTime()
		: (ref?.calendarId !== undefined && typeof ref?.withCalendar === 'function' ? ref : undefined);

	if (zdt) {
		const Host = fallback.constructor as any;
		if (zdt.calendarId !== 'iso8601') {
			const isoZdt = zdt.withCalendar('iso8601');
			return new Host(isoZdt, { ...(fallback as any).config, calendar: 'iso8601' });
		}
		if (!(ref instanceof fallback.constructor)) {
			return new Host(zdt, (fallback as any).config);
		}
	}
	return ref;
}

/**
 * Resolves calendar quarter candidates.
 *
 * @param t - The source Tempo instance
 * @param anchor - Optional reference time override
 * @returns Array of matching quarter term definitions
 * @internal
 */
function resolve(t: Tempo, anchor?: any): any[] {
	const isoHost = toIsoTempo(anchor, t);
	return resolveCycleWindow(isoHost, groups, { anchor: isoHost });
}

/**
 * ## QuarterTerm
 * ISO 8601-2 Calendar Quarter
 */
export const QuarterTerm = defineTerm({
	key: 'qtr',
	scope: 'quarter',
	description: 'Calendar Quarter',
	groups,
	keys: QUARTER_KEYS,

	resolve(this: Tempo, anchor?: any) {
		return resolve(this, anchor);
	},

	/** determine where the current Tempo instance fits within the above range */
	define(this: Tempo, keyOnly?: boolean | number | string, anchor?: any) {
		const isoHost = toIsoTempo(anchor, this);
		const res = resolve(this, anchor);
		const scope = getTermRange(isoHost, asArray(res), keyOnly as any, isoHost) as any;
		return (scope && typeof scope === 'object') ? { ...scope, keys: QUARTER_KEYS } : scope;
	},

	[TermHook.ordinal](this: any, groups: Record<string, any>, anchor: Tempo) {
		return resolveRangeOrdinal(this, groups, anchor);
	},

	[TermHook.diff](this: any, other: Tempo, unit: string, tempo: Tempo) {
		return resolveRangeDiff(this, other, unit, tempo);
	},

	[TermHook.format](this: any, token: string, tempo: Tempo) {
		return resolveRangeFormat(this, token, tempo);
	}
});

declare module '@magmacomputing/tempo' {
	interface TempoTermRegistry {
		qtr: QuarterKey;
		quarter: {
			key: QuarterKey;
			label: 'First Quarter' | 'Second Quarter' | 'Third Quarter' | 'Fourth Quarter';
			keys: readonly QuarterKey[];
			span: TermSpan;
		};
	}
}

