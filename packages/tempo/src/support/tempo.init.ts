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
import { setProperty, hasOwn, create, collect, setPatterns } from './tempo.util.js';
import { sym, Token } from './tempo.symbol.js';
import { Match, Snippet, Layout, Event, Period, Ignore, Guard, Default } from './tempo.default.js';
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
		mdyLocales: asArray(baseState?.parse.mdyLocales ?? Default.mdyLocales as any),
		mdyLayouts: asArray<t.Pair>(baseState?.parse.mdyLayouts ?? Default.mdyLayouts as any),
		layoutOrder: asArray<string>(baseState?.parse.layoutOrder ?? Default.layoutOrder as any),
		pivot: (baseState?.parse.pivot ?? Default.pivot) as any,
		mode: (baseState?.parse.mode ?? Default.mode) as any,
		lazy: false,
		pattern: new Map(baseState?.parse.pattern),
	});

	// 2. Establish the base configuration options
	if (isGlobal) {
		markConfig(Object.assign(state.config, Default));
		const { timeZone, calendar } = getDateTimeFormat();
		Object.defineProperties(state.config, {
			calendar: { value: calendar, enumerable: true, writable: true, configurable: true },
			timeZone: { value: timeZone, enumerable: true, writable: true, configurable: true },
			locale: { value: (getDateTimeFormat() as any).locale ?? 'en-US', enumerable: true, writable: true, configurable: true },
			discovery: { value: Symbol.keyFor(sym.$Tempo) as string, enumerable: true, writable: true, configurable: true },
			formats: { value: enumify(STATE.FORMAT, false), enumerable: true, writable: true, configurable: true },
			sphere: { value: getHemisphere(timeZone), enumerable: true, writable: true, configurable: true },
			get: { value: function (key: string) { return this[key] }, enumerable: false, writable: true, configurable: true },
			scope: { value: 'global', enumerable: true, writable: true, configurable: true },
			catch: { value: options.catch ?? false, enumerable: true, writable: true, configurable: true }
		});
	} else if (baseState) {
		state.config = markConfig(Object.create(baseState.config));
		Object.defineProperties(state.config, {
			calendar: { value: (state.config as any).calendar, enumerable: true, writable: true, configurable: true },
			timeZone: { value: (state.config as any).timeZone, enumerable: true, writable: true, configurable: true },
			locale: { value: (state.config as any).locale, enumerable: true, writable: true, configurable: true },
			discovery: { value: (state.config as any).discovery, enumerable: true, writable: true, configurable: true },
			formats: { value: (state.config as any).formats, enumerable: true, writable: true, configurable: true },
			sphere: { value: (state.config as any).sphere, enumerable: true, writable: true, configurable: true },
			get: { value: (state.config as any).get, enumerable: false, writable: true, configurable: true },
			scope: { value: 'local', enumerable: true, writable: true, configurable: true },
		});
		setProperty(state.config, 'catch', options.catch);
	} else {
		markConfig(Object.assign(state.config, Default));
		Object.defineProperties(state.config, {
			calendar: { value: calendar, enumerable: true, writable: true, configurable: true },
			timeZone: { value: timeZone, enumerable: true, writable: true, configurable: true },
			locale: { value: (getDateTimeFormat() as any).locale ?? 'en-US', enumerable: true, writable: true, configurable: true },
			discovery: { value: Symbol.keyFor(sym.$Tempo) as string, enumerable: true, writable: true, configurable: true },
			formats: { value: enumify(STATE.FORMAT, false), enumerable: true, writable: true, configurable: true },
			sphere: { value: getHemisphere(timeZone), enumerable: true, writable: true, configurable: true },
			get: { value: function (key: string) { return this[key] }, enumerable: false, writable: true, configurable: true },
			scope: { value: 'local', enumerable: true, writable: true, configurable: true },
		});
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
				state.parse.layoutOrder = asArray(arg.value)
					.map(v => String(v).trim())
					.filter(Boolean);
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

			case 'pivot': {
				const v = Number(arg.value);
				if (Number.isInteger(v) && v >= 0) state.parse.pivot = v;
				break;
			}

			case 'mode':
				state.parse.mode = String(arg.value) as Mode;
				break;

			case 'anchor':
				state.anchor = arg.value;
				break;
		}
	});

	if (patternsDirty) setPatterns(state);

	return state;
}
