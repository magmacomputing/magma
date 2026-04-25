import { toZonedDateTime, toInstant } from '#library/temporal.library.js';
import { isDefined, isFunction, isString, isUndefined, isNumber } from '#library/assertion.library.js';
import { secure } from '#library/proxy.library.js';
import { sortKey, byKey } from '#library/array.library.js';
import { sym, TermError, SCHEMA, getLargestUnit, isTempo, getRuntime } from '#tempo/support';
import type { Tempo } from '../tempo.class.js';
import type { TermPlugin, Range, ResolvedRange } from './plugin.type.js';
import { getHost } from './plugin.util.js';

/**
 * ## defineTerm
 * Helper to register a Term plugin.
 */
export const defineTerm = <T extends TermPlugin>(term: T): T => {
	registerTerm(term);
	return term;
}

/**
 * ## findTermPlugin
 * Find a Term plugin by key, scope, or sub-key.
 */
export function findTermPlugin(ident: string): TermPlugin | undefined {
	if (!isString(ident)) return undefined;
	const id = (ident.startsWith('#') ? ident.slice(1) : ident).toLowerCase();
	const [termPart] = id.split('.');

	return getRuntime().pluginsDb.terms.find((t: TermPlugin) => {
		if (t.key?.toLowerCase() === termPart || t.scope?.toLowerCase() === termPart) return true;
		if (t.groups) {
			const list = Array.isArray(t.groups) ? t.groups : Object.values(t.groups).flat(Infinity) as Range[];
			return list.some((r: Range) => r.key?.toLowerCase() === id || r.key?.toLowerCase() === termPart);
		}
		return false;
	});
}

/**
 * ## defineRange
 * Factory to normalize and group Term ranges for efficient lookup.
 */
export function defineRange<T extends Range>(ranges: T[], ...keys: (keyof T)[]) {
	return byKey(ranges, ...keys);
}

/**
 * find where a Tempo fits within a range of DateTime
 */
export function getTermRange(tempo: Tempo, list: Range[], keyOnly: boolean | number = true, anchor?: any): string | ResolvedRange | undefined {
	const chronological = sortKey([...list], 'year', 'month', 'day', 'hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond');
	if (chronological.length === 0) return undefined;

	const zdt = anchor ?? (tempo as any).toDateTime();

	// determine the largest unit defined in the range list, and use the unit above it as rollover
	const unit = getLargestUnit(list);
	const unitIndex = SCHEMA.findIndex(([u]) => u === unit);
	const rolloverIndex = Math.max(0, unitIndex - 1);
	const rolloverUnit = SCHEMA[rolloverIndex][0];

	const resolve = (range: Range, anchor: Temporal.ZonedDateTime) => {
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
		const resZdt = toZonedDateTime({ ...obj, timeZone: anchor.timeZoneId, calendar: anchor.calendarId });
		// @ts-ignore
		return new (getHost(tempo))(resZdt, (tempo as any).config);
	}

	const matchIndex = chronological.findLastIndex(range => {
		const date = resolve(range, zdt);
		return (date.toDateTime().epochNanoseconds as bigint) <= (zdt.epochNanoseconds as bigint);
	});

	if (isNumber(keyOnly)) {
		const cycle = Math.floor(chronological.length / 3);
		if (cycle === 0 || !Number.isInteger(keyOnly) || keyOnly < 1 || keyOnly > cycle) return undefined;

		const offset = matchIndex === -1 ? cycle : Math.floor(matchIndex / cycle) * cycle;
		const match = chronological[offset + (keyOnly - 1)];
		if (!match) return undefined;

		const start = resolve(match, zdt);
		let end: Tempo;
		const i = offset + (keyOnly - 1);
		const next = chronological[i + 1];

		if (next) {
			end = resolve(next, zdt);
		} else {
			const roll = { ...match };
			if (isNumber(roll.year)) roll.year++;
			end = resolve(roll, zdt.add({ [`${rolloverUnit}s`]: 1 } as any));
		}

		return {
			start,
			end,
			...match
		}
	}

	const match = chronological[matchIndex === -1 ? 0 : matchIndex];
	if (keyOnly === true) return match.key;

	const i = chronological.indexOf(match);
	const next = chronological[i + 1];

	const start = resolve(match, zdt);
	let end: Tempo;

	if (next) {
		end = resolve(next, zdt);
	} else {
		const roll = { ...match };
		if (isNumber(roll.year)) roll.year++;
		end = resolve(roll, zdt.add({ [`${rolloverUnit}s`]: 1 } as any));
	}

	return {
		start,
		end,
		...match
	}
}

/**
 * # getRange
 * Resolve the full list of candidates for a term, passing an anchor to prevent recursion.
 */
export function getRange(entry: any, t: Tempo, anchor?: any, group?: string): Range[] {
	const term = (entry.plugin ?? entry) as TermPlugin;
	let res: any;

	try {
		if (isDefined(anchor)) {
			const host = new (getHost(t))(anchor, (t as any).config);
			res = isFunction(term.resolve) ? term.resolve.call(host, anchor) : term.define.call(host, false, anchor);
		} else {
			res = isFunction(term.resolve) ? term.resolve.call(t) : term.define.call(t, false);
		}
	} catch (err: any) {
		if (err.message.includes('Class constructor')) {
			return [];
		}
		throw err;
	}

	let list = (res == null) ? [] : (Array.isArray(res) ? res : [res]);

	const keys = (term as any).groupBy ?? [];
	if (keys.length > 0) {
		list = list.filter(r => keys.every((key: string) => {
			if (key === 'sphere') {
				const valA = String(r[key] ?? '').toLowerCase();
				const valB = String((t.config as any)[key] ?? '').toLowerCase();
				if (valA === '' || valB === '') return false;
				return valB.includes(valA);
			}
			return r[key] === (t.config as any)[key];
		}));
	}

	if (group) {
		const meta: any = (term as any).groups ?? (term as any).ranges;
		const isPlainObject = (val: any) => typeof val === 'object' && val !== null && !Array.isArray(val) && !isFunction(val);

		if (isPlainObject(meta)) {
			const source = Object.values(meta).flat(Infinity);
			list = (source as any[]).filter(r => r.group === group);
		} else {
			list = list.filter(r => r.group === group);
		}
	}

	return secure(list) as Range[];
}

/**
 * Resolve a term to a specific boundary based on a mutation.
 */
export function resolveTermAnchor(tempo: Tempo, terms: any[], offset: string, mutate: string): any {
	const ident = offset.startsWith('#') ? offset.slice(1) : offset;
	const termObj = terms.find(t => t.key === ident || t.scope === ident);
	if (!termObj) return undefined;

	const anchor = (tempo as any).toDateTime();
	const list = getRange(termObj, tempo, anchor);
	const range = (getTermRange(tempo, list, false, anchor) as any);
	if (!range) return undefined;

	if (mutate === 'start') return range.start;
	if (mutate === 'mid') {
		const startNs = range.start.toDateTime().epochNanoseconds as bigint;
		const endNs = range.end.toDateTime().epochNanoseconds as bigint;
		const midNs = startNs + (endNs - startNs) / BigInt(2);
		// @ts-ignore
		return new tempo.constructor(toInstant(midNs).toZonedDateTimeISO((range.start as any).tz).withCalendar((range.start as any).cal), (tempo as any).config);
	}
	if (mutate === 'end') return range.end.subtract({ nanoseconds: 1 });

	return undefined;
}

/**
 * Resolve a term shift.
 */
export function resolveTermShift(tempo: Tempo, source: any[], offset: string, shift: number): any {
	const anchor = (tempo as any).toDateTime();
	let list: Range[] = [];

	// If source is a list of plugins, find the right one and resolve it.
	// Otherwise, it's a pre-resolved list of ranges.
	if (source.length > 0 && 'define' in source[0]) {
		const ident = offset.startsWith('#') ? offset.slice(1) : offset;
		const termObj = source.find(t => t.key === ident || t.scope === ident);
		if (!termObj) return undefined;
		list = getRange(termObj, tempo, anchor);
	} else {
		list = source;
	}

	const range = (getTermRange(tempo, list, false, anchor) as any);
	if (!range) return undefined;

	// find index in list (matching key and major components for identity)
	const idx = list.findIndex(r => {
		return r.key === range.key &&
			(isUndefined(r.year) || isUndefined(range.year) || r.year === range.year) &&
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
	return res.start;
}

type resolveOptions = {
	anchor?: any;
	groupBy?: string[];
	[key: string]: any;
}
/**
 * # resolveCycleWindow
 * Resolves a window of ranges (prev, current, next) around a source date,
 * ensuring all returned ranges are detached clones and validated against the context.
 */
export function resolveCycleWindow(source: Tempo | any, template: Range[] | Record<string, Range[]>, { anchor, groupBy = [], ...options }: resolveOptions = {}): Range[] {
	// ensure we have a valid Tempo instance to work with
	const t = (isTempo(source) ? source : (isDefined(source) ? new (getHost(source))(source) : source)) as Tempo;
	if (!isTempo(t)) return [];

	// 1. Resolve Template (supporting optional dynamic grouping)
	let list: Range[] = [];
	if (!isDefined(template)) {
		(t.constructor as any)[TermError]?.(t.config, 'template');
		return [];
	}

	if (!Array.isArray(template) && groupBy.length > 0) {
		const groupKey = groupBy
			.map(key => options[key] ?? anchor?.[key] ?? t.config[key] ?? (t as any)[key] ?? '')
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
			const missing = groupBy.filter(k => isUndefined(options[k]) && isUndefined(anchor?.[k]) && isUndefined(t.config[k]));
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
	sortKey(list, 'month', 'day', 'hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond');

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
				clone.year = (itm.year >= -10 && itm.year <= 10) ? itm.year + targetYY : itm.year; // See Range JSDoc in plugin.type.ts (|year| ≤ 10 is relative)
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
export function registerTerm(term: TermPlugin) {
	const rt = getRuntime();

	// Validate and persist in the runtime's discovery database.
	rt.addTerm(term);

	rt.emit(sym.$Register, term);
}
