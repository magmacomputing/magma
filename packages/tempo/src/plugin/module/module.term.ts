import { toZonedDateTime, toInstant } from '#library/temporal.library.js';
import { isDefined, isString, isZonedDateTime } from '#library/type.library.js';
import { asArray, isNumeric } from '#library/coercion.library.js';

import { sym, getLargestUnit, SCHEMA, Match, isTempo } from '#tempo/support';
import { getRange, getTermRange, resolveTermShift, findTermPlugin } from '../term.util.js';
import { getHost } from '../plugin.util.js';
import { parseModifier } from './module.lexer.js';

import type { Tempo } from '../../tempo.class.js';
import type { TempoType } from '../plugin.type.js';

/**
 * Internal helper to safely get the ZonedDateTime from a Tempo instance or raw object
 */
const toZdt = (v: any): Temporal.ZonedDateTime => isTempo(v) ? v.toDateTime() : v;

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
export function resolveTermMutation(Tempo: TempoType, instance: Tempo, mutate: string, unit: string, offset: any, zdt: Temporal.ZonedDateTime): Temporal.ZonedDateTime | null {
	if (!isZonedDateTime(zdt)) return zdt;

	const [termPart, rangePart] = unit.startsWith('#')
		? unit.slice(1).split('.')
		: [unit, undefined];

	const termObj = findTermPlugin(termPart);

	if (!termObj) {
		Tempo?.[sym.$termError]?.(instance.config, unit);
		return null;
	}

	const tz = zdt.timeZoneId;
	const cal = zdt.calendarId;

	// Slick Shorthand Parsing (e.g. #qtr.>2, #zodiac.<)
	let mod: string | undefined;
	let nbr = 1;
	let rKey = rangePart;
	let numericOnly = false;

	const slickStr = (rangePart ? unit : (isString(offset) ? offset : undefined));
	if (slickStr) {
		const slick = slickStr.match(Match.slick) || (isString(offset) ? offset.match(Match.slickValue) : null);
		const { groups } = (slick || {}) as any;
		if (groups) {
			const hasMod = !!groups.sh_mod;
			const hasNbr = isNumeric(groups.sh_nbr);
			mod = hasMod ? groups.sh_mod : undefined;
			nbr = hasNbr ? Number(groups.sh_nbr) : 1;
			rKey = (groups.sh_unit && groups.sh_unit.length > 0) ? groups.sh_unit : (hasMod ? undefined : rKey);
			numericOnly = hasNbr && !hasMod;
		}
	}

	// 0. Handle relative .add() — preserving position within the target range
	if (mutate === 'add') {
		const slickParsed = !!slickStr;
		const directional = mod && !['this', '>=', '<='].includes(mod);
		const numericOffset = !directional && isNumeric(offset);

		if (directional || numericOffset || (slickParsed && !mod)) {
			const shiftDir = directional
				? ((mod!.includes('<') || mod!.includes('-') || mod === 'prev' || mod === 'last') ? -1 : 1)
				: (numericOffset ? Math.sign(Number(offset) || 1) : 1);
			const addCount = directional
				? nbr
				: (numericOffset ? Math.abs(Number(offset) || 1) : nbr);

			// Find current containing range
			const rawList = getRange(termObj, instance, zdt);
			const currentRange = getTermRange(instance, rawList, false, zdt) as any;
			if (!currentRange) {
				Tempo?.[sym.$termError]?.(instance.config, unit);
				return null;
			}

			// Calculate cursor's offset within current range (nanoseconds)
			const startNs = toZdt(currentRange.start).epochNanoseconds as bigint;
			const cursorNs = zdt.epochNanoseconds as bigint;
			const positionNs = cursorNs - startNs;

			// Step through adjacent ranges to reach the target
			let jump = zdt;
			let remaining = addCount;
			let target: any = null;
			let iters = 0;

			while (remaining > 0 && iters < 200) {
				iters++;
				const jumpList = getRange(termObj, instance, jump);
				const range = getTermRange(instance, jumpList, false, jump) as any;
				if (!range) break;

				const matchKey = !rKey || range.key?.toLowerCase() === rKey.toLowerCase();
				const hasMoved = (shiftDir > 0)
					? (toZdt(range.start).epochNanoseconds as bigint) > (zdt.epochNanoseconds as bigint)
					: (toZdt(range.end).epochNanoseconds as bigint) < (zdt.epochNanoseconds as bigint);

				if (matchKey && (iters > 1 || hasMoved)) {
					target = range;
					remaining--;
				}

				jump = (shiftDir > 0)
					? toZdt(range.end)
					: toZdt(range.start).subtract({ nanoseconds: 1 });
			}

			if (!target || remaining > 0) {
				Tempo?.[sym.$termError]?.(instance.config, unit);
				return null;
			}

			// Apply same position-offset, clamped to target range bounds
			const tStartNs = toZdt(target.start).epochNanoseconds as bigint;
			const tEndNs = toZdt(target.end).epochNanoseconds as bigint;
			let tNs = tStartNs + positionNs;
			if (tNs >= tEndNs) tNs = tEndNs - 1n;	// clamp to range end
			if (tNs < tStartNs) tNs = tStartNs;		// clamp to range start

			return toInstant(tNs).toZonedDateTimeISO(tz).withCalendar(cal);
		}
	}

	// 1. Handle Absolute Mutations (start | mid | end) OR Slick Mutations
	if (mutate === 'start' || mutate === 'mid' || mutate === 'end' || mod) {
		let jump = zdt;
		let list = getRange(termObj, instance, jump);

		// Fast-path for simple absolute `.set('#term.key')` (no shifter/modifier):
		// choose the current containing range, or the most-recent past instance
		// of the requested key (or the nearest future if none in the past).
		if (mutate === 'start' && !mod && nbr === 1) {
			const rawList = getRange(termObj, instance, jump);
			let candidates = rawList;
			if (rKey) {
				const found = rawList.some(r => r.key?.toLowerCase() === rKey.toLowerCase());
				if (!found) {
					Tempo?.[sym.$termError]?.(instance.config, unit);
					return null;
				}
				candidates = rawList.filter(r => r.key?.toLowerCase() === rKey.toLowerCase());
			}

			const starts = candidates.map(c => {
				const s = toZonedDateTime({
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
				return { range: c, start: s };
			});

			// prefer the latest start that is <= cursor
			const prev = starts
				.filter(it => (it.start.epochNanoseconds as bigint) <= (jump.epochNanoseconds as bigint))
				.sort((a, b) => {
					const sa = a.start.epochNanoseconds as bigint;
					const sb = b.start.epochNanoseconds as bigint;
					return sa === sb ? 0 : (sa > sb ? -1 : 1);
				})[0];

			if (prev) return prev.start.withTimeZone(tz).withCalendar(cal);

			// otherwise pick the nearest future start
			const next = starts
				.sort((a, b) => {
					const sa = a.start.epochNanoseconds as bigint;
					const sb = b.start.epochNanoseconds as bigint;
					return sa === sb ? 0 : (sa < sb ? -1 : 1);
				})[0];

			if (next) return next.start.withTimeZone(tz).withCalendar(cal);

			Tempo?.[sym.$termError]?.(instance.config, unit);
			return null;
		}

		// 1. Core resolving loop: handle shifters and absolute searching with repeat counts
		const direction = (mod?.includes('<') || mod?.includes('-') || mod === 'prev' || mod === 'last') ? -1 : 1;
		let remaining = nbr;
		let iterations = 0;
		while (remaining > 0 && iterations < 200) {
			iterations++;

			const rawList = getRange(termObj, instance, jump);
			let list = rawList;
			// If a specific range key was requested (e.g. #qtr.q99) but the
			// candidate list contains no such key, fail fast and emit a term error.
			if (rKey) {
				const found = rawList.some(r => r.key?.toLowerCase() === rKey.toLowerCase());
				if (!found) {
					Tempo?.[sym.$termError]?.(instance.config, unit);
					return null;
				}
				list = list.filter(r => r.key?.toLowerCase() === rKey.toLowerCase());
			}

			const resolved = rawList.map(c => {
				const start = toZonedDateTime({
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

			// Special handling for numeric-only repeat counts (e.g. `2q2`):
			// - First iteration should prefer the containing or most-recent past
			//   instance (similar to the single `.set()` fast-path).
			// - Subsequent iterations should pick the next future instance
			//   strictly after the previous matched range.
			if (numericOnly && iterations === 1 && nbr > 1) {
				const candidates = resolved.filter(c => rKey ? c.key?.toLowerCase() === rKey.toLowerCase() : true);
				// prefer latest start <= cursor (zdt)
				const prev = candidates
					.filter(it => (toZdt(it.start).epochNanoseconds) <= (zdt.epochNanoseconds ))
					.sort((a, b) => {
						const sa = toZdt(a.start).epochNanoseconds;
						const sb = toZdt(b.start).epochNanoseconds;
						return sa === sb ? 0 : (sa > sb ? -1 : 1);
					})[0];

				if (prev) {
					const target = prev;
					const found = toZdt(target.start).withTimeZone(tz).withCalendar(cal);
					remaining--;
					if (remaining === 0) {
						if (mutate === 'mid' || mutate === 'end') { jump = found; break; }
						return found;
					}
					jump = toZdt(target.end);
					continue;
				}

				// otherwise pick the nearest future start
				const next = candidates
					.filter(it => (toZdt(it.start).epochNanoseconds as bigint) > (zdt.epochNanoseconds))
					.sort((a, b) => {
						const sa = toZdt(a.start).epochNanoseconds;
						const sb = toZdt(b.start).epochNanoseconds;
						return sa === sb ? 0 : (sa < sb ? -1 : 1);
					})[0];

				if (next) {
					const target = next;
					const found = toZdt(target.start).withTimeZone(tz).withCalendar(cal);
					remaining--;
					if (remaining === 0) {
						if (mutate === 'mid' || mutate === 'end') { jump = found; break; }
						return found;
					}
					jump = toZdt(target.end);
					continue;
				}
			}

			// If numeric-only and past the first iteration, pick the next
			// future instance strictly after the current jump.
			if (numericOnly && iterations > 1) {
				const candidates = resolved
					.filter(c => rKey ? c.key?.toLowerCase() === rKey.toLowerCase() : true)
					.filter(it => (toZdt(it.start).epochNanoseconds as bigint) > (jump.epochNanoseconds as bigint))
					.sort((a, b) => {
						const sa = toZdt(a.start).epochNanoseconds as bigint;
						const sb = toZdt(b.start).epochNanoseconds as bigint;
						return sa === sb ? 0 : (sa < sb ? -1 : 1);
					});

				if (candidates.length > 0) {
					const target = candidates[0];
					const found = toZdt(target.start).withTimeZone(tz).withCalendar(cal);
					remaining--;
					if (remaining === 0) {
						if (mutate === 'mid' || mutate === 'end') { jump = found; break; }
						return found;
					}
					jump = toZdt(target.end);
					continue;
				}
			}

			// Treat explicit modifiers and + / - as shifters. Numeric repeat counts
			// without an explicit modifier (e.g. `2q2`) are handled as inclusive
			// searches and should not be treated as shifters.
			const isShifter = (mod === '>' || mod === '<' || mod === 'next' || mod === 'prev' || mod === 'last' || mod === '+' || mod === '-');

			const compare = (r: any) => {
				const start = toZdt(r.start).epochNanoseconds as bigint;
				const end = toZdt(r.end).epochNanoseconds as bigint;
				const cursor = (isShifter && iterations > 1) ? (jump.epochNanoseconds as bigint) : (zdt.epochNanoseconds as bigint);

				let match = false;
				if (mod === '>' || mod === 'next') match = (iterations > 1) ? (start >= cursor) : (start > cursor);
				else if (mod === '<' || mod === 'prev' || mod === 'last') match = (iterations > 1) ? (end <= cursor) : (end < cursor);
				else if (mod === '>=') match = (iterations > 1) ? (start >= cursor) : (end > cursor);
				else if (mod === '<=') match = (iterations > 1) ? (end <= cursor) : (start <= cursor);
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
					const startA = toZdt(a.start).epochNanoseconds;
					const startB = toZdt(b.start).epochNanoseconds;
					const cursor = jump.epochNanoseconds;

					if (isShifter) return direction > 0 ? (startA < startB ? -1 : 1) : (startA > startB ? -1 : 1);

					const diffA = startA > cursor ? startA - cursor : cursor - startA;
					const diffB = startB > cursor ? startB - cursor : cursor - startB;
					return diffA < diffB ? -1 : (diffA > diffB ? 1 : 0);
				}).filter(m => {
					if (!isShifter) return true;
					const start = toZdt(m.start).epochNanoseconds;
					const end = toZdt(m.end).epochNanoseconds;
					const cursor = jump.epochNanoseconds;
					if (direction > 0) return start >= cursor;
					return end <= cursor;
				});

			if (matches.length > 0) {
				const target = matches[0];
				const found = toZdt(target.start).withTimeZone(tz).withCalendar(cal);
				remaining--;
				if (remaining === 0) {
					if (mutate === 'mid' || mutate === 'end') {
						jump = found;
						break;
					}
					return found;
				}
				jump = (direction > 0) ? toZdt(target.end) : toZdt(target.start).subtract({ nanoseconds: 1 });
			} else {
				const currentRes = (getTermRange(instance, rawList, false, jump) as any);
				if (!currentRes) { jump = (direction > 0) ? jump.add({ days: 30 }) : jump.subtract({ days: 30 }); continue; }
				jump = (direction > 0) ? toZdt(currentRes.end) : toZdt(currentRes.start).subtract({ nanoseconds: 1 });
			}
		}

		if (remaining > 0) {
			Tempo?.[sym.$termError]?.(instance.config, unit);
			return null;
		}

		// Final range resolution for mid/end
		if (mutate === 'mid' || mutate === 'end') {
			const finalRange = (getTermRange(instance, getRange(termObj, instance, jump), false, jump) as any);
			if (!finalRange) {
				Tempo?.[sym.$termError]?.(instance.config, unit);
				return null;
			}
			if (mutate === 'mid') {
				const startNs = toZdt(finalRange.start).epochNanoseconds as bigint;
				const endNs = toZdt(finalRange.end).epochNanoseconds as bigint;
				const midNs = startNs + (endNs - startNs) / BigInt(2);
				return toInstant(midNs).toZonedDateTimeISO(tz).withCalendar(cal);
			}
			return toZdt(finalRange.end).subtract({ nanoseconds: 1 }).withTimeZone(tz).withCalendar(cal);
		}
		return jump;
	}

	// 2. Handle Relative Mutations (add | set)
	const isNumericString = isString(offset) && Match.numeric.test(String(offset));
	if (isString(offset) && !offset.startsWith('#') && !isNumericString) {
		let jump = zdt;

		const getStep = (currentRange: any) => {
			if (currentRange) {
				const items = asArray(currentRange);
				const largestUnit = getLargestUnit(items);
				const unitIndex = SCHEMA.findIndex(([u]) => u === largestUnit);
				if (unitIndex !== -1) {
					const rolloverIndex = Math.max(0, unitIndex - 1);
					const stepUnit = SCHEMA[rolloverIndex][0];
					return { [`${stepUnit}s`]: 1 } as any;
				}
			}

			// Fallback if range doesn't define units
			const fallbackUnit = termObj.scope ?? 'year';
			const stepUnit = fallbackUnit === 'period' ? 'day' : fallbackUnit;
			return { [`${stepUnit}s`]: 1 } as any;
		};

		const range = termObj.define.call(new (getHost(instance))(jump, { ...instance.config, mode: 'strict' }), false);
		let next = jump.add(getStep(range));

		let iterations = 0;
		while (next.epochNanoseconds <= zdt.epochNanoseconds) {
			if (++iterations > 50) {													// Safety-Valve: prevent infinite look-ahead
				const currentRange = termObj.define.call(new (getHost(instance))(jump, { ...instance.config, mode: 'strict' }), false);
				jump = jump.add(getStep(currentRange));
				next = jump;
			} else {
				const currentRange = termObj.define.call(new (getHost(instance))(jump, { ...instance.config, mode: 'strict' }), false);
				jump = jump.add(getStep(currentRange));
				next = jump;
			}
		}
		const res = new (getHost(instance))(offset, { ...instance.config, anchor: next, mode: 'strict' }).toDateTime();
		return isZonedDateTime(res) ? res : next;
	}

	// 3. Handle Absolute Numeric Set (e.g. .set({ '#quarter': 2 }))
	if (mutate === 'set' && !mod && isNumeric(offset)) {
		const rawList = getRange(termObj, instance, zdt);
		const target = getTermRange(instance, rawList, Number(offset), zdt) as any;
		if (target) return toZdt(target.start).withTimeZone(tz).withCalendar(cal);

		Tempo?.[sym.$termError]?.(instance.config, unit);
		return null;
	}

	// 4. Handle Numeric Shifts or Term Shifting
	if (isNumeric(offset) || (isString(offset) && offset.startsWith('#'))) {
		const shiftValue = isNumeric(offset) ? Number(offset) : 1;
		let jump = zdt;
		let remaining = Math.abs(shiftValue);
		const direction = shiftValue > 0 ? 1 : -1;

		let iterations = 0;
		while (remaining > 0) {
			if (++iterations > 100) {												// Safety-Valve: prevent infinite shift
				Tempo?.[sym.$termError]?.(instance.config, unit);
				return null;
			}

			let list = getRange(termObj, instance, jump);

			// If a range part was specified, filter the list
			if (rangePart) {
				list = list.filter(r => r.key?.toLowerCase() === rangePart.toLowerCase());
			}

			if (list.length === 0) {
				Tempo?.[sym.$termError]?.(instance.config, unit);
				return null;
			}

			const res = resolveTermShift(new (getHost(instance))(jump, instance.config), list, unit, direction);
			if (isDefined(res)) {
				jump = toZdt(res);
				remaining--;
			} else {
				// if we hit the edge of the current list, jump to the end of the current cycle and try again
				const current = (getTermRange(instance, list, false, jump) as any);
				if (!current) {
					Tempo[sym.$termError]?.(instance.config, unit);
					return null;
				}

				const nextJump = (direction > 0) ? toZdt(current.end) : toZdt(current.start).subtract({ nanoseconds: 1 });
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
export function resolveTermValue(Tempo: TempoType, instance: Tempo, term: string, zdt: Temporal.ZonedDateTime): Temporal.ZonedDateTime | null {
	return resolveTermMutation(Tempo, instance, 'start', term, term, zdt);
}

