import { Temporal } from '@js-temporal/polyfill';

import { isDefined, isObject, isString, isZonedDateTime } from '#library/type.library.js';
import { isNumeric } from '#library/coercion.library.js';
import { $termError } from '../../tempo.symbol.js';
import { getSafeFallbackStep } from '../../tempo.util.js';
import { Match } from '../../tempo.default.js';
import { REGISTRY, getRange, getTermRange, resolveTermShift, findTermPlugin } from '../plugin.util.js';
import { parseModifier } from './module.lexer.js';

/**
 * Resolves a mutation (start/mid/end/add) against a Tempo Term.
 * 
 * @param Tempo - The Tempo constructor (for static access)
 * @param instance - The calling Tempo instance
 * @param mutate - The mutation type: 'set' | 'add' | 'start' | 'mid' | 'end'
 * @param unit - The term identifier (e.g. '#quarter')
 * @param offset - The mutation value (e.g. 1, -2, 'next', 'previous')
 * @param zdt - The current ZonedDateTime state
 * @returns The mutated ZonedDateTime
 */
export function resolveTermMutation(Tempo: any, instance: any, mutate: string, unit: string, offset: any, zdt: any): any {
	if (!isZonedDateTime(zdt)) return zdt;

	const [termPart, rangePart] = unit.startsWith('#')
		? unit.slice(1).split('.')
		: [unit, undefined];

	const termObj = findTermPlugin(termPart);

	if (!termObj) {
		Tempo[$termError](instance.config, unit);
		return null;
	}

	const tz = zdt.timeZoneId;
	const cal = zdt.calendarId;

	// Slick Shorthand Parsing (e.g. #qtr.>2, #zodiac.<)
	let mod: string | undefined;
	let nbr = 1;
	let rKey = rangePart;

	const slickStr = (rangePart ? unit : (isString(offset) ? offset : undefined));
	if (slickStr) {
		const slick = slickStr.match(Match.slick) || (isString(offset) ? offset.match(/^(?<sh_mod>[\+\-\<\>]=?|next|prev|this|last)?(?<sh_nbr>[0-9]+)?(?<sh_unit>[\w]*)$/) : null);
		const { groups } = (slick || {}) as any;
		if (groups) {
			mod = groups.sh_mod || (isNumeric(groups.sh_nbr) ? '+' : undefined);
			nbr = isNumeric(groups.sh_nbr) ? Number(groups.sh_nbr) : 1;
			rKey = (groups.sh_unit && groups.sh_unit.length > 0) ? groups.sh_unit : (groups.sh_mod ? undefined : rKey);
		}
	}

	// 1. Handle Absolute Mutations (start | mid | end) OR Slick Mutations
	if (mutate === 'start' || mutate === 'mid' || mutate === 'end' || mod) {
		let jump = zdt;
		let list = getRange(termObj, instance, jump);

		// 1. Core resolving loop: handle shifters and absolute searching with repeat counts
		const direction = (mod?.includes('<') || mod?.includes('-') || mod === 'prev' || mod === 'last') ? -1 : 1;
		let remaining = nbr;
		let iterations = 0;
		while (iterations < 200 && remaining > 0) {
			if (++iterations > 200) {
				Tempo[$termError](instance.config, unit);
				return null;
			}

			const rawList = getRange(termObj, instance, jump);
			let list = rawList;
			if (rKey) list = list.filter(r => r.key?.toLowerCase() === rKey.toLowerCase());

			const resolved = rawList.map(c => {
				const start = Temporal.ZonedDateTime.from({
					year: c.year ?? jump.year,
					month: c.month ?? 1,
					day: c.day ?? 1,
					hour: c.hour ?? 0,
					minute: c.minute ?? 0,
					second: c.second ?? 0,
					millisecond: c.millisecond ?? 0,
					microsecond: c.microsecond ?? 0,
					nanosecond: c.nanosecond ?? 0,
					timeZone: tz,
					calendar: cal
				});
				return getTermRange(instance, rawList, false, start);
			}).filter(isDefined) as any[];

			const isShifter = (mod === '>' || mod === '<' || mod === 'next' || mod === 'prev' || mod === 'last' || mod === '+' || mod === '-' || (mod === void 0 && nbr > 1));

			const compare = (r: any) => {
				const start = r.start.toDateTime().epochNanoseconds as bigint;
				const end = r.end.toDateTime().epochNanoseconds as bigint;
				const cursor = (isShifter && iterations > 1) ? (jump.epochNanoseconds as bigint) : (zdt.epochNanoseconds as bigint);

				let match = false;
				if (mod === '>' || mod === 'next') match = start > cursor;
				else if (mod === '<' || mod === 'prev' || mod === 'last') match = end < cursor;
				else if (mod === '>=') match = iterations > 1 ? start >= cursor : end > cursor;
				else if (mod === '<=') match = iterations > 1 ? end <= cursor : start <= cursor;
				else if (mod === '+' || mod === '-') {
					const res = parseModifier({
						mod: mod as any, adjust: 1, offset: Number(cursor / 1000000n),
						period: Number((mod === '-') ? end / 1000000n : start / 1000000n)
					});
					match = res !== 0;
				} else {																						// Absolute Search or Inclusive mod
					const offset = Number(cursor / 1000000n);
					if (mod === void 0) {
						match = true;
					} else {
						const res = parseModifier({
							mod: mod as any, adjust: 1, offset,
							period: Number(start / 1000000n)
						});
						match = res === 0;
					}
				}
				return match;
			};

			const matches = resolved
				.filter(c => rKey ? c.key?.toLowerCase() === rKey.toLowerCase() : true)
				.filter(compare)
				.sort((a, b) => {
					const startA = a.start.toDateTime().epochNanoseconds as bigint;
					const startB = b.start.toDateTime().epochNanoseconds as bigint;
					const cursor = jump.epochNanoseconds as bigint;

					if (isShifter) return direction > 0 ? (startA < startB ? -1 : 1) : (startA > startB ? -1 : 1);

					const diffA = startA > cursor ? startA - cursor : cursor - startA;
					const diffB = startB > cursor ? startB - cursor : cursor - startB;
					return diffA < diffB ? -1 : (diffA > diffB ? 1 : 0);
				}).filter(m => {
					if (!isShifter) return true;
					const start = m.start.toDateTime().epochNanoseconds as bigint;
					const end = m.end.toDateTime().epochNanoseconds as bigint;
					const cursor = jump.epochNanoseconds as bigint;
					if (direction > 0) return start >= cursor;
					return end <= cursor;
				});

			if (matches.length > 0) {
				const target = matches[0];
				const found = target.start.toDateTime().withTimeZone(tz).withCalendar(cal);
				remaining--;
				if (remaining === 0) {
					if (mutate === 'mid' || mutate === 'end') {
						jump = found;
						break;
					}
					return found;
				}
				jump = (direction > 0) ? target.end.toDateTime() : target.start.toDateTime().subtract({ nanoseconds: 1 });
			} else {
				const currentRes = (getTermRange(instance, rawList, false, jump) as any);
				if (!currentRes) { jump = (direction > 0) ? jump.add({ days: 30 }) : jump.subtract({ days: 30 }); continue; }
				jump = (direction > 0) ? currentRes.end.toDateTime() : currentRes.start.toDateTime().subtract({ nanoseconds: 1 });
			}
		}

		// Final range resolution for mid/end
		if (mutate === 'mid' || mutate === 'end') {
			const finalRange = (getTermRange(instance, getRange(termObj, instance, jump), false, jump) as any);
			if (mutate === 'mid') {
				const startNs = finalRange.start.toDateTime().epochNanoseconds as bigint;
				const endNs = finalRange.end.toDateTime().epochNanoseconds as bigint;
				const midNs = startNs + (endNs - startNs) / BigInt(2);
				return Temporal.Instant.fromEpochNanoseconds(midNs).toZonedDateTimeISO(tz).withCalendar(cal);
			}
			return finalRange.end.toDateTime().subtract({ nanoseconds: 1 }).withTimeZone(tz).withCalendar(cal);
		}
		return jump;
	}

	// 2. Handle Relative Mutations (add | set)
	if (isString(offset) && !offset.startsWith('#')) {
		let jump = zdt;
		// Determine the shifted target by recursively calling .set on a temporary strict instance
		let next = new instance.constructor(jump, { ...instance.config, mode: 'strict' }).set({ [unit]: offset }).toDateTime();

		let iterations = 0;
		while (next.epochNanoseconds <= zdt.epochNanoseconds) {
			if (++iterations > 50) {													// Safety-Valve: prevent infinite look-ahead
				const range = termObj.define.call(new instance.constructor(jump, { ...instance.config, mode: 'strict' }), false);
				const step = getSafeFallbackStep(range as any, termObj.scope ?? (unit === '#period' ? 'period' : undefined));
				jump = jump.add(step);
			} else {
				const range = termObj.define.call(new instance.constructor(jump, { ...instance.config, mode: 'strict' }), false);
				if (isObject(range) && (range as any).end) {
					jump = (range as any).end.toDateTime();
				} else {
					const step = (unit === '#period' || termObj.scope === 'period') ? { days: 1 } : { years: 1 };
					jump = jump.add(step);
				}
			}
			next = new instance.constructor(jump, { ...instance.config, mode: 'strict' }).set({ [unit]: offset }).toDateTime();
		}
		return next;
	}

	// 3. Handle Numeric Shifts or Term Shifting
	if (isNumeric(offset) || (isString(offset) && offset.startsWith('#'))) {
		const shiftValue = isNumeric(offset) ? Number(offset) : 1;
		let jump = zdt;
		let remaining = Math.abs(shiftValue);
		const direction = shiftValue > 0 ? 1 : -1;

		let iterations = 0;
		while (remaining > 0) {
			if (++iterations > 100) {												// Safety-Valve: prevent infinite shift
				Tempo[$termError](instance.config, unit);
				return null;
			}

			let list = getRange(termObj, instance, jump);

			// If a range part was specified, filter the list
			if (rangePart) {
				list = list.filter(r => r.key?.toLowerCase() === rangePart.toLowerCase());
			}

			if (list.length === 0) {
				Tempo[$termError](instance.config, unit);
				return null;
			}

			const res = resolveTermShift(new instance.constructor(jump, instance.config), list, unit, direction);
			if (isDefined(res)) {
				jump = res.toDateTime();
				remaining--;
			} else {
				// if we hit the edge of the current list, jump to the end of the current cycle and try again
				const current = (getTermRange(instance, list, false, jump) as any);
				if (!current) {
					Tempo[$termError](instance.config, unit);
					return null;
				}

				const nextJump = (direction > 0) ? current.end.toDateTime() : current.start.toDateTime().subtract({ nanoseconds: 1 });
				if (nextJump.epochNanoseconds === jump.epochNanoseconds) {			// detect zero-progress stall
					jump = (direction > 0) ? jump.add({ days: 1 }) : jump.subtract({ days: 1 });
				} else {
					jump = nextJump;
				}
			}
		}

		return jump.withTimeZone(tz).withCalendar(cal);
	}

	return zdt;
}

/**
 * Resolves a term identifier (e.g. '#quarter') to its current value (start of cycle).
 */
export function resolveTermValue(Tempo: any, instance: any, term: string, zdt: any): any {
	return resolveTermMutation(Tempo, instance, 'start', term, term, zdt);
}

