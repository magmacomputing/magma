import '#library/temporal.polyfill.js';
import { enumify } from '#library/enumerate.library.js';
import { asArray } from '#library/coercion.library.js';
import { getDateTimeFormat, getHemisphere } from '#library/international.library.js';
import { normalizeUtcOffset } from '#library/temporal.library.js';
import { markConfig } from '#library/symbol.library.js';
import { asType } from '#library/type.library.js';
import { isString, isObject, isUndefined, isDefined, isRegExp } from '#library/assertion.library.js';
import { ownEntries } from '#library/primitive.library.js';

import { getRuntime } from './tempo.runtime.js';
import { setProperty, setProperties, hasOwn, create, collect, normalizeLayoutOrder, resolveMonthDay } from './tempo.util.js';
import { sym, Token } from './tempo.symbol.js';
import { Match, Snippet, Layout, Event, Period, Ignore, Default } from './tempo.default.js';
import enums, { STATE } from './tempo.enum.js';
import * as t from '../tempo.type.js';
import type { Mode } from '../tempo.type.js';

/** @internal Initialise a Tempo state */
export function init(options: t.Options = {}, isGlobal = true, baseState?: t.Internal.State): t.Internal.State {
	const runtime = getRuntime();
	// Global init is intentionally idempotent after first hydration; late-loaded modules must use Tempo.extend().
	if (isGlobal && runtime.state && !baseState) return runtime.state;

	const { timeZone, calendar } = getDateTimeFormat();

	const state = {
		config: {},
		parse: {}
	} as t.Internal.State

	// 1. Establish the base parsing state
	state.parse = markConfig({
		token: Token,
		result: [],
		snippet: Object.assign({}, baseState?.parse.snippet ?? Snippet),
		layout: Object.assign({}, baseState?.parse.layout ?? Layout),
		event: Object.assign({}, baseState?.parse.event ?? Event),
		period: Object.assign({}, baseState?.parse.period ?? Period),
		ignore: baseState ? { ...baseState.parse.ignore } : Object.fromEntries(asArray(Ignore).map(w => [w, w])),
		monthDay: {
			...(isObject(baseState?.parse.monthDay)
				? baseState?.parse.monthDay
				: isObject(Default.monthDay)
					? Default.monthDay
					: {})
		},
		layoutOrder: asArray<string>(baseState?.parse.layoutOrder ?? Default.layoutOrder as any),
		parsePrefilter: Boolean(baseState?.parse.parsePrefilter ?? Default.parsePrefilter),
		pivot: (baseState?.parse.pivot ?? Default.pivot) as any,
		mode: (baseState?.parse.mode ?? Default.mode) as any,
		lazy: false,
		pattern: new Map(baseState?.parse.pattern),
	});

	// 2. Establish the base configuration options
	if (isGlobal) {
		markConfig(Object.assign(state.config, Default));
		const { timeZone, calendar } = getDateTimeFormat();
		setProperties(state.config, {
			calendar,
			timeZone,
			locale: (getDateTimeFormat() as any).locale ?? 'en-US',
			discovery: Symbol.keyFor(sym.$Tempo) as string,
			formats: enumify(STATE.FORMAT, false),
			sphere: getHemisphere(timeZone),
			scope: 'global',
			catch: options.catch ?? false
		});
		Object.defineProperty(state.config, 'get', { value: function (key: string) { return this[key] }, enumerable: false, writable: true, configurable: true });
	} else if (baseState) {
		state.config = markConfig(Object.create(baseState.config));
		setProperties(state.config, {
			calendar: (state.config as any).calendar,
			timeZone: (state.config as any).timeZone,
			locale: (state.config as any).locale,
			discovery: (state.config as any).discovery,
			formats: (state.config as any).formats,
			sphere: (state.config as any).sphere,
			scope: 'local'
		});
		Object.defineProperty(state.config, 'get', { value: (state.config as any).get, enumerable: false, writable: true, configurable: true });
		setProperty(state.config, 'catch', options.catch);
	} else {
		markConfig(Object.assign(state.config, Default));
		setProperties(state.config, {
			calendar,
			timeZone,
			locale: (getDateTimeFormat() as any).locale ?? 'en-US',
			discovery: Symbol.keyFor(sym.$Tempo) as string,
			formats: enumify(STATE.FORMAT, false),
			sphere: getHemisphere(timeZone),
			scope: 'local'
		});
		Object.defineProperty(state.config, 'get', { value: function (key: string) { return this[key] }, enumerable: false, writable: true, configurable: true });
		if (isDefined(options.catch))
			setProperty(state.config, 'catch', options.catch);
	}

	// 3. Initialize registries that need objects
	state.OPTION = new Set(Object.keys(Default));
	state.ZONED_DATE_TIME = new Set(['year', 'month', 'day', 'hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond', 'offset', 'timeZone', 'calendar']);

	if (isGlobal) runtime.state = state;
	return state;
}


/** @internal Extend a Tempo state with new options (Shadowing) */
export function extendState(state: t.Internal.State, options: t.Options) {
	let patternsDirty = false;

	ownEntries(options).forEach(([optKey, optVal]) => {
		if (isUndefined(optVal)) return;
		const arg = asType(optVal);

		switch (optKey) {
			case 'snippet':
			case 'layout':
			case 'event':
			case 'period':
			case 'ignore': {
				patternsDirty = true;
				if (!hasOwn(state.parse, optKey))
					state.parse[optKey] = create(state.parse, optKey);

				const rule = state.parse[optKey];
				if (['snippet', 'layout'].includes(optKey)) {
					collect(rule, arg.value, (v: any) => {
						if (optKey === 'snippet') {
							const pattern = isRegExp(v) ? v.source : String(v);
							// 🛡️ Security Check: Prevent catastrophic backtracking and malicious patterns
							if (pattern.length > 500) throw new Error(`[Tempo#extend] Snippet pattern too long (max 500 chars).`);
							if (Match.backtrack.test(pattern)) throw new Error(`[Tempo#extend] Snippet contains suspicious nested quantifiers.`);
							return new RegExp(pattern);
						}
						return isRegExp(v) ? v.source : v;
					});
				} else {
					asArray(arg.value).forEach(elm => {
						if (isObject(elm)) Object.assign(rule, elm);
						else if (isString(elm)) Object.assign(rule, { [elm]: elm });
					})
				}
				break;
			}

			case 'layoutOrder':
				state.parse.layoutOrder = normalizeLayoutOrder(arg.value);
				break;

			case 'monthDay':
				state.parse.monthDay = resolveMonthDay(arg.value, state.parse.monthDay);
				break;

			case 'parsePrefilter':
				state.parse.parsePrefilter = Boolean(arg.value);
				break;

			case 'timeZone': {
				const zone = String(arg.value).toLowerCase();
				const resolvedZone = enums.TIMEZONE[zone] ?? normalizeUtcOffset(String(arg.value));
				setProperty(state.config, 'timeZone', resolvedZone);
				setProperty(state.config, 'sphere', getHemisphere(resolvedZone));
				break;
			}

			case 'calendar':
				setProperty(state.config, 'calendar', String(arg.value));
				break;

			case 'locale':
				setProperty(state.config, 'locale', String(arg.value));
				break;

			case 'discovery':
				setProperty(state.config, 'discovery', arg.value);
				break;

			case 'formats':
				setProperty(state.config, 'formats', arg.value);
				break;

			case 'sphere':
				setProperty(state.config, 'sphere', arg.value);
				break;

			case 'catch':
				setProperty(state.config, 'catch', Boolean(arg.value));
				break;

			case 'pivot':
				state.parse.pivot = arg.value;
				break;

			case 'mode':
				state.parse.mode = arg.value;
				break;

			default:
				setProperty(state.config, optKey, arg.value);
				break;
		}
	});
}
