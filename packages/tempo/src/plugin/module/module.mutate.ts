import { isDefined, isObject, isString, isUndefined, isZonedDateTime } from '#library/type.library.js';
import { singular } from '#library/string.library.js';
import sym from '../../tempo.symbol.js';
import enums from '../../tempo.enum.js';
import { REGISTRY } from '../../tempo.register.js';
import { defineInterpreterModule, findTermPlugin, getHost } from '../plugin.util.js';
import { resolveTermMutation } from './module.term.js';
import type { Tempo } from '../../tempo.class.js';
import type * as t from '../../tempo.type.js';

/**
 * MutateModule logic for Tempo.add and Tempo.set
 */
function mutate(this: Tempo, type: 'add' | 'set', args?: any, options: t.Options = {}) {
	const state = (this as any)[sym.$Internal]();
	if (!isZonedDateTime(state.zdt)) return this;

	const { zdt: selfZdt, parse: internalParse } = state;
	const TempoClass = getHost(this);


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
	if (isRoot) state.matches = Array.isArray(this.parse?.result) ? [...this.parse.result] : [];

	try {
		if (isDefined(args)) {
			// 1. Shorthand String
			if (isString(args) && args.startsWith('#')) {
				const resolveType = type === 'add' ? 'add' : 'start';
				const res = resolveTermMutation(TempoClass, this, resolveType, args, (type === 'add' ? 1 : args), zdt);
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
								TempoClass[sym.$logError](this.config, `Infinite recursion detected in mutation engine for key: ${key}, adjust: ${adjust}, depth: ${state.mutateDepth}`);
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

							// Term-based mutations
							if (slug.endsWith('.term')) {
								const res = resolveTermMutation(TempoClass, this, op as any, term!, adjust, currZdt);
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
									const res = internalParse(offset, currZdt, term);
									if (isUndefined(res)) state.errored = true;
									return res ?? currZdt;
								}

								case 'set.year': case 'set.month': case 'set.week': case 'set.day':
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
								case 'start.week': return currZdt.add({ days: -(this.dow - enums.WEEKDAY.Mon) }).startOfDay();
								case 'start.day': return currZdt.startOfDay();
								case 'start.hour': case 'start.minute': case 'start.second':
									return currZdt.round({ smallestUnit: offset as any, roundingMode: 'trunc' });

								case 'mid.year': return currZdt.with({ month: enums.MONTH.Jul, day: 1 }).startOfDay();
								case 'mid.month': return currZdt.with({ day: Math.trunc(currZdt.daysInMonth / 2) }).startOfDay();
								case 'mid.week': return currZdt.add({ days: -(this.dow - enums.WEEKDAY.Thu) }).startOfDay();
								case 'mid.day': return currZdt.round({ smallestUnit: 'day', roundingMode: 'trunc' }).add({ hours: 12 });
								case 'mid.hour': return currZdt.round({ smallestUnit: 'hour', roundingMode: 'trunc' }).add({ minutes: 30 });
								case 'mid.minute': return currZdt.round({ smallestUnit: 'minute', roundingMode: 'trunc' }).add({ seconds: 30 });
								case 'mid.second': return currZdt.round({ smallestUnit: 'second', roundingMode: 'trunc' }).add({ milliseconds: 500 });

								case 'end.year': return currZdt.add({ years: 1 }).with({ month: enums.MONTH.Jan, day: 1 }).startOfDay().subtract({ nanoseconds: 1 });
								case 'end.month': return currZdt.add({ months: 1 }).with({ day: 1 }).startOfDay().subtract({ nanoseconds: 1 });
								case 'end.week': return currZdt.add({ days: (enums.WEEKDAY.Sun - this.dow) + 1 }).startOfDay().subtract({ nanoseconds: 1 });
								case 'end.day': case 'end.hour': case 'end.minute': case 'end.second':
									return currZdt.round({ smallestUnit: offset as any, roundingMode: 'ceil' }).subtract({ nanoseconds: 1 });

								default:
									// @ts-ignore
									TempoClass[sym.$logError](this.config, `Unexpected method(${op}), unit(${key}) and offset(${adjust})`);
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
				// @ts-ignore - access to private constructor fallback
				return new TempoClass(args, { ...state.options, ...overrides, ...options, result: state.matches, anchor: zdt, [sym.$errored]: state.errored, [sym.$mutateDepth]: state.mutateDepth });
			}
		}

		if (state.errored) {
			// @ts-ignore - access to private constructor fallback
			return new TempoClass(null, { ...state.options, ...overrides, ...options, result: state.matches, [sym.$errored]: true, [sym.$mutateDepth]: state.mutateDepth });
		}

		// @ts-ignore
		return new TempoClass(zdt, { ...state.options, ...overrides, ...options, result: state.matches, anchor: zdt, [sym.$errored]: state.errored, [sym.$mutateDepth]: state.mutateDepth });

	} finally {
		if (isRoot) state.matches = undefined;
		state.parseDepth--;
	}
}

/**
 * MutateModule registration
 */
// Eagerly register with the global registry to ensure availability even if .extend() is delayed
REGISTRY.modules['MutateModule'] = mutate;

export const MutateModule = defineInterpreterModule('MutateModule', mutate);
