import '#library/temporal.polyfill.js';

import { Logify } from '#library/logify.class.js';
import { Immutable, Serializable } from '#library/class.library.js';
import { asArray } from '#library/coercion.library.js';
import { getStorage, setStorage } from '#library/storage.library.js';
import { secure, proxify, delegate } from '#library/proxy.library.js';
import { getContext, CONTEXT } from '#library/utility.library.js';
import { enumify } from '#library/enumerate.library.js';
import { ownKeys, ownEntries, unwrap } from '#library/primitive.library.js';
import { getAccessors, omit } from '#library/reflection.library.js';
import { pad, trimAll } from '#library/string.library.js';
import { getType, asType } from '#library/type.library.js';
import { isEmpty, isDefined, isUndefined, isString, isObject, isRegExp, isSymbol, isFunction, isClass, isZonedDateTime, isDurationLike, isZonedDateTimeLike, isBoolean } from '#library/assertion.library.js';
import type { Property, Secure } from '#library/type.library.js';
import { getDateTimeFormat, getHemisphere, canonicalLocale } from '#library/international.library.js';

import { registerPlugin, interpret, ensureModule } from './plugin/plugin.util.js'
import { registerTerm, getTermRange } from './plugin/term.util.js';
import { DEFAULT_LAYOUT_CLASS, resolveLayoutOrder, getLayoutOrder } from './engine/engine.layout.js';
import { resolveMonthDay } from './support/tempo.util.js';
import type { TermPlugin, Plugin } from './plugin/plugin.type.js';
import { setProperty, proto, hasOwn, create, compileRegExp, setPatterns, normalizeLayoutOrder } from './support/tempo.util.js';

import { datePattern } from './support/tempo.default.js';
import { sym, markConfig, TermError, getRuntime, init, isTempo, registryUpdate, registryReset, onRegistryReset, Match, Token, Snippet, Layout, Event, Period, Ignore, Default, Guard, enums, STATE, DISCOVERY, $Internal, $setConfig, $logError, $logDebug, $Identity, $setEvents, $setPeriods, $buildGuard, $IsBase, $ImmutableSkip, $Tempo, $Register, $Logify, $errored, $dbg, $guard, $Discover, $setDiscovery } from '#tempo/support';
import * as t from './tempo.type.js';												// namespaced types (Tempo.*)
import { instant, normalizeUtcOffset } from '#library/temporal.library.js';

declare module '#library/type.library.js' {
	interface TypeValueMap<T> {
		Tempo: { type: 'Tempo', value: Tempo };
	}
}
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
const Context = getContext();																// current execution context

/** return whether the shape is 'local' or 'global' */
const isLocal = (shape: { config: { scope: string } }) => shape.config.scope === 'local';

const ClassStates = new WeakMap<typeof Tempo, Internal.State>();
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
namespace Internal {
	export type State = t.Internal.State;
	export type Parse = t.Internal.Parse;
	export type MatchResult = t.Internal.Match;
	export type Config = t.Internal.Config;
	export type Discovery = t.Internal.Discovery;
	export type Registry = t.Internal.Registry;
	export type PluginContainer = t.Internal.PluginContainer;

	export type Fmt = {																					// used for the fmtTempo() shortcut
		<F extends string>(fmt: F, tempo?: t.DateTime, options?: t.Options): t.FormatType<F>;
		<F extends string>(fmt: F, options: t.Options): t.FormatType<F>;
	}
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
/**
 * # Tempo
 * A powerful wrapper around `Temporal.ZonedDateTime` for flexible parsing and intuitive manipulation of date-time objects.
 * Bridges the gap between raw string/number inputs and the strict requirements of the ECMAScript Temporal API.
 */
@Serializable
@Immutable
export class Tempo {
	/** Weekday names (short-form) */													static get WEEKDAY() { return enums.WEEKDAY }
	/** Weekday names (long-form) */													static get WEEKDAYS() { return enums.WEEKDAYS }
	/** Month names (short-form) */														static get MONTH() { return enums.MONTH }
	/** Month names (long-form) */														static get MONTHS() { return enums.MONTHS }
	/** Time durations as seconds (singular) */								static get DURATION() { return enums.DURATION }
	/** Time durations as milliseconds (plural) */						static get DURATIONS() { return enums.DURATIONS }

	/** Quarterly Seasons */																	static get SEASON() { return enums.SEASON }
	/** Compass cardinal points */														static get COMPASS() { return enums.COMPASS }

	/** Tempo to Temporal DateTime Units map */								static get ELEMENT() { return enums.ELEMENT }
	/** Pre-configured format {name -> string} pairs */				static get FORMAT() { return enums.FORMAT }
	/** Number names (0-10) */																static get NUMBER() { return enums.NUMBER }
	/** TimeZone aliases */																		static get TIMEZONE() { return enums.TIMEZONE }
	/** regional date-parsing configuration */								static get MONTH_DAY() { return enums.MONTH_DAY }
	/** initialization strategies */													static get MODE() { return enums.MODE }
	/** some useful Dates */																	static get LIMIT() { return enums.LIMIT }

	/** @internal check if Tempo is currently initializing */	static get isInitializing() { return !Tempo.#lifecycle.ready }
	/** @internal check if Tempo is currently extending */		static get isExtending() { return Tempo.#lifecycle.extendDepth > 0 }

	/** Logify for internal errors and debug logs */					static #dbg = new Logify('Tempo', { debug: Default?.debug ?? false, catch: Default?.catch ?? false })

	/** Tempo state for the global configuration */						static #global = {} as Internal.State;
	/** cache for next-available 'usr' Token key */						static #usrCount = 0;
	/** mutable list of registered term plugins */						static get #terms(): TermPlugin[] { return getRuntime().pluginsDb.terms }
	/** mapping of terms to their resolved values */					static #termMap: Map<string, TermPlugin> = new Map();
	/** flag to prevent recursion during init */							static #lifecycle = { bootstrap: true, initialising: false, extendDepth: 0, ready: false };
	/** Master Guard predicate (implements RegExp-like interface) */static #guard: { test(str: string): boolean } = { test: () => true };
	/** Set of allowed lowercased tokens for the Master Guard */		static #allowedTokens: Set<string> = new Set();

	static [$IsBase] = true;

	/** @internal Static access to global private state. */
	static [$Internal]() {
		return ClassStates.get(this) ?? Tempo.#global;
	}

	static [$ImmutableSkip] = ['init'];
	static get $ImmutableSkip() { return ['init']; }

	/** @internal brand check to distinguish Tempo objects from other objects */
	get [$Identity](): true { return true }

	/** @internal handle internal errors using the global config */
	static [$logError](...msg: any[]): void {
		const provided = (isObject(msg[0]) && (msg[0] as any)[$Logify] === true) ? msg.shift() : undefined;
		const global = (this as any)[$Internal]().config;
		const config = markConfig(Object.create(global));
		if (provided) Object.entries(provided).forEach(([k, v]) => setProperty(config, k, v));
		markConfig(config);                                     // ensure config is marked for Logify
		Tempo.#dbg.error(config, ...msg);
	}

	/** @internal handle internal debug logs */
	static [$logDebug](...args: any[]): void {
		const provided = (isObject(args[0]) && (args[0] as any)[$Logify] === true) ? args.shift() : undefined;
		const global = (this as any)[$Internal]().config;
		const config = markConfig(Object.create(global));
		if (provided) Object.entries(provided).forEach(([k, v]) => setProperty(config, k, v));
		Tempo.#dbg.debug(config, ...args);
	}


	/**
	 * {dt} is a layout that combines date-related {snippets} (e.g. dd, mm -or- evt) into a pattern against which a string can be tested.  
	 * because it will also include a list of events (e.g. 'new_years' | 'xmas'), we need to rebuild {dt} if the user adds a new event
	 */
	// TODO:  check all Layouts which reference "{evt}" and update them
	static [$setEvents](shape: Internal.State) {
		const events = ownEntries(shape.parse.event, true);
		if (isLocal(shape) && !hasOwn(shape.parse, 'event') && !hasOwn(shape.parse.monthDay, 'active'))
			return;																								// no local change needed

		const src = shape.config.scope === 'global' ? 'g' : 'l';			// 'g'lobal or 'l'ocal (sandbox also uses 'l')
		const groups = events
			.map(([pat, _], idx) => `(?<${src}evt${idx}>${pat})`)	// assign a number to the pattern
			.join('|')																						// make an 'Or' pattern for the event-keys

		if (groups) {
			const protoEvt = proto(shape.parse.snippet)[Token.evt]?.source;
			if (!isLocal(shape) || groups !== protoEvt) {
				if (isLocal(shape) && !hasOwn(shape.parse, 'snippet'))
					shape.parse.snippet = create(shape.parse, 'snippet');

				setProperty(shape.parse.snippet, Token.evt, new RegExp(groups));
			}
		} else {
			// If no groups, ensure we don't have a stale or empty regex that could cause issues
			if (hasOwn(shape.parse.snippet, Token.evt)) {
				delete shape.parse.snippet[Token.evt as any];
			}
		}

		const isMonthDay = Boolean(shape.parse.monthDay.active);
		const protoDt = proto(shape.parse.layout)[Token.dt] as string;
		const targetDt = isMonthDay ? datePattern.mdy : datePattern.dmy;

		if (!isLocal(shape) || targetDt !== protoDt) {
			if (isLocal(shape) && !hasOwn(shape.parse, 'layout'))
				shape.parse.layout = create(shape.parse, 'layout');

			setProperty(shape.parse.layout, Token.dt, targetDt);
		}
	}

	/**
	 * {tm} is a layout that combines time-related snippets (hh, mi, ss, ff, mer -or- per) into a pattern against which a string can be tested.  
	 * because it will also include a list of periods (e.g. 'midnight' | 'afternoon' ), we need to rebuild {tm} if the user adds a new period
	*/
	// TODO:  check all Layouts which reference "{per}" and update them
	static [$setPeriods](shape: Internal.State) {
		const periods = ownEntries(shape.parse.period, true);
		if (isLocal(shape) && !hasOwn(shape.parse, 'period'))
			return;																							// no local change needed

		const src = shape.config.scope === 'global' ? 'g' : 'l';   // 'g'lobal or 'l'ocal (sandbox also uses 'l')
		const groups = periods
			.map(([pat, _], idx) => `(?<${src}per${idx}>${pat})`)	// {pattern} is the 1st element of the tuple
			.join('|')																						// make an 'or' pattern for the period-keys

		if (groups) {
			const protoPer = proto(shape.parse.snippet)[Token.per]?.source;
			if (!isLocal(shape) || groups !== protoPer) {
				if (isLocal(shape) && !hasOwn(shape.parse, 'snippet'))
					shape.parse.snippet = create(shape.parse, 'snippet');

				setProperty(shape.parse.snippet, Token.per, new RegExp(groups));
			}
		} else {
			// If no groups, ensure we don't have a stale or empty regex that could cause issues
			if (hasOwn(shape.parse.snippet, Token.per)) {
				delete shape.parse.snippet[Token.per as any];
			}
		}
	}

	/** try to infer hemisphere using the timezone's daylight-savings setting */
	static #setSphere = (shape: Internal.State, options: t.Options) => {
		if (isDefined(options.sphere)) return options.sphere;

		const tz = options.timeZone;
		if (isDefined(tz)) {
			if (String(tz).toLowerCase() === 'utc') return undefined;
			const sphere = getHemisphere(String(tz));
			if (isDefined(sphere)) return sphere;
		}

		return isDefined(shape.config?.sphere) ? shape.config.sphere : undefined;
	}

	/** determine if we have a {timeZone} which prefers {mdy} date-order */
	static #isMonthDay(shape: Internal.State) {
		const { timeZone, locale } = shape.config;
		const mdy = shape.parse.monthDay;
		const globalMdy = Tempo.MONTH_DAY as t.MonthDay;
		const intl = new Intl.Locale(locale);
		const tz = String(timeZone);

		// Find the resolved timezone list for the current locale (which includes getTimeZones data)
		const activeLocaleData = mdy.resolvedLocales?.find(l => l.locale === intl.baseName || l.locale === intl.language);
		if (activeLocaleData?.timeZones?.includes(tz)) return true;

		// Fallback to global timezones if not found in resolved locales
		const globalTzs = globalMdy.timezones || {};
		if (globalTzs[intl.baseName]?.includes(tz) || globalTzs[intl.language]?.includes(tz)) return true;

		// Dynamically check if the timezone belongs to the locale IF the locale was added to globalMdy.locales (e.g., via Discovery)
		if (asArray(globalMdy.locales).includes(intl.baseName) || asArray(globalMdy.locales).includes(intl.language)) {
			const intlTzs = (intl as any).getTimeZones?.() || [];
			if (intlTzs.includes(tz)) return true;
		}

		return false;
	}

	/**
	 * swap parsing-order of layouts to suit different timeZones  
	 * this allows the parser to try to interpret '04012023' as Apr-01-2023 before trying 04-Jan-2023  
	 */
	static #swapLayout(shape: Internal.State) {
		const { layouts } = shape.parse.monthDay;
		if (isEmpty(layouts)) return;

		const layoutController = shape.parse.layoutOrder.length > 0
			? { [DEFAULT_LAYOUT_CLASS]: [...shape.parse.layoutOrder] }
			: undefined;

		const layout = resolveLayoutOrder({
			layout: shape.parse.layout,
			monthDayLayouts: layouts!,
			isMonthDay: Boolean(shape.parse.monthDay.active),
			...(layoutController !== undefined && { layoutController }),
		});

		if (layout !== shape.parse.layout)
			shape.parse.layout = layout as Layout;

		Tempo.#dbg.debug(shape.config, `Resolved layout order: ${getLayoutOrder(layout).join(' -> ')}`);
	}

	/** get first Canonical name of a supplied locale */
	static #locale = (locale?: string) => {
		let language: string | undefined;

		try {																										// lookup locale
			language = canonicalLocale(locale!);
		} catch (error) { }																			// catch unknown locale

		const global = Context.global;

		return language ??
			global?.navigator?.languages?.[0] ??									// fallback to current first navigator.languages[]
			global?.navigator?.language ??												// else navigator.language
			Default.locale ??																			// else default locale
			locale																								// cannot determine locale
	}

	/** detect likely overlap between two alias keys/patterns */
	static #isAliasCollision(a: string, b: string): boolean {
		const left = a.trim().toLowerCase();
		const right = b.trim().toLowerCase();

		if (!left || !right) return false;
		if (left === right) return true;

		return left.includes(right) || right.includes(left);
	}

	/**
	 * conform input of Snippet / Layout / Event / Period options  
	 * This is needed because we allow the user to flexibly provide detail as {[key]:val} or {[key]:val}[] or [key,val][]  
	 */
	static [$setConfig](shape: Internal.State, ...options: t.Options[]) {
		const providedOptions: t.Options = Object.assign({}, ...options);
		const storeKey = providedOptions.store;
		const mergedOptions: t.Options = storeKey
			? Object.assign(Tempo.readStore(storeKey), providedOptions)
			: providedOptions;
		if (shape === Tempo.#global)																// sanitize global configuration
			omit(mergedOptions, 'value', 'anchor', 'result');

		if (isEmpty(mergedOptions))																	// nothing to do
			return;

		/** helper to normalize snippet/layout Options into the target Config */
		const collect = (target: Property<any>, value: any, convert: (v: any) => any) => {
			const itm = asType(value);
			target ??= {}

			switch (itm.type) {
				case 'Object':
					ownEntries(itm.value as Property<any>)
						.forEach(([k, v]) => target[Tempo.getSymbol(k)] = convert(v));
					break;
				case 'String':
				case 'RegExp':
					target[Tempo.getSymbol()] = convert(itm.value);
					break;
				case 'Array':
					itm.value.forEach(elm => collect(target, elm, convert));
					break;
			}
		}

		ownEntries(mergedOptions)
			.forEach(([optKey, optVal]) => {
				if (isUndefined(optVal)) return;										// skip undefined values
				const arg = asType(optVal);

				switch (optKey) {
					case 'snippet':
					case 'layout':
					case 'event':
					case 'period':
					case 'ignore':
						// lazy-shadowing: only create local object if it doesn't already exist on local shape
						if (!hasOwn(shape.parse, optKey))
							shape.parse[optKey] = create(shape.parse, optKey);

						const rule = shape.parse[optKey];
						if (['snippet', 'layout'].includes(optKey)) {
							collect(rule, arg.value, v =>
								optKey === 'snippet'
									? isRegExp(v) ? v : new RegExp(v)
									: isRegExp(v) ? v.source : v
							)
						} else {
							const aliases: [string, any][] = [];
							asArray(arg.value)
								.forEach(elm => {
									if (isObject(elm)) {
										ownEntries(elm as Record<string, any>, true)
											.forEach(([k, v]) => aliases.push([String(k), v]));
									} else if (isString(elm)) {
										aliases.push([elm, elm]);
									}
								});

							if ((optKey === 'event' || optKey === 'period') && aliases.length > 0) {
								const existing = ownEntries(rule as Record<string, any>, true)
									.map(([k, v]) => [String(k), v] as [string, any]);
								const incomingKeys = new Set(aliases.map(([k]) => k));

								aliases.forEach(([incomingKey]) => {
									const collisions = existing
										.map(([k]) => k)
										.filter(k => !incomingKeys.has(k) && Tempo.#isAliasCollision(k, incomingKey));

									if (!isEmpty(collisions)) {
										Tempo.#dbg.warn(shape.config,
											`Potential ${optKey} alias collision: "${incomingKey}" overlaps with existing alias(es): ${collisions.join(', ')}`);
									}
								});

								const next = Object.fromEntries([
									...aliases,
									...existing.filter(([k]) => !incomingKeys.has(k))
								]);

								ownKeys(rule as Record<string, any>, true)
									.forEach(key => delete (rule as any)[key]);
								Object.assign(rule, next);
							} else {
								Object.assign(rule, Object.fromEntries(aliases));
							}
						}
						break;

					case 'monthDay':
						shape.parse.monthDay = resolveMonthDay(arg.value, shape.parse.monthDay);
						break;

					case 'layoutOrder':
						shape.parse.layoutOrder = normalizeLayoutOrder(arg.value as NonNullable<t.Options[typeof optKey]>);
						break;

					case 'parsePrefilter':
						shape.parse.parsePrefilter = Boolean(arg.value);
						break;

					case 'pivot':
						shape.parse["pivot"] = Number(arg.value);
						break;

					case 'config':
						(this as any)[$setConfig](shape, arg.value as t.Options);
						break;

					case 'timeZone': {
						const zone = String(arg.value).toLowerCase();
						const resolvedZone = enums.TIMEZONE[zone] ?? normalizeUtcOffset(String(arg.value));
						setProperty(shape.config, 'timeZone', resolvedZone);
						setProperty(shape.config, 'sphere', getHemisphere(resolvedZone));
						break;
					}

					case 'calendar': {
						setProperty(shape.config, 'calendar', String(arg.value));
						break;
					}

					case 'formats':
						if (isLocal(shape) && !hasOwn(shape.config, 'formats'))
							shape.config.formats = shape.config.formats.extend({}) as t.FormatRegistry;	// shadow parent prototype

						if (isObject(arg.value))
							shape.config.formats = shape.config.formats.extend(arg.value as Property<any>) as t.FormatRegistry;
						break;

					case 'discovery':
						setProperty(shape.config, 'discovery', isSymbol(optVal) ? Symbol.keyFor(optVal) as string : optVal);
						break;

					case 'plugins':
						asArray(optVal).forEach(p => this.extend(p));
						break;

					case 'mode':
						shape.parse.mode = optVal as any;
						shape.parse.lazy = (optVal === enums.MODE.Defer);	// if defer, set lazy true. if strict, set lazy false. if auto, constructor will decide.
						break;

					case 'relativeTime':
						if (isObject(optVal))
							shape.config.relativeTime = { ...shape.config.relativeTime, ...(optVal as any) };
						break;

					case 'rtfFormat':																	// deprecated alias
						shape.config.relativeTime = { ...shape.config.relativeTime, format: optVal as Intl.RelativeTimeFormat };
						break;

					case 'rtfStyle':																	// deprecated alias
						shape.config.relativeTime = { ...shape.config.relativeTime, style: optVal as Intl.RelativeTimeFormatStyle };
						break;

					case 'anchor':
						break;																					// internal anchor used for relativity parsing

					default:																					// else just add to config
						setProperty(shape.config, optKey, optVal);
						break;
				}
			})

		// Resolve effective 'active' flag (either from explicit options or auto-detection)
		const active = Reflect.has(mergedOptions, 'monthDay')
			? shape.parse.monthDay.active
			: Tempo.#isMonthDay(shape);

		// If flag differs from inherited default, apply it to the local state (shadowing if necessary)
		if (active !== proto(shape.parse).monthDay?.active) {
			if (!hasOwn(shape.parse, 'monthDay'))
				shape.parse.monthDay = { ...shape.parse.monthDay };

			shape.parse.monthDay.active = active;
		}

		shape.config.sphere = Tempo.#setSphere(shape, mergedOptions);

		Tempo.#swapLayout(shape);
		if (isDefined(shape.parse.event)) (this as any)[$setEvents](shape);
		if (isDefined(shape.parse.period)) (this as any)[$setPeriods](shape);

		setPatterns(shape);															// setup Regex DateTime patterns
	}

	// /** resolve regional date-parsing configuration */
	//    /**
	// 	* Normalize a MonthDay configuration value against the base.
	// 	* @internal
	// 	*/
	//    static resolveMonthDay(value: t.MonthDay | boolean = {}): t.MonthDay {
	// 	   // Use the shared utility and Tempo.MONTH_DAY as base
	// 	   // Optionally, warn using #dbg if needed
	// 	   return resolveMonthDayUtil(value, Tempo.MONTH_DAY);
	//    }

	/** support "Global Discovery" of user-options */
	static [$setDiscovery](shape: Internal.State, discovery?: Internal.Discovery) {
		if (!isObject(discovery)) return {}

		markConfig(discovery);																	// auto-mark the discovery object

		// 1. Process TimeZones (normalize to lowercase for lookup)
		if (discovery.timeZones) {
			const tzs = Object.fromEntries(
				ownEntries(discovery.timeZones, true).map(([k, v]) => [String(k).toLowerCase(), v])
			);
			registryUpdate('TIMEZONE', tzs);
		}

		// 1b. Process Numbers
		if (discovery.numbers)
			registryUpdate('NUMBER', discovery.numbers);

		// 1c. Process MDY settings
		if (discovery.monthDay) {
			const md = discovery.monthDay;
			if (md.timezones) {
				const mdyTzs = Object.fromEntries(
					ownEntries(md.timezones, true).map(([k, v]) => {
						try { return [new Intl.Locale(String(k)).baseName, v] }
						catch { return [String(k), v] }
					})
				);
				registryUpdate('MONTH_DAY', { timezones: mdyTzs });
			}
			if (md.locales) registryUpdate('MONTH_DAY', { locales: asArray(md.locales) });
			if (md.layouts) registryUpdate('MONTH_DAY', { layouts: asArray(md.layouts) });
		}

		// 1d. Process RelativeTime
		if (discovery.relativeTime)
			shape.config.relativeTime = { ...shape.config.relativeTime, ...discovery.relativeTime };

		// 2. Process Terms
		if ((discovery as any).term) {
			discovery.terms = [...asArray(discovery.terms || []), ...asArray((discovery as any).term)];
			Tempo.#dbg.warn(shape.config, 'Legacy "term" key in Discovery is deprecated. Please use "terms" instead.');
		}
		if (discovery.terms)
			this.extend(asArray(discovery.terms));

		// 3. Process Formats
		if (discovery.formats) {
			shape.config.formats = shape.config.formats.extend(discovery.formats) as t.FormatRegistry;
			registryUpdate('FORMAT', discovery.formats);
		}

		// 4. Process Plugins
		if (discovery.plugins)
			asArray(discovery.plugins).forEach(p => this.extend(p));

		// 5. Process Options
		let opts = discovery.options || {}
		if (discovery.ignore) {
			const ignore = isFunction(discovery.ignore) ? discovery.ignore() : discovery.ignore;
			opts = { ...opts, ignore };
		}
		const res = isFunction(opts) ? opts() : opts;

		if (shape === Tempo.#global) {
			(this as any)[$buildGuard]();
			setPatterns(shape);
		}

		return res;
	}

	static [$buildGuard]() {
		const wordsList = [
			...Object.keys(enums.NUMBER),
			...Object.keys(enums.WEEKDAY),
			...Object.keys(enums.WEEKDAYS),
			...Object.keys(enums.MONTH),
			...Object.keys(enums.MONTHS),
			...Object.keys(enums.DURATION),
			...Object.keys(enums.DURATIONS),
			...Object.keys(enums.TIMEZONE),
			...ownKeys((this as any)[$Internal]().parse.event),
			...ownKeys((this as any)[$Internal]().parse.period),
			...ownKeys((this as any)[$Internal]().parse.ignore),
			...ownKeys((this as any)[$Internal]().parse.snippet),
			...ownKeys((this as any)[$Internal]().parse.layout),
			...[Token.slk],
			...Tempo.#terms.map(t => t.key),
			...Tempo.#terms.map(t => t.scope),
			...Guard
		].filter(w => isString(w) || isSymbol(w))
			.map(w => (isSymbol(w) ? w.description : (w as string))!.toLowerCase())
			.filter(Boolean);

		Tempo.#allowedTokens = new Set(wordsList);

		let maxT = 0;
		for (const w of wordsList) if (w.length > maxT) maxT = w.length;
		const maxTokenLength = maxT;

		// Define the custom guard logic (Scan-and-Consume)
		Tempo.#guard = {
			test(input: string): boolean {
				if (!input || typeof input !== 'string') return false;

				let i = 0;
				const len = input.length;

				while (i < len) {
					const char = input[i];

					// 1. Skip spaces
					if (char === ' ' || char === '\n' || char === '\t' || char === '\r') {
						i++;
						continue;
					}

					// 2. Try Bracket match (starts with [)
					if (char === '[') {
						const sub = input.substring(i);
						const match = sub.match(Match.bracket);
						if (match && match.index === 0) {
							i += match[0].length;
							continue;
						}
					}

					// 3. Try Longest Token match from Set
					let matched = false;
					const searchLen = Math.min(maxTokenLength, len - i);
					const slice = input.substring(i, i + searchLen).toLowerCase();

					for (let l = searchLen; l > 0; l--) {
						const candidate = slice.substring(0, l);
						if (Tempo.#allowedTokens.has(candidate)) {
							i += l;
							matched = true;
							break;
						}
					}
					if (matched) continue;

					// 4. Try Fallback char (Match.guard)
					if (Match.guard.test(char)) {
						i++;
						continue;
					}

					return false; // No valid match at current position
				}

				return true;
			}
		}

		if ((this as any)[$Internal]() === Tempo.#global) {
			setPatterns((this as any)[$Internal]());
		}
	}

	/** @internal resolve a global discovery config object by symbol key */
	static #getConfig(sym: symbol) {
		const discovery = (globalThis as Record<symbol, any>)[sym];
		return proxify(omit({ ...discovery, scope: 'discovery' }, 'value'));
	}

	/**
	 * Unified loader for library extensions.
	 * 
	 * @param arg - A `Plugin` function, a `TermPlugin` object (or array), or a `Discovery` object.
	 * @param options - Optional configuration for a standard `Plugin`.
	 * @returns The `Tempo` class for chaining.
	 */
	/**
	 * Register a plugin or term extension.
	 * 
	 * @param plugin - A plugin or term extension to register.
	 * @param options - Optional configuration for the plugin.
	 */
	static extend(plugin: Plugin, options?: t.Options): typeof Tempo;
	/**
	 * Register an array of plugins or term extensions.
	 * 
	 * @param plugins - An array of plugins, terms, or extensions to register.
	 * @param options - Optional configuration for the plugins.
	 */
	static extend(plugins: (Plugin | TermPlugin | any)[], options?: t.Options): typeof Tempo;
	/**
	 * Register multiple plugins or term extensions.
	 * 
	 * @param args - A plugin, term, or list of extensions to register.
	 */
	static extend(...args: any[]): typeof Tempo;
	static extend(...args: any[]): typeof Tempo {
		let options = (args.length > 1 && isObject(args[args.length - 1]) && !isFunction(args[args.length - 1]) && !isDefined(args[args.length - 1].key)) ? args.pop() : undefined;
		const items = args.flat(Infinity);

		if (isEmpty(items)) return this;

		Tempo.#lifecycle.extendDepth++;													// increment the re-entrant nesting counter
		try {
			items.forEach(item => {
				const arg = item as any;
				if (isFunction(arg)) {															// Standard Plugin registration
					const rt = getRuntime();
					if (rt.installed.has(arg)) return;
					rt.installed.add(arg);														// mark as installed (BEFORE side-effects)

					registerPlugin(arg);
					try {
						(arg as any)(this, options, (val: any) => new this(val));
					} catch (e: any) {
						const msg = (e?.message ?? '').toLowerCase();
						if (msg.includes('constructor') || msg.includes('class') || (e instanceof TypeError) || isClass(arg)) {
							Tempo.#dbg.warn((this as any)[$Internal]().config, `Misidentified class in plugin registration: ${(arg as any).name}`, e.stack ?? e);
						} else {
							throw e;
						}
					}
				}
				else if (isObject(item) && isString((item as any).name) && isFunction((item as any).install)) {
					// Plugin object form { name, install }
					const name = (item as any).name;
					const rt = getRuntime();
					if (rt.installed.has(name)) {
						Tempo.#dbg.debug((this as any)[$Internal]().config, `Plugin already installed by name: ${name}`);
						return;
					}
					rt.installed.add(name);

					registerPlugin(item);
					(item as Plugin).install.call(this as any, this);
				}
				else if (isObject(item)) {
					// 1. handle TermPlugin
					if (isString((item as any).key) && isFunction((item as any).define)) {
						const config = item as TermPlugin;
						if (Tempo.#termMap.has(config.key)) return;

						Tempo.#termMap.set(config.key, config);
						if (config.scope) Tempo.#termMap.set(config.scope, config);

						registerTerm(config);

						// 3. sync with parser registries
						if (config.scope && config.ranges) {
							const target = config.scope === 'period' ? (this as any)[sym.$Internal]().parse.period : (config.scope === 'event' ? (this as any)[sym.$Internal]().parse.event : undefined);
							if (target) {
								config.ranges.forEach(r => {
									if (r.key && !target[r.key]) {
										const val = isDefined(r.hour) ? `${r.hour}:${pad(r.minute ?? 0)}` : (r.month ? `${pad(r.day ?? 1)} ${Tempo.MONTH.keys()[r.month - 1]}` : undefined);
										if (val) target[r.key] = val;
									}
								});
								if (config.scope === 'period') (this as any)[$setPeriods]((this as any)[sym.$Internal]());
								if (config.scope === 'event') (this as any)[$setEvents]((this as any)[sym.$Internal]());
							}
						}
					}
					// 2. handle Discovery object (container)
					else {
						const discovery = item as any
						if (discovery.term) {
							discovery.terms = [...asArray(discovery.terms || []), ...asArray(discovery.term)];
							Tempo.#dbg.warn((this as any)[$Internal]().config, 'Legacy "term" key in Discovery is deprecated. Please use "terms" instead.');
						}
						if (discovery.plugin) {
							discovery.plugins = [...asArray(discovery.plugins || []), ...asArray(discovery.plugin)];
						}
						if (discovery.options) (this as any)[$setConfig]((this as any)[$Internal](), discovery.options)
						if (discovery.plugins) this.extend(discovery.plugins, discovery.options)
						if (discovery.terms) this.extend(discovery.terms)

						// handle other discovery keys directly
						if (discovery.numbers) registryUpdate('NUMBER', discovery.numbers)
						if (discovery.timeZones) {
							const tzs = Object.fromEntries(ownEntries(discovery.timeZones).map(([k, v]) => [k.toString().toLowerCase(), v]));
							registryUpdate('TIMEZONE', tzs)
						}
						if (discovery.formats) {
							(this as any)[$Internal]().config.formats = (this as any)[$Internal]().config.formats.extend(discovery.formats) as t.FormatRegistry;
							registryUpdate('FORMAT', discovery.formats)
						}

						// only trigger init if we're assigning a new discovery object to a symbol
						if (ownKeys(item).some(key => DISCOVERY.has(key as any))) {
							const discovery = (isSymbol(options) ? options : (options as any)?.discovery) ?? sym.$Tempo;
							const discoverySymbol = isString(discovery) ? Symbol.for(discovery) : (isSymbol(discovery) && !Symbol.keyFor(discovery) ? Symbol.for('TempoSandbox') : discovery);

							if ((globalThis as Record<symbol, any>)[discoverySymbol as symbol] !== item) {
								(globalThis as Record<symbol, any>)[discoverySymbol as symbol] = item;
								(this as any)[$setConfig]((this as any)[$Internal](), { discovery: discoverySymbol })
							}
						}
					}
				}
			})
		} finally {
			Tempo.#lifecycle.extendDepth--;												// decrement the re-entrant nesting counter
		}

		if (Tempo.#lifecycle.extendDepth === 0) {
			(this as any)[$buildGuard]();
			setPatterns((this as any)[$Internal]());							// rebuild the global patterns
		}

		return this;
	}

	/**
	 * 🏭 Sandbox Factory Mode
	 * Create a fresh, isolated Tempo subclass with its own configuration and registries.
	 * Returns a new class that inherits from the caller, but maintains independent state.
	 */
	static create(options: t.Options = {}): typeof Tempo {
		const SandboxTempo = class extends (this as any) {
			static [Symbol.toStringTag] = 'TempoSandbox';
		}

		const discovery = options.discovery;
		const normalizedDiscovery = (isObject(discovery) && !isSymbol(discovery)) || isUndefined(discovery) || (isSymbol(discovery) && !Symbol.keyFor(discovery))
			? Symbol.for('TempoSandbox')
			: (isString(discovery) ? Symbol.for(discovery) : discovery) as string | symbol;

		let data: any = { options: { ...options, discovery: normalizedDiscovery }, scope: 'sandbox' };

		if (isObject(options.discovery) && !isSymbol(options.discovery)) {
			data = { ...data, ...options.discovery as any };
		}

		(globalThis as any)[normalizedDiscovery as any] = data;

		const state = init(options, false, (this as any)[$Internal]());
		state.config.discovery = normalizedDiscovery as any;
		ClassStates.set(SandboxTempo as any, state);
		setPatterns(state); // compile regex patterns for the isolated sandbox state

		// Apply configuration to the sandbox
		(SandboxTempo as any)[$setConfig](state,
			{
				scope: 'sandbox',
				discovery: normalizedDiscovery as any,
				catch: options.catch ?? false
			},
			{ ...options, discovery: normalizedDiscovery }
		);

		// If the sandbox was provided with monthDay discovery, resolve and apply it to the isolated state
		if (isObject(options.discovery) && options.discovery.monthDay) {
			const discoveryMD = resolveMonthDay(options.discovery.monthDay, Tempo.MONTH_DAY);
			state.parse.monthDay = { ...state.parse.monthDay, ...discoveryMD };
		}

		Object.freeze(SandboxTempo);
		return SandboxTempo as unknown as typeof Tempo;
	}

	/** Reset Tempo to its default, built-in registration state */
	static init(options: t.Options = {}): typeof Tempo {

		if (Tempo.#lifecycle.initialising) return this;
		Tempo.#lifecycle.initialising = true;

		try {
			const rt = getRuntime();
			rt.state = undefined;																	// force fresh state
			const state = init();
			if ((this as any)[sym.$IsBase]) {
				Tempo.#global = state;
			} else {
				ClassStates.set(this, state);
			}

			// 1. Augment the parsing state (non-destructively)
			const parse = state.parse;
			parse.pattern ??= new Map<symbol, RegExp>();
			parse.monthDay = resolveMonthDay(Default.monthDay, Tempo.MONTH_DAY);
			parse.layoutOrder = asArray(Default.layoutOrder as t.Options['layoutOrder']) as string[];
			parse.parsePrefilter = Boolean(Default.parsePrefilter);
			parse.pivot ??= Default.pivot as any;
			parse.mode ??= Default.mode as any;
			parse.lazy = false;

			// 2. Establish context and keys
			const sys = getDateTimeFormat();
			const timeZone = options.timeZone ?? sys.timeZone;
			const calendar = options.calendar ?? sys.calendar;
			const config = state.config;
			let discovery = options.discovery ?? Symbol.keyFor($Tempo) as string;
			const storeKey = options.store || config.store || Symbol.keyFor($Tempo) as string;

			// Normalize discovery to a symbol if it's an object to prevent leakage into config state
			if (isObject(discovery) && !isSymbol(discovery)) {
				const data = discovery;
				discovery = Symbol.for(`tempo.discovery.${Tempo.#usrCount++}`);
				(globalThis as any)[discovery] = data;
			}
			const normalizedDiscovery = isString(discovery) ? Symbol.for(discovery) : discovery;
			const userDiscovery = (globalThis as any)[normalizedDiscovery] as Internal.Discovery;

			// Resolve locale if missing or invalid
			const currentLocale = config.locale;
			const locale = (!currentLocale || currentLocale === 'en-US') ? Tempo.#locale(currentLocale) : currentLocale;

			if (!hasOwn(config, 'get')) {
				Object.defineProperty(config, 'get', {
					value: function (key: string) { return this[key] },
					enumerable: false, writable: true, configurable: true
				});
			}

			Tempo.#usrCount = 0;																	// reset user-key counter
			for (const key of Object.keys(Token))									// purge user-allocated Tokens
				if (key.startsWith('usr.'))													// only remove 'usr.' prefixed keys
					delete Token[key];

			Tempo.#termMap.clear();																// clear term lookup map
			registryReset();																			// purge formats and numbers

			// 3. Apply configuration via unified setters (non-destructive merge)
			(this as any)[$setConfig](state,
				{
					calendar,
					timeZone,
					locale,
					discovery: normalizedDiscovery,
					formats: config.formats ?? enumify(STATE.FORMAT, false),
					scope: 'global',
					catch: options.catch ?? config.catch ?? false
				},
				{ store: storeKey, discovery: normalizedDiscovery, scope: 'global' },
				this.readStore(storeKey),													// allow for storage-values to overwrite
				(this as any)[$setDiscovery](state, rt.pluginsDb as any),		// persistent library extensions
				(this as any)[$setDiscovery](state, userDiscovery),	// user Discovery (Configuration bootstrapping)
				options,																						// explicit options from the call
			)

			if (options.plugins) this.extend(options.plugins);		// ensure init-plugins are processed before 'ready'

			if (Context.type === CONTEXT.Browser || options.debug === true)
				Tempo.#dbg.info(this.config, 'Tempo:', state.config);

			Tempo.#lifecycle.ready = true;
			setPatterns(state);										// rebuild the global patterns (Master Guard etc)

		} finally {
			Tempo.#lifecycle.initialising = false;
			Tempo.#lifecycle.bootstrap = false;
		}

		return this
	}

	/** explicitly enable/disable "catch" mode for internal errors */
	static setCatchMode(catchMode: boolean): typeof Tempo {
		(this as any)[$setConfig]((this as any)[$Internal](), { catch: catchMode });
		return this;
	}

	/** @internal unload a module by name (experimental internal use only) */
	static unloadModule(name: string): typeof Tempo {
		const rt = getRuntime();
		delete rt.modules[name];
		rt.installed.delete(name);
		const baseName = name.endsWith('Module') ? name.slice(0, -6) : name;
		rt.installed.delete(baseName);
		return this;
	}

	/** @internal check if a module is loaded */
	static hasModule(name: string): boolean {
		const rt = getRuntime();
		const mod = name === 'term' ? 'TermsModule' : name;
		return isDefined(rt.modules[mod]) || rt.installed.has(mod) || rt.pluginsDb.plugins.some(p => p.name === mod);
	}

	/** @internal Reads options from persistent storage (e.g., localStorage). */
	static readStore(key = (this as any)[$Internal]().config.store) {
		return getStorage<t.Options>(key, {});
	}

	/** @internal Writes configuration into persistent storage. */
	static writeStore(config?: t.Options, key = (this as any)[$Internal]().config.store) {
		return setStorage(key, config);
	}

	/** @internal lookup or registers a new `Symbol` for a given key. */
	static getSymbol(key?: string | symbol) {
		if (isUndefined(key)) {
			const usr = `usr.${++Tempo.#usrCount}`;							// allocate a prefixed 'user' key
			return Token[usr] = Symbol(usr);											// add to Symbol register
		}

		if (isSymbol(key)) return key;

		if (isString(key) && key.includes('.')) {
			const description = key.split('.').pop()!;						// use last segment as description
			return Token[key as keyof typeof Token] ??= Symbol(description);
		}

		return Token[key as keyof typeof Token] ?? Symbol.for(`$Tempo.${key}`);
	}

	/** @internal translates {layout} into an anchored, case-insensitive RegExp. */
	static regexp(layout: string | RegExp, snippet?: Snippet) {
		return compileRegExp(layout, (this as any)[$Internal](), snippet as any);
	}

	/** Compares two `Tempo` instances or date-time values. */
	static compare(tempo1?: t.DateTime | t.Options, tempo2?: t.DateTime | t.Options) {
		const one = new Tempo(tempo1 as t.DateTime), two = new Tempo(tempo2 as t.DateTime);

		return Number((one.nano > two.nano) || -(one.nano < two.nano)) + 0;
	}

	/** global Tempo configuration */
	static get config() {
		const state = (this as any)[$Internal]();
		const out = Object.create(Default);
		const descriptors = omit(Object.getOwnPropertyDescriptors(state.config), 'value', 'anchor');

		Object.defineProperties(out, descriptors);
		Object.defineProperty(out, 'toJSON',										// bare-bones: only show global overrides
			{
				value: () => Object.fromEntries(Object.entries(out)),															// proxify sees own toJSON, skips allObject
				enumerable: false, configurable: true
			});
		Object.defineProperty(out, sym.$Inspect,
			{
				value: () => Object.fromEntries(Object.entries(out)),
				enumerable: false, configurable: true
			});

		return proxify(out);
	}


	/** global discovery configuration */
	static get discovery() {
		const discovery = this.config.discovery;
		const sym = isString(discovery) ? Symbol.for(discovery) : discovery;
		return Tempo.#getConfig(sym as symbol);
	}

	static get options() {
		const keyFor = this.config.store ?? Symbol.keyFor($Tempo) as string;
		const storage = proxify(Object.assign({ key: keyFor, scope: 'storage' }, omit(Tempo.readStore(keyFor), 'value')));
		return Object.assign({}, this.default, storage, this.discovery, this.config);
	}

	/** Creates a new `Tempo` instance. */
	static from(options?: t.Options): Tempo;
	static from(tempo: t.DateTime | undefined, options?: t.Options): Tempo;
	static from(tempo?: t.DateTime | t.Options, options?: t.Options) { return new this(tempo as NonNullable<t.DateTime>, options); }

	static now() { return instant().epochNanoseconds; }
	/** get the current system Instant */
	static get instant() { return Temporal.Instant.fromEpochNanoseconds(this.now()) }

	/** static Tempo.terms (registry) */
	static get terms(): Secure<Omit<TermPlugin, 'define' | 'resolve'>[]> & Record<string, Omit<TermPlugin, 'define' | 'resolve'>> {
		const list = Tempo.#terms.map(({ define, resolve, ...rest }) => rest);
		// `delegate` returns an array-like proxy that also supports string lookups; use
		// an `unknown` bridge to assert the combined intersection type so the compiler
		// treats `Tempo.terms` as array-like and indexable by key.
		return delegate(list, (key) => {
			if (isString(key) && !['length', 'map', 'find', 'forEach', 'includes'].includes(key)) {
				return list.find(t => t.key === key || t.scope === key);
			}
			return undefined;
		}) as unknown as Secure<Omit<TermPlugin, 'define' | 'resolve'>[]> & Record<string, Omit<TermPlugin, 'define' | 'resolve'>>;
	}

	/** static Tempo.formats (registry) */
	static get formats() {
		return Tempo.config.formats;
	}

	/** static Tempo properties getter */
	static get properties(): Secure<string[]> {
		return secure(getAccessors(Tempo)
			.filter(acc => getType(acc) !== 'Symbol') as string[]);	// omit any Symbol properties
	}

	/** Tempo initial default settings */
	static get default() {
		return Object.freeze({ ...Default, scope: 'default', timeZone: Default.timeZone || enums.TIMEZONE.utc });
	}

	/** 
	 * configuration governing the static 'rules' used when parsing t.DateTime argument
	 */
	static get parse() {
		const parse = (this as any)[$Internal]().parse;
		return secure({
			...omit(parse, 'token'),															// spread primitives like {pivot}
			snippet: { ...parse.snippet },												// spread nested objects
			layout: { ...parse.layout },
			event: { ...parse.event },
			period: { ...parse.period },
			ignore: { ...parse.ignore },
			monthDay: { ...parse.monthDay },
			layoutOrder: [...parse.layoutOrder],
			parsePrefilter: parse.parsePrefilter,
			mode: parse.mode
		});
	}

	/** iterate over Tempo properties */
	static [Symbol.iterator]() {
		return Tempo.properties[Symbol.iterator]();							// static Iterator over array of 'getters'
	}

	/** release global config and reset library to defaults */
	static [Symbol.dispose]() { Tempo.init() }

	/** static Tempo.ignores (registry) */
	static get ignores(): Secure<Ignore> {
		return secure(ownKeys((this as any)[$Internal]().parse.ignore, true) as string[]);
	}

	/** allow instanceof to work across module boundaries via the local brand symbol */
	static [$Identity] = true;
	static [Symbol.hasInstance](instance: any) {
		return Boolean(instance?.[$Identity])
	}

	/** check if a supplied variable is a valid Tempo instance */
	static isTempo(instance?: any): instance is Tempo {
		return instance instanceof Tempo;
	}

	static {																									// Static initialization block to sequence the bootstrap phase
		// Define the reactive register hook
		getRuntime().setHook($Register, (plugin: Plugin | Plugin[]) => {
			if (!Tempo.isExtending) Tempo.extend(plugin)
		});

		onRegistryReset(() => {
			(Tempo as any)[$buildGuard]();
		});

		Tempo.init();																						// synchronously initialize the library
	}

	/** constructor tempo */																	#tempo?: t.DateTime;
	/** constructor options */																#options = {} as t.Options;
	/** instantiation Temporal Instant */											#now: Temporal.Instant;
	/** underlying Temporal ZonedDateTime */									#zdt!: Temporal.ZonedDateTime;
	/** indicator that the instance failed to parse */				#errored = false;
	/** temporary anchor used during parsing */								#anchor: Temporal.ZonedDateTime | undefined;
	/** prebuilt formats, for convenience */									#fmt!: any;
	/** mapping of terms to their resolved values */					#term!: any;
	/** a collection of parse rule-matches */									#matches: Internal.MatchResult[] | undefined;
	/** current parsing depth to manage state isolation */		#parseDepth = 0;
	/** current mutation depth to manage infinite recursion */#mutateDepth = 0;
	/** instance values to complement static values */				#local = {
		/** instance configuration */															config: { [$Logify]: true } as unknown as Internal.Config,
		/** instance parse rules (only populated if provided) */	parse: { result: [] as Internal.MatchResult[] } as Internal.Parse
	} as Internal.State;

	/** @internal internal key for signaling pre-errored state in constructor */
	static [$errored] = $errored;

	/** @internal */	static [TermError](config: Internal.Config, term: string): void {
		const hint = Tempo.#terms.length === 0 ? ". (No term plugins are registered—did you forget to call Tempo.extend(TermsModule)?)" : "";
		const msg = `Unknown Term identifier: ${term}${hint}`;
		Tempo.#dbg.error(config, msg);
		if (config.catch !== true) throw new Error(msg);
	}

	/** @internal */	static get [$dbg](): Logify { return Tempo.#dbg }
	/** @internal */	static get [$guard]() { return Tempo.#guard }

	/** 
	 * @internal Internal access to instance private state.
	 * This surface is not part of the public contract and is subject to change.
	 */
	[$Internal]() {
		const self: Tempo = unwrap(this);
		return {
			get zdt() { return self.#zdt },
			set zdt(val: any) { self.#zdt = val },
			get errored() { return self.#errored },
			set errored(val: any) { self.#errored = val },
			get parseDepth() { return self.#parseDepth },
			set parseDepth(val: any) { self.#parseDepth = val },
			get mutateDepth() { return self.#mutateDepth },
			set mutateDepth(val: any) { self.#mutateDepth = val },
			get matches() { return self.#matches },
			set matches(val: any) { self.#matches = val },
			get anchor() { return self.#anchor },
			set anchor(val: any) { self.#anchor = val },
			get options() { return self.#options },
			get tempo() { return self.#tempo },
			get now() { return self.#now },
			config: self.#local.config,
			parse: self.#local.parse,
			OPTION: enums.OPTION,
			ZONED_DATE_TIME: enums.ZONED_DATE_TIME
		}
	}

	/** allow for auto-convert of Tempo to BigInt, Number or String */
	[Symbol.toPrimitive](hint?: 'string' | 'number' | 'default') {
		switch (hint) {
			case 'string': return this.toString();								// ISO 8601 string
			case 'number': return this.epoch.ms;									// Unix epoch (milliseconds)
			default: return this.nano;														// Unix epoch (nanoseconds)
		}
	}

	/** iterate over instance formats */
	[Symbol.iterator]() {
		return ownEntries(this.#fmt, true)[Symbol.iterator]();	// instance Iterator over tuple of FormatType[]
	}

	get [Symbol.toStringTag]() {															// default string description
		return 'Tempo';																					// hard-coded to avoid minification mangling
	}


	/**
	 * Instantiates a new `Tempo` object with configuration only.
	 * 
	 * @param options - Configuration options for this specific instance.
	 */
	constructor(options?: t.Options);
	/**
	 * Instantiates a new `Tempo` object with a value.
	 * 
	 * @param tempo - The date-time value to parse.
	 * @param options - Configuration options for this specific instance.
	 */
	constructor(tempo: t.DateTime, options?: t.Options);
	constructor(tempo?: t.DateTime | t.Options, options: t.Options = {}) {
		this.#now = instant();																	// stash current Instant
		[this.#tempo, this.#options] = this.#swap(tempo, options);// swap arguments around

		if (isZonedDateTime(this.#tempo)) this.#zdt = this.#tempo;
		this.#setLocal(this.#options);													// parse local options
		if (!this.#zdt && isObject(this.#tempo) && isDurationLike(this.#tempo)) {
			// relative shorthand for "now plus duration"
			this.#zdt = this.#now.toZonedDateTimeISO(this.#local.config.timeZone).add(this.#tempo as Temporal.DurationLike);
		}

		const { mode } = this.#local.parse;
		const input = String(this.#tempo ?? '');

		// 🏛️ Initialization Strategy ('auto' | 'strict' | 'defer')
		if (mode === Tempo.MODE.Defer) this.#local.parse.lazy = true;
		else if (mode === Tempo.MODE.Strict) this.#local.parse.lazy = false;
		else if (isString(this.#tempo) && !isEmpty(input) && Tempo.#guard.test(trimAll(input))) {
			this.#local.parse.lazy = true;												// auto-switch to lazy-mode for valid strings
		}

		this.#fmt = this.#setDelegator('fmt');									// initialize the format-delegator
		this.#term = this.#setDelegator('term');								// initialize the term-delegator
		this.#anchor = this.#options.anchor;

		// 🧬 Unified State Hand-off (from clone / mutate)
		const handoff = (this.#options as any)[$Internal];
		if (isObject(handoff)) {
			this.#errored = handoff.errored ?? false;
			this.#mutateDepth = handoff.mutateDepth ?? 0;
			this.#parseDepth = 0;
			this.#matches = handoff.matches;
		} else if ((this.#options as any)[$errored]) {
			this.#errored = true;
		}

		if (!this.#local.parse.lazy) this.#resolve();						// attempt to interpret immediately (if not lazy)
	}

	/** explicitly enable/disable "catch" mode for this instance */
	setCatchMode(catchMode: boolean): this {
		setProperty(this.#local.config, 'catch', catchMode);
		return this;
	}

	/** @internal unload a module by name (experimental internal use only) */
	unloadModule(name: string): this {
		(this.constructor as typeof Tempo).unloadModule(name);
		return this;
	}

	/** @internal check if a module is loaded */
	hasModule(name: string): boolean {
		return (this.constructor as typeof Tempo).hasModule(name);
	}

	/** Resolve the instance to a Temporal.ZonedDateTime (with optional callback) */
	#resolve<T>(cb?: (zdt: Temporal.ZonedDateTime) => T): T | Temporal.ZonedDateTime {
		if (!this.#zdt) {
			try {
				const skip = [this.#local.parse.format, this.#local.parse.term, this.#local.parse.result]
					.filter(isDefined);
				this.#zdt = this.#parse(this.#tempo as t.DateTime, this.#anchor);
				if (isUndefined(this.#zdt)) {
					this.#errored = true;
					const msg = `Tempo parse returned undefined for: ${String(this.#tempo)}`;
					if (this.#local.config.catch === true) {
						Tempo.#dbg.error(this.#local.config, msg);
						this.#zdt = this.#now.toZonedDateTimeISO('UTC');
					} else {
						Tempo.#dbg.error(this.#local.config, msg);
						throw new Error(msg);
					}
				}
				secure(this.#local.config);
				secure(this.#local.parse, new WeakSet(skip));
			} catch (err) {
				this.#errored = true;																// mark as errored
				const msg = `Cannot create Tempo: ${(err as Error).message}\n${(err as Error).stack}`;
				if (this.#local.config.catch === true) {
					Tempo.#dbg.error(this.#local.config, msg);				// log as error if in catch-mode
					this.#zdt = this.#now.toZonedDateTimeISO('UTC');
				} else {
					Tempo.#dbg.error(this.#local.config, err, msg);		// log as error then re-throw
					throw err;
				}
			}
		}

		const zdt = isZonedDateTime(this.#zdt) ? this.#zdt : this.#now.toZonedDateTimeISO('UTC');
		return cb?.(zdt) ?? zdt;
	}

	#setLazy(target: any, name: PropertyKey | undefined, define: (keyOnly: boolean) => any, isKeyOnly = false) {
		if (isDefined(name) && isDefined(define)) {
			const desc = Object.getOwnPropertyDescriptor(target, name);
			if (desc) return ('value' in desc) ? () => desc.value : desc.get;
			let guard = false;
			let memo: any;
			let set = false;

			const get = () => {
				if (guard) return undefined;												// recursion guard
				guard = true;
				try {
					if (!set) {
						try {
							memo = define.call(this, isKeyOnly);				// evaluate the property
						} catch (e: any) {
							const msg = (e?.message ?? '').toLowerCase();
							if (msg.includes('constructor') || msg.includes('class') || (e instanceof TypeError) || isClass(define)) {
								Tempo.#dbg.warn(this.#local.config, `Misidentified class in delegator evaluate: ${String(define)}`, e.stack ?? e);
								memo = define;
							} else {
								throw e;
							}
						}
						set = true;
						// Promote to own property on target for subsequent calls (memoization) if extensible
						if (Reflect.isExtensible(target))
							Object.defineProperty(target, name, { value: memo, enumerable: true, configurable: true, writable: false });
					}
					return memo;
				}
				finally { guard = false; }
			}

			// shadowing chain (only if extensible)
			if (Reflect.isExtensible(target))
				Object.defineProperty(target, name, { get, enumerable: true, configurable: true });
			// if (Reflect.isExtensible(target)) {
			// 	const shadow = Object.create(Object.getPrototypeOf(target));
			// 	Object.defineProperty(shadow, name, { get, enumerable: true, configurable: true });
			// 	Object.setPrototypeOf(target, shadow);
			// }

			return get;																						// return getter closure
		}
		return undefined;
	}

	/** create a Proxy-based delegator that registers lazy properties on-demand */
	#setDelegator(host: 'term' | 'fmt') {
		const target = Object.create(null);
		const proxy = delegate(target, (key) => {
			if (key === $Discover) return this.#discover(host, target);
			if (!isString(key)) return;

			// discovery phase
			if (host === 'fmt') {
				if (!ensureModule(this, 'FormatModule')) return undefined;
				if (isDefined(this.#local.config.formats[key]))
					return this.#setLazy(target, key, () => this.format(key as t.Format))?.();
			} else {
				if (!ensureModule(this, 'TermsModule')) return undefined;
				const term = Tempo.#termMap.get(key);
				if (term) {
					const isKeyOnly = term.key === key;
					const define = (keyOnly: boolean) => {
						try {
							const result = term.define.call(this, keyOnly);
							const res = Array.isArray(result) ? getTermRange(this, result, keyOnly) : result;
							return isObject(res) ? secure(res) : res;
						} catch (err: any) {
							if (err.message.includes('Class constructor')) {
								Tempo.#dbg.warn(this.#local.config, `Misidentified class in term definition: ${key}`, err.stack ?? err);
							} else {
								throw err;
							}
						}
						return undefined;
					};
					return this.#setLazy(target, key, define, isKeyOnly)?.();
				}
			}
		}, true);

		// Eager support during construction
		if (!this.#local.parse.lazy) this.#discover(host, target);

		return proxy;
	}

	#discover(host: 'term' | 'fmt', target: any) {
		if (!Tempo.#lifecycle.ready) return;
		if (host === 'fmt') {
			ownKeys(this.#local.config.formats).forEach(key => {
				if (isString(key)) this.#setLazy(target, key, () => this.format(key as t.Format));
			});
		} else {
			Tempo.#terms.forEach(term => {
				const define = (keyOnly: boolean, anchor?: any) => {
					try {
						const res = term.resolve ? term.resolve.call(this, anchor) : term.define.call(this, keyOnly, anchor);
						const out = (getTermRange(this, (Array.isArray(res) ? (res as any) : [res]), keyOnly, anchor) as any);
						return isObject(out) ? secure(out) : out;
					} catch (err: any) {
						if (err.message.includes('Class constructor')) {
							Tempo.#dbg.warn(this.#local.config, `Misidentified class in term discovery: ${term.key}`, err.stack ?? err);
						} else {
							throw err;
						}
					}
				};
				this.#setLazy(target, term.key, (isKey: boolean) => define(isKey, this.toDateTime()), true);
				if (term.scope) this.#setLazy(target, term.scope, (isKey: boolean) => define(isKey, this.toDateTime()), false);
			});
		}
	}

	/** 4-digit year (e.g., 2024) */													get yy() { return this.toDateTime().year }
	/** 4-digit ISO week-numbering year */										get yw() { return this.toDateTime().yearOfWeek }
	/** Month number: Jan=1, Dec=12 */												get mm() { return this.toDateTime().month as t.mm }
	/** ISO week number of the year */												get ww() { return this.toDateTime().weekOfYear as t.ww }
	/** Day of the month (1-31) */														get dd() { return this.toDateTime().day }
	/** Day of the month (alias for `dd`) */									get day() { return this.toDateTime().day }
	/** Hour of the day (0-23) */															get hh() { return this.toDateTime().hour as t.hh }
	/** Minutes of the hour (0-59) */													get mi() { return this.toDateTime().minute as t.mi }
	/** Seconds of the minute (0-59) */												get ss() { return this.toDateTime().second as t.ss }
	/** Milliseconds of the second (0-999) */									get ms() { return this.toDateTime().millisecond as t.ms }
	/** Microseconds of the millisecond (0-999) */						get us() { return this.toDateTime().microsecond as t.us }
	/** Nanoseconds of the microsecond (0-999) */							get ns() { return this.toDateTime().nanosecond as t.ns }
	/** Fractional seconds (e.g., 0.123456789) */							get ff() { return +(`0.${pad(this.ms, 3)}${pad(this.us, 3)}${pad(this.ns, 3)}`) }
	/** IANA Time Zone ID (e.g., 'Australia/Sydney') */				get tz() { return this.toDateTime().timeZoneId }
	/** Temporal Calendar ID (e.g., 'iso8601' | 'gregory') */	get cal() { return this.toDateTime().calendarId }
	/** Unix timestamp (defaults to milliseconds) */					get ts() { return this.epoch[this.#local.config.timeStamp] }
	/** Short month name (e.g., 'Jan') */											get mmm() { return Tempo.MONTH.keyOf(this.toDateTime().month as t.Month) }
	/** Full month name (e.g., 'January') */									get mon() { return Tempo.MONTHS.keyOf(this.toDateTime().month as t.Month) }
	/** Short weekday name (e.g., 'Mon') */										get www() { return Tempo.WEEKDAY.keyOf(this.toDateTime().dayOfWeek as t.Weekday) }
	/** Full weekday name (e.g., 'Monday') */									get wkd() { return Tempo.WEEKDAYS.keyOf(this.toDateTime().dayOfWeek as t.Weekday) }
	/** ISO weekday number: Mon=1, Sun=7 */										get dow() { return this.toDateTime().dayOfWeek as t.Weekday }
	/** Nanoseconds since Unix epoch (BigInt) */							get nano() { return this.toDateTime().epochNanoseconds }
	/** `true` if the underlying date-time is valid. */				get isValid() { return this.#resolve(zdt => !this.#errored && isZonedDateTime(zdt)); }

	/** list of registered terms and their available range keys */
	get terms(): Record<string, string[]> {
		const res: Record<string, string[]> = {};
		Tempo.terms.forEach(term => {
			const source = (term as any).ranges || (term as any).groups || [];				// check both ranges and groups
			const list = Array.isArray(source) ? source : Object.values(source).flat(Infinity) as any[];
			const ranges = [...new Set(list.map(r => r.key).filter(isString))];				// collect unique range keys
			res[term.key] = ranges;
			if (term.scope) res[term.scope] = ranges;							// add scope alias if defined
		});
		return res;
	}

	/** current range key for every registered term */
	get ranges(): Record<string, string> {
		const res: Record<string, string> = {};
		Tempo.terms.forEach(term => {
			const val = (this as any).term[term.key];							// access the term-delegate (forces evaluation)
			if (isString(val)) {
				res[term.key] = val;
				if (term.scope) res[term.scope] = val;							// alias the string to the scope key
			}
		});
		return res;
	}

	/** current Tempo configuration */
	get config() {
		const global = (this as any)[$Internal]().config;
		const out = markConfig(Object.create(global));
		Object.entries(this.#local.config).forEach(([k, v]) => setProperty(out, k, v));

		if (!Object.hasOwn(out, 'mode')) setProperty(out, 'mode', this.#local.parse.mode);
		if (!Object.hasOwn(out, 'lazy')) setProperty(out, 'lazy', this.#local.parse.lazy);

		Object.defineProperty(out, 'toJSON', {
			value: () => Object.fromEntries(											// bare-bones: only show local overrides
				Object.entries(out)),																// proxify sees own toJSON, skips allObject
			enumerable: false, configurable: true
		});

		return proxify(out) as t.Internal.Config;
	}

	/** Instance-specific parse rules (merged with global) */
	get parse(): Internal.Parse {
		const self: Tempo = unwrap(this);
		self.#resolve();
		// Return a shadowed view so we can safely inject matches without breaking the freeze on the original state
		const out = Object.create(self.#local.parse);
		if (self.#matches !== undefined)
			Object.defineProperty(out, 'result', { value: self.#matches, enumerable: true, configurable: true });

		return out as t.Internal.Parse;
	}

	/** Keyed results for all resolved terms */								get term() { return this.#term }
	/** Formatted results for all pre-defined format codes */ get fmt() { return this.#fmt }
	/** units since epoch */																	get epoch() {
		return secure({
			/** seconds since epoch */														ss: Math.trunc(this.toDateTime().epochMilliseconds / 1_000),
			/** milliseconds since epoch */												ms: this.toDateTime().epochMilliseconds,
			/** microseconds since epoch */												us: Number(this.toDateTime().epochNanoseconds / BigInt(1_000)),
			/** nanoseconds since epoch */												ns: this.toDateTime().epochNanoseconds,
		})
	}

	/**
	 * @Immutable class decorators wrap the class but leave internal lexical bindings pointing to the original, undecorated class.  
	 * To ensure new instances returned by instance methods are properly frozen,  
	 * we must instantiate internally from the decorated wrapper (which is bound to `this.constructor`)  
	 * rather than using `new Tempo(..)`.  
	 */
	/** @internal */																					get #Tempo() { return this.constructor as typeof Tempo; }

	/** apply a custom format. */															format<K extends t.Format>(fmt: K) { return this.#resolve(() => interpret(this, 'FormatModule', () => `{${String(fmt)}}`, false, fmt)); }

	/** time duration until another date-time */							until(arg0?: any, arg1?: any): any { return this.#resolve(() => interpret(this, 'DurationModule', undefined, false, 'until', arg0, arg1) ?? this); }
	/** time elapsed since another date-time */								since(arg0?: any, arg1?: any): any { return this.#resolve(() => interpret(this, 'DurationModule', undefined, false, 'since', arg0, arg1) ?? this); }

	/** returns a new `Tempo` with specific duration added. */add(tempo?: t.MutateAdd, options?: t.Options): Tempo { return this.#resolve(() => interpret(this, 'MutateModule', 'add', false, tempo, options) ?? this); }
	/** returns a new `Tempo` with specific offsets. */				set(tempo?: t.MutateSet, options?: t.Options): Tempo { return this.#resolve(() => interpret(this, 'MutateModule', 'set', false, tempo, options) ?? this); }
	/** returns a clone of the current `Tempo` instance. */		clone() { return new this.#Tempo(this, this.config) }

	/** returns the underlying Temporal.ZonedDateTime */			toDateTime() { return this.#resolve() as Temporal.ZonedDateTime; }
	/** returns a Temporal.PlainDate representation */				toPlainDate() { return this.toDateTime().toPlainDate() }
	/** returns a Temporal.PlainTime representation */				toPlainTime() { return this.toDateTime().toPlainTime() }
	/** returns a Temporal.PlainDateTime representation */		toPlainDateTime() { return this.toDateTime().toPlainDateTime() }
	/** returns the underlying Temporal.Instant */						toInstant() { return this.toDateTime().toInstant() }

	/** the current system time localized to this instance. */toNow() { return instant().toZonedDateTimeISO(this.tz).withCalendar(this.cal) }
	/** the date-time as a standard `Date` object. */					toDate() { return new Date(this.toDateTime().round({ smallestUnit: enums.ELEMENT.ms }).epochMilliseconds) }
	/**ISO8601 string representation of the date-time. */
	toString() {
		return (this.isValid && !this.#errored)
			? this.toPlainDateTime().toString({ calendarName: 'never' })
			: String(this.#tempo ?? '');
	}

	/** Custom JSON serialization for `JSON.stringify`. */
	toJSON() { return { ...this.#local.config, value: this.toString() } }

	/** setup local 'config' and 'parse' rules (prototype-linked to global) */
	#setLocal(options: t.Options = {}) {
		const classState = (this.constructor as any)[$Internal]();
		this.#local.config = markConfig(Object.create(classState.config));
		Object.assign(this.#local.config, { scope: 'local' });

		this.#local.parse = markConfig(Object.create(classState.parse));
		setProperty(this.#local.parse, 'result', [...(options.result ?? [])]);

		(this.constructor as any)[$setConfig](this.#local, options);									// set #local config
	}

	/** parse DateTime input */
	#parse(tempo: t.DateTime, dateTime?: Temporal.ZonedDateTime, term?: string): Temporal.ZonedDateTime {
		if (!ensureModule(this, 'ParseModule', true)) return this.#fallbackParse(tempo, dateTime, term);

		const res = interpret(this, 'ParseModule', 'parse', false, tempo, dateTime, term);
		if (isUndefined(res)) {
			const msg = `ParseModule error. Could not parse ${String(tempo)}`;
			Tempo.#dbg.error(this.#local.config, msg);
			if (this.#local.config.catch !== true) throw new Error(msg);
			return undefined as any;
		}
		return res;
	}

	#fallbackParse(tempo: t.DateTime, dateTime?: Temporal.ZonedDateTime, term?: string): Temporal.ZonedDateTime {
		if (isZonedDateTime(tempo)) return tempo;
		if (isTempo(tempo)) return tempo.toDateTime();
		if (isString(tempo)) {
			try {
				const tz = (this.#local.config.timeZone as string) ?? 'UTC';
				if ((tempo as string).includes('[')) return Temporal.ZonedDateTime.from(tempo as string);
				return Temporal.PlainDateTime.from(tempo as string).toZonedDateTime(tz);
			} catch { /* ignore and throw below */ }
		}
		if (isUndefined(tempo) || isEmpty(tempo)) return dateTime ?? instant().toZonedDateTimeISO(this.#local.config.timeZone);

		const msg = 'Tempo ParseModule not loaded. Did you forget to Tempo.extend(ParseModule)?';
		Tempo.#dbg.error(this.#local.config, msg);
		if (this.#local.config.catch !== true) throw new Error(msg);
		return undefined as any;
	}

	/** resolve constructor / method arguments */
	#swap(tempo?: t.DateTime | t.Options, options: t.Options = {}): [t.DateTime | undefined, t.Options] {
		if (isTempo(tempo))
			// preserve parse result history when creating new instance from an existing one
			return [tempo, Object.assign({ result: [...tempo.parse.result] }, options)];

		return this.#isOptions(tempo)
			? [tempo.value, Object.assign({}, tempo)]
			: [tempo, options];
	}

	/** check if we've been given a Tempo Options object */
	#isOptions(arg: any): arg is t.Options {
		if (!isObject(arg) || arg.constructor !== Object) return false;

		const keys = ownKeys(arg);															// if it contains any 'mutation' keys, then it's not (just) an options object
		if (keys.some(key => enums.MUTATION.has(key)))
			return false;

		return keys
			.some(key => enums.OPTION.has(key));
	}

	/** check if we've been given a ZonedDateTimeLike object */
	#isZonedDateTimeLike(tempo: t.DateTime | t.Options | undefined): tempo is Temporal.ZonedDateTimeLike & { value?: any } {
		if (!isObject(tempo) || isEmpty(tempo) || isTempo(tempo)) return false;

		// if it contains any 'options' keys (other than value), it's likely an Options object
		const keys = ownKeys(tempo);
		if (keys.some(key => enums.OPTION.has(key) && key !== 'value')) return false;

		return isZonedDateTimeLike(tempo);
	}

	#result(...rest: Partial<Internal.MatchResult>[]) {
		const match = Object.assign({}, ...rest) as Internal.MatchResult;	// collect all object arguments

		if (isDefined(this.#anchor) && !match.isAnchored)
			match.isAnchored = true;

		const res = (this.#matches ?? this.#local.parse.result) as any[];
		if (isDefined(res) && !Object.isFrozen(res)) {
			if (!res.includes(match)) res.push(match);
		}
	}
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// shortcut functions to common Tempo properties / methods
/** current timestamp (ts) */	export const getStamp = ((tempo: t.DateTime, options: t.Options) => new Tempo(tempo, options).ts) as t.Params<number | bigint>;
/** create new Tempo */				export const getTempo = ((tempo: t.DateTime, options: t.Options) => new Tempo(tempo, options)) as t.Params<Tempo>;
/** format a Tempo */					export const fmtTempo = ((fmt: string, tempo: t.DateTime, options: t.Options) => new Tempo(tempo, options).format(fmt as any)) as Internal.Fmt;

export namespace Tempo {
	export type DateTime = t.DateTime;
	export type Pattern = t.Pattern;
	export type Logic = t.Logic;
	export type Pair = t.Pair;
	export type Groups = t.Groups;

	export type PatternOptionArray<T> = t.Internal.PatternOptionArray<T>;
	export type PatternOption<T> = t.Internal.PatternOption<T>;

	export interface BaseOptions extends t.Internal.BaseOptions { }
	export type Options = t.Options;

	/** Configuration to use for #until() and #since() argument */
	export type Unit = t.Unit;
	export type Until = t.Until;
	export type Mutate = t.Mutate;
	export type Set = t.MutateSet;
	export type Add = t.MutateAdd;

	export type OwnFormat = t.OwnFormat;
	export type Formats = t.Formats;
	export type Format = t.Format;
	export type FormatRegistry = t.FormatRegistry;
	export type FormatType<K extends PropertyKey> = t.FormatType<K>;

	export type Modifier = t.Modifier;
	export type Relative = t.Relative;

	export type mm = t.mm;
	export type hh = t.hh;
	export type mi = t.mi;
	export type ss = t.ss;
	export type ms = t.ms;
	export type us = t.us;
	export type ns = t.ns;
	export type ww = t.ww;

	export type Duration = t.Duration;

	export type WEEKDAY = t.WEEKDAY;
	export type WEEKDAYS = t.WEEKDAYS;
	export type MONTH = t.MONTH;
	export type MONTHS = t.MONTHS;
	export type DURATION = t.DURATION;
	export type DURATIONS = t.DURATIONS;
	export type COMPASS = t.COMPASS;
	export type SEASON = t.SEASON;
	export type ELEMENT = t.ELEMENT;

	export type Weekday = t.Weekday;
	export type Month = t.Month;
	export type Element = t.Element;

	export interface Params<T> extends t.Params<T> { }
}

