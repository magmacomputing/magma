import { isDefined, isObject, isString, isUndefined, isZonedDateTime } from '#library/assertion.library.js';
import { singular } from '#library/string.library.js';

import { sym, enums } from '#tempo/support';
import { defineInterpreterModule } from '../plugin/plugin.util.js';
import { findTermPlugin } from '../plugin/term.util.js';
import { resolveTermMutation } from '../engine/engine.term.js';
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
	const isRoot = state.parseDepth === 1;
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
				zdt = Object.entries(args ?? {})
					.reduce<Temporal.ZonedDateTime>((currZdt, [key, adjust]) => {
						if (key === 'timeZone' || key === 'calendar') return currZdt;

						try {
							// @ts-ignore - access to mutation guard
							if (++state.mutateDepth > 100) {
								// @ts-ignore - access to static logger
								(this.constructor as any)[sym.$logError](this.config, `Infinite recursion detected in mutation engine for key: ${key}, adjust: ${adjust}, depth: ${state.mutateDepth}`);
								state.errored = true;
								return currZdt;
							}

							const { mutate: op, offset, single, term } = ((key, adjust, type) => {
								const isTerm = key.startsWith('#');
								if (type === 'add') {
									const isTermPlugin = !isTerm && !!findTermPlugin(key as string);
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
										const isTermPlugin = !isTerm && !!findTermPlugin(key as string);
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
									return currZdt.add({ [singular(single) + 's']: offset });

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
									// @ts-ignore
									(this.constructor as any)[sym.$logError](this.config, `Unexpected method(${op}), unit(${key}) and offset(${adjust})`);
									state.errored = true;
									return currZdt;
							}
						} finally {
							// @ts-ignore
							state.mutateDepth--;
						}
					}, zdt);
			}
			else {
				// 3. Return a new instance with the final state
				// @ts-ignore - access to private constructor/state
				return new (this.constructor as any)(args, { ...state.options, ...this.config, ...options, anchor: zdt, [sym.$Internal]: { ...state, matches } });
			}
		}

		if (state.errored) {
			// @ts-ignore - access to private constructor fallback
			return new (this.constructor as any)(null, { ...state.options, ...overrides, ...options, [sym.$Internal]: { ...state, matches } });
		}

		// @ts-ignore
		matches.push({ type: 'Mutation', value: zdt, match: 'mutation' });

		// @ts-ignore
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
export const MutateModule = defineInterpreterModule('MutateModule', MutateEngine);
