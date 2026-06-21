import '#library/temporal.polyfill.js';
import { enumify } from '#library/enumerate.library.js';
import { asArray } from '#library/coercion.library.js';
import { getDateTimeFormat, getHemisphere, canonicalLocale } from '#library/international.library.js';
import { normalizeUtcOffset } from '#library/temporal.library.js';
import { markConfig } from '#library/symbol.library.js';
import { deepMerge } from '#library/object.library.js';
import { asType } from '#library/type.library.js';
import { isString, isObject, isUndefined, isDefined, isRegExp, isEmpty } from '#library/assertion.library.js';
import { ScopedSet } from '#library/scopedset.class.js';
import { ownEntries } from '#library/primitive.library.js';
import { getStorage } from '#library/storage.library.js';
import { parseLogLevel } from '#library/logger.class.js';

import { getRuntime } from './support.runtime.js';
import { setProperty, setProperties, hasOwn, create, collect, normalizeLayoutOrder, resolveMonthDay, logError, generateLocalizedSnippets } from './support.util.js';
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
		// Unfreeze the registry sub-object so that extendState can write into it at runtime.
		// Default.registry is frozen (via secure()), so we need a mutable shallow clone.
		if (state.config.registry) {
			state.config.registry = {
				...state.config.registry,
				modifiers: { ...(state.config.registry.modifiers ?? {}) }
			}
		}
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

		state.parse = Object.create(baseState.parse);
		setProperties(state.config, {
			scope: 'local',
			catch: options.catch ?? (baseState.config as any).catch ?? false,
			intl: Object.create((baseState.config as any).intl || {}),
		});
		Object.defineProperty(state.config, 'get', { value: function (key: string) { return this[key] }, enumerable: false, writable: true, configurable: true });
	} else {
		markConfig(Object.assign(state.config, configDefaults));
		// Unfreeze the registry sub-object so that extendState can write into it at runtime.
		if (state.config.registry) {
			state.config.registry = {
				...state.config.registry,
				modifiers: { ...(state.config.registry.modifiers ?? {}) }
			}
		}
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
export function extendState(state: t.Internal.State, options: t.Options): boolean {
	let patternsDirty = false;

	const clearLocalization = () => {
		if (state.parse.monthMap || state.parse.weekdayMap) {
			delete state.parse.monthMap;
			delete state.parse.weekdayMap;
			state.parse.snippet[Token.mm as any] = Snippet[Token.mm as any];
			state.parse.snippet[Token.wkd as any] = Snippet[Token.wkd as any];

			if ((state.parse as any).localizedEvents) {
				(state.parse as any).localizedEvents.forEach((k: string) => {
					delete state.parse.event[k];
				});
				delete (state.parse as any).localizedEvents;
			}
			patternsDirty = true;
		}
	}

	ownEntries(options).forEach(([optKey, optVal]) => {
		if (isUndefined(optVal)) return;

		state.userProvidedKeys.add(optKey);
		const arg = asType(optVal);

		switch (optKey) {
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
				const resolvedLocales = asArray(arg.value).map(l => canonicalLocale(String(l))).filter(Boolean) as string[];
				if (resolvedLocales.length > 0) {
					const finalLocale = resolvedLocales.length === 1 ? resolvedLocales[0] : resolvedLocales;
					setProperty(state.config, 'locale', finalLocale);
					if (resolvedLocales.every(locale => locale.split('-')[0] === 'en')) clearLocalization();
				}
				break;
			}

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
					if (arg.value.modifiers) {
						// Deep-merge user modifiers with existing defaults so English keywords remain active
						const existing = state.config.registry.modifiers ?? {};
						const merged: Record<string, string[]> = {};

						// normalize existing defaults into arrays
						for (const [op, words] of Object.entries(existing))
							merged[op] = [...asArray<string>(words as any)];

						// merge incoming user modifiers
						for (const [op, words] of Object.entries(arg.value.modifiers)) {
							const current = merged[op] ?? [];
							merged[op] = [...new Set([...current, ...asArray<string>(words as any)])];
						}

						setProperty(state.config.registry, 'modifiers', merged);
					}

					const parseMap: Record<string, 'snippet' | 'layout' | 'event' | 'period' | 'ignore'> = {
						snippets: 'snippet',
						layouts: 'layout',
						events: 'event',
						periods: 'period',
						ignores: 'ignore'
					}

					ownEntries(arg.value).forEach(([k, v]) => {
						if (isString(k) && k in parseMap) {
							const targetKey = parseMap[k];
							state.userProvidedKeys.add(targetKey);
							patternsDirty = true;
							if (!hasOwn(state.parse, targetKey))
								state.parse[targetKey] = create(state.parse, targetKey);

							const rule = state.parse[targetKey];
							if (['snippet', 'layout'].includes(targetKey)) {
								collect(rule, v, (val: any) => {
									if (targetKey === 'snippet') {
										// ReDoS Mitigation: Snippet patterns should be kept as simple as possible.
										// While length limits and backtrack detection offer baseline protection, 
										// residual risk remains from crafted patterns that evade these checks.
										// If snippets are ever sourced from untrusted configuration inputs, consider
										// implementing a timeout wrapper around the RegExp constructor call for defense-in-depth.
										const pattern = isRegExp(val) ? val.source : String(val);
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
									return isRegExp(val) ? val.source : val;
								});
							} else {
								asArray(v).forEach(elm => {
									if (isObject(elm)) Object.assign(rule, elm);
									else if (isString(elm)) Object.assign(rule, { [elm]: elm });
								});
							}
						}
					});
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
				state.config.intl = deepMerge(state.config.intl, arg.value);
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

	const locale = state.config.locale;
	if (locale) {
		const locales = asArray(locale);
		if (locales.length > 0 && !locales.every(l => l.split('-')[0] === 'en')) {
			const { snippets, monthMap, weekdayMap, events } = generateLocalizedSnippets(locales);
			state.parse.monthMap = monthMap;
			state.parse.weekdayMap = weekdayMap;
			Object.assign(state.parse.snippet, snippets);

			// Map to exact lexer Tokens to override default layout placeholders
			const defaultMm = Snippet[Token.mm as any].source.replace(/^\(\?<mm>|\)$/g, '');
			const defaultWkd = Snippet[Token.wkd as any].source.replace(/^\(\?<wkd>|\)$/g, '');
			state.parse.snippet[Token.mm as any] = new RegExp(`(?<mm>${defaultMm}|${snippets.mmm})`, 'i');
			state.parse.snippet[Token.wkd as any] = new RegExp(`(?<wkd>${defaultWkd}|${snippets.www})`, 'i');

			if (!isEmpty(events)) {
				Object.assign(state.parse.event, events);
				(state.parse as any).localizedEvents = Object.keys(events);

				// Register new localized aliases with the AliasEngine
				if (state.aliasEngine) {
					// Ensure we don't corrupt global state if we are a local instance
					if (state.config.scope === 'local' && state.aliasEngine.depth === 0) {
						if (typeof state.aliasEngine.fork === 'function') {
							state.aliasEngine = state.aliasEngine.fork(state.config);
						}
					}
					state.aliasEngine.registerAliases('evt', ownEntries(events));
				}
			}
			patternsDirty = true;
		} else if (locales.length > 0) {
			clearLocalization();
		}
	}

	return patternsDirty;
}
