import '#library/temporal.polyfill.js';
import { enumify } from '#library/enumerate.library.js';
import { asArray } from '#library/coercion.library.js';
import { getDateTimeFormat, getHemisphere, canonicalLocale } from '#library/international.library.js';
import { normalizeUtcOffset } from '#library/temporal.library.js';
import { markConfig } from '#library/symbol.library.js';
import { asType } from '#library/type.library.js';
import { isString, isObject, isUndefined, isDefined, isRegExp } from '#library/assertion.library.js';
import { ScopedSet } from '#library/scopedset.class.js';
import { ownEntries } from '#library/primitive.library.js';
import { getStorage } from '#library/storage.library.js';
import { parseLogLevel } from '#library/logger.class.js';

import { getRuntime } from './support.runtime.js';
import { setProperty, setProperties, hasOwn, create, collect, normalizeLayoutOrder, resolveMonthDay, logError } from './support.util.js';
import { setLicense } from '../plugin/license/license.manager.js';
import { sym, Token } from './support.symbol.js';
import { Match, Snippet, Layout, Event, Period, Ignore, Default } from './support.default.js';
import { STATE } from './support.enum.js';

import enums from './support.enum.js';
import * as t from '../tempo.type.js';

/** @internal Initialise a Tempo state */
export function init(options: t.Options = {}, isGlobal = true, baseState?: t.Internal.State): t.Internal.State {
	const runtime = getRuntime();
	// Global init is intentionally idempotent after first hydration; late-loaded modules must use Tempo.extend().
	if (isGlobal && runtime.state && !baseState) return runtime.state;

	const { timeZone, calendar } = getDateTimeFormat();
	const state = (baseState ? Object.create(baseState) : {
		config: {},
		parse: {},
		pluginsDb: { terms: [], plugins: [] },
		userProvidedKeys: new Set<string>()
	}) as t.Internal.State;

	if (baseState) {
		state.config = Object.create(baseState.config);
		if (baseState.config.registry) state.config.registry = Object.create(baseState.config.registry);
		if (baseState.config.format) state.config.format = Object.create(baseState.config.format);
		state.parse = Object.create(baseState.parse);
		state.userProvidedKeys = new Set(baseState.userProvidedKeys);
		state.installed = new ScopedSet(runtime.installed);	// sandbox: delegates has() to global, isolates add()
		state.pluginsDb = {
			terms: [...baseState.pluginsDb.terms],
			plugins: [...baseState.pluginsDb.plugins]
		};
	}

	// 1. Establish the base parsing state
	const parseState: t.Internal.Parse = {
		token: Token,
		result: [],
		snippet: Object.assign({}, baseState?.parse.snippet ?? Snippet),
		layout: Object.assign({}, baseState?.parse.layout ?? Layout),
		event: Object.assign({}, baseState?.parse.event ?? Event),
		period: Object.assign({}, baseState?.parse.period ?? Period),
		ignore: baseState ? { ...baseState.parse.ignore } : Object.fromEntries(asArray(Ignore).map(w => [w, w])),
		monthDay: baseState ? {
			...baseState.parse.monthDay,
			locales: [...asArray(baseState.parse.monthDay.locales)],
			layouts: [...asArray(baseState.parse.monthDay.layouts)],
			timezones: { ...baseState.parse.monthDay.timezones },
			...(baseState.parse.monthDay.resolvedLocales ? {
				resolvedLocales: baseState.parse.monthDay.resolvedLocales.map((l: any) => ({ ...l, timeZones: [...l.timeZones] }))
			} : {})
		} : resolveMonthDay({}, Default.monthDay as any),
		planner: baseState ? {
			...(baseState.parse.planner.layoutOrder ? { layoutOrder: [...asArray<string | symbol>(baseState.parse.planner.layoutOrder)] } : {}),
			...(isDefined(baseState.parse.planner.preFilter) ? { preFilter: Boolean(baseState.parse.planner.preFilter) } : {}),
		} : {
			layoutOrder: [...asArray<string | symbol>(Default.planner?.layoutOrder ?? (Default as any).layoutOrder)],
			preFilter: Boolean(Default.planner?.preFilter ?? (Default as any).preFilter),
		},
		pivot: (baseState?.parse.pivot ?? Default.pivot) as any,
		mode: (baseState?.parse.mode ?? Default.mode) as any,
		lazy: false,
		pattern: new Map(baseState?.parse.pattern),
		...(baseState ? {
			...(isDefined(baseState.parse.isAnchored) ? { isAnchored: baseState.parse.isAnchored } : {}),
			...(isDefined(baseState.parse.anchor) ? { anchor: baseState.parse.anchor } : {}),
			...(isDefined(baseState.parse.format) ? { format: baseState.parse.format } : {}),
			...(isDefined(baseState.parse.term) ? { term: baseState.parse.term } : {}),
			...(isDefined(baseState.parse.guard) ? { guard: baseState.parse.guard } : {}),
		} : {})
	};

	state.parse = markConfig(parseState);

	// 2. Establish the base configuration options
	const configDefaults = Object.fromEntries(Object.entries(Default).filter(([key]) => enums.CONFIG.has(key)));
	if (isGlobal) {
		markConfig(Object.assign(state.config, configDefaults));
		const { timeZone, calendar } = getDateTimeFormat();
		setProperties(state.config, {
			calendar,
			timeZone,
			locale: (getDateTimeFormat() as any).locale ?? 'en-US',
			discovery: Symbol.keyFor(sym.$Tempo) as string,
			formats: enumify(STATE.FORMAT, false),
			sphere: getHemisphere(timeZone),
			scope: 'global',
			catch: options.catch ?? false,
			intl: {},
		});
		Object.defineProperty(state.config, 'get', { value: function (key: string) { return this[key] }, enumerable: false, writable: true, configurable: true });
	} else if (baseState) {
		state.config = markConfig(Object.create(baseState.config));
		if (baseState.config.registry) state.config.registry = Object.create(baseState.config.registry);
		if (baseState.config.format) state.config.format = Object.create(baseState.config.format);
		state.parse = Object.create(baseState.parse);
		setProperties(state.config, {
			scope: 'local',
			catch: options.catch ?? (baseState.config as any).catch ?? false,
			intl: Object.create((baseState.config as any).intl || {}),
		});
		Object.defineProperty(state.config, 'get', { value: function (key: string) { return this[key] }, enumerable: false, writable: true, configurable: true });
	} else {
		markConfig(Object.assign(state.config, configDefaults));
		setProperties(state.config, {
			calendar,
			timeZone,
			locale: (getDateTimeFormat() as any).locale ?? 'en-US',
			discovery: Symbol.keyFor(sym.$Tempo) as string,
			formats: enumify(STATE.FORMAT, false),
			sphere: getHemisphere(timeZone),
			scope: 'local',
			intl: {},
		});
		Object.defineProperty(state.config, 'get', { value: function (key: string) { return this[key] }, enumerable: false, writable: true, configurable: true });
		if (isDefined(options.catch))
			setProperty(state.config, 'catch', options.catch);
	}

	// 3. Initialize registries that need objects
	state.OPTION = new Set(Object.keys(configDefaults));
	state.ZONED_DATE_TIME = new Set(['year', 'month', 'day', 'hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond', 'offset', 'timeZone', 'calendar']);

	if (isGlobal) {
		runtime.state = state;

		// 4. Discovery Cascade (License)
		let key = options.license;

		if (!key) key = getStorage('TEMPO_LICENSE_KEY');
		if (!key) key = (globalThis as any).TEMPO_LICENSE_KEY;

		if (key) setLicense(state, key);
	}
	return state;
}

/** @internal Extend a Tempo state with new options (Shadowing) */
export function extendState(state: t.Internal.State, options: t.Options) {
	let patternsDirty = false;

	ownEntries(options).forEach(([optKey, optVal]) => {
		if (isUndefined(optVal)) return;

		state.userProvidedKeys.add(optKey);
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
							if (pattern.length > 500) {
								logError(`[Tempo#extend] Snippet pattern too long (max 500 chars).`, state.config);
								return new RegExp(Match.escape(pattern));
							}
							if (Match.backtrack.test(pattern)) {
								logError(`[Tempo#extend] Snippet contains suspicious nested quantifiers.`, state.config);
								return new RegExp(Match.escape(pattern));
							}
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

			case 'monthDay':
				state.parse.monthDay = resolveMonthDay(arg.value, state.parse.monthDay);
				break;

			case 'timeZone': {
				const zone = String(arg.value).toLowerCase();
				const resolvedZone = options.timeZones?.[zone] ?? state.config.timeZones?.[zone] ?? enums.TIMEZONE[zone] ?? normalizeUtcOffset(String(arg.value));
				setProperty(state.config, 'timeZone', resolvedZone);
				break;
			}

			case 'calendar':
				setProperty(state.config, 'calendar', String(arg.value));
				break;

			case 'locale': {
				const resolvedLocale = canonicalLocale(String(arg.value));
				if (resolvedLocale)
					setProperty(state.config, 'locale', resolvedLocale);
				break;
			}

			case 'format':
				if (isObject(arg.value)) state.config.format = { ...(state.config.format || {}), ...arg.value };
				break;

			case 'discovery':
				setProperty(state.config, 'discovery', arg.value);
				break;

			case 'registry':
				if (isObject(arg.value)) {
					if (!state.config.registry) state.config.registry = {} as any;
					if (arg.value.formats) {
						if (state.config.registry.formats?.extend) state.config.registry.formats = state.config.registry.formats.extend(arg.value.formats) as t.FormatRegistry;
						else setProperty(state.config.registry, 'formats', arg.value.formats);
					}
					if (arg.value.locales) {
						if ((state.config.registry.locales as any)?.extend) state.config.registry.locales = (state.config.registry.locales as any).extend(arg.value.locales);
						else setProperty(state.config.registry, 'locales', arg.value.locales);
					}
				}
				break;

			case 'formats':
				if (!state.config.registry) state.config.registry = {} as any;
				if (state.config.registry.formats?.extend) {
					state.config.registry.formats = state.config.registry.formats.extend(arg.value) as t.FormatRegistry;
				} else {
					setProperty(state.config.registry, 'formats', arg.value);
				}
				break;

			case 'locales':
				if (!state.config.registry) state.config.registry = {} as any;
				if ((state.config.registry.locales as any)?.extend) {
					state.config.registry.locales = (state.config.registry.locales as any).extend(arg.value);
				} else {
					setProperty(state.config.registry, 'locales', arg.value);
				}
				break;

			case 'sphere':
				setProperty(state.config, 'sphere', arg.value);
				break;

			case 'catch':
				setProperty(state.config, 'catch', Boolean(arg.value));
				break;

			case 'pivot': {
				const pivot = parseInt(String(arg.value));
				state.parse.pivot = (Number.isFinite(pivot) && pivot >= 0 && pivot <= 99) ? pivot : Default.pivot!;
				break;
			}

			case 'mode':
				state.parse.mode = arg.value;
				break;

			case 'intl':
				if (!isObject(state.config.intl)) setProperty(state.config, 'intl', {});
				state.config.intl = { ...state.config.intl, ...arg.value };
				break;

			case 'planner':
				if (isDefined(arg.value.layoutOrder)) state.parse.planner.layoutOrder = normalizeLayoutOrder(arg.value.layoutOrder);
				if (isDefined(arg.value.preFilter)) state.parse.planner.preFilter = Boolean(arg.value.preFilter);
				break;

			case 'layoutOrder':
				state.parse.planner.layoutOrder = normalizeLayoutOrder(arg.value);
				break;

			case 'preFilter':
				state.parse.planner.preFilter = Boolean(arg.value);
				break;

			case 'timeStamp': {
				const unit = (isString(arg.value) ? arg.value : arg.value?.unit)?.trim()?.toLowerCase();

				if (isUndefined(unit) || !['ss', 'ms', 'us', 'ns'].includes(unit)) {
					logError(`[Tempo#extend] Invalid timeStamp unit: ${String(unit ?? arg.value)}. Expected 'ss', 'ms', 'us', or 'ns'.`, state.config);
					break;
				}

				setProperty(state.config, optKey, unit);
				break;
			}

			case 'license': {
				const key = String(arg.value);
				setLicense(state, key);
				break;
			}

			case 'debug':
				setProperty(state.config, 'debug', parseLogLevel(arg.value));
				break;

			default:
				setProperty(state.config, optKey, arg.value);
				break;

		}
	});
}
