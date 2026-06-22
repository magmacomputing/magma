import { isDefined, isObject, isString, isUndefined, isZonedDateTime } from '#library/assertion.library.js';
import { singular } from '#library/string.library.js';
import { normaliseFractionalDurations } from '#library/temporal.library.js';

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
 * MutateModule logic for Tempo.add and Tempo.set
 */
function mutate(this: Tempo, type: 'add' | 'set', args?: any, options: t.Options = {}) {
	const state = (this as any)[sym.$Internal]();
	if (isUndefined(state.mutateDepth)) state.mutateDepth = 0;
	if (!isZonedDateTime(state.zdt)) return this;
	const { zdt: selfZdt } = state;
	const overrides = {
		timeZone: options.timeZone ?? this.tz,
		calendar: options.calendar ?? this.cal,
		sphere: options.sphere ?? this.config.sphere
	} as Required<t.Options>;

	if (type === 'set' && isObject(args) && args.constructor === Object) {
		const { timeZone, calendar } = args as Record<string, any>;
		if (timeZone) overrides.timeZone = timeZone;
		if (calendar) overrides.calendar = calendar;
	}

	// Shift the current instance to the target timezone first
	let zdt = selfZdt.withTimeZone(overrides.timeZone).withCalendar(overrides.calendar);
	state.parseDepth++;
	const matches = Array.isArray(this.parse?.result) ? Array.from(this.parse.result) : [];

	try {
		if (isDefined(args)) {
			// 1. Shorthand String
			if (isString(args) && args.startsWith('#')) {
				const resolveType = type === 'add' ? 'add' : 'start';
				const res = resolveTermMutation((this.constructor as any), this, resolveType, args, (type === 'add' ? 1 : args), zdt);
				if (res === null) state.errored = true;
				else zdt = res;
			}
			// 2. Mutation Object
			else if (isObject(args) && args.constructor === Object) {
				const payload = { ...args };												// Clone to avoid mutating the user's object directly
				normaliseFractionalDurations(payload);

				zdt = Object.entries(payload)
					.reduce<Temporal.ZonedDateTime>((currZdt, [key, adjust]) => {
						if (key === 'timeZone' || key === 'calendar') return currZdt;

						try {
							if (type === 'set' && isString(adjust)) {
								const validMap: Record<string, string> = { year: 'yy', month: 'mm', week: 'ww', day: 'dd', hour: 'hh', minute: 'mi', second: 'ss' };
								const mapped = validMap[singular(key)];
								if (mapped) {
									logError(`For relative Slick math, use the '${mapped}' snippet key instead of '${key}'.`, this.config);
									state.errored = true;
									return currZdt;
								}
							}

							if (type === 'set' && SLICK_KEYS.includes(key as any)) {
								if (!isString(adjust)) {
									logError(`Slick key '${key}' expects a string payload (e.g. '>1').`, this.config);
									state.errored = true;
									return currZdt;
								}

								let matchSlickValue = Match.slickValue;
								if (state.config.registry?.modifiers) {
									const symbols = ['+', '-', '<', '<=', '>', '>=', '='];
									const words = new Set<string>();
									symbols.forEach(sym => {
										const mapped = state.config.registry!.modifiers![sym];
										if (mapped) (Array.isArray(mapped) ? mapped : [mapped]).forEach(w => words.add(w));
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
								if (sh_mod === '<' || sh_mod === '-' || sh_mod === 'prev' || sh_mod === 'last') nbr = -nbr;

								const unitMap: Record<string, string> = {
									yy: 'years', mm: 'months', ww: 'weeks', dd: 'days',
									hh: 'hours', mi: 'minutes', ss: 'seconds'
								};
								return currZdt.add({ [unitMap[key]]: nbr });
							}
							if (++state.mutateDepth > 100) {
								logError(`Infinite recursion detected in mutation engine for key: ${key}, adjust: ${adjust}, depth: ${state.mutateDepth}`, this.config);
								state.errored = true;
								return currZdt;
							}

							const { mutate: op, offset, single, term } = ((key, adjust, type) => {
								const isTerm = key.startsWith('#');
								if (type === 'add') {
									const isTermPlugin = !isTerm && isDefined(findTermPlugin(key as string, state));
									const isStandard = ['period', 'event', 'time', 'date', 'dow', 'wkd'].includes(key as string);
									return {
										mutate: 'add',
										offset: adjust,
										single: isTerm || (isTermPlugin && !isStandard) ? 'term' : singular(key),
										term: isTerm ? (key as string) : (isTermPlugin ? key : undefined)
									}
								}

								switch (key) {
									case 'start':
									case 'mid':
									case 'end': {
										const val = adjust?.toString() ?? '';
										const isTermVal = val.startsWith('#');
										return { mutate: key as any, offset: val, single: isTermVal ? 'term' : singular(val), term: isTermVal ? val : undefined };
									}
									default: {
										const isTermPlugin = !isTerm && isDefined(findTermPlugin(key as string, state));
										const isStandard = ['period', 'event', 'time', 'date', 'dow', 'wkd'].includes(key as string);
										return {
											mutate: 'set',
											offset: adjust,
											single: isTerm || (isTermPlugin && !isStandard) ? 'term' : singular(key as string),
											term: isTerm ? (key as string) : (isTermPlugin ? key : undefined)
										}
									}
								}
							})(key, adjust, type);

							const slug = `${op}.${single}`;
							const parseInner = (input: any, anchor?: any) => {
								const res = (this.constructor as any).from(input, { ...this.config, anchor });
								if (res.isValid) {
									matches.push(...res.parse.result);
									return res.toDateTime();
								}
								return undefined;
							};

							// Term-based mutations
							if (slug.endsWith('.term')) {
								const res = resolveTermMutation((this.constructor as any), this, op as any, term!, adjust, currZdt);
								if (res === null) state.errored = true;
								return res ?? currZdt;
							}

							// Standard temporal units
							switch (slug) {
								case 'add.year': case 'add.month': case 'add.week': case 'add.day':
								case 'add.hour': case 'add.minute': case 'add.second':
								case 'add.millisecond': case 'add.microsecond': case 'add.nanosecond':
									return currZdt.add({ [`${single}s`]: offset });

								case 'set.period': case 'set.time': case 'set.date': case 'set.event':
								case 'set.dow': case 'set.wkd': {
									const res = parseInner(offset, currZdt);
									if (isUndefined(res)) state.errored = true;
									return res ?? currZdt;
								}

								case 'set.year': case 'set.month': case 'set.day':
								case 'set.hour': case 'set.minute': case 'set.second':
								case 'set.millisecond': case 'set.microsecond': case 'set.nanosecond':
									return currZdt.with({ [single]: offset });

								case 'set.yy': case 'set.mm': case 'set.dd': case 'set.hh':
								case 'set.mi': case 'set.ss': case 'set.ms': case 'set.us': case 'set.ns': {
									const value = enums.ELEMENT[single as t.Element];
									return currZdt.with({ [value]: offset });
								}

								case 'start.year': return currZdt.with({ month: enums.MONTH.Jan, day: 1 }).startOfDay();
								case 'start.month': return currZdt.with({ day: 1 }).startOfDay();
								case 'start.week': return currZdt.add({ days: -(currZdt.dayOfWeek - enums.WEEKDAY.Mon) }).startOfDay();
								case 'start.day': return currZdt.startOfDay();
								case 'start.hour': case 'start.minute': case 'start.second':
									return currZdt.round({ smallestUnit: offset as any, roundingMode: 'trunc' });

								case 'mid.year': return currZdt.with({ month: enums.MONTH.Jul, day: 1 }).startOfDay();
								case 'mid.month': return currZdt.with({ day: Math.trunc(currZdt.daysInMonth / 2) }).startOfDay();
								case 'mid.week': return currZdt.add({ days: -(currZdt.dayOfWeek - enums.WEEKDAY.Thu) }).startOfDay();
								case 'mid.day': return currZdt.round({ smallestUnit: 'day', roundingMode: 'trunc' }).add({ hours: 12 });
								case 'mid.hour': return currZdt.round({ smallestUnit: 'hour', roundingMode: 'trunc' }).add({ minutes: 30 });
								case 'mid.minute': return currZdt.round({ smallestUnit: 'minute', roundingMode: 'trunc' }).add({ seconds: 30 });
								case 'mid.second': return currZdt.round({ smallestUnit: 'second', roundingMode: 'trunc' }).add({ milliseconds: 500 });

								case 'end.year': return currZdt.add({ years: 1 }).with({ month: enums.MONTH.Jan, day: 1 }).startOfDay().subtract({ nanoseconds: 1 });
								case 'end.month': return currZdt.add({ months: 1 }).with({ day: 1 }).startOfDay().subtract({ nanoseconds: 1 });
								case 'end.week': return currZdt.add({ days: (enums.WEEKDAY.Sun - currZdt.dayOfWeek) + 1 }).startOfDay().subtract({ nanoseconds: 1 });
								case 'end.day': case 'end.hour': case 'end.minute': case 'end.second':
									return currZdt.round({ smallestUnit: offset as any, roundingMode: 'ceil' }).subtract({ nanoseconds: 1 });

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
	add(this: Tempo, args?: any, options: t.Options = {}) {
		return mutate.call(this, 'add', args, options);
	},
	set(this: Tempo, args?: any, options: t.Options = {}) {
		return mutate.call(this, 'set', args, options);
	}
};

/**
 * MutateModule registration
 */
export const MutateModule: TempoModule = defineInterpreterModule('MutateModule', MutateEngine);
