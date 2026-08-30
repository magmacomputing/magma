import '#library/temporal.polyfill.js';
import { asType } from '#library/type.library.js';
import { LOG } from '#library/logger.class.js';
import { isNull, isString, isObject, isZonedDateTime, isInstant, isDefined, isUndefined, isEmpty, isNumber, isNumeric } from '#library/assertion.library.js';
import { asArray } from '#library/coercion.library.js';
import { instant, getTemporalIds } from '#library/temporal.library.js';
import { ownKeys, ownEntries } from '#library/primitive.library.js';
import type { TypeValue } from '#library/type.library.js';

import { resolveTermValue } from '../engine/engine.term.js';
import { selectLayoutPatterns } from '../engine/engine.planner.js';
import { compose } from '../engine/engine.composer.js';
import { normalizeMatch, accumulateResult } from '../engine/engine.normalizer.js';

import { getRange, getTermRange } from '../plugin/term/term.util.js';
import { defineInterpreterModule } from '../plugin/plugin.util.js';
import type { Range, ResolvedRange } from '../plugin/term/term.type.js';

import { sym, isTempo, TermError, getRuntime, Match, TempoError, $setEvents, $setPeriods, markConfig, setPatterns, init, extendState, enums, Token, Snippet } from '#tempo/support';
import { setProperty, logError, logDebug, hasOwn } from '#tempo/support/support.util.js';
import * as t from '../tempo.type.js';

/**
 * Builds a parse-cache key from normalized input and parsing configuration.
 *
 * @param str - The input text to include in the key
 * @param today - The anchor date used for date-sensitive parsing
 * @param state - The parser state whose temporal configuration scopes the key
 * @returns A cache key containing the input, anchor date, time zone, calendar, locale, and hemisphere
 */
function buildCacheKey(str: string, today: Temporal.ZonedDateTime, state: t.Internal.State): string {
	const norm = str.trim().toLowerCase();
	const dateSalt = today.toPlainDate().toString();
	const tz = String(state.config.timeZone || 'UTC');
	const cal = String(state.config.calendar || 'iso8601');
	const loc = Array.isArray(state.config.locale) ? state.config.locale.join(',') : String(state.config.locale || 'en-US');
	const sph = String(state.config.sphere || 'north');
	return `${norm}::${dateSalt}::${tz}::${cal}::${loc}::${sph}`;
}

/**
 * Internal Parse Engine Implementation
 */
const _ParseEngine = {
	/** parse DateTime input */
	parse(state: t.Internal.State, tempo: t.DateTime, dateTime?: Temporal.ZonedDateTime, term?: string) {
		if (isNull(tempo)) {
			state.errored = true;
			return undefined as any;
		}

		if (!term && (isZonedDateTime(tempo) || isInstant(tempo))) {
			const { config } = state;
			const [tz, cal] = getTemporalIds(config.timeZone, config.calendar);
			const dt = isZonedDateTime(tempo) ? tempo : (tempo as Temporal.Instant).toZonedDateTimeISO(tz);
			return {
				type: 'Temporal.ZonedDateTime',
				value: dt.withTimeZone(tz).withCalendar(cal),
				zone: tz,
				calendar: cal
			};
		}

		state.parseDepth = (state.parseDepth ?? 0) + 1;
		const isRoot = state.parseDepth === 1;

		if (isRoot) {
			if (!Array.isArray(state.parse.result))
				setProperty(state.parse, 'result', []);
			state.parse.result.length = 0;
		}
		let today: Temporal.ZonedDateTime;

		try {
			const { config } = state;
			const TempoClass = getRuntime().modules['Tempo'];
			const terms = state.pluginsDb.terms;

			const val = dateTime ?? state.anchor ?? state.config.anchor ?? (isTempo(tempo) ? (tempo as any).toDateTime() : (isZonedDateTime(tempo) ? tempo : (isInstant(tempo) ? tempo.toZonedDateTimeISO(config.timeZone) : undefined)));
			const [tz, cal] = getTemporalIds(config.timeZone, config.calendar);

			let basis: Temporal.ZonedDateTime;
			if (isTempo(val)) basis = (val as any).toDateTime();
			else if (isZonedDateTime(val)) basis = val;
			else if (isDefined(val)) {
				const safeConfig = { ...state.config };
				delete safeConfig.anchor;
				if (TempoClass) {
					basis = (TempoClass as any).from(val, safeConfig).toDateTime();
				} else {
					const ms = val instanceof Date ? val.getTime() : (typeof val === 'number' || typeof val === 'bigint' ? Number(val) : new Date(String(val)).getTime());
					basis = Temporal.Instant.fromEpochMilliseconds(ms || Date.now()).toZonedDateTimeISO(tz).withCalendar(cal);
				}
			} else {
				basis = instant().toZonedDateTimeISO(tz).withCalendar(cal);
			}

			const isAnchored = isDefined(val);
			if (isRoot) {
				state.parse.anchor = basis;
				state.parse.isAnchored = isAnchored;
			}

			today = basis;

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
						if (range?.start) return { type: 'Temporal.ZonedDateTime', value: range.start.toDateTime().withTimeZone(tz).withCalendar(cal), zone: tz, calendar: cal };
					}
					throw new RangeError(`Term index out of range: ${tempo} for ${term}`);
				}

				if (tempo === term) {
					const range = termObj.define.call(state as any, false, today);
					const list = isUndefined(range) ? [] : asArray(range as Range | Range[]);
					const current = getTermRange(state as any, list, false, today) as ResolvedRange | undefined;
					if (current?.start) return { type: 'Temporal.ZonedDateTime', value: current.start.toDateTime().withTimeZone(tz).withCalendar(cal), zone: tz, calendar: cal };
				}
			}

			if (isObject(tempo)) {
				const termKey = Object.keys(tempo).find(k => k.startsWith('#'));
				if (termKey) {
					if (isUndefined(term)) {
						const msg = `Unsupported Syntax: Term-based mutations (#) cannot be passed to the constructor. Use new Tempo().set(${JSON.stringify(tempo)}) instead.`;
						logError(msg, state.config);
						throw new TempoError(msg);
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

			const { dateTime: dt, timeZone } = compose(res as any, today, tz, targetTz, targetCal, (m) => accumulateResult(state, m), state.config.timeStamp, state.config, state.userProvidedKeys);

			dateTime = dt;

			const hasExplicitTzOption = state.options && hasOwn(state.options, 'timeZone');
			const effectiveTz = hasExplicitTzOption ? targetTz : (timeZone ?? targetTz);
			if (isZonedDateTime(dateTime) && !state.errored)
				dateTime = dateTime.withTimeZone(effectiveTz).withCalendar(targetCal);

			if ((state.config.cache === true || state.config.cache === enums.CACHE.On || state.config.cache === enums.CACHE.Refresh || state.config.cache === 'refresh') && isString(tempo) && isZonedDateTime(dateTime) && !state.errored) {
				const cacheKey = buildCacheKey(tempo, today, state);
				state.cache.set(cacheKey, dateTime.toString());
			}

			return Object.assign(res, {
				type: 'Temporal.ZonedDateTime',
				value: (isZonedDateTime(dateTime) && !state.errored) ? dateTime : undefined as any
			});
		} finally {
			state.parseDepth--;
		}
	},

	/** conform input to a Temporal.ZonedDateTime */
	conform(state: any, tempo: t.DateTime, dateTime: Temporal.ZonedDateTime, isAnchored = false, resolvingKeys = new Set<string>()) {
		const arg = asType(tempo);
		let { type, value } = arg;
		const TempoClass = getRuntime().modules['Tempo'];
		const terms = state.pluginsDb.terms;

		if (isTempo(dateTime)) dateTime = dateTime.toDateTime();
		if (!isZonedDateTime(dateTime)) {
			logError(new TypeError(`Sacred Anchor corrupted: ${String(value)}`), state.config);
			return { type: 'Void', value: undefined as any };
		}

		let zdt = dateTime as any;

		if (_ParseEngine.isZonedDateTimeLike(state, tempo)) {
			const { timeZone, calendar, value: _, ...options } = tempo as t.Options;

			const termKey = Object.keys(options).find(k => k.startsWith('#'));
			if (termKey && terms.length === 0) {
				if (TempoClass) (TempoClass as any)[TermError](state.config, termKey);
				return { type: 'Void', value: undefined as any };
			}

			if (timeZone) zdt = zdt.withTimeZone(timeZone);
			if (calendar) zdt = zdt.withCalendar(calendar);
			if (!isEmpty(options)) zdt = zdt.with(options as Temporal.ZonedDateTimeLikeObject);

			accumulateResult(state, { type: 'Temporal.ZonedDateTimeLike', value: zdt, match: 'Temporal.ZonedDateTimeLike' });

			return { type: 'Temporal.ZonedDateTime', value: zdt }
		}

		if (isTempo(value)) {
			const res = value.toDateTime();
			const [tz, cal] = getTemporalIds(res);
			return { type: 'Temporal.ZonedDateTime', value: res, zone: tz, calendar: cal }
		}

		if (isZonedDateTime(value))
			return { type: 'Temporal.ZonedDateTime', value }

		if (isString(value) && value.startsWith('#')) {
			const res = resolveTermValue(TempoClass, state as any, value, dateTime);
			if (isZonedDateTime(res)) return { type: 'Temporal.ZonedDateTime', value: res }
			return { type: 'Void', value: undefined as any }
		}

		if (isString(value)) {
			let trim = value.trim();
			const normVal = trim.toLowerCase();

			// 1. Static Glossary Check
			if (state.cache.isStatic(normVal)) {
				const staticTarget = state.cache.get(normVal);
				if (staticTarget) {
					accumulateResult(state, { match: 'CacheHit', value: trim, source: 'glossary' as any });
					return { type: 'String', value: staticTarget };
				}
			}

			// 2. Dynamic Parse Cache Check
			const cacheOpt = state.config.cache;
			if (cacheOpt === true || cacheOpt === enums.CACHE.On) {
				const cacheKey = buildCacheKey(trim, dateTime, state);
				const cachedIso = state.cache.get(cacheKey);
				if (cachedIso) {
					accumulateResult(state, { match: 'CacheHit', value: trim, source: 'parseCache' as any });
					return { type: 'String', value: cachedIso };
				}
			}

			if (state.parse.ignorePattern) {
				// Clone the RegExp: global/sticky flags maintain `lastIndex` state, which
				// cannot be mutated when `state.parse` is frozen (e.g. on a sandbox instance).
				const pat = Object.isFrozen(state.parse.ignorePattern)
					? new RegExp(state.parse.ignorePattern.source, state.parse.ignorePattern.flags)
					: state.parse.ignorePattern;
				trim = trim.replace(pat, ' ').replace(Match.spaces, ' ').trim();
			}

			let guard = state?.parse?.guard?.test(trim)
				?? (TempoClass as any)?.[sym.$guard]?.test(trim)
				?? true;

			if (!guard) {
				const snip = Object.assign({}, Snippet, state.parse?.snippet);
				const sep = snip[Token.sep]?.source ?? Match.separator.source;
				const mm = snip[Token.mm]?.source ?? Snippet[Token.mm].source;
				const dd = (snip[Token.dd]?.source ?? Snippet[Token.dd].source)
					.replace('{ord}', snip[Token.ord]?.source ?? Snippet[Token.ord].source);
				const datePrefix = new RegExp(`^\\d{4}${sep}(?:${mm})${sep}(?:${dd})(?:\\b|[T\\s]|$)`, 'i');
				if (datePrefix.test(trim) && (!trim.includes('[') && !trim.includes(']') || Match.bracket.test(trim)))
					guard = true;
			}

			// 🛡️ Bypass the strict global guard if the current instance is using localized parsing
			if (!guard && (!isEmpty(state.parse.monthMap) || !isEmpty(state.parse.weekdayMap)))
				guard = true;

			// Also bypass if the input itself matches a registered modifier word (e.g. localized 'prochain', 'siguiente')
			if (!guard && state.config.registry?.modifiers) {
				const modWords = (Object.values(state.config.registry.modifiers) as string[][]).flat();
				if (modWords.some(w => trim.toLowerCase().includes(w.toLowerCase())))
					guard = true;
			}

			if (!guard) {
				const keys = (obj: any) => {
					const res = new Set<string>();
					let curr = obj;
					while (curr && curr !== Object.prototype) {
						ownKeys(curr).forEach(k => res.add(String(k)));
						curr = Object.getPrototypeOf(curr);
					}
					return res;
				}

				const local = [...keys(state.parse.event), ...keys(state.parse.period)];
				const lowTrim = trim.toLowerCase();
				const bypass = local.some(key => lowTrim.includes(String(key).toLowerCase()));
				if (!bypass) return arg;
			}
			value = trim;																					// Update value for downstream parsing
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
			logError(new RangeError(`Infinite recursion detected in layout resolution for: ${String(value)}`), state.config);
			return arg;
		}

		if (type === 'String' && isEmpty(trim)) {
			accumulateResult(state, { type: 'Empty', value: trim, match: 'Empty' });
			return Object.assign(arg, { type: 'Empty' });
		}

		let isEpoch = false;
		let finalValue: any = value;
		let finalType: any = type;

		const isExplicitUnit = state.userProvidedKeys?.has('timeStamp');
		const isLong = trim.length >= 12 ||
			(state.config.timeStamp === 'ss' && trim.length >= 9) ||
			(isExplicitUnit && trim.length >= 9);

		if (type === 'String' && isNumeric(trim)) {
			const num = Number(trim);
			const isBigInt = Number.isInteger(num) && isLong;

			// ⚡ Only short-circuit as Epoch if it's a fractional number or a long integer.
			// Short integers (like '+6') should fall through to layout matching (e.g. 'offset').
			if (!Number.isInteger(num) || isBigInt) {
				isEpoch = true;
				finalValue = isBigInt ? BigInt(trim) : num;
				finalType = isBigInt ? 'BigInt' : 'Number';
			}
		}
		else if (type === 'BigInt') {
			isEpoch = true;
		}
		else if (type === 'Number') {
			if (!isNumber(value)) return arg;

			if (!Number.isInteger(value) || isLong) {
				isEpoch = true;
				finalValue = Number.isInteger(value) ? BigInt(value) : value;
				finalType = Number.isInteger(value) ? 'BigInt' : 'Number';
			}
			else if (trim.length <= 7) {
				const msg = 'Cannot safely interpret number with less than 8-digits: use string instead';
				logError(new TypeError(msg), state.config);
				return arg;
			}
		}

		if (isEpoch) {
			const match = { type: finalType, value: finalValue, match: 'Epoch' } as any;
			accumulateResult(state, match);
			return Object.assign(arg, match);
		}

		if (!isZonedDateTime(dateTime)) return arg;

		let zdt = dateTime as any;
		const anchorTime = zdt.toPlainTime();

		const orderedPatterns = selectLayoutPatterns(state, trim, {
			enablePrefilter: state.parse.preFilter === true,
			onPlan: (summary) => {
				if (state.parse.preFilter !== true || !state.config?.debug) return;
				const reduced = summary.totalCandidates - summary.selectedCandidates;
				if (reduced <= 0 && !summary.fallbackToFull) return;

				logDebug(
					`Planner summary: selected ${summary.selectedCandidates}/${summary.totalCandidates}`,
					state.config,
					`rules=${summary.rulesApplied.join(',') || 'none'}`,
					`fallback=${summary.fallbackToFull}`,
					`input="${summary.inputClass.trim}"`
				);
			}
		});

		if (state.config?.debug === LOG.Debug)
			logDebug(`[ParseEngine] Selected layouts: ${orderedPatterns.map(p => p[0].description).join(', ')}`, state.config);

		for (const [symKey, pat] of orderedPatterns) {
			const groups = _ParseEngine.parseMatch(state, pat, trim);
			if (isEmpty(groups))
				continue;

			if (state.config?.debug === LOG.Debug)
				logDebug(`[ParseEngine] Matched layout '${symKey.description}' with groups: ${JSON.stringify(groups)}`, state.config);

			const hasTime = Object.keys(groups)
				.some(key => ['hh', 'mi', 'ss', 'ms', 'us', 'ns', 'ff', 'mer'].includes(key) || Match.period.test(key) || (Match.named.test(key) && key.endsWith('tm'))) || Object.values(groups).includes('now');
			accumulateResult(state, { match: symKey.description, value: trim, groups: { ...groups } });

			dateTime = normalizeMatch(groups, dateTime, {
				state,
				isAnchored,
				resolvingKeys,
				subParse: (v, dt, rk) => _ParseEngine.parseLayout(state, v, dt, true, rk) as any,
				conform: (v, dt, rk) => _ParseEngine.conform(state, v, dt, true, rk) as any
			});

			const isChanged = !dateTime.toPlainTime().equals(anchorTime);
			if (!isAnchored && !hasTime && !isChanged)
				dateTime = dateTime.withPlainTime('00:00:00');



			if (isZonedDateTime(dateTime))
				Object.assign(arg, { type: 'Temporal.ZonedDateTime', value: dateTime, match: symKey.description, groups });

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

	/** check if we've been given a ZonedDateTimeLike object */
	isZonedDateTimeLike(state: any, tempo: t.DateTime | t.Options | undefined): tempo is Temporal.ZonedDateTimeLike & { value?: any } {
		if (!isObject(tempo) || isEmpty(tempo) || (tempo.constructor !== Object && tempo.constructor !== undefined))
			return false;

		const keys = ownKeys(tempo);
		if (keys.some(key => state.CONFIG.has(key) && !state.ZONED_DATE_TIME.has(key) && key !== 'value'))
			return false;

		return keys
			.filter(isString)
			.some((key: string) => state.ZONED_DATE_TIME.has(key) && !state.CONFIG.has(key))
	},
}

const withState = <A extends any[], R>(fn: (state: t.Internal.State, ...args: A) => R) => {
	return function (this: any, ...args: [t.Internal.State, ...A] | A): R {
		const firstArg = args[0] as t.Internal.State | undefined;
		let state: t.Internal.State;
		let callArgs: A;

		if (isObject(firstArg) && isObject(firstArg.config) && isObject(firstArg.parse)) {
			state = firstArg;
			callArgs = args.slice(1) as A;
		} else if (isObject(firstArg) && firstArg.constructor && typeof (firstArg.constructor as any)[sym.$Internal] === 'function') {
			state = (firstArg.constructor as any)[sym.$Internal]();
			callArgs = args.slice(1) as A;
		} else {
			state = (this as any)?.[sym.$Internal]?.() ?? getRuntime().state;
			callArgs = args as A;
		}

		const res = fn(state, ...callArgs) as any;
		return (isObject(res) && 'type' in res && 'value' in res) ? res.value : res;
	}
}

/**
 * Public Parse Engine (wrapped for dual-mode support)
 */
export const ParseEngine = {
	/** Parses a DateTime input into a normalized temporal object */
	parse: withState(_ParseEngine.parse),
	/** Conforms a parse result to a specific temporal type */
	conform: withState(_ParseEngine.conform),
	/** Parses input using a specific layout pattern */
	parseLayout: withState(_ParseEngine.parseLayout),
	/** Matches input against the supplied regular expression pattern */
	parseMatch: withState(_ParseEngine.parseMatch),
	/** Checks if input is a ZonedDateTime-like object */
	isZonedDateTimeLike: withState(_ParseEngine.isZonedDateTimeLike),
	/** Accumulates and returns parse results */
	result: withState(accumulateResult)
}

/**
 * # ParseModule
 * The internal parsing engine for Tempo.
 * Decouples date-string interpretation from the core class.
 * @property {string} name - Module identifier
 * @property {string} version - Module version
 * @property {Function} install - Module installation function
 */
export const ParseModule = defineInterpreterModule('ParseModule', ParseEngine);

/**
 * Parses a date-time value using an isolated parser configuration.
 *
 * Standalone parsing defaults to strict mode and applies the supplied configuration overrides.
 *
 * @param value - The date-time value to parse.
 * @param options - Configuration overrides for this parse operation.
 * @returns The parsed date-time as a `Temporal.ZonedDateTime`.
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
	state.options = localOptions;

	// Apply options
	extendState(state, localOptions);

	// Register event/period aliases for standalone state before compiling patterns
	const TempoClass = runtime.modules['Tempo'];
	if (TempoClass) {
		(TempoClass as any)[$setEvents](state, undefined, false);
		(TempoClass as any)[$setPeriods](state, undefined, false);
	}

	// Compile RegEx patterns
	setPatterns(state);

	// Execute the parse
	return ParseEngine.parse(state, value);
}
