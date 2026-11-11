import { toZonedDateTime, toInstant, getTemporalIds, instant } from '#library/temporal.library.js';
import { isNotNullish, isFunction, isObject, isString, isUndefined, isNumber, isZonedDateTime, isPlainObject, isText, isSafeKey, isNullish } from '#library/assertion.library.js';
import { secure } from '#library/proxy.library.js';
import { sortKey, byKey } from '#library/array.library.js';
import { asArray, asError } from '#library/coercion.library.js';
import { deepFreeze } from '#library/utility.library.js';
import { cast } from '#library/type.library.js';

import { TEMPO_VERSION } from '../../tempo.version.js';
import { getHost, ensureModule } from '../plugin.util.js';
import { sym, TermError, isTempo } from '../../support/support.symbol.js';
import { getRuntime } from '../../support/support.runtime.js';
import { SCHEMA, getLargestUnit, logWarn } from '../../support/support.util.js';
import type { Tempo } from '../../tempo.class.js';
import type { TermPlugin, Range, ResolvedRange, TermSpan, TermFactory } from './term.type.js';

/**
 * ## defineTerm
 * Helper to register a Term plugin.
 */
export const defineTerm = <T extends TermPlugin, Opts = any>(term: T): TermFactory<T, Opts> => {
	const aliasesSet = new Set<string>();
	for (const a of asArray(term.aliases))
		if (a !== term.key) aliasesSet.add(a);

	if (term.scope && term.scope !== term.key)
		aliasesSet.add(term.scope);

	const termObj = {
		...term,
		...(aliasesSet.size > 0 ? { aliases: Array.from(aliasesSet) } : {}),
		[sym.$PluginType]: 'term',
		version: term.version ?? TEMPO_VERSION
	} as T;

	const factory = function (options?: Opts) {
		return deepFreeze({
			...termObj,
			options: isObject(options) ? { ...options } : options,
			[sym.$PluginType]: 'term'
		});
	};

	const { name, ...rest } = termObj as any;
	const result = Object.assign(factory, rest, { [sym.$PluginType]: 'term' });
	if (name) {
		Object.defineProperty(result, 'name', { value: name, configurable: true });
	}

	registerTerm(result);
	return deepFreeze(result) as TermFactory<T, Opts>;
}

/**
 * Finds a term plugin by its key, scope, alias, or range key.
 *
 * @param ident - The term or range identifier, optionally prefixed with `#`
 * @param state - Optional plugin state to search
 * @returns The matching term plugin, or `undefined` when no match is found
 */
export function findTermPlugin(ident: string, state?: any): TermPlugin | undefined {
	if (!isString(ident)) return undefined;
	const id = (ident.startsWith('#') ? ident.slice(1) : ident).toLowerCase();
	const [termPart] = id.split('.');

	const st = state?.pluginsDb ? state : getRuntime().state;
	if (!st?.pluginsDb?.terms) return undefined;

	return st.pluginsDb.terms.find((t: TermPlugin) => {
		if (t.key?.toLowerCase() === termPart || t.scope?.toLowerCase() === termPart) return true;
		if (asArray(t.aliases).some((a: string) => a.toLowerCase() === termPart)) return true;
		if (t.groups) {
			const list = Array.isArray(t.groups) ? t.groups : Object.values(t.groups).flat(Infinity) as Range[];
			return list.some((r: Range) => r.key?.toLowerCase() === id || r.key?.toLowerCase() === termPart);
		}
		return false;
	});
}

/**
 * ## defineSpan
 * Constructs an encapsulated TermSpan object with temporal boundaries, durations,
 * and normalized progress metrics (`0.0..1.0`).
 *
 * @param tempo - The reference Tempo instance
 * @param start - Start boundary of the range (Tempo instance)
 * @param end - End boundary of the range (Tempo instance)
 * @param anchor - Optional reference instant (defaults to `tempo`)
 * @returns Encapsulated TermSpan object
 */
export function defineSpan(tempo: Tempo, start: Tempo, end: Tempo, anchor?: any): TermSpan {
	const hostTempo = isTempo(tempo) ? tempo : start;
	const Host = getHost(hostTempo);
	const refTempo = isTempo(anchor)
		? anchor
		: (isZonedDateTime(anchor) && Host ? new Host(anchor, (hostTempo as any).config) : hostTempo);
	const refZdt = refTempo.toDateTime();
	let total: any;
	let elapsed: any;
	let remaining: any;

	if (ensureModule(hostTempo, 'DurationModule', true)) {
		total = start.until(end);
		elapsed = start.until(refTempo);
		remaining = refTempo.until(end);
	} else {
		const startZdt = start.toDateTime();
		const endZdt = end.toDateTime();
		total = startZdt.until(endZdt);
		elapsed = startZdt.until(refZdt);
		remaining = refZdt.until(endZdt);
	}

	const totalNs = (end.toDateTime().epochNanoseconds as bigint) - (start.toDateTime().epochNanoseconds as bigint);
	const elapsedNs = (refZdt.epochNanoseconds as bigint) - (start.toDateTime().epochNanoseconds as bigint);
	const rawProgress = totalNs > 0n ? Number(elapsedNs) / Number(totalNs) : 0;
	const progress = Math.round(Math.max(0, Math.min(1, rawProgress)) * 10000) / 10000;

	return {
		start,
		end,
		total,
		elapsed,
		remaining,
		progress
	};
}

/**
 * ## defineRange
 * Groups and secures term ranges for efficient lookup.
 *
 * @param ranges - The ranges to group
 * @param keys - Range properties used as grouping keys
 * @returns A secured collection of grouped ranges
 */
export function defineRange<T extends Range>(ranges: T[], ...keys: (keyof T)[]) {
	return secure(byKey(ranges, ...keys));
}

/**
 * Resolves the range containing a Tempo instance.
 *
 * @param tempo - The Tempo instance to locate
 * @param list - The ranges to search
 * @param keyOnly - Controls the result: `true` returns the range key, a positive integer returns the corresponding cycle range, and `false` returns the resolved range
 * @param anchor - Optional temporal anchor used to resolve range boundaries
 * @returns The matching range key, resolved range, or `undefined` when no range is available
 * @internal
 */
export function getTermRange(tempo: Tempo, list: Range[] | readonly Range[], keyOnly: boolean | number | string = true, anchor?: any): string | ResolvedRange | undefined | null {
	if (list.length === 0) return undefined;

	let zdt = isTempo(anchor)
		? anchor.toDateTime()
		: (isZonedDateTime(anchor) ? anchor : (isTempo(tempo) ? tempo.toDateTime() : undefined));
	if (!isZonedDateTime(zdt))
		zdt = instant().toZonedDateTimeISO(tempo.config.timeZone ?? 'UTC');

	// determine the largest unit defined in the range list, and use the unit above it as rollover
	const unit = getLargestUnit(list);
	const unitIndex = SCHEMA.findIndex(([u]) => u === unit);
	const rolloverIndex = Math.max(0, unitIndex - 1);
	const rolloverUnit = SCHEMA[rolloverIndex][0];

	const resolve = (range: Range, anchor: Temporal.ZonedDateTime) => {
		if (range.span?.start)
			return range.span.start;
		
		const obj: any = {};
		for (let i = 0; i < SCHEMA.length; i++) {
			const [u] = SCHEMA[i];
			const val = range[u];
			if (isNumber(val)) {
				obj[u] = val;
			} else if (i > rolloverIndex) {
				obj[u] = (i <= 2) ? 1 : 0;
			} else {
				const fallback = (anchor as any)[u];
				obj[u] = isNumber(fallback) ? fallback : (i <= 2 ? 1 : 0);
			}
		}
		// @ts-ignore
		const [timeZone, calendar] = getTemporalIds(anchor.timeZoneId, anchor.calendarId);
		const resZdt = toZonedDateTime({ ...obj, timeZone, calendar });

		// @ts-ignore
		return new (getHost(tempo))(resZdt, (tempo as any).config);
	};

	const hasSpans = list.some(r => r.span?.start);
	const chronological = hasSpans
		? [...list].sort((a, b) => {
			const aNs = (a.span?.start ?? resolve(a, zdt)).epoch.ns as bigint;
			const bNs = (b.span?.start ?? resolve(b, zdt)).epoch.ns as bigint;
			return aNs < bNs ? -1 : (aNs > bNs ? 1 : 0);
		})
		: sortKey([...list], 'year', 'month', 'day', 'hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond');
	if (chronological.length === 0) return undefined;

	const matchIndex = chronological.findLastIndex(range => {
		const date = resolve(range, zdt);
		return (date.toDateTime().epochNanoseconds as bigint) <= (zdt.epochNanoseconds as bigint);
	});

	const SCHEMA_KEYS = new Set([
		'year', 'month', 'week', 'day', 'hour',
		'minute', 'second', 'millisecond', 'microsecond', 'nanosecond'
	]);

	const hostTempo = isTempo(tempo) ? tempo : new (getHost(tempo))(zdt, (tempo as any)?.config);

	const buildResolvedRange = (matchItem: any, start: Tempo, end: Tempo): ResolvedRange => {
		const meta: Record<string, any> = {};
		for (const [k, v] of Object.entries(matchItem)) {
			if (!SCHEMA_KEYS.has(k) && k !== 'span')
				meta[k] = v;
		}

		const resolvedStart = matchItem.span?.start ?? start;
		const resolvedEnd = matchItem.span?.end ?? end;

		return {
			...meta,
			span: defineSpan(hostTempo, resolvedStart, resolvedEnd, zdt)
		} as ResolvedRange;
	};

	const deriveCycleLength = (): number => {
		const len = chronological.length;
		if (len <= 2) return len;
		if (len % 3 === 0) {
			const third = len / 3;
			const r0 = chronological[0];
			const r1 = chronological[third];
			const r2 = chronological[third * 2];

			const y0 = r0?.span?.start?.yy ?? r0?.year;
			const y1 = r1?.span?.start?.yy ?? r1?.year;
			const y2 = r2?.span?.start?.yy ?? r2?.year;

			// Require evidence of successive cycle years before reducing the list length
			if (isNumber(y0) && isNumber(y1) && isNumber(y2) && y1 === y0 + 1 && y2 === y1 + 1) {
				return third;
			}
		}
		return len;
	};

	if (isNumber(keyOnly)) {
		if (!Number.isInteger(keyOnly) || keyOnly < 1) return undefined;

		const cycle = deriveCycleLength();
		if (cycle === 0 || keyOnly > cycle) return undefined;

		const offset = (cycle === chronological.length)
			? 0
			: (matchIndex === -1 ? cycle : Math.floor(matchIndex / cycle) * cycle);
		const match = chronological[offset + (keyOnly - 1)];
		if (!match) return undefined;

		const start = match.span?.start ?? resolve(match, zdt);
		let end: Tempo;
		if (match.span?.end) {
			end = match.span.end;
		} else {
			const i = offset + (keyOnly - 1);
			const next = chronological[i + 1];

			if (next) {
				end = next.span?.start ?? resolve(next, zdt);
			} else {
				const roll = { ...match };
				if (isNumber(roll.year)) roll.year++;
				end = resolve(roll, zdt.add({ [`${rolloverUnit}s`]: 1 } as any));
			}
		}

		return buildResolvedRange(match, start, end);
	}

	if (isText(keyOnly)) {
		const cycle = deriveCycleLength();
		const offset = (cycle === 0 || cycle === chronological.length)
			? 0
			: (matchIndex === -1 ? cycle : Math.floor(matchIndex / cycle) * cycle);
		const cycleSlice = cycle > 0 && cycle < chronological.length ? chronological.slice(offset, offset + cycle) : chronological;
		const lowKey = keyOnly.toLowerCase();

		const currentMatch = matchIndex >= 0 ? chronological[matchIndex] : undefined;
		const match = (currentMatch && (currentMatch.label?.toLowerCase() === lowKey || currentMatch.key?.toLowerCase() === lowKey))
			? currentMatch
			: (cycleSlice.find(r => r.label?.toLowerCase() === lowKey)
				?? cycleSlice.find(r => r.key?.toLowerCase() === lowKey)
				?? chronological.find(r => r.year === zdt.year && r.label?.toLowerCase() === lowKey)
				?? chronological.find(r => r.year === zdt.year && r.key?.toLowerCase() === lowKey)
				?? chronological.find(r => r.key?.toLowerCase() === lowKey || r.label?.toLowerCase() === lowKey));
		if (!match) return undefined;

		const start = match.span?.start ?? resolve(match, zdt);
		let end: Tempo;
		if (match.span?.end) {
			end = match.span.end;
		} else {
			const i = chronological.indexOf(match);
			const next = chronological[i + 1];

			if (next) {
				end = next.span?.start ?? resolve(next, zdt);
			} else {
				const roll = { ...match };
				if (isNumber(roll.year)) roll.year++;
				end = resolve(roll, zdt.add({ [`${rolloverUnit}s`]: 1 } as any));
			}
		}

		return buildResolvedRange(match, start, end);
	}

	const match = chronological[matchIndex === -1 ? 0 : matchIndex];
	if (keyOnly === true) return match.key;

	const i = chronological.indexOf(match);
	const next = chronological[i + 1];

	const start = match.span?.start ?? resolve(match, zdt);
	let end: Tempo;

	if (match.span?.end) {
		end = match.span.end;
	} else if (next) {
		end = next.span?.start ?? resolve(next, zdt);
	} else {
		const roll = { ...match };
		if (isNumber(roll.year)) roll.year++;
		end = resolve(roll, zdt.add({ [`${rolloverUnit}s`]: 1 } as any));
	}

	return buildResolvedRange(match, start, end);
}

/**
 * Resolves and filters the ranges provided by a term plugin.
 *
 * @param entry - The term plugin entry to resolve
 * @param anchor - Optional anchor used as the resolution context
 * @param group - Optional group name used to filter the ranges
 * @returns The resolved, filtered range list
 * @internal
 */
export function getRange(entry: any, t: Tempo, anchor?: any, group?: string): readonly Range[] {
	const term = (entry.plugin ?? entry) as TermPlugin;
	let res: any;

	try {
		if (isNotNullish(anchor)) {
			const host = new (getHost(t))(anchor, (t as any).config);
			res = isFunction(term.resolve) ? term.resolve.call(host, anchor) : term.define.call(host, false, anchor);
		} else {
			res = isFunction(term.resolve) ? term.resolve.call(t) : term.define.call(t, false);
		}
	} catch (err: unknown) {
		const error = asError(err);
		if (error.message.includes('Class constructor'))
			return [];

		throw error;
	}

	let list = (res == null) ? [] : asArray(res);

	const keys = (term as any).groupBy ?? [];
	if (keys.length > 0) {
		list = list.filter(r => keys.every((key: string) => {
			if (key === 'sphere') {
				const valA = String(r[key] ?? '').toLowerCase();
				const valB = String(t.sphere ?? (t.config as any)[key] ?? '').toLowerCase();
				if (valA === '' || valB === '') return false;
				return valB.includes(valA);
			}
			return r[key] === ((t as any)[key] ?? (t.config as any)[key]);
		}));
	}

	if (group) {
		const meta: any = (term as any).groups ?? (term as any).ranges;

		if (isPlainObject(meta)) {
			const source = Object.values(meta).flat(Infinity);
			list = (source as any[]).filter(r => r.group === group);
		} else {
			list = list.filter(r => r.group === group);
		}
	}

	return secure(list) as readonly Range[];
}

/**
 * Resolves a term to a boundary of its current range.
 *
 * @param tempo - The reference time used to determine the current range
 * @param terms - The available term definitions
 * @param offset - The term key, scope, or alias, optionally prefixed with `#`
 * @param mutate - The boundary to resolve: `start`, `mid`, or `end`
 * @returns The range start, midpoint, or final instant before its end, or `undefined` when unavailable
 * @internal
 */
export function resolveTermAnchor(tempo: Tempo, terms: any[], offset: string, mutate: string): any {
	const ident = offset.startsWith('#') ? offset.slice(1) : offset;
	const termObj = terms.find(t => t.key === ident || t.scope === ident || asArray(t.aliases).includes(ident));
	if (!termObj) return undefined;

	const anchor = (tempo as any).toDateTime();
	const list = getRange(termObj, tempo, anchor);
	const range = (getTermRange(tempo, list, false, anchor) as any);
	if (!range) return undefined;

	const start = range.span.start;
	const end = range.span.end;

	if (mutate === 'start') return start;
	if (mutate === 'mid') {
		const startNs = start.toDateTime().epochNanoseconds as bigint;
		const endNs = end.toDateTime().epochNanoseconds as bigint;
		const midNs = startNs + (endNs - startNs) / 2n;
		// @ts-ignore
		return new tempo.constructor(toInstant(midNs).toZonedDateTimeISO((start as any).tz).withCalendar((start as any).cal), (tempo as any).config);
	}
	if (mutate === 'end') return end.subtract({ nanoseconds: 1 });

	return undefined;
}

/**
 * Resolves the start boundary of a range at a shifted position relative to the current term range.
 *
 * @param tempo - The reference date and time used to identify the current range.
 * @param source - Term plugins or pre-resolved ranges to search.
 * @param offset - The term key, scope, or alias when `source` contains plugins.
 * @param shift - The number of ranges to move forward or backward.
 * @returns The start boundary of the shifted range, or `undefined` if the source, current range, or target range cannot be resolved.
 * @internal
 */
export function resolveTermShift(tempo: Tempo, source: readonly any[], offset: string, shift: number): any {
	const anchor = (tempo as any).toDateTime();
	let list: readonly Range[] = [];

	// If source is a list of plugins, find the right one and resolve it.
	// Otherwise, it's a pre-resolved list of ranges.
	if (source.length > 0 && 'define' in source[0]) {
		const ident = offset.startsWith('#') ? offset.slice(1) : offset;
		const termObj = source.find(t => t.key === ident || t.scope === ident || asArray(t.aliases).includes(ident));
		if (!termObj) return undefined;
		list = getRange(termObj, tempo, anchor);
	} else {
		list = source as readonly Range[];
	}

	const range = (getTermRange(tempo, list, false, anchor) as any);
	if (!range) return undefined;

	const targetStart = range.span.start;

	// find index in list (matching key and major components for identity)
	const idx = list.findIndex(r => {
		if (r.key !== range.key) return false;
		if (r.span?.start && targetStart) {
			return r.span.start.epoch.ns === targetStart.epoch.ns;
		}
		if (targetStart) {
			return (isUndefined(r.year) || r.year === targetStart.yy) &&
				(isUndefined(r.month) || r.month === targetStart.mm) &&
				(isUndefined(r.day) || r.day === targetStart.dd);
		}
		return (isUndefined(r.year) || isUndefined(range.year) || r.year === range.year) &&
			(isUndefined(r.month) || isUndefined(range.month) || r.month === range.month) &&
			(isUndefined(r.day) || isUndefined(range.day) || r.day === range.day);
	});

	if (idx === -1) return undefined;

	const targetIdx = idx + shift;
	const target = list[targetIdx];
	if (!target) return undefined;

	// resolve target range
	const res = (getTermRange(tempo, [target], false) as any);
	if (!res) return undefined;
	return res.span.start;
}

type resolveOptions = {
	anchor?: any;
	groupBy?: string[];
	[key: string]: any;
}
/**
 * Builds a three-period range window centered on a source date.
 *
 * @param source - The date value or `Tempo` instance used to determine the window.
 * @param template - Range templates provided as an array or grouped record.
 * @param options - Configuration for the anchor and template grouping criteria.
 * @returns Detached range copies representing the previous, current, and next periods.
 * @internal
 */
/**
 * Coerces a Tempo instance, internal state, or date-time source into a valid Tempo host.
 *
 * @param source - Tempo instance, internal parser state, or date-time input
 * @param anchor - Optional date-time anchor when resolving from internal state
 * @returns A Tempo host instance, or `source` unchanged if no constructor is available
 * @internal
 */
export function resolveTermHost(source: Tempo | any, anchor?: any): Tempo | any {
	if (isTempo(source)) {
		if (isNotNullish(anchor)) {
			const Host = getHost(source);
			return Host ? new Host(anchor, (source as any).config) : source;
		}
		return source;
	}
	if (isObject(source) && 'pluginsDb' in source && 'config' in source) {
		const Host = (source as any).tempoInstance?.constructor ?? getHost(source);
		const safeConfig = { ...(source as any).config };
		delete safeConfig.anchor;
		delete safeConfig.scope;
		if (safeConfig.registry && Object.keys(safeConfig.registry).length === 0)
			delete safeConfig.registry;
		const basis = anchor ?? (source as any).tempoInstance ?? (source as any).parse?.anchor;
		return Host ? new Host(basis, safeConfig) : source;
	}
	if (isNotNullish(source)) {
		const Host = getHost(source);
		return Host ? new Host(source) : source;
	}
	return source;
}

export function resolveCycleWindow(source: Tempo | any, template: Range[] | readonly Range[] | Record<string, Range[] | readonly Range[]> | Record<PropertyKey, any>, { anchor, groupBy = [], ...options }: resolveOptions = {}): Range[] {
	// ensure we have a valid Tempo instance to work with
	const t = resolveTermHost(source, anchor) as Tempo;
	if (!isTempo(t)) return [];

	// 1. Resolve Template (supporting optional dynamic grouping)
	let list: Range[] = [];
	if (isNullish(template)) {
		(t.constructor as any)[TermError]?.(t.config, 'template');
		return [];
	}

	if (!Array.isArray(template) && groupBy.length > 0) {
		const groupKey = groupBy
			.map(key => options[key] ?? anchor?.[key] ?? (t as any)[key] ?? t.config[key] ?? '')
			.join('.');

		list = (template as any)[groupKey] ?? [];
		if (list.length === 0 && groupBy.includes('sphere')) {
			const sphereIdx = groupBy.indexOf('sphere');
			const targetParts = groupKey.split('.');
			const targetSphere = (targetParts.length > sphereIdx ? targetParts[sphereIdx] : '').toLowerCase();

			let bestKey: string | undefined;
			let bestSphereLength = -1;

			for (const k of Object.keys(template)) {
				const kParts = k.split('.');
				if (kParts.length !== targetParts.length) continue;

				const sphereSegment = (kParts[sphereIdx] ?? '').trim();
				if (!sphereSegment) continue;

				const staticMatch = kParts.every((p, i) => i === sphereIdx || p === targetParts[i]);
				if (!staticMatch) continue;

				const sphereLower = sphereSegment.toLowerCase();
				const sphereMatch = targetSphere.includes(sphereLower);
				if (!sphereMatch) continue;

				if (
					sphereSegment.length > bestSphereLength ||
					(sphereSegment.length === bestSphereLength && (!bestKey || k.localeCompare(bestKey) < 0))
				) {
					bestKey = k;
					bestSphereLength = sphereSegment.length;
				}
			}
			if (bestKey) list = (template as any)[bestKey];
		}

		if (list.length === 0) {
			const missing = groupBy.filter(k => isUndefined(options[k]) && isUndefined(anchor?.[k]) && isUndefined((t as any)[k]) && isUndefined(t.config[k]));
			const msg = missing.length > 0 ? `Missing grouping criteria: ${missing.join(', ')}` : `No ranges found for group: ${groupKey}`;
			(t.constructor as any)[TermError]?.(t.config, msg);
			return [];
		}
	} else {
		list = Array.isArray(template) ? template : Object.values(template).flat() as Range[];
	}

	if (list.length === 0) return [];

	// Ensure chronological order for reliable anchor/window calculation
	list = [...list]; // Defensive copy to avoid mutating the original template
	sortKey(list, 'year', 'month', 'day', 'hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond');

	// 2. Resolve Window (Sub-Yearly vs Yearly)
	const unit = getLargestUnit(list);
	if (!['year', 'month', 'day'].includes(unit as any)) {
		const results: Range[] = [];
		for (const offset of [-1, 0, 1]) {
			const date = t.add({ days: offset });
			list.forEach(itm => {
				results.push({
					...itm,
					year: date.yy,
					month: date.mm,
					day: date.dd
				});
			});
		}
		return results;
	}

	// Handle Yearly Cycles (Default)
	const yy = t.yy;
	const mm = t.mm;
	const dd = t.dd;

	const startItem = list[0];
	const startMm = startItem.month ?? 1;
	const startDd = startItem.day ?? 1;

	let baseYear = yy;
	if (mm < startMm || (mm === startMm && dd < startDd)) baseYear--;

	const window: Range[] = [];
	for (const offset of [-1, 0, 1]) {
		const targetYY = baseYear + offset;
		list.forEach(itm => {
			const clone = { ...itm };
			// Normalize year semantics: Treat small offsets as relative to the cycle,
			// while treating larger numbers as absolute years (e.g. for fixed historical dates).
			if (isNumber(itm.year)) {
				clone.year = (itm.year >= -10 && itm.year <= 10) ? itm.year + targetYY : itm.year; // See Range JSDoc in term.type.ts (|year| ≤ 10 is relative)
			} else {
				clone.year = targetYY;
			}
			window.push(clone);
		});
	}

	return window;
}

/**
 * ## registerTerm
 * Registration hook for Term plugins.
 */
export function registerTerm(term: TermPlugin, state?: any) {
	const rt = getRuntime();

	// Validate and persist in the state's discovery database.
	if (state) rt.addTerm(state, term);
	else if (rt.state) rt.addTerm(rt.state, term);

	rt.emit(sym.$Register, term);
}

/**
 * Resolves an anchored ordinal expression (e.g. "3rd day of #qtr.2", "last day of #szn.summer")
 * relative to a range-based Term plugin.
 *
 * @param termObj - The term plugin instance providing ranges via define()
 * @param groups - Capture groups from the ordinal expression (e.g. ord, term, value)
 * @param anchor - The reference Tempo instance
 * @returns The resolved Tempo instance, or undefined when not resolvable
 */
export function resolveRangeOrdinal(
	termObj: any,
	groups: Record<string, any>,
	anchor: Tempo,
): Tempo | undefined {
	const rawDayOffset = groups.value ?? (isString(groups.ord) ? parseInt(groups.ord, 10) : undefined);
	if (!Number.isFinite(rawDayOffset) || rawDayOffset === 0) return undefined;

	const parts = (groups.term || '').slice(1).split('.');
	const subKey = parts[1];

	let range: any;
	if (isNotNullish(subKey) && subKey !== '') {
		const cycleNum = parseInt(subKey, 10);
		if (Number.isInteger(cycleNum) && cycleNum > 0) {
			range = isFunction(termObj.define) ? termObj.define.call(anchor, cycleNum, anchor) : undefined;
		} else {
			range = isFunction(termObj.define) ? termObj.define.call(anchor, subKey, anchor) : undefined;
		}
	} else {
		range = isFunction(termObj.define) ? termObj.define.call(anchor, false, anchor) : undefined;
	}

	const start = range?.span?.start;
	const end = range?.span?.end;
	if (!start || !end) return undefined;

	const target = (rawDayOffset > 0)
		? start.add({ days: rawDayOffset - 1 })
		: end.subtract({ days: Math.abs(rawDayOffset) });

	const targetNs = target.toDateTime().epochNanoseconds as bigint;
	const startNs = start.toDateTime().epochNanoseconds as bigint;
	const endNs = end.toDateTime().epochNanoseconds as bigint;

	return (targetNs < startNs || targetNs >= endNs)
		? undefined
		: target;
}

/**
 * Resolves the difference between two Tempo instances in terms of a range-based Term plugin.
 * (e.g. t1.until(t2, '#qtr'), t2.since(t1, '#szn'))
 *
 * @param termObj - The term plugin instance providing ranges via define()
 * @param other - The target Tempo instance
 * @param _unit - The unit string (e.g. "#qtr")
 * @param tempo - The origin Tempo instance
 * @returns The signed count of ranges between tempo and other, or undefined
 */
export function resolveRangeDiff(
	termObj: any,
	other: Tempo,
	_unit: string,
	tempo: Tempo,
): number | undefined {
	if (!isFunction(termObj?.define)) return undefined;

	const rangeA = termObj.define.call(tempo, false, tempo);
	const rangeB = termObj.define.call(other, false, other);
	const startA = rangeA?.span?.start;
	const endA = rangeA?.span?.end;
	const startB = rangeB?.span?.start;
	const endB = rangeB?.span?.end;
	if (!startA || !endA || !startB || !endB) return undefined;

	const startANs = startA.toDateTime().epochNanoseconds as bigint;
	const startBNs = startB.toDateTime().epochNanoseconds as bigint;

	if (startANs === startBNs) return 0;

	// Invert for past target
	if (startBNs < startANs) {
		const positiveDiff = resolveRangeDiff(termObj, tempo, _unit, other);
		return isNotNullish(positiveDiff) ? -positiveDiff : undefined;
	}

	let count = 0;
	let currentRange = rangeA;
	const maxIterations = 10000;

	while (count < maxIterations) {
		const currentEnd = currentRange?.span?.end;
		if (!currentEnd) return undefined;
		const currentEndNs = currentEnd.toDateTime().epochNanoseconds as bigint;
		if (currentEndNs > startBNs)
			break;

		count++;
		const nextRange = termObj.define.call(currentEnd, false, currentEnd);
		const currentStart = currentRange?.span?.start;
		const nextStart = nextRange?.span?.start;
		const nextEnd = nextRange?.span?.end;
		if (!nextStart || !nextEnd || (nextStart.toDateTime().epochNanoseconds as bigint) <= (currentStart.toDateTime().epochNanoseconds as bigint))
			return undefined;

		currentRange = nextRange;
	}

	return (count >= maxIterations) ? undefined : count;
}

/**
 * Resolves formatted term tokens (e.g. "{#qtr}", "{#qtr.label}", "{#szn.symbol}")
 * by delegating to the range definition of the term.
 *
 * @param termObj - The term plugin instance providing ranges via define()
 * @param token - The format token (e.g. "#qtr", "#qtr.label")
 * @param tempo - The reference Tempo instance being formatted
 * @returns The resolved string value, or undefined when not resolvable
 */
export function resolveRangeFormat(
	termObj: any,
	token: string,
	tempo: Tempo,
): string | undefined {
	if (!isFunction(termObj?.define)) return undefined;

	const range = termObj.define.call(tempo, false, tempo);
	if (!range) return undefined;

	const parts = token.slice(1).split('.');
	const subKeys = parts.slice(1);

	// Top-level token without sub-path (e.g. "{#qtr}", "{#quarter}", "{#szn}")
	if (subKeys.length === 0) {
		const tokenName = parts[0]?.toLowerCase();
		const isScope = tokenName === termObj.scope?.toLowerCase();
		const val = isObject(range)
			? (isScope ? (range.label ?? range.key) : (range.key ?? range.label))
			: range;
		return isNotNullish(val) ? String(val) : undefined;
	}

	// Traverse sub-keys (e.g. "{#qtr.label}", "{#szn.symbol}", "{#qtr.span.start}", "{#tod.hour}")
	let curr: any = range;
	for (const key of subKeys) {
		if (isNullish(curr) || !isSafeKey(key)) return undefined;
		curr = curr[key] ??
			curr.span?.[key] ??
			(isTempo(curr.span?.start) ? (curr.span.start.toDateTime() as any)[key] ?? (curr.span.start as any)[key] : undefined);
	}

	if (isNullish(curr) || isFunction(curr)) return undefined;

	if (isTempo(curr))
		return cast<Tempo>(curr).format('{yyyy}-{mm}-{dd}');

	return isObject(curr)
		? String(curr.label ?? curr.key ?? curr.name ?? curr.value ?? curr)
		: String(curr);
}

/**
 * Resolves a normalized hemisphere ('north' | 'south') for terms requiring a polar sphere.
 * Enforces the "refuse-to-guess" policy: if the sphere is missing, non-polar (e.g. 'equator', 'east'),
 * or unresolvable, emits a diagnostic warning and returns undefined.
 *
 * @param source - The raw sphere string, or an object containing sphere (e.g. Tempo instance, anchor, or context)
 * @param termName - Optional name of the calling term plugin for the diagnostic warning
 * @param config - Optional configuration object passed to logWarn
 * @returns 'north' | 'south' | undefined
 */
/**
 * Resolves the hemisphere or equatorial sphere from a configuration source.
 *
 * @param source - The source containing sphere/hemisphere settings
 * @param termName - Optional term identifier for warning messages
 * @param config - Optional configuration object
 * @returns 'north' | 'south' | 'equator' | undefined
 */
export function resolveTermSphere(
	source?: any,
	termName?: string,
	config?: any,
): 'north' | 'south' | 'equator' | undefined {
	const raw = isObject(source)
		? (source.sphere ?? (source as any).anchor?.sphere ?? (source as any).config?.sphere)
		: source;

	const s = isString(raw) ? raw.toLowerCase() : '';
	const isSouth = s.includes('south');
	const isNorth = s.includes('north');
	const isEquator = s.includes('equator');

	const matches = [isSouth, isNorth, isEquator].filter(Boolean).length;
	if (matches !== 1) {
		if (termName)
			logWarn(`[tempo] ${termName} requires an explicit sphere of 'north', 'south', or 'equator' (received: ${JSON.stringify(raw)}).`, config);

		return undefined;
	}

	if (isEquator) return 'equator';
	return isSouth ? 'south' : 'north';
}


