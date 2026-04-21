import '#library/temporal.polyfill.js';
import { asType, isNull, isString, isObject, isZonedDateTime, isDefined, isUndefined, isIntegerLike, isEmpty, type TypeValue } from '#library/type.library.js';
import { asArray, asInteger, isNumeric } from '#library/coercion.library.js';
import { instant } from '#library/temporal.library.js';
import { ownKeys, ownEntries } from '#library/primitive.library.js';

import type { Tempo } from '../../tempo.class.js';
import { prefix, parseWeekday, parseDate, parseTime, parseZone } from './module.lexer.js';
import { sym, isTempo, Match, getRuntime } from '../../support/support.index.js';
import { resolveTermMutation, resolveTermValue } from './module.term.js';
import { compose } from './module.composer.js';
import { defineInterpreterModule } from '../plugin.util.js';
import { getRange, getTermRange } from '../term.util.js';
import * as t from '../../tempo.type.js';

/**
 * Internal helper to resolve state from 'this' context or first argument
 */
const withState = (fn: Function) => function (this: any, ...args: any[]) {
	const state = isTempo(this) ? (this as any)[sym.$Internal]() : args.shift();
	return fn.call(this, state, ...args);
};

/**
 * Internal Parse Engine Implementation
 */
const _ParseEngine = {
	/** parse DateTime input */
	parse(state: any, tempo: t.DateTime, dateTime?: Temporal.ZonedDateTime, term?: string): Temporal.ZonedDateTime {
		if (isNull(tempo)) {
			state.errored = true;
			return undefined as any;
		}

		state.parseDepth = (state.parseDepth ?? 0) + 1;
		const isRoot = state.parseDepth === 1;
		if (isRoot) state.matches = [];
		let today: Temporal.ZonedDateTime;

		try {
			const { config } = state;
			const val = dateTime ?? state.anchor ?? (isTempo(tempo) ? (tempo as any).toDateTime() : (isZonedDateTime(tempo) ? tempo : undefined));
			const basis = isDefined(val) ? val : instant().toZonedDateTimeISO(config.timeZone);

			const tz = isTempo(basis) ? (basis as any).tz : (isZonedDateTime(basis) ? basis.timeZoneId : config.timeZone);
			const cal = isTempo(basis) ? (basis as any).cal : (isZonedDateTime(basis) ? basis.calendarId : config.calendar);

			today = isZonedDateTime(basis) ? basis : (isTempo(basis) ? (basis as any).toDateTime() : instant().toZonedDateTimeISO(tz).withCalendar(cal));

			const TempoClass = getRuntime().modules['Tempo'];
			const terms = getRuntime().pluginsDb.terms;

			if (term) {
				const ident = term.startsWith('#') ? term.slice(1) : term;
				const termObj = terms.find((termEntry: any) => termEntry.key === ident || termEntry.scope === ident);
				if (!termObj) {
					if (TempoClass)
						(TempoClass as any)[sym.$termError](state.config, term);
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
					const list = isUndefined(range) ? [] : asArray(range as t.Range | t.Range[]);
					const current = getTermRange(state as any, list, false, today) as t.ResolvedRange | undefined;
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
						if (TempoClass) (TempoClass as any)[sym.$termError](state.config, termKey);
						return undefined as any;
					}
				}
			}

			const isAnchored = isDefined(dateTime) || isDefined(state.anchor);
			const resolvingKeys = new Set<string>();
			const res = _ParseEngine.conform(state, tempo, today, isAnchored, resolvingKeys);

			const { timeZone: tz2, calendar: cal2 } = state.config;
			const targetTz = isString(tz2) ? tz2 : (tz2 as any).id ?? (tz2 as any).timeZoneId;
			const targetCal = isString(cal2) ? cal2 : (cal2 as any).id ?? (cal2 as any).calendarId;

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
			if (isRoot) state.matches = undefined;
			state.parseDepth--;
		}
	},

	/** conform input to a Temporal.ZonedDateTime */
	conform(state: any, tempo: t.DateTime, dateTime: Temporal.ZonedDateTime, isAnchored = false, resolvingKeys = new Set<string>()): TypeValue<any> {
		const arg = asType(tempo);
		let { type, value } = arg;
		const TempoClass = getRuntime().modules['Tempo'];
		const terms = getRuntime().pluginsDb.terms;


		if (!isZonedDateTime(dateTime)) {
			if (TempoClass) (TempoClass as any)[sym.$logError](state.config, new TypeError(`Sacred Anchor corrupted: ${String(value)}`));
			return arg;
		}

		let zdt = dateTime as any;

		if (_ParseEngine.isZonedDateTimeLike(state, tempo)) {
			const { timeZone, calendar, value: _, ...options } = tempo as t.Options;

			const termKey = Object.keys(options).find(k => k.startsWith('#'));
			if (termKey && terms.length === 0) {
				if (TempoClass) (TempoClass as any)[sym.$termError](state.config, termKey);
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

		return _ParseEngine.parseLayout(state, value as string | number, dateTime, isAnchored, resolvingKeys);
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
		const map = state.parse.pattern;
		for (const [symKey, pat] of map) {
			const groups = _ParseEngine.parseMatch(state, pat, trim);
			if (isEmpty(groups)) continue;

			const hasAlias = Object.keys(groups).some(k => k.includes('evt') || k.includes('per'));
			const isRootMatch = Object.keys(groups).some(k => k === 'dt' || k === 'tm');
			const hadEventOrPeriod = hasAlias || isRootMatch;

			_ParseEngine.result(state, { match: symKey.description, value: trim, groups: { ...groups } });

			dateTime = parseZone(groups, dateTime, state.config);
			dateTime = _ParseEngine.parseGroups(state, groups, dateTime, isAnchored, resolvingKeys);

			dateTime = parseWeekday(groups, dateTime, (TempoClass as any)?.[sym.$dbg], state.config);
			dateTime = parseDate(groups, dateTime, (TempoClass as any)?.[sym.$dbg], state.config, state.parse["pivot"]);
			dateTime = parseTime(groups, dateTime);

			const hasTime = Object.keys(groups).some(key => ['hh', 'mi', 'ss', 'ms', 'us', 'ns', 'ff', 'mer'].includes(key) || Match.period.test(key))
				|| hadEventOrPeriod
				|| !dateTime.toPlainTime().equals(anchorTime);

			if (!isAnchored && !hasTime)
				dateTime = dateTime.withPlainTime('00:00:00');

			if (isZonedDateTime(dateTime)) {
				Object.assign(arg, { type: 'Temporal.ZonedDateTime', value: dateTime, match: symKey.description, groups });
			}

			if (TempoClass) {
				(TempoClass as any)[sym.$logDebug](state.config, 'groups', groups);
				(TempoClass as any)[sym.$logDebug](state.config, 'pattern', symKey.description);
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
	parseGroups(state: any, groups: t.Groups, dateTime: Temporal.ZonedDateTime, isAnchored: boolean, resolvingKeys: Set<string>): Temporal.ZonedDateTime {
		if (!isZonedDateTime(dateTime)) return dateTime;
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
				const isLocal = key.startsWith('l');
				const idx = +key.substring((isGlobal || isLocal) ? 4 : 3);
				const src = isGlobal ? (isEvent ? (getRuntime().modules['Tempo'] as any)[sym.$Internal]().parse.event : (getRuntime().modules['Tempo'] as any)[sym.$Internal]().parse.period) : (isEvent ? state.parse.event : state.parse.period);
				const entry = ownEntries(src, true)[idx];


				if (!entry) {
					resolved.add(key);
					continue;
				}

				const aliasKey = `${key}:${String(entry[0])}`;
				if (resolvingKeys.size > 50 || resolvingKeys.has(aliasKey)) {
					const msg = `Infinite recursion detected in Tempo resolution for: ${aliasKey}`;
					state.errored = true;
					if (TempoClass) (TempoClass as any)[sym.$logError](state.config, new RangeError(msg));
					resolved.add(key);
					continue;
				}

				resolvingKeys.add(aliasKey);
				resolved.add(key);

				const definition = entry[1];
				let res: string = '';
				if (typeof definition === 'function') {
					try {
						state.anchor = dateTime;
						state.zdt = dateTime;

						// Provide a host context that mimics a Tempo instance for the handler
						const host = TempoClass ? new (TempoClass as any)(dateTime, state.config) : {
							add: (val: any) => dateTime.add(val),
							set: (val: any) => isObject(val) ? dateTime.with(val) : dateTime,
							toNow: () => Temporal.Now.zonedDateTimeISO(state.config.timeZone),
							toDateTime: () => dateTime,
							[sym.$isTempo]: true
						};

						const result = (definition as Function).call(host);
						if (isTempo(result)) dateTime = (result as any).toDateTime();
						else if (isZonedDateTime(result)) dateTime = result as Temporal.ZonedDateTime;
						else if (isObject(result) && isFunction((result as any).toDateTime)) dateTime = (result as any).toDateTime();
						else dateTime = isZonedDateTime(state.zdt) ? (state.zdt as any) : dateTime;
						res = String(result);
					} catch (e: any) {
						if (e.message.includes('Temporal')) {
							res = (definition as any).toString();
						} else {
							throw e;
						}
					}
				} else {
					res = (definition as string);
				}

				if (isEvent && !isAnchored && isZonedDateTime(dateTime)) dateTime = (dateTime as any).startOfDay();

				if (TempoClass) (TempoClass as any)[sym.$logDebug](state.config, 'event', `resolved "${key}" to "${res}" against ${(dateTime as any).toString?.() ?? String(dateTime)}`);

				try {
					const type = isEvent ? 'Event' : 'Period';
					const val = entry![0];
					const pat = (isEvent ? 'dt' : 'tm');
					const resolveVal = typeof definition === 'function' ? res : definition;
					_ParseEngine.result(state, { type, value: val as any, match: pat, groups: { [key]: resolveVal as string } });

					const resolving = new Set(resolvingKeys);
					resolving.add(aliasKey);
					const resMatch = _ParseEngine.parseLayout(state, res, dateTime, isAnchored, resolving);

					if (resMatch.type === 'Temporal.ZonedDateTime')
						dateTime = resMatch.value;
				} finally {
					resolved.add(key);
				}

				delete groups[key];
			}
		} finally {
			state.anchor = prevAnchor;
			if (state.parseDepth === 1) {
				state.zdt = prevZdt;
				state.matches = undefined;
			} else {
				if (isZonedDateTime(dateTime)) state.zdt = dateTime;
			}
			state.parseDepth--;
		}

		if (isDefined(groups["mm"]) && !isNumeric(groups["mm"])) {
			const mm = prefix(groups["mm"] as t.MONTH);
			if (TempoClass) groups["mm"] = (TempoClass as any).MONTH[mm as t.MONTH]!.toString().padStart(2, "0");
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

const isFunction = (v: any): v is Function => typeof v === 'function';

/**
 * # ParseModule
 * The internal parsing engine for Tempo.
 * Decouples date-string interpretation from the core class.
 */
export const ParseModule = defineInterpreterModule('ParseModule', ParseEngine);
