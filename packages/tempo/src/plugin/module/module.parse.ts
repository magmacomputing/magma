import '#library/temporal.polyfill.js';
import { asType, isNull, isString, isObject, isZonedDateTime, isDefined, isUndefined, isIntegerLike, isEmpty } from '#library/type.library.js';
import { asArray, asInteger, isNumeric } from '#library/coercion.library.js';
import { instant } from '#library/temporal.library.js';
import { ownKeys, ownEntries } from '#library/primitive.library.js';

import type { Tempo } from '../../support/tempo.class.js';
import { prefix, parseWeekday, parseDate, parseTime, parseZone } from './module.lexer.js';
import { registryUpdate } from '../../support/tempo.register.js';
import sym, { isTempo } from '../../support/tempo.symbol.js';
import { Match } from '../../support/tempo.default.js';
import { resolveTermMutation, resolveTermValue } from './module.term.js';
import { compose } from './module.composer.js';
import { defineInterpreterModule } from '../plugin.util.js';
import { getRange, getTermRange } from '../term.util.js';
import { getRuntime } from '../../support/tempo.runtime.js';
import * as t from '../../support/tempo.type.js';

/**
 * Internal Parse Engine Implementation
 */
const ParseEngine = {
	/** parse DateTime input */
	parse(this: any, tempo: t.DateTime, dateTime?: Temporal.ZonedDateTime, term?: string): Temporal.ZonedDateTime {
		const state = this[sym.$Internal]();
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
			const val = dateTime ?? state.anchor ?? (isTempo(tempo) ? tempo.toDateTime() : (isZonedDateTime(tempo) ? tempo : undefined));
			const basis = isDefined(val) ? val : instant().toZonedDateTimeISO(config.timeZone);

			const tz = isTempo(basis) ? (basis as any).tz : (isZonedDateTime(basis) ? basis.timeZoneId : config.timeZone);
			const cal = isTempo(basis) ? (basis as any).cal : (isZonedDateTime(basis) ? basis.calendarId : config.calendar);

			today = isZonedDateTime(basis) ? basis : (isTempo(basis) ? (basis as any).toDateTime() : instant().toZonedDateTimeISO(tz).withCalendar(cal));

			const TempoClass = this.constructor as typeof Tempo;

			if (term) {
				const ident = term.startsWith('#') ? term.slice(1) : term;
				const termObj = getRuntime().terms.find((t: any) => t.key === ident || t.scope === ident);
				if (!termObj) {
					(TempoClass as any)[sym.$termError](state.config, term);
					return undefined as any;
				}

				if (isNumeric(tempo as any)) {
					const list = getRange(termObj, this, today);
					const current = (getTermRange(this, list, false, today) as any);
					if (!current) throw new RangeError(`Term index out of range: ${tempo} for ${term}`);

					const isMultiCycle = isDefined(termObj.resolve) && list.some(r => r.year !== undefined);
					const itemsPerCycle = isMultiCycle ? list.length / 3 : list.length;
					const currentIdx = list.findIndex(r => r.key === current.key && (isMultiCycle ? r.year === current.year : true));

					if (currentIdx === -1 || itemsPerCycle <= 0) throw new RangeError(`Term index out of range: ${tempo} for ${term}`);

					const cycleOffset = Math.floor(currentIdx / itemsPerCycle) * itemsPerCycle;
					const targetIdx = cycleOffset + (Number(tempo) - 1);
					const item = list[targetIdx];

					if (item) {
						const range = (getTermRange(this, [item], false, today) as any);
						if (range?.start) return range.start.toDateTime().withTimeZone(tz).withCalendar(cal);
					}
					throw new RangeError(`Term index out of range: ${tempo} for ${term}`);
				}

				if (tempo === term) {
					const range = termObj.define.call(this, false, today);
					const list = isUndefined(range) ? [] : asArray(range as t.Range | t.Range[]);
					const current = getTermRange(this, list, false, today) as t.ResolvedRange | undefined;
					if (current?.start) return current.start.toDateTime().withTimeZone(tz).withCalendar(cal);
				}
			}

			if (isString(tempo) && tempo.startsWith('#')) {
				const res = resolveTermValue(TempoClass, this, tempo, today);
				if (isZonedDateTime(res)) return res;
				return undefined as any;
			}

			if (isUndefined(term) && isObject(tempo) && Object.keys(tempo).some(k => k.startsWith('#'))) {
				const msg = `Unsupported Syntax: Term-based mutations (#) cannot be passed to the constructor. Use new Tempo().set(${JSON.stringify(tempo)}) instead.`;
				(TempoClass as any)[sym.$logError](state.config, msg);
				throw new Error(msg);
			}

			if (isObject(tempo) && Object.keys(tempo).some(k => k.startsWith('#')) && getRuntime().terms.length === 0) {
				(TempoClass as any)[sym.$termError](state.config, Object.keys(tempo).find(k => k.startsWith('#'))!);
				return undefined as any;
			}

			const isAnchored = isDefined(dateTime) || isDefined(state.anchor);
			const resolvingKeys = new Set<string>();
			const res = ParseEngine.conform.call(this, tempo, today, isAnchored, resolvingKeys);

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
	conform(this: any, tempo: t.DateTime, dateTime: Temporal.ZonedDateTime, isAnchored = false, resolvingKeys = new Set<string>()): t.TypeValue<any> {
		const state = this[sym.$Internal]();
		const arg = asType(tempo);
		const { type, value } = arg;
		const TempoClass = this.constructor as typeof Tempo;


		if (!isZonedDateTime(dateTime)) {
			(TempoClass as any)[sym.$logError](state.config, new TypeError(`Sacred Anchor corrupted: ${String(value)}`));
			return arg;
		}

		let zdt = dateTime as any;

		if (ParseEngine.isZonedDateTimeLike.call(this, tempo)) {
			const { timeZone, calendar, value: _, ...options } = tempo as t.Options;

			const keys = Object.keys(options);
			if (keys.some(k => k.startsWith('#')) && getRuntime().terms.length === 0) {
				(TempoClass as any)[sym.$termError](state.config, keys.find(k => k.startsWith('#'))!);
				return undefined as any;
			}

			if (!isEmpty(options)) zdt = zdt.with(options as Temporal.ZonedDateTimeLikeObject);

			if (timeZone)
				if (isZonedDateTime(zdt)) zdt = zdt.withTimeZone(timeZone);
			if (calendar)
				zdt = zdt.withCalendar(calendar);

			ParseEngine.result.call(this, { type: 'Temporal.ZonedDateTimeLike', value: zdt, match: 'Temporal.ZonedDateTimeLike' });

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

		if (type !== 'String' && type !== 'Number' && type !== 'Function' && type !== 'AsyncFunction') {
			ParseEngine.result.call(this, arg, { match: type });
			return arg;
		}

		if (isString(value)) {
			const trim = (value as string).trim();
			const guard = (TempoClass as any)[sym.$guard].test(trim);

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
		}

		return ParseEngine.parseLayout.call(this, value as string | number, dateTime, isAnchored, resolvingKeys);
	},

	/** match a string or number against known layouts */
	parseLayout(this: any, value: string | number, dateTime: Temporal.ZonedDateTime, isAnchored = false, resolvingKeys = new Set<string>()): t.TypeValue<any> {
		const state = this[sym.$Internal]();
		const arg = asType(value);
		const { type } = arg;
		const trim = (type === 'String') ? (value as string).trim() : value.toString();
		const resolving = new Set(resolvingKeys);
		const TempoClass = this.constructor as typeof Tempo;

		if (resolving.size >= 100) {
			(TempoClass as any)[sym.$logError](state.config, new RangeError(`Infinite recursion detected in layout resolution for: ${String(value)}`));
			return arg;
		}

		if (type === 'String') {
			if (isEmpty(trim)) {
				ParseEngine.result.call(this, arg, { match: 'Empty' });
				return Object.assign(arg, { type: 'Empty' });
			}
			if (isIntegerLike(trim)) {
				ParseEngine.result.call(this, arg, { match: 'BigInt' });
				return Object.assign(arg, { type: 'BigInt', value: asInteger(trim) });
			}
		}
		else {
			if (Number.isNaN(value) || !Number.isFinite(value)) return arg;
			if (trim.length <= 7) {
				const msg = 'Cannot safely interpret number with less than 8-digits: use string instead';
				(TempoClass as any)[sym.$logError](state.config, new TypeError(msg));
				return arg;
			}
		}

		if (!isZonedDateTime(dateTime)) return arg;

		let zdt = dateTime as any;
		const anchorTime = zdt.toPlainTime();
		const map = state.parse.pattern;
		for (const [symKey, pat] of map) {
			const groups = ParseEngine.parseMatch.call(this, pat, trim);
			if (isEmpty(groups)) continue;

			const hasAlias = Object.keys(groups).some(k => k.includes('evt') || k.includes('per'));
			const isRootMatch = Object.keys(groups).some(k => k === 'dt' || k === 'tm');
			const hadEventOrPeriod = hasAlias || isRootMatch;

			ParseEngine.result.call(this, arg, { match: symKey.description, groups: { ...groups } });

			dateTime = parseZone(groups, dateTime, state.config);
			dateTime = ParseEngine.parseGroups.call(this, groups, dateTime, isAnchored, resolvingKeys);

			dateTime = parseWeekday(groups, dateTime, (TempoClass as any)[sym.$dbg], state.config);
			dateTime = parseDate(groups, dateTime, (TempoClass as any)[sym.$dbg], state.config, state.parse["pivot"]);
			dateTime = parseTime(groups, dateTime);

			const hasTime = Object.keys(groups).some(key => ['hh', 'mi', 'ss', 'ms', 'us', 'ns', 'ff', 'mer'].includes(key) || Match.period.test(key))
				|| hadEventOrPeriod
				|| !dateTime.toPlainTime().equals(anchorTime);

			if (!isAnchored && !hasTime)
				dateTime = dateTime.withPlainTime('00:00:00');

			if (isZonedDateTime(dateTime)) {
				Object.assign(arg, { type: 'Temporal.ZonedDateTime', value: dateTime, match: symKey.description, groups });
			}

			(TempoClass as any)[sym.$logDebug](state.config, 'groups', groups);
			(TempoClass as any)[sym.$logDebug](state.config, 'pattern', symKey.description);

			break;
		}

		return arg;
	},

	/** apply a regex-match against a value, and clean the result */
	parseMatch(this: any, pat: RegExp, value: string | number) {
		const groups = value.toString().match(pat)?.groups || {}

		ownEntries(groups)
			.forEach(([key, val]: [string, any]) => isEmpty(val) && delete groups[key]);


		return groups as t.Groups;
	},

	/** resolve {event} | {period} to their date | time values (mutates groups) */
	parseGroups(this: any, groups: t.Groups, dateTime: Temporal.ZonedDateTime, isAnchored: boolean, resolvingKeys: Set<string>): Temporal.ZonedDateTime {
		if (!isZonedDateTime(dateTime)) return dateTime;
		const state = this[sym.$Internal]();
		const TempoClass = this.constructor as typeof Tempo;

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
					const result = resolveTermMutation(TempoClass, this, 'set', slk, undefined, dateTime);
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
				const src = isGlobal ? (isEvent ? (TempoClass as any)[sym.$Internal]().parse.event : (TempoClass as any)[sym.$Internal]().parse.period) : (isEvent ? state.parse.event : state.parse.period);
				const entry = ownEntries(src, true)[idx];


				if (!entry) {
					resolved.add(key);
					continue;
				}

				const aliasKey = `${key}:${String(entry[0])}`;
				if (resolvingKeys.size > 50 || resolvingKeys.has(aliasKey)) {
					const msg = `Infinite recursion detected in Tempo resolution for: ${aliasKey}`;
					state.errored = true;
					(TempoClass as any)[sym.$logError](state.config, new RangeError(msg));
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
						const result = (definition as Function).call(this);
						if (isTempo(result)) dateTime = result.toDateTime();
						else if (isZonedDateTime(result)) dateTime = result as Temporal.ZonedDateTime;
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

				(TempoClass as any)[sym.$logDebug](state.config, 'event', `resolved "${key}" to "${res}" against ${(dateTime as any).toString?.() ?? String(dateTime)}`);

				try {
					const type = isEvent ? 'Event' : 'Period';
					const val = entry![0];
					const pat = (isEvent ? 'dt' : 'tm');
					const resolveVal = typeof definition === 'function' ? res : definition;
					ParseEngine.result.call(this, { type, value: val as any, match: pat, groups: { [key]: resolveVal as string } });

					const resolving = new Set(resolvingKeys);
					resolving.add(aliasKey);
					const resMatch = ParseEngine.parseLayout.call(this, res, dateTime, isAnchored, resolving);

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
			groups["mm"] = (TempoClass as any).MONTH[mm as t.MONTH]!.toString().padStart(2, "0");
		}

		return dateTime;
	},

	/** check if we've been given a ZonedDateTimeLike object */
	isZonedDateTimeLike(this: any, tempo: t.DateTime | t.Options | undefined): tempo is Temporal.ZonedDateTimeLike & { value?: any } {
		if (!isObject(tempo) || isEmpty(tempo))
			return false;

		const keys = ownKeys(tempo);
		const TempoClass = this.constructor as typeof Tempo;
		if (keys.some(key => (TempoClass as any)[sym.$Internal]().OPTION.has(key) && key !== 'value'))
			return false;

		return keys
			.filter(isString)
			.every((key: string) => (TempoClass as any)[sym.$Internal]().ZONED_DATE_TIME.has(key))
	},

	/** accumulate match results */
	result(this: any, ...rest: Partial<t.Internal.Match>[]) {
		const state = this[sym.$Internal]();
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
 * # ParseModule
 * The internal parsing engine for Tempo.
 * Decouples date-string interpretation from the core class.
 */
export const ParseModule = defineInterpreterModule('ParseModule', ParseEngine);
