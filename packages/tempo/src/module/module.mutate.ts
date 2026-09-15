import { evaluate } from '#library/evaluation.library.js';
import { isDefined, isNumber, isObject, isString, isUndefined, isZonedDateTime } from '#library/assertion.library.js';
import { asArray, ifNumeric } from '#library/coercion.library.js';
import { singular } from '#library/string.library.js';
import { normaliseFractionalDurations } from '#library/temporal.library.js';
import { getISOWeekOfYear } from '#library/international.library.js';

import { sym, enums, logError, Match } from '#tempo/support';
import { SLICK_KEYS } from '#tempo/support/support.default.js';
import { resolveTermMutation } from '../engine/engine.term.js';
import { defineInterpreterModule, type TempoModule } from '../plugin/plugin.util.js';
import { findTermPlugin } from '../plugin/term/term.util.js';
import type { Tempo } from '../tempo.class.js';
import type * as t from '../tempo.type.js';

declare module '#library/type.library.js' {
	interface TypeValueMap<T> {
		Mutation: { type: 'Mutation', value: any };
	}
}

/**
 * Adjusts a ZonedDateTime to the specified target ISO week-numbering year
 * while preserving the ISO week-of-year (clamped to maxWeeks) and day-of-week.
 */
function shiftToIsoYear(currZdt: Temporal.ZonedDateTime, targetYear: number): Temporal.ZonedDateTime {
	const { weekOfYear } = getISOWeekOfYear(currZdt);
	const jan4 = Temporal.PlainDate.from({ year: targetYear, month: 1, day: 4 });
	const mondayWeek1 = jan4.subtract({ days: jan4.dayOfWeek - 1 });
	const maxWeeks = getISOWeekOfYear(Temporal.PlainDate.from({ year: targetYear, month: 12, day: 28 })).weekOfYear;
	const targetWeek = Math.min(weekOfYear, maxWeeks);
	const targetPlainDate = mondayWeek1.add({ weeks: targetWeek - 1, days: currZdt.dayOfWeek - 1 });
	const pd = currZdt.toPlainDate().withCalendar('iso8601');
	const daysDiff = targetPlainDate.since(pd).days;
	return currZdt.add({ days: daysDiff });
}

/**
 * Applies an addition, subtraction, or field-setting mutation to the current date-time.
 *
 * @param type - The mutation operation: `add`, `plus`, `subtract`, `sub`, `minus`, or `set`
 * @param args - A mutation value, mutation object, term expression, or date-time input
 * @param options - Time zone, calendar, and sphere overrides
 * @returns A new mutated `Tempo` instance, or the original instance when no valid date-time exists
 */
function mutate(this: Tempo, type: 'add' | 'subtract' | 'set' | 'plus' | 'minus' | 'sub', args?: any, options: t.Options = {}) {
	if (type === 'plus') type = 'add';
	if (type === 'minus' || type === 'sub') type = 'subtract';
	const state = (this as any)[sym.$Internal]();
	if (isUndefined(state.mutateDepth)) state.mutateDepth = 0;
	if (!isZonedDateTime(state.zdt)) return this;
	const { zdt: selfZdt } = state;
	let explicitTz: any = options.timeZone;
	let explicitCal: any = options.calendar;
	let explicitSphere: any = options.sphere;

	if (type === 'set' && isObject(args) && args.constructor === Object) {
		const { timeZone, calendar, sphere } = args as Record<string, any>;
		if (isDefined(timeZone)) explicitTz = timeZone;
		if (isDefined(calendar)) explicitCal = calendar;
		if (isDefined(sphere)) explicitSphere = sphere;
	}

	const targetTz = explicitTz ?? this.tz;
	const isChangingTz = isDefined(targetTz) && evaluate(targetTz) !== this.tz;

	const overrides: t.Options = {
		timeZone: targetTz,
		calendar: explicitCal ?? this.cal,
		sphere: isDefined(explicitSphere) ? explicitSphere : (isChangingTz ? undefined : state.options?.sphere)
	};

	// Shift the current instance to the target timezone first
	const resolvedTz = evaluate(overrides.timeZone);
	const targetCal = evaluate(overrides.calendar);
	let zdt = selfZdt.withTimeZone(resolvedTz).withCalendar(targetCal);
	state.parseDepth++;
	const matches = Array.isArray(this.parse?.result) ? Array.from(this.parse.result) : [];

	try {
		if (isDefined(args)) {
			// 1. Shorthand String
			if (isString(args) && args.startsWith('#')) {
				const resolveType = (type === 'add' || type === 'subtract') ? type : 'start';
				const res = resolveTermMutation((this.constructor as any), this, resolveType, args, ((type === 'add' || type === 'subtract') ? 1 : args), zdt);
				if (res === null) state.errored = true;
				else zdt = res;
			}
			// 2. Mutation Object
			else if (isObject(args) && args.constructor === Object) {
				const payload = { ...args };												// Clone to avoid mutating the user's object directly
				normaliseFractionalDurations(payload);

				zdt = Object.entries(payload)
					.reduce<Temporal.ZonedDateTime>((currZdt, [key, adjust]) => {
						if (key === 'timeZone' || key === 'calendar' || key === 'sphere') return currZdt;

						try {
							if (++state.mutateDepth > 100) {
								logError(`Infinite recursion detected in mutation engine for key: ${key}, adjust: ${adjust}, depth: ${state.mutateDepth}`, this.config);
								state.errored = true;
								return currZdt;
							}

							if (type === 'set' && isString(adjust) && adjust !== 'start' && adjust !== 'mid' && adjust !== 'end') {
								const validMap: Record<string, string> = {
									year: 'yy', month: 'mm', week: 'ww', day: 'dd', hour: 'hh', minute: 'mi', second: 'ss',
									millisecond: 'ms', microsecond: 'us', nanosecond: 'ns'
								};
								const mapped = validMap[singular(key)];
								if (mapped) {
									logError(`For relative Slick math, use the '${mapped}' snippet key instead of '${key}'.`, this.config);
									state.errored = true;
									return currZdt;
								}
							}

							if (type === 'set' && SLICK_KEYS.includes(key as any) && adjust !== 'start' && adjust !== 'mid' && adjust !== 'end') {
								if (!isString(adjust)) {
									if (key === 'wkd') {
										logError(`Slick key 'wkd' requires a weekday name (e.g. '>Fri').`, this.config);
										state.errored = true;
										return currZdt;
									}
								} else {

									let matchSlickValue = Match.slickValue;
									const backwardWords = new Set<string>();
									if (state.config.registry?.modifiers) {
										const symbols = ['+', '-', '<', '<=', '>', '>=', '='];
										const words = new Set<string>();
										symbols.forEach(sym => {
											const mapped = state.config.registry!.modifiers![sym];
											if (mapped) {
												asArray(mapped).forEach(w => {
													words.add(w);
													if (sym === '<' || sym === '<=' || sym === '-') backwardWords.add(w);
												});
											}
										});
										if (words.size > 0) {
											const escapedWords = Array.from(words).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
											escapedWords.sort((a, b) => b.length - a.length);
											const wordPattern = escapedWords.join('|');
											matchSlickValue = new RegExp(`^(?<sh_mod>[\\+\\-\\<\\>\\=]=?|${wordPattern})?(?<sh_nbr>-?[0-9]+)?(?<sh_unit>[\\w]*)$`);
										}
									}

									const slick = adjust.match(matchSlickValue);
									if (!slick || !slick.groups) {
										logError(`Invalid slick syntax '${adjust}' for key '${key}'.`, this.config);
										state.errored = true;
										return currZdt;
									}

									let { sh_mod, sh_nbr, sh_unit } = slick.groups;

									if (key === 'wkd') {
										if (!sh_unit) {
											logError(`Slick key 'wkd' requires a weekday name (e.g. '>Fri').`, this.config);
											state.errored = true;
											return currZdt;
										}
										const offsetStr = (sh_mod || '>') + (sh_nbr || '');
										const res = resolveTermMutation((this.constructor as any), this, 'set', sh_unit, offsetStr, currZdt);
										if (res === null) state.errored = true;
										return res ?? currZdt;
									}

									if (!sh_mod) {
										logError(`Slick math requires a shift operator (e.g. '>', '<') for key '${key}'.`, this.config);
										state.errored = true;
										return currZdt;
									}

									let nbr = sh_nbr ? Number(sh_nbr) : 1;
									if (sh_mod === '<' || sh_mod === '-' || sh_mod === 'prev' || sh_mod === 'last' || backwardWords.has(sh_mod)) nbr = -nbr;

									const unitMap: Record<string, string> = {
										yy: 'years', mm: 'months', ww: 'weeks', dd: 'days',
										hh: 'hours', mi: 'minutes', ss: 'seconds',
										ms: 'milliseconds', us: 'microseconds', ns: 'nanoseconds'
									};
									return currZdt.add({ [unitMap[key]]: nbr });
								}
							}

							const { mutate: op, offset, single, term } = ((key, adjust, type) => {
								const isTerm = key.startsWith('#');
								if (type === 'add' || type === 'subtract') {
									const isTermPlugin = !isTerm && isDefined(findTermPlugin(key as string, state));
									const isStandard = ['period', 'event', 'time', 'date', 'dow', 'wkd'].includes(key as string);
									const isTermUnit = isTerm || (isTermPlugin && !isStandard);
									const val = ifNumeric(adjust);
									const isIsoYear = key === 'isoYear' || key === 'isoyear' || key === 'yw';
									const isIsoWeek = key === 'isoWeek' || key === 'isoweek' || key === 'wy';
									return {
										mutate: isTermUnit ? type : 'add',
										offset: (type === 'subtract' && !isTermUnit && isNumber(val)) ? -val : val,
										single: isTermUnit ? 'term' : (isIsoYear ? 'yw' : (isIsoWeek ? 'isoweek' : singular(key))),
										term: isTerm ? (key as string) : (isTermPlugin ? key : undefined)
									};
								}

								if (type === 'set' && isString(adjust) && (adjust === 'start' || adjust === 'mid' || adjust === 'end')) {
									const isIsoYear = key === 'isoYear' || key === 'isoyear' || key === 'yw';
									const isIsoWeek = key === 'isoWeek' || key === 'isoweek' || key === 'wy';
									const unitKey = isIsoYear ? 'yw' : (isIsoWeek ? 'isoweek' : ((enums.ELEMENT as any)[key] ?? key));
									const isTermVal = (unitKey as string).startsWith('#');
									const isTermPlugin = !isTermVal && isDefined(findTermPlugin(unitKey as string, state));
									const isStandard = ['period', 'event', 'time', 'date', 'dow', 'wkd'].includes(unitKey as string);
									return {
										mutate: adjust as any,
										offset: adjust,
										single: isTermVal || (isTermPlugin && !isStandard) ? 'term' : (isIsoYear ? 'yw' : (isIsoWeek ? 'isoweek' : singular(unitKey as string))),
										term: isTermVal ? (unitKey as string) : (isTermPlugin ? unitKey : undefined)
									};
								}

								switch (key) {
									case 'start':
									case 'mid':
									case 'end': {
										const val = adjust?.toString() ?? '';
										const isIsoYear = val === 'isoYear' || val === 'isoyear' || val === 'yw';
										const isIsoWeek = val === 'isoWeek' || val === 'isoweek' || val === 'wy';
										const unitVal = isIsoYear ? 'yw' : (isIsoWeek ? 'isoweek' : ((enums.ELEMENT as any)[val] ?? val));
										const isTermVal = (unitVal as string).startsWith('#');
										const isTermPlugin = !isTermVal && isDefined(findTermPlugin(unitVal as string, state));
										const isStandard = ['period', 'event', 'time', 'date', 'dow', 'wkd'].includes(unitVal as string);
										return {
											mutate: key as any,
											offset: val,
											single: isTermVal || (isTermPlugin && !isStandard) ? 'term' : (isIsoYear ? 'yw' : (isIsoWeek ? 'isoweek' : singular(unitVal as string))),
											term: isTermVal ? (unitVal as string) : (isTermPlugin ? unitVal : undefined)
										};
									}
									default: {
										const isTermPlugin = !isTerm && isDefined(findTermPlugin(key as string, state));
										const isStandard = ['period', 'event', 'time', 'date', 'dow', 'wkd'].includes(key as string);
										const isIsoYear = key === 'isoYear' || key === 'isoyear' || key === 'yw';
										const isIsoWeek = key === 'isoWeek' || key === 'isoweek' || key === 'wy';
										return {
											mutate: 'set',
											offset: adjust,
											single: isTerm || (isTermPlugin && !isStandard) ? 'term' : (isIsoYear ? 'yw' : (isIsoWeek ? 'isoweek' : singular(key as string))),
											term: isTerm ? (key as string) : (isTermPlugin ? key : undefined)
										};
									}
								}
							})(key, adjust, type);

							// Term-based mutations
							if (single === 'term') {
								const res = resolveTermMutation((this.constructor as any), this, op as any, term!, adjust, currZdt);
								if (res === null) state.errored = true;
								return res ?? currZdt;
							}

							const slug = `${op}:${single}`;
							const parseInner = (input: any, anchor?: any) => {
								const res = (this.constructor as any).from(input, { ...this.config, anchor });
								if (res.isValid) {
									matches.push(...res.parse.result);
									return res.toDateTime();
								}
								return undefined;
							}

							// Standard temporal units
							switch (slug) {
								case 'add:year': case 'add:month': case 'add:week': case 'add:day':
								case 'add:hour': case 'add:minute': case 'add:second':
								case 'add:millisecond': case 'add:microsecond': case 'add:nanosecond':
								case 'add:isoweek':
									return currZdt.add({ [`${single === 'isoweek' ? 'week' : single}s`]: offset });

								case 'add:yy': case 'add:mm': case 'add:dd': case 'add:hh':
								case 'add:mi': case 'add:ss': case 'add:ms': case 'add:us': case 'add:ns':
								case 'add:wy': case 'add:ww': {
									const value = enums.ELEMENT[single as t.Element];
									return currZdt.add({ [`${value}s`]: offset });
								}

								case 'add:yw': {
									const val = ifNumeric(offset);
									if (!isNumber(val) || !Number.isFinite(val)) {
										logError(`Unexpected method(${op}), unit(${key}) and offset(${adjust})`, this.config);
										state.errored = true;
										return currZdt;
									}
									const { yearOfWeek } = getISOWeekOfYear(currZdt);
									return shiftToIsoYear(currZdt, yearOfWeek + Math.trunc(val));
								}

								case 'set:period': case 'set:time': case 'set:date': case 'set:event':
								case 'set:dow': case 'set:wkd': {
									const res = parseInner(offset, currZdt);
									if (isUndefined(res)) state.errored = true;
									return res ?? currZdt;
								}

								case 'set:year': case 'set:month': case 'set:day':
								case 'set:hour': case 'set:minute': case 'set:second':
								case 'set:millisecond': case 'set:microsecond': case 'set:nanosecond':
									return currZdt.with({ [single]: offset });

								case 'set:yy': case 'set:mm': case 'set:dd': case 'set:hh':
								case 'set:mi': case 'set:ss': case 'set:ms': case 'set:us': case 'set:ns': {
									const value = enums.ELEMENT[single as t.Element];
									return currZdt.with({ [value]: offset });
								}

								case 'set:yw': {
									const val = ifNumeric(offset);
									if (!isNumber(val) || !Number.isFinite(val)) {
										logError(`Unexpected method(${op}), unit(${key}) and offset(${adjust})`, this.config);
										state.errored = true;
										return currZdt;
									}
									return shiftToIsoYear(currZdt, Math.trunc(val));
								}

								case 'set:isoweek': {
									const val = ifNumeric(offset);
									if (!isNumber(val) || !Number.isFinite(val) || val < 1) {
										logError(`Unexpected method(${op}), unit(${key}) and offset(${adjust})`, this.config);
										state.errored = true;
										return currZdt;
									}
									const targetWeek = Math.trunc(val);
									const { weekOfYear, yearOfWeek } = getISOWeekOfYear(currZdt);
									const maxWeeks = getISOWeekOfYear(Temporal.PlainDate.from({ year: yearOfWeek, month: 12, day: 28 })).weekOfYear;
									const clampedWeek = Math.min(targetWeek, maxWeeks);
									return currZdt.add({ weeks: clampedWeek - weekOfYear });
								}

								case 'start:year': return currZdt.with({ month: enums.MONTH.Jan, day: 1 }).startOfDay();
								case 'start:yw': {
									const { yearOfWeek } = getISOWeekOfYear(currZdt);
									const jan4 = Temporal.PlainDate.from({ year: yearOfWeek, month: 1, day: 4 });
									const mondayWeek1 = jan4.subtract({ days: jan4.dayOfWeek - 1 });
									const pd = currZdt.toPlainDate().withCalendar('iso8601');
									return currZdt.add({ days: mondayWeek1.since(pd).days }).startOfDay();
								}
								case 'start:month': return currZdt.with({ day: 1 }).startOfDay();
								case 'start:isoweek':
								case 'start:wy':
									return currZdt.add({ days: -(currZdt.dayOfWeek - enums.WEEKDAY.Mon) }).startOfDay();
								case 'start:week': {
									if (!state.config.localeInfo)
										return currZdt.add({ days: -(currZdt.dayOfWeek - enums.WEEKDAY.Mon) }).startOfDay();

									const diff = (currZdt.dayOfWeek - this.intl.firstDay + 7) % 7;
									return currZdt.subtract({ days: diff }).startOfDay();
								}
								case 'start:day': return currZdt.startOfDay();

								case 'start:hour': case 'start:minute': case 'start:second':
								case 'start:millisecond': case 'start:microsecond': case 'start:nanosecond':
									return currZdt.round({ smallestUnit: (enums.ELEMENT[single as t.Element] ?? single) as any, roundingMode: 'trunc' });

								case 'mid:year': return currZdt.with({ month: enums.MONTH.Jul, day: 1 }).startOfDay();
								case 'mid:yw': {
									const { yearOfWeek } = getISOWeekOfYear(currZdt);
									const jan4 = Temporal.PlainDate.from({ year: yearOfWeek, month: 1, day: 4 });
									const mondayWeek1 = jan4.subtract({ days: jan4.dayOfWeek - 1 });
									const midDate = mondayWeek1.add({ weeks: 25, days: 3 });
									const pd = currZdt.toPlainDate().withCalendar('iso8601');
									return currZdt.add({ days: midDate.since(pd).days }).startOfDay();
								}
								case 'mid:month': return currZdt.with({ day: Math.trunc(currZdt.daysInMonth / 2) }).startOfDay();
								case 'mid:isoweek':
								case 'mid:wy':
									return currZdt.add({ days: -(currZdt.dayOfWeek - enums.WEEKDAY.Thu) }).startOfDay();
								case 'mid:week': {
									if (!state.config.localeInfo)
										return currZdt.add({ days: -(currZdt.dayOfWeek - enums.WEEKDAY.Thu) }).startOfDay();

									const diff = (currZdt.dayOfWeek - this.intl.firstDay + 7) % 7;
									return currZdt.subtract({ days: diff }).startOfDay().add({ days: 3 });
								}
								case 'mid:day': return currZdt.round({ smallestUnit: 'day', roundingMode: 'trunc' }).add({ hours: 12 });
								case 'mid:hour': return currZdt.round({ smallestUnit: 'hour', roundingMode: 'trunc' }).add({ minutes: 30 });
								case 'mid:minute': return currZdt.round({ smallestUnit: 'minute', roundingMode: 'trunc' }).add({ seconds: 30 });
								case 'mid:second': return currZdt.round({ smallestUnit: 'second', roundingMode: 'trunc' }).add({ milliseconds: 500 });
								case 'mid:millisecond': return currZdt.round({ smallestUnit: 'millisecond', roundingMode: 'trunc' }).add({ microseconds: 500 });
								case 'mid:microsecond': return currZdt.round({ smallestUnit: 'microsecond', roundingMode: 'trunc' }).add({ nanoseconds: 500 });
								case 'mid:nanosecond': return currZdt;

								case 'end:year': return currZdt.add({ years: 1 }).with({ month: enums.MONTH.Jan, day: 1 }).startOfDay().subtract({ nanoseconds: 1 });
								case 'end:yw': {
									const { yearOfWeek } = getISOWeekOfYear(currZdt);
									const jan4Next = Temporal.PlainDate.from({ year: yearOfWeek + 1, month: 1, day: 4 });
									const mondayWeek1Next = jan4Next.subtract({ days: jan4Next.dayOfWeek - 1 });
									const pd = currZdt.toPlainDate().withCalendar('iso8601');
									return currZdt.add({ days: mondayWeek1Next.since(pd).days }).startOfDay().subtract({ nanoseconds: 1 });
								}
								case 'end:month': return currZdt.add({ months: 1 }).with({ day: 1 }).startOfDay().subtract({ nanoseconds: 1 });
								case 'end:isoweek':
								case 'end:wy':
									return currZdt.add({ days: (enums.WEEKDAY.Sun - currZdt.dayOfWeek) + 1 }).startOfDay().subtract({ nanoseconds: 1 });
								case 'end:week': {
									if (!state.config.localeInfo)
										return currZdt.add({ days: (enums.WEEKDAY.Sun - currZdt.dayOfWeek) + 1 }).startOfDay().subtract({ nanoseconds: 1 });

									const diff = (currZdt.dayOfWeek - this.intl.firstDay + 7) % 7;
									return currZdt.subtract({ days: diff }).startOfDay().add({ days: 7 }).subtract({ nanoseconds: 1 });
								}

								case 'end:day': case 'end:hour': case 'end:minute': case 'end:second':
								case 'end:millisecond': case 'end:microsecond': {
									const unit = (enums.ELEMENT[single as t.Element] ?? single) as any;
									const pluralUnit = `${unit}s`;
									return currZdt.round({ smallestUnit: unit, roundingMode: 'trunc' }).add({ [pluralUnit]: 1 }).subtract({ nanoseconds: 1 });
								}
								case 'end:nanosecond':
									return currZdt;

								default:
									logError(`Unexpected method(${op}), unit(${key}) and offset(${adjust})`, this.config);
									state.errored = true;
									return currZdt;
							}
						} finally {
							state.mutateDepth--;
						}
					}, zdt);
			}
			else {
				// 3. Return a new instance with the final state
				return new (this.constructor as any)(args, { ...state.options, ...this.config, ...options, anchor: zdt, [sym.$Internal]: { ...state, matches } });
			}
		}

		if (state.errored) {
			return new (this.constructor as any)(null, { ...state.options, ...overrides, ...options, [sym.$Internal]: { ...state, matches } });
		}

		matches.push({ type: 'Mutation', value: zdt, match: 'mutation' });

		return new (this.constructor as any)(zdt, { ...state.options, ...overrides, ...options, anchor: zdt, [sym.$Internal]: { ...state, matches } });

	} finally {
		state.parseDepth--;
	}
}

/**
 * Mutate Engine Implementation
 */
const MutateEngine = {
	/**
	 * Adds a duration or mutation to the current date-time.
	 *
	 * @param args - A mutation value, mutation object, term expression, or date-time input
	 * @param options - Time zone, calendar, and sphere overrides
	 * @returns A new mutated Tempo instance
	 */
	add(this: Tempo, args?: any, options: t.Options = {}) {
		return mutate.call(this, 'add', args, options);
	},
	/**
	 * Alias for `add`. Adds a duration or mutation to the current date-time.
	 *
	 * @param args - A mutation value, mutation object, term expression, or date-time input
	 * @param options - Time zone, calendar, and sphere overrides
	 * @returns A new mutated Tempo instance
	 */
	plus(this: Tempo, args?: any, options: t.Options = {}) {
		return mutate.call(this, 'add', args, options);
	},
	/**
	 * Subtracts a duration or mutation from the current date-time.
	 *
	 * @param args - A mutation value, mutation object, term expression, or date-time input
	 * @param options - Time zone, calendar, and sphere overrides
	 * @returns A new mutated Tempo instance
	 */
	subtract(this: Tempo, args?: any, options: t.Options = {}) {
		return mutate.call(this, 'subtract', args, options);
	},
	/**
	 * Alias for `subtract`. Subtracts a duration or mutation from the current date-time.
	 *
	 * @param args - A mutation value, mutation object, term expression, or date-time input
	 * @param options - Time zone, calendar, and sphere overrides
	 * @returns A new mutated Tempo instance
	 */
	sub(this: Tempo, args?: any, options: t.Options = {}) {
		return mutate.call(this, 'subtract', args, options);
	},
	/**
	 * Alias for `subtract`. Subtracts a duration or mutation from the current date-time.
	 *
	 * @param args - A mutation value, mutation object, term expression, or date-time input
	 * @param options - Time zone, calendar, and sphere overrides
	 * @returns A new mutated Tempo instance
	 */
	minus(this: Tempo, args?: any, options: t.Options = {}) {
		return mutate.call(this, 'subtract', args, options);
	},
	/**
	 * Sets specific fields of the current date-time to new values.
	 *
	 * @param args - A mutation value, mutation object, term expression, or date-time input
	 * @param options - Time zone, calendar, and sphere overrides
	 * @returns A new mutated Tempo instance
	 */
	set(this: Tempo, args?: any, options: t.Options = {}) {
		return mutate.call(this, 'set', args, options);
	}
};

/**
 * MutateModule registration
 */
export const MutateModule: TempoModule = defineInterpreterModule('MutateModule', MutateEngine);
