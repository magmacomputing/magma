import '#library/temporal.polyfill.js';
import { asType } from '#library/type.library.js';
import { isNull, isString, isObject, isFunction, isZonedDateTime, isInstant, isDefined, isUndefined, isIntegerLike, isEmpty } from '#library/assertion.library.js';
import { asArray, asInteger } from '#library/coercion.library.js';
import { isNumeric } from '#library/assertion.library.js';
import { instant, getTemporalIds } from '#library/temporal.library.js';
import { ownKeys, ownEntries } from '#library/primitive.library.js';
import type { TypeValue } from '#library/type.library.js';
import { resolveTermMutation, resolveTermValue } from '../engine/engine.term.js';
import { prefix, parseWeekday, parseDate, parseTime, parseZone } from '../engine/engine.lexer.js';
import { compose } from '../engine/engine.composer.js';

import { getRange, getTermRange } from '../plugin/term.util.js';
import { defineInterpreterModule } from '../plugin/plugin.util.js';
import type { Range, ResolvedRange } from '../plugin/plugin.type.js';
import { sym, isTempo, TermError, getRuntime, Match } from '../support/support.index.js';
import { markConfig, setPatterns, init, extendState } from '../support/support.index.js';
import enums from '../support/tempo.enum.js';
import * as t from '../tempo.type.js';
import type { Tempo } from '../tempo.class.js';

/**
 * Internal Parse Engine Implementation
 */
const _ParseEngine = {
	/** parse DateTime input */
	parse(state: t.Internal.State, tempo: t.DateTime, dateTime?: Temporal.ZonedDateTime, term?: string): Temporal.ZonedDateTime {
		if (isNull(tempo)) {
			state.errored = true;
			return undefined as any;
		}

		if (!term && (isZonedDateTime(tempo) || isInstant(tempo))) {
			const { config } = state;
			const [tz, cal] = getTemporalIds(config.timeZone, config.calendar);
			const dt = isZonedDateTime(tempo) ? tempo : (tempo as Temporal.Instant).toZonedDateTimeISO(tz);
			return dt.withTimeZone(tz).withCalendar(cal);
		}

		state.parseDepth = (state.parseDepth ?? 0) + 1;
		const isRoot = state.parseDepth === 1;
		if (isRoot) state.matches = [];
		let today: Temporal.ZonedDateTime;

		try {
			const { config } = state;
			const val = dateTime ?? state.anchor ?? (isTempo(tempo) ? (tempo as any).toDateTime() : (isZonedDateTime(tempo) ? tempo : (isInstant(tempo) ? tempo.toZonedDateTimeISO(config.timeZone) : undefined)));
			const basis = isDefined(val) ? val : instant().toZonedDateTimeISO(config.timeZone);

			const [tz, cal] = isTempo(basis) ? [(basis as any).tz, (basis as any).cal] : getTemporalIds(basis ?? config.timeZone, basis ?? config.calendar);
			const isAnchored = isDefined(val);
			today = isZonedDateTime(basis) ? basis : (isTempo(basis) ? (basis as any).toDateTime() : (isZonedDateTime(val) ? val : instant().toZonedDateTimeISO(tz).withCalendar(cal)));

			const TempoClass = getRuntime().modules['Tempo'];
			const terms = getRuntime().pluginsDb.terms;

			if (term) {
				const ident = term.startsWith('#') ? term.slice(1) : term;
				const termObj = terms.find((termEntry: any) => termEntry.key === ident || termEntry.scope === ident);
				if (!termObj) {
					if (TempoClass)
						(TempoClass as any)[TermError](state.config, term);
					return undefined as any;
				}

				if (isNumeric(tempo as any)) {
					const list = getRange(termObj, state as any, today);
					const current = (getTermRange(state as any, list, false, today) as any);
					if (!current) throw new RangeError(`Term index out of range: ${tempo} for ${term}`);

					const isMultiCycle = isDefined(termObj.resolve) && list.some(r => r.year !== undefined);
					const itemsPerCycle = isMultiCycle ? list.length / 3 : list.length;
					const currentIdx = list.findIndex(r => r.key === current.key && (isMultiCycle ? r.year === current.year : true));

					if (currentIdx === -1 || itemsPerCycle <= 0) throw new RangeError(`Term index out of range: ${tempo} for ${term}`);

					const cycleOffset = Math.floor(currentIdx / itemsPerCycle) * itemsPerCycle;
					const targetIdx = cycleOffset + (Number(tempo) - 1);
					const item = list[targetIdx];

					if (item) {
						const range = (getTermRange(state as any, [item], false, today) as any);
						if (range?.start) return range.start.toDateTime().withTimeZone(tz).withCalendar(cal);
					}
					throw new RangeError(`Term index out of range: ${tempo} for ${term}`);
				}

				if (tempo === term) {
					const range = termObj.define.call(state as any, false, today);
					const list = isUndefined(range) ? [] : asArray(range as Range | Range[]);
					const current = getTermRange(state as any, list, false, today) as ResolvedRange | undefined;
					if (current?.start) return current.start.toDateTime().withTimeZone(tz).withCalendar(cal);
				}
			}

			if (isString(tempo) && tempo.startsWith('#')) {
				const res = resolveTermValue(TempoClass, state as any, tempo, today);
				if (isZonedDateTime(res)) return res;
				return undefined as any;
			}

			if (isObject(tempo)) {
				const termKey = Object.keys(tempo).find(k => k.startsWith('#'));
				if (termKey) {
					if (isUndefined(term)) {
						const msg = `Unsupported Syntax: Term-based mutations (#) cannot be passed to the constructor. Use new Tempo().set(${JSON.stringify(tempo)}) instead.`;
						if (TempoClass) (TempoClass as any)[sym.$logError](state.config, msg);
						throw new Error(msg);
					}
					if (terms.length === 0) {
						if (TempoClass) (TempoClass as any)[TermError](state.config, termKey);
						return undefined as any;
					}
				}
			}

			const resolvingKeys = new Set<string>();
			const res = _ParseEngine.conform(state, tempo, today, isAnchored, resolvingKeys);

			const { timeZone: tz2, calendar: cal2 } = state.config;
			const [targetTz, targetCal] = getTemporalIds(tz2, cal2);

			const { dateTime: dt, timeZone } = compose(res, today, tz, targetTz, targetCal);

			dateTime = dt;
			if (timeZone && state) state.config.timeZone = timeZone;

			if (isZonedDateTime(dateTime) && !state.errored)
				dateTime = dateTime.withTimeZone(targetTz).withCalendar(targetCal);

			if (isRoot) {
				if (Reflect.isExtensible(state.parse)) {
					if (isUndefined(state.parse.result)) {
						Object.defineProperty(state.parse, 'result', {
							value: [...(state.matches ?? [])],
							writable: true, configurable: true, enumerable: true
						});
					} else {
						state.parse.result.push(...(state.matches ?? []));
					}
				}
			}

			return (isZonedDateTime(dateTime) && !state.errored) ? dateTime : undefined as any;
		} finally {
			if (isRoot) delete state.matches;
			state.parseDepth--;
		}
	},

	/** conform input to a Temporal.ZonedDateTime */
	conform(state: any, tempo: t.DateTime, dateTime: Temporal.ZonedDateTime, isAnchored = false, resolvingKeys = new Set<string>()): TypeValue<any> {
		const arg = asType(tempo);
		let { type, value } = arg;
		const TempoClass = getRuntime().modules['Tempo'];
		const terms = getRuntime().pluginsDb.terms;


		if (isTempo(dateTime)) dateTime = dateTime.toDateTime();
		if (!isZonedDateTime(dateTime)) {
			if (TempoClass) (TempoClass as any)[sym.$logError](state.config, new TypeError(`Sacred Anchor corrupted: ${String(value)}`));
			return arg;
		}

		let zdt = dateTime as any;

		if (_ParseEngine.isZonedDateTimeLike(state, tempo)) {
			const { timeZone, calendar, value: _, ...options } = tempo as t.Options;

			const termKey = Object.keys(options).find(k => k.startsWith('#'));
			if (termKey && terms.length === 0) {
				if (TempoClass) (TempoClass as any)[TermError](state.config, termKey);
				return undefined as any;
			}

			if (!isEmpty(options)) zdt = zdt.with(options as Temporal.ZonedDateTimeLikeObject);

			if (timeZone)
				if (isZonedDateTime(zdt)) zdt = zdt.withTimeZone(timeZone);
			if (calendar)
				zdt = zdt.withCalendar(calendar);

			_ParseEngine.result(state, { type: 'Temporal.ZonedDateTimeLike', value: zdt, match: 'Temporal.ZonedDateTimeLike' });

			return Object.assign(arg, {
				type: 'Temporal.ZonedDateTime',
				value: zdt,
			})
		}

		if (isTempo(value)) {
			const res = (value as any).toDateTime();
			state.config.timeZone = res.timeZoneId;
			state.config.calendar = res.calendarId;
			return Object.assign(arg, { type: 'Temporal.ZonedDateTime', value: res });
		}

		if (isZonedDateTime(value)) {
			return Object.assign(arg, { type: 'Temporal.ZonedDateTime', value });
		}

		if (isString(value)) {
			let trim = (value as string).trim();
			if (state.parse.ignorePattern)
				trim = trim.replace(state.parse.ignorePattern, ' ').replace(Match.spaces, ' ').trim();

			const guard = (TempoClass as any)?.[sym.$guard]?.test(trim) ?? true;

			if (!guard) {
				const keys = (obj: any) => {
					const res = new Set<string>();
					let curr = obj;
					while (curr && curr !== Object.prototype) {
						ownKeys(curr).forEach(k => res.add(String(k)));
						curr = Object.getPrototypeOf(curr);
					}
					return res;
				};
				const local = [...keys(state.parse.event), ...keys(state.parse.period)];
				const bypass = local.some(key => trim.toLowerCase().includes(String(key).toLowerCase()));
				if (!bypass) return arg;
			}
			value = trim; // Update value for downstream parsing
		}

		const res = _ParseEngine.parseLayout(state, value as string | number, dateTime, isAnchored, resolvingKeys);
		return res;
	},

	/** match a string or number against known layouts */
	parseLayout(state: any, value: string | number, dateTime: Temporal.ZonedDateTime, isAnchored = false, resolvingKeys = new Set<string>()): TypeValue<any> {
		const arg = asType(value);
		const { type } = arg;
		const trim = value?.toString().trim() ?? '';
		const resolving = new Set(resolvingKeys);
		const TempoClass = getRuntime().modules['Tempo'];

		if (resolving.size >= 100) {
			if (TempoClass) (TempoClass as any)[sym.$logError](state.config, new RangeError(`Infinite recursion detected in layout resolution for: ${String(value)}`));
			return arg;
		}

		if (type === 'String') {
			if (isEmpty(trim)) {
				_ParseEngine.result(state, { type: 'Empty', value: trim, match: 'Empty' });
				return Object.assign(arg, { type: 'Empty' });
			}
			if (isIntegerLike(trim)) {
				_ParseEngine.result(state, { type: 'BigInt', value: asInteger(trim), match: 'BigInt' });
				return Object.assign(arg, { type: 'BigInt', value: asInteger(trim) });
			}
		}
		else {
			if (Number.isNaN(value) || !Number.isFinite(value)) return arg;
			if (trim.length <= 7) {
				const msg = 'Cannot safely interpret number with less than 8-digits: use string instead';
				if (TempoClass) (TempoClass as any)[sym.$logError](state.config, new TypeError(msg));
				return arg;
			}
		}

		if (!isZonedDateTime(dateTime)) return arg;

		let zdt = dateTime as any;
		const anchorTime = zdt.toPlainTime();

		const orderedPatterns = (ownEntries(state.parse.layout) as [PropertyKey, string][])
			.map(([layoutKey]) => {
				const symKey = typeof layoutKey === 'symbol'
					? layoutKey
					: (state.parse.token?.[String(layoutKey)] as symbol | undefined);
				return [symKey, symKey ? state.parse.pattern.get(symKey) : undefined] as const;
			});

		for (const [symKey, pat] of orderedPatterns) {
			if (!symKey || !pat) continue;
			const groups = _ParseEngine.parseMatch(state, pat, trim);
			if (isEmpty(groups)) {
				continue;
			}
			const hasTime = Object.keys(groups).some(key => ['hh', 'mi', 'ss', 'ms', 'us', 'ns', 'ff', 'mer'].includes(key) || Match.period.test(key)) || Object.values(groups).includes('now');

			_ParseEngine.result(state, { match: symKey.description, value: trim, groups: { ...groups } });

			dateTime = parseZone(groups, dateTime, state.config);
			dateTime = _ParseEngine.parseGroups(state, groups, dateTime, isAnchored, resolvingKeys);

			dateTime = parseWeekday(groups, dateTime, (TempoClass as any)?.[sym.$dbg], state.config);
			dateTime = parseDate(groups, dateTime, (TempoClass as any)?.[sym.$dbg], state.config, state.parse["pivot"]);
			dateTime = parseTime(groups, dateTime);

			const isChanged = !dateTime.toPlainTime().equals(anchorTime);
			if (!isAnchored && !hasTime && !isChanged)
				dateTime = dateTime.withPlainTime('00:00:00');

			if (isZonedDateTime(dateTime)) {
				Object.assign(arg, { type: 'Temporal.ZonedDateTime', value: dateTime, match: symKey.description, groups });
			}

			break;
		}

		return arg;
	},

	/** apply a regex-match against a value, and clean the result */
	parseMatch(state: any, pat: RegExp, value: string | number) {
		const groups = value.toString().match(pat)?.groups || {}

		ownEntries(groups)
			.forEach(([key, val]: [string, any]) => isEmpty(val) && delete groups[key]);


		return groups as t.Groups;
	},

	/** resolve {event} | {period} to their date | time values (mutates groups) */
	parseGroups(state: t.Internal.State, groups: t.Groups, dateTime: Temporal.ZonedDateTime, isAnchored: boolean, resolvingKeys: Set<string>): Temporal.ZonedDateTime {
		const TempoClass = getRuntime().modules['Tempo'];
		const prevAnchor = state.anchor;
		const prevZdt = state.zdt;

		state.anchor = dateTime;
		state.zdt = dateTime;

		state.parseDepth = (state.parseDepth ?? 0) + 1;
		const isRoot = state.parseDepth === 1;
		if (isRoot) state.matches = [];

		try {
			const resolved = new Set<string>();
			let pending: string[];

			while ((pending = ownKeys(groups).filter(k => (Match.event.test(k) || Match.period.test(k) || k === 'slk') && !resolved.has(k))).length > 0) {
				const key = pending[0];

				if (key === 'slk') {
					const slk = groups[key];
					const result = resolveTermMutation(TempoClass, state as any, 'set', slk, undefined, dateTime);
					if (result === null) {
						state.errored = true;
						resolved.add(key);
						delete groups[key];
						break;
					}
					dateTime = result;
					resolved.add(key);
					delete groups[key];
					continue;
				}

				const isEvent = Match.event.test(key);
				const isGlobal = key.startsWith('g');
				const isNamed = key === 'gdt' || key === 'dt' || key === 'gtm' || key === 'tm';
				const idx = isNamed ? -1 : +(key.match(/\d+$/)?.[0] ?? -1);

				if (isNamed) {
					resolved.add(key);
					delete groups[key];
					continue;
				}

				const globalParse = isGlobal ? (TempoClass as any)?.[sym.$Internal]?.().parse : undefined;
				const src = isGlobal
					? (isEvent ? globalParse?.event : globalParse?.period)
					: (isEvent ? state.parse.event : state.parse.period);
				const entry = ownEntries(src, true)[idx];

				if (!entry) {
					resolved.add(key);
					delete groups[key];
					continue;
				}

				const aliasKey = entry[0] as string;
				if (resolvingKeys.size > 50 || resolvingKeys.has(aliasKey)) {
					const msg = `Infinite recursion detected in Tempo resolution for: ${aliasKey}`;
					state.errored = true;
					if (TempoClass) (TempoClass as any)[sym.$logError](state.config, new RangeError(msg));
					resolved.add(key);
					delete groups[key];
					continue;
				}

				resolvingKeys.add(aliasKey);
				resolved.add(key);

				const definition = entry[1];
				const isFn = isFunction(definition);
				let res: string = '';
				if (isFn) {
					// Provide a lightweight host context that mimics a Tempo instance for the handler
					const host = {
						add: (val: any) => {
							return dateTime.add(val);
						},
						subtract: (val: any) => {
							return dateTime.subtract(val);
						},
						with: (val: any) => dateTime.with(val),
						set: (val: any, opt?: any) => {
							const res = _ParseEngine.conform(state, val, dateTime, true, resolvingKeys);
							return (TempoClass as any)?.from(isZonedDateTime(res.value) ? res.value : dateTime, { ...state.config, ...opt });
						},
						toNow: () => instant().toZonedDateTimeISO(state.config.timeZone).withCalendar(state.config.calendar),
						toDateTime: () => dateTime,
						get hh() { return dateTime.hour },
						get mi() { return dateTime.minute },
						get ss() { return dateTime.second },
						get yy() { return dateTime.year },
						get mm() { return dateTime.month },
						get dd() { return dateTime.day },
						[sym.$Identity]: true,
						config: state.config
					};

					const result = (definition as Function).call(host);
					if (isString(result) && /^(?:[01]?\d|2[0-3]):[0-5]\d$/.test(result)) {
						const [hourStr, minuteStr] = result.split(':');
						const hour = Number(hourStr);
						const minute = Number(minuteStr);
						dateTime = dateTime.with({ hour, minute, second: 0, millisecond: 0 });
						res = '';
					} else if (isTempo(result)) {
						dateTime = (result as any).toDateTime();
					} else if (isZonedDateTime(result)) {
						dateTime = result as Temporal.ZonedDateTime;
					} else if (isObject(result) && isFunction((result as any).toDateTime)) {
						dateTime = (result as any).toDateTime();
					} else {
						res = isString(result) || isNumeric(result) ? String(result) : '';
					}
					state.zdt = dateTime;
				} else {
					res = (definition as string);
				}

				try {
					const type = isEvent ? 'Event' : 'Period';
					const pat = (isEvent ? 'dt' : 'tm');
					const resolveVal = isFn ? res : definition;
					const source = isGlobal ? 'global' : 'local';
					_ParseEngine.result(state, { type, value: entry[0] as any, match: pat, source, groups: { [key]: resolveVal as string } });

					// Protect against recursive re-evaluation of same alias
					if (!isEmpty(res) && res !== String(groups[key])) {
						const resolving = new Set(resolvingKeys);
						resolving.add(aliasKey);
						const resMatch = _ParseEngine.parseLayout(state, res, dateTime, true, resolving);

						if (resMatch.type === 'Temporal.ZonedDateTime')
							dateTime = resMatch.value;
					}
				} finally {
					delete groups[key];
				}
			}
		} finally {
			if (isDefined(prevAnchor)) state.anchor = prevAnchor;
			else delete state.anchor;
			if (isDefined(prevZdt)) state.zdt = prevZdt;
			else delete state.zdt;
			state.parseDepth--;
			if (state.parseDepth === 0) delete state.matches;
		}

		if (isDefined(groups["mm"]) && !isNumeric(groups["mm"])) {
			const mm = prefix(groups["mm"] as t.MONTH);
			if (TempoClass) groups["mm"] = (TempoClass as any).MONTH[mm as t.MONTH]!.toString().padStart(2, '0');
			else if (enums.MONTH[mm as t.MONTH]) groups["mm"] = enums.MONTH[mm as t.MONTH]!.toString().padStart(2, '0');
		}

		return dateTime;
	},

	/** check if we've been given a ZonedDateTimeLike object */
	isZonedDateTimeLike(state: any, tempo: t.DateTime | t.Options | undefined): tempo is Temporal.ZonedDateTimeLike & { value?: any } {
		if (!isObject(tempo) || isEmpty(tempo))
			return false;

		const keys = ownKeys(tempo);
		if (keys.some(key => state.OPTION.has(key) && key !== 'value'))
			return false;

		return keys
			.filter(isString)
			.every((key: string) => state.ZONED_DATE_TIME.has(key))
	},

	/** accumulate match results */
	result(state: any, ...rest: Partial<t.Internal.Match>[]) {
		const match = Object.assign({}, ...rest) as t.Internal.Match;

		if (isDefined(state.anchor) && !match.isAnchored)
			match.isAnchored = true;

		const res = state.matches ?? state.parse.result;
		if (isDefined(res) && !Object.isFrozen(res)) {
			if (!res.includes(match)) res.push(match);
		}
	}
};

const withState = <A extends any[], R>(fn: (state: t.Internal.State, ...args: A) => R) => {
	return function (this: any, ...args: [t.Internal.State, ...A] | A): R {
		const firstArg = args[0] as t.Internal.State | undefined;
		if (isObject(firstArg) && isObject(firstArg.config) && isObject(firstArg.parse)) {
			return fn(firstArg, ...(args.slice(1) as A));
		}

		const state = (this as any)?.[sym.$Internal]?.() ?? this;
		return fn(state as t.Internal.State, ...(args as A));
	};
};

/**
 * Public Parse Engine (wrapped for dual-mode support)
 */
export const ParseEngine = {
	parse: withState(_ParseEngine.parse),
	conform: withState(_ParseEngine.conform),
	parseLayout: withState(_ParseEngine.parseLayout),
	parseMatch: withState(_ParseEngine.parseMatch),
	parseGroups: withState(_ParseEngine.parseGroups),
	isZonedDateTimeLike: withState(_ParseEngine.isZonedDateTimeLike),
	result: withState(_ParseEngine.result)
};



/**
 * # ParseModule
 * The internal parsing engine for Tempo.
 * Decouples date-string interpretation from the core class.
 */
export const ParseModule = defineInterpreterModule('ParseModule', ParseEngine);

/**
 * Standalone Parser
 * Returns a Temporal.ZonedDateTime from a variety of inputs.
 *
 * @example
 * import { parse } from '@magmacomputing/tempo/parse';
 * const zdt = parse('2026-04-22');
 */
export function parse(value: t.DateTime, options: t.Options = {}): Temporal.ZonedDateTime {
	const runtime = getRuntime();
	const globalState = runtime.state ?? init();

	// Create a local state isolated from the global state
	const state: t.Internal.State = {
		...globalState,
		config: markConfig({ ...globalState.config }),
		parse: markConfig({ ...globalState.parse })
	} as t.Internal.State;

	// Deep-clone nested mutable objects to prevent global leakage
	state.parse.snippet = { ...globalState.parse.snippet };
	state.parse.layout = { ...globalState.parse.layout };
	state.parse.event = { ...globalState.parse.event };
	state.parse.period = { ...globalState.parse.period };
	state.parse.ignore = { ...globalState.parse.ignore };
	state.parse.pattern = new Map(globalState.parse.pattern);

	// Standalone parsing defaults to 'strict' mode
	const localOptions = { ...options };
	localOptions.mode ??= 'strict';

	// Apply options
	extendState(state, localOptions);

	// Compile RegEx patterns
	setPatterns(state);

	// Execute the parse
	return ParseEngine.parse(state, value);
}
