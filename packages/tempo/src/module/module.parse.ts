import '#library/temporal.polyfill.js';
import { asType } from '#library/type.library.js';
import { isNull, isString, isObject, isZonedDateTime, isInstant, isDefined, isUndefined, isIntegerLike, isEmpty } from '#library/assertion.library.js';
import { asArray, asInteger } from '#library/coercion.library.js';
import { isNumeric } from '#library/assertion.library.js';
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
import { sym, isTempo, TermError, getRuntime, Match } from '../support/support.index.js';
import { markConfig, setPatterns, init, extendState } from '../support/support.index.js';
import { setProperty } from '#tempo/support/support.util.js';
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

		if (isRoot) {
			if (!Array.isArray(state.parse.result))
				setProperty(state.parse, 'result', []);
			state.parse.result.length = 0;
		}
		let today: Temporal.ZonedDateTime;

		try {
			const { config } = state;
			const TempoClass = getRuntime().modules['Tempo'];
			const terms = getRuntime().pluginsDb.terms;

			const val = dateTime ?? state.anchor ?? state.config.anchor ?? (isTempo(tempo) ? (tempo as any).toDateTime() : (isZonedDateTime(tempo) ? tempo : (isInstant(tempo) ? tempo.toZonedDateTimeISO(config.timeZone) : undefined)));
			const [tz, cal] = getTemporalIds(config.timeZone, config.calendar);
			const basis = isTempo(val) ? (val as any).toDateTime() : (isDefined(val) ? val : instant().toZonedDateTimeISO(tz).withCalendar(cal));
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

			const { dateTime: dt, timeZone } = compose(res, today, tz, targetTz, targetCal, (m) => accumulateResult(state, m), state.config.timeStamp, state.config);

			dateTime = dt;
			if (timeZone && state) state.config.timeZone = timeZone;

			if (isZonedDateTime(dateTime) && !state.errored)
				dateTime = dateTime.withTimeZone(targetTz).withCalendar(targetCal);

			return (isZonedDateTime(dateTime) && !state.errored) ? dateTime : undefined as any;
		} finally {
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
			if (timeZone) zdt = zdt.withTimeZone(timeZone);
			if (calendar) zdt = zdt.withCalendar(calendar);

			accumulateResult(state, { type: 'Temporal.ZonedDateTimeLike', value: zdt, match: 'Temporal.ZonedDateTimeLike' });

			return Object.assign(arg, {
				type: 'Temporal.ZonedDateTime',
				value: zdt,
			})
		}

		if (isTempo(value)) {
			const res = (value as any).toDateTime();
			const [tz, cal] = getTemporalIds(res);
			state.config.timeZone = tz;
			state.config.calendar = cal;
			return Object.assign(arg, { type: 'Temporal.ZonedDateTime', value: res });
		}

		if (isZonedDateTime(value)) {
			return Object.assign(arg, { type: 'Temporal.ZonedDateTime', value });
		}

		if (isString(value)) {
			let trim = (value as string).trim();
			if (state.parse.ignorePattern) {
				// Clone the RegExp: global/sticky flags maintain `lastIndex` state, which
				// cannot be mutated when `state.parse` is frozen (e.g. on a sandbox instance).
				const pat = Object.isFrozen(state.parse.ignorePattern)
					? new RegExp(state.parse.ignorePattern.source, state.parse.ignorePattern.flags)
					: state.parse.ignorePattern;
				trim = trim.replace(pat, ' ').replace(Match.spaces, ' ').trim();
			}

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
				const lowTrim = trim.toLowerCase();
				const bypass = local.some(key => lowTrim.includes(String(key).toLowerCase()));
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
				accumulateResult(state, { type: 'Empty', value: trim, match: 'Empty' });
				return Object.assign(arg, { type: 'Empty' });
			}
			if (isIntegerLike(trim)) {
				accumulateResult(state, { type: 'BigInt', value: asInteger(trim), match: 'BigInt' });
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

		const orderedPatterns = selectLayoutPatterns(state, trim, {
			enablePrefilter: state.parse.preFilter === true,
			onPlan: (summary) => {
				if (state.parse.preFilter !== true || !state.config?.debug) return;
				if (!TempoClass) return;

				const reduced = summary.totalCandidates - summary.selectedCandidates;
				if (reduced <= 0 && !summary.fallbackToFull) return;

				(TempoClass as any)[sym.$logDebug](state.config,
					`Planner summary: selected ${summary.selectedCandidates}/${summary.totalCandidates}`,
					`rules=${summary.rulesApplied.join(',') || 'none'}`,
					`fallback=${summary.fallbackToFull}`,
					`input="${summary.inputClass.trim}"`
				);
			}
		});

		for (const [symKey, pat] of orderedPatterns) {
			const groups = _ParseEngine.parseMatch(state, pat, trim);
			if (isEmpty(groups))
				continue;

			const hasTime = Object.keys(groups)
				.some(key => ['hh', 'mi', 'ss', 'ms', 'us', 'ns', 'ff', 'mer'].includes(key) || Match.period.test(key) || (Match.named.test(key) && key.endsWith('tm'))) || Object.values(groups).includes('now');
			accumulateResult(state, { match: symKey.description, value: trim, groups: { ...groups } });

			dateTime = normalizeMatch(groups, dateTime, {
				state,
				isAnchored,
				resolvingKeys,
				subParse: (v, dt, rk) => _ParseEngine.parseLayout(state, v, dt, true, rk),
				conform: (v, dt, rk) => _ParseEngine.conform(state, v, dt, true, rk)
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
		if (isObject(firstArg) && isObject(firstArg.config) && isObject(firstArg.parse)) {
			return fn(firstArg, ...(args.slice(1) as A));
		}

		const state = (this as any)?.[sym.$Internal]?.() ?? this;
		return fn(state as t.Internal.State, ...(args as A));
	}
}

/**
 * Public Parse Engine (wrapped for dual-mode support)
 */
export const ParseEngine = {
	parse: withState(_ParseEngine.parse),
	conform: withState(_ParseEngine.conform),
	parseLayout: withState(_ParseEngine.parseLayout),
	parseMatch: withState(_ParseEngine.parseMatch),
	isZonedDateTimeLike: withState(_ParseEngine.isZonedDateTimeLike),
	result: withState(accumulateResult)
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
 * @param value - The date-time value to parse (string, number, Date, or Tempo instance).
 * @param options - Configuration overrides for this specific parse operation.
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
