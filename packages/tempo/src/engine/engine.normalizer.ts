import { isDefined, isEmpty, isZonedDateTime, isNumeric, isString } from '#library/assertion.library.js';
import { getTemporalIds, instant } from '#library/temporal.library.js';
import { ownKeys } from '#library/primitive.library.js';
import type { TypeValue } from '#library/type.library.js';

import { getRuntime, sym, Match, logError, logDebug, TempoError, Default } from '#tempo/support';
import { prefix, parseWeekday, parseDate, parseTime, parseZone } from './engine.lexer.js';
import { resolveTermMutation } from './engine.term.js';
import enums from '#tempo/support/support.enum.js';
import * as t from '../tempo.type.js';

/** 
 * Maximum depth for recursive alias resolution. 
 * This ceiling (50) is generous to accommodate complex alias chains while remaining well above 
 * the PatternCompiler.matcher depth limit (~10), preventing stack overflows during normalization.
 */
const MAX_TEMPO_RESOLVE_DEPTH = 50;

/**
 * Context provided to the normalizer to handle recursion and state management.
 */
export interface NormalizerContext {
	state: t.Internal.State;
	isAnchored: boolean;
	resolvingKeys: Set<string>;
	subParse: (value: string, dateTime: Temporal.ZonedDateTime, resolvingKeys: Set<string>) => TypeValue<any>;
	conform: (value: any, dateTime: Temporal.ZonedDateTime, resolvingKeys: Set<string>) => TypeValue<any>;
}

/**
 * Provide a lightweight host context that mimics a Tempo instance for functional alias handlers.
 */
export function getAliasContext(ctx: NormalizerContext, dateTime: Temporal.ZonedDateTime): t.AliasContext {
	const { state, resolvingKeys, conform } = ctx;
	const [tz, cal] = getTemporalIds(state.config.timeZone, state.config.calendar);

	const host = {
		add: (val: any, opt?: any) => {
			let nextZdt = dateTime;
			const nextCtx = opt ? { ...ctx, state: { ...state, config: { ...state.config, ...opt } } } : ctx;

			if (isString(val) && val.startsWith('#')) {
				const TempoClass = getRuntime().modules['Tempo'];
				const res = resolveTermMutation(TempoClass, nextCtx.state as any, 'add', val, 1, nextZdt);
				if (isZonedDateTime(res)) nextZdt = res;
			} else {
				nextZdt = nextZdt.add(val);
			}

			return getAliasContext(nextCtx as any, nextZdt);
		},
		subtract: (val: any, opt?: any) => {
			let nextZdt = dateTime;
			const nextCtx = opt ? { ...ctx, state: { ...state, config: { ...state.config, ...opt } } } : ctx;

			if (isString(val) && val.startsWith('#')) {
				const TempoClass = getRuntime().modules['Tempo'];
				const res = resolveTermMutation(TempoClass, nextCtx.state as any, 'subtract', val, 1, nextZdt);
				if (isZonedDateTime(res)) nextZdt = res;
			} else {
				nextZdt = nextZdt.subtract(val);
			}

			return getAliasContext(nextCtx as any, nextZdt);
		},
		sub(val: any, opt?: any) {
			return this.subtract(val, opt);
		},
		set: (val: any, opt?: any) => {
			const res = conform(val, dateTime, resolvingKeys);
			const nextZdt = isZonedDateTime(res.value) ? res.value : dateTime;
			const nextCtx = opt ? { ...ctx, state: { ...state, config: { ...state.config, ...opt } } } : ctx;
			return getAliasContext(nextCtx as any, nextZdt);
		},
		toNow: () => getAliasContext(ctx, instant().toZonedDateTimeISO(tz).withCalendar(cal)),
		toDateTime: () => dateTime,
		toString: () => dateTime.toString() as t.ISOString,
		get yy() { return dateTime.year },
		get mm() { return dateTime.month },
		get dd() { return dateTime.day },
		get hh() { return dateTime.hour },
		get mi() { return dateTime.minute },
		get ss() { return dateTime.second },
		get tz() { return tz },
		get cal() { return cal },
		get loc() { return state.config.locale ?? Default.locale },
		config: state.config,
		[sym.$Identity]: true,
	} as t.AliasContext

	return host;
}

/**
 * Normalize a set of regex groups into a Temporal.ZonedDateTime.
 */
export function normalizeMatch(
	groups: t.Groups,
	dateTime: Temporal.ZonedDateTime,
	ctx: NormalizerContext
): Temporal.ZonedDateTime {
	const { state, isAnchored } = ctx;

	// 1. Zone
	dateTime = parseZone(groups, dateTime, state.config);

	// 2. Event Aliases & Slick Shifters (Early)
	// These provide the base date/anchor for subsequent parsing
	dateTime = resolveAliases(groups, dateTime, ctx, ['evt', 'slk']);
	if (state.errored) return dateTime;

	// 3. Weekday, Date
	if (isDefined(groups["wkd"]) && !isNumeric(groups["wkd"])) {
		const rawWkd = String(groups["wkd"]).replace(/\.$/, '').toLowerCase();
		const mappedWkd = state.parse.weekdayMap?.[rawWkd];
		if (isDefined(mappedWkd)) {
			const engWkd = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][mappedWkd.value - 1];
			groups["wkd"] = engWkd;
			logDebug(`[Normalizer] Normalized localized weekday string '${rawWkd}' to '${engWkd}'`, state.config);
			accumulateResult(state, { type: 'Weekday' as any, value: mappedWkd.value as any, match: rawWkd, locale: mappedWkd.locale });
		}
	}
	dateTime = parseWeekday(groups, dateTime, state.config);
	dateTime = parseDate(groups, dateTime, state.config, state.parse["pivot"]);

	// 4. Period Aliases (Late)
	// These may overflow (e.g. 24:00) and should be applied to the explicit date
	dateTime = resolveAliases(groups, dateTime, ctx, ['per']);
	if (state.errored) return dateTime;

	// 5. Time
	dateTime = parseTime(groups, dateTime);

	return dateTime;
}

/**
 * Resolve {event} | {period} aliases found in the matched groups.
 */
export function resolveAliases(
	groups: t.Groups,
	dateTime: Temporal.ZonedDateTime,
	ctx: NormalizerContext,
	filter?: string[]
): Temporal.ZonedDateTime {
	const { state, resolvingKeys, subParse } = ctx;
	const prevAnchor = state.anchor;
	const prevZdt = state.zdt;

	state.anchor = dateTime;
	state.zdt = dateTime;

	state.parseDepth = (state.parseDepth ?? 0) + 1;
	const isRoot = state.parseDepth === 1;
	if (isRoot) state.matches = [];

	const TempoClass = getRuntime().modules['Tempo'];
	const aliasEngine = state.aliasEngine ?? (TempoClass as any)?.[sym.$Internal]?.().aliasEngine;

	try {
		for (const key of ownKeys(groups)) {
			if (filter) {
				const isMatch = filter.some(f => {
					const alias = aliasEngine?.getAlias(key);
					if (key === f || (alias && (alias.type === f || alias.groupName === f))) return true;
					return key.startsWith(f);
				});
				if (!isMatch) continue;
			}

			if (key === 'slk') {
				const slk = groups[key];
				const result = resolveTermMutation(TempoClass, state as any, 'set', slk, undefined, dateTime);

				if (result === null) {
					state.errored = true;
					delete groups[key];
					break;
				}

				dateTime = result;
				delete groups[key];
				continue;
			}

			if (Match.named.test(key)) {
				delete groups[key];
				continue;
			}

			const register = aliasEngine?.getAlias(key);
			if (!register) continue;

			const aliasKey = register.name;
			if (resolvingKeys.size > MAX_TEMPO_RESOLVE_DEPTH || resolvingKeys.has(aliasKey)) {
				const msg = `Infinite recursion detected in Tempo resolution for: ${aliasKey}`;
				state.errored = true;
				logError(new RangeError(msg), state.config);
				delete groups[key];
				continue;
			}

			resolvingKeys.add(aliasKey);

			try {
				const host = getAliasContext(ctx, dateTime);
				const res = aliasEngine?.resolveAlias(key as any, host);
				if (!res) continue;

				logDebug(`[Normalizer] Resolved alias '${aliasKey}'`, state.config);

				try {
					const mapped = ({
						evt: { type: 'Event', pat: 'dt' },
						per: { type: 'Period', pat: 'tm' }
					} as const)[res.type as 'evt' | 'per'];

					if (!mapped)
						throw new TempoError(`[ParseEngine] Unexpected AliasType: ${res.type}`);

					const { type, pat } = mapped;

					accumulateResult(state, { type, value: res.key as any, match: pat, source: res.source, groups: { [key]: res.value } });

					if (!isEmpty(res.value) && res.value !== String(groups[key])) {
						const resolving = new Set(resolvingKeys);
						resolving.add(res.key);

						const subAnchor: any = state.anchor;
						state.anchor = dateTime;
						const resMatch = subParse(res.value, dateTime, resolving);
						state.anchor = subAnchor;

						if (resMatch.type === 'Temporal.ZonedDateTime')
							dateTime = resMatch.value;
					}
				} finally {
					state.zdt = dateTime;
					delete groups[key];
				}
			} finally {
				resolvingKeys.delete(aliasKey);
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
		const rawMm = String(groups["mm"]).replace(/\.$/, '').toLowerCase();
		const mappedMm = state.parse.monthMap?.[rawMm];

		if (isDefined(mappedMm)) {
			groups["mm"] = mappedMm.value.toString().padStart(2, '0');
			logDebug(`[Normalizer] Normalized localized month string '${groups["mm"]}'`, state.config);
			accumulateResult(state, { type: 'Month' as any, value: mappedMm.value as any, match: rawMm, locale: mappedMm.locale });
		} else {
			const mm = prefix(groups["mm"] as t.MONTH);
			const monthVal = enums.MONTH[mm];

			if (isDefined(monthVal)) {
				groups["mm"] = monthVal.toString().padStart(2, '0');
				logDebug(`[Normalizer] Normalized month string '${mm}' to ${groups["mm"]}`, state.config);
			}
		}
	}

	return dateTime;
}

/**
 * Accumulate match results for diagnostic tracing.
 */
export function accumulateResult(state: t.Internal.State, ...rest: Partial<t.Internal.Match>[]) {
	const match = Object.assign({}, ...rest) as t.Internal.Match;

	if (isDefined(state.parse.anchor))
		match.anchor = state.parse.anchor;

	if (!isDefined(match.isAnchored) && isDefined(state.parse.isAnchored))
		match.isAnchored = state.parse.isAnchored;

	const res = state.parse.result;
	if (isDefined(res) && !Object.isFrozen(res)) {
		const isDuplicate = res.some(existing =>
			existing.match === match.match &&
			existing.source === match.source &&
			String(existing.anchor ?? '') === String(match.anchor ?? '')
		);
		if (!isDuplicate) res.push(match);
	}
}
