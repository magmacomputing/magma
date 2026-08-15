/**
 * Tempo type definitions — exported as flat top-level types.
 *
 * Consumers access these via the `Tempo` namespace which is reconstructed
 * by `tempo.index.ts` using `export * as Tempo from '#tempo/tempo.type.js'`.
 *
 * Inside `tempo.class.ts` these are accessed via `import * as t`.
 */
import type { Pledge } from '#library/pledge.class.js';
import type { DebugLevel } from '#library/logger.class.js';
import type { ScopedSet } from '#library/scopedset.class.js';
import type { IntRange, NonOptional, Property, Plural, Prettify, TemporalObject, TypeValue, RegistryOption, Branded, LooseUnion } from '#library/type.library.js';

import { sym, type TempoBrand } from '#tempo/support/support.symbol.js';
import * as enums from '#tempo/support/support.enum.js';
import { BoundedCache } from '#tempo/support/support.cache.js';
import { SLICK_KEYS, type Snippet, type Layout, type Event, type Period, type Ignore } from '#tempo/support/support.default.js';
import type { Token } from '#tempo/support/support.symbol.js';

import type { AliasEngine } from './engine/engine.alias.js';
import type { PatternCompiler } from './engine/engine.pattern.js';

import type { TermPlugin } from '#tempo/plugin/term/term.type.js';
import type { TempoPlugin } from '#tempo/plugin/plugin.util.js';
import type { Tempo } from '#tempo/tempo.class.js';

declare global {
	interface globalThis {
		/**
		 * User-facing Global Discovery slot.
		 * Applications place a Discovery object here (keyed by the string returned by
		 * `Symbol.keyFor(sym.$Tempo)`, or by a custom symbol passed to `Tempo.init`).
		 * Internal machinery now lives inside the TempoRuntime — see `tempo.runtime.ts`.
		 */
		[sym.$Tempo]?: Internal.Discovery;
	}
}

/** A string representing a Temporal.ZonedDateTime in ISO 8601 format (e.g. 2026-05-10T10:26:04+10:00[Australia/Sydney]) */
export type ISOString = Branded<string, 'ISO8601'>;

/** the value that Tempo will attempt to interpret as a valid ISO date / time */
export type DateTime = ISOString | string | number | bigint | Date | Tempo | TempoBrand | TemporalObject | Temporal.ZonedDateTimeLike | undefined | null;

export type Pattern = string | RegExp
/**
 * AliasContext: a lightweight, chainable host that mimics a Tempo instance.
 * Used as the 'this' context within Functional Aliases (Events and Periods).
 */
export interface AliasContext {
	/** add a duration or Term to the current state and return a new context */
	add(value: DateTime | string | Record<string, any>, options?: Options): AliasContext;
	/** subtract a duration or Term from the current state and return a new context */
	subtract(value: DateTime | string | Record<string, any>, options?: Options): AliasContext;
	/** @hidden */
	sub(value: DateTime | string | Record<string, any>, options?: Options): AliasContext;
	/** set the current state to a new value (alias, date, or Term) and return a new context */
	set(value: DateTime | string, options?: Options): AliasContext;
	/** reset the context to the current system time ('now') */
	toNow(): AliasContext;
	/** return the current state as a raw Temporal.ZonedDateTime */
	toDateTime(): Temporal.ZonedDateTime;
	/** return the ISO string representation of the current state */
	toString(): ISOString;

	/** Year number */                      readonly yy: number;
	/** Month number (1-12) */              readonly mm: IntRange<1, 12>;
	/** Day of month (1-31) */              readonly dd: IntRange<1, 31>;
	/** Hour (0-23) */                      readonly hh: IntRange<0, 23>;
	/** Minute (0-59) */                    readonly mi: IntRange<0, 59>;
	/** Second (0-59) */                    readonly ss: IntRange<0, 59>;
	/** IANA TimeZone identifier */         readonly tz: string;
	/** Calendar identifier */              readonly cal: string;
	/** Resolved BCP 47 locale */           readonly locale: string | string[];
	/** Resolved hemisphere */              readonly sphere: enums.COMPASS | undefined;
	/** Current configuration state */      readonly config: Internal.Config;
}

/** Function-based alias handler for Events and Periods */
export type AliasFunction = (this: AliasContext) => DateTime | AliasContext;

export type Logic = string | number | AliasFunction;
export type Pair = [string, string] | readonly [string, string]
export type LayoutPair = Pair | string[] | readonly string[]
export type Groups = Record<string, string>

/**
 * Configuration options for Tempo instances and operations.
 */
/**
 * Updated Options type to support new planner: { layoutOrder: string[] } structure.
 * Both top-level and grouped options are supported.
 */
export interface Options extends Partial<Internal.BaseOptions> {
	planner?: PlannerOptions;
	intl?: IntlOptions;
	[key: string]: any;
}

/**
 * # Plugin
 * extend the functionality of the Tempo class.
 * Every attempt to resolve an input to a Tempo should always be checked with .isValid before continuing.
 * Otherwise unpredictable behaviour is likely.
 */

/** Configuration to use for #until() and #since() argument */
export type DateTimeUnit = Temporal.DateUnit | Temporal.TimeUnit
export type Unit = DateTimeUnit | Plural<DateTimeUnit> | Element
export type Units = Plural<DateTimeUnit>;
export type BaseDuration = Record<Units, number>;
/**
 * # FlexibleDuration
 * A distributive mapped type over {@link Units} which requires at least one duration key 
 * from {@link BaseDuration} (the mapped key K) while making all other BaseDuration 
 * properties optional.
 * 
 * @example
 * // Valid: at least one key is present
 * const a: FlexibleDuration = { hours: 1 };
 * const b: FlexibleDuration = { hours: 1, minutes: 30 };
 * 
 * // Invalid: empty object (no mandatory key)
 * const c: FlexibleDuration = {}; 
 */
export type FlexibleDuration = {
	[K in Units]: Pick<BaseDuration, K> & { [P in keyof Omit<BaseDuration, K>]?: number };
}[Units]
export type Until = (Options & { unit?: Unit }) | Unit

export type Mutate = 'start' | 'mid' | 'end'
export type TermOffset = { [K: `#${string}`]: number | string }
export type SetFields = {
	[K in Mutate]?: Unit | `#${string}`;
} & {
	[K in 'date' | 'time' | 'event' | 'period']?: string;
}
export type SlickKey = SLICK_KEYS[number];
export type SlickOffset = { [K in SlickKey]?: string };

export type MutateShorthand = {
	yy?: LooseUnion<number>;
	mm?: LooseUnion<mm>;
	wy?: LooseUnion<wy>;
	ww?: LooseUnion<wy>;
	dd?: LooseUnion<dd>;
	hh?: LooseUnion<hh>;
	mi?: LooseUnion<mi>;
	ss?: LooseUnion<ss>;
	ms?: LooseUnion<ms>;
	us?: LooseUnion<us>;
	ns?: LooseUnion<ns>;
	wkd?: LooseUnion<wkd>;
}

export type MutateSet = SetFields & MutateShorthand & {
	timeZone?: Temporal.TimeZoneLike;
	calendar?: Temporal.CalendarLike;
} & TermOffset | DateTime
export type AddUnits = { [K in Unit]?: number };
export type MutateAdd = AddUnits & { [K in Element]?: number } & TermOffset | DateTime

export type Modifier = '=' | '-' | '+' | '<' | '<=' | '-=' | '>' | '>=' | '+=' | 'this' | 'next' | 'prev' | 'last' | 'first' | undefined
export type Relative = 'ago' | 'hence' | 'prior' | 'from now'

export type mm = IntRange<1, 12>
export type dd = IntRange<1, 31>
export type hh = IntRange<0, 23>
export type mi = IntRange<0, 59>
export type ss = IntRange<0, 59>
export type ms = IntRange<0, 999>
export type us = IntRange<0, 999>
export type ns = IntRange<0, 999>
/** ISO 8601 week number (1-53) */
export type wy = IntRange<1, 53>
/** alias for `wy` */
export type ww = IntRange<1, 53>
export type wkd = IntRange<1, 7>

export type Duration = NonOptional<Temporal.DurationLikeObject> & Record<"iso", string> & Record<"sign", number> & Record<"blank", boolean> & Record<"unit", string | undefined> & {
	balance(opts?: { nominal?: boolean; relativeTo?: any; largestUnit?: Unit | string }): Duration;
	format(opts?: Intl.NumberFormatOptions & { locales?: string | string[] }): string;
}

/** mapping of format names to instance-resolutions (string) */
export type Formats = enums.Formats;

/** Union of all known format strings */
export type Format = enums.Format;
/** Enum registry of format strings */
export type FormatRegistry = enums.FormatEnum;

/**
 * Augment this interface in your plugin or app to register additional
 * format tokens for compile-time validation via `ValidateFormat`.
 *
 * @example
 * // In a plugin's .d.ts:
 * declare module '@magmacomputing/tempo' {
 *   interface TempoFormatTokens {
 *     'fiscal.quarter': true;
 *   }
 * }
 */
export interface TempoFormatTokens {
	// ── year / week ───────────────────────────────────
	yyyy: true; yy: true; yw: true;
	// ── week-of-year ─────────────────────────────────
	ww: true; wy: true; yywy: true; yyww: true;
	// ── era / eon ─────────────────────────────────────
	era: true; eon: true;
	// ── month ─────────────────────────────────────────
	mm: true; mon: true; mmm: true;
	// ── day ───────────────────────────────────────────
	dd: true; day: true; dow: true; wkd: true; www: true;
	// ── hour / minute / second ────────────────────────
	hh: true; h24: true; h12: true; mer: true;
	mi: true; ss: true;
	// ── sub-second ────────────────────────────────────
	ms: true; us: true; ns: true; ff: true;
	// ── composite date/time ───────────────────────────
	ymd: true; dmy: true; mdy: true; hms: true;
	// ── legacy composites (deprecated, still supported) ──
	ymd6: true; dmy6: true; mdy6: true;
	// ── timestamp / zone / calendar ───────────────────
	ts: true; nano: true; tz: true; cal: true;
}

/** All statically-known base token names (derived from TempoFormatTokens). */
type _CoreToken = keyof TempoFormatTokens;

/**
 * Accepted token shapes inside a `{…}` brace pair:
 * - a core token alone: `{yyyy}`
 * - a core token with one or more modifiers: `{dd:ord}`, `{tz:zzzzz}`
 * - a term-plugin key (always accepted, cannot be statically known): `{#season.key}`
 */
type _ValidToken = _CoreToken | `${_CoreToken}:${string}` | `#${string}` | `term.${string}`;

/**
 * Compile-time validator for Tempo format strings.
 *
 * - Recursively walks every `{token}` brace-pair in the string.
 * - Accepts any token in `TempoFormatTokens`, modifier suffixes (`{dd:ord}`),
 *   and term-plugin keys (`{#season.key}`).
 * - When `S` is a plain `string` variable (not a literal) validation is skipped
 *   to avoid false positives.
 * - Returns a descriptive error literal when an unknown token is found, which
 *   surfaces as a readable type error in the IDE.
 *
 * @example
 * // Valid — no IDE error
 * tempo.format('{www}, {dd} {mmm} {yyyy}');
 *
 * // Invalid — IDE highlights the bad token
 * tempo.format('{mon} {dy}');
 * //                    ^^ Type '"❌ '{dy}' is not a valid Tempo format token"'
 */
export type ValidateFormat<S extends string> =
	string extends S ? string																	// S widened to string (variable) — skip
	: S extends `${string}\\${string}` ? string								// escaped braces present — skip validation
	: S extends `${string}{${infer T}}${infer Rest}`
	? T extends _ValidToken
	? ValidateFormat<Rest>																		// valid token, recurse into tail
	: `❌ '{${T}}' is not a valid Tempo format token`		 		// bad token — surfaced as IDE error
	: string;																									// no more braces — valid

export type WEEKDAY = enums.WEEKDAY
export type WEEKDAYS = enums.WEEKDAYS
export type MONTH = enums.MONTH
export type MONTHS = enums.MONTHS
export type DURATION = enums.DURATION
export type DURATIONS = enums.DURATIONS
export type COMPASS = enums.COMPASS
export type SEASON = enums.SEASON
export type ELEMENT = enums.ELEMENT
export type TIMEZONE = enums.TIMEZONE
export type MODE = enums.MODE
export type NUMBER = enums.Number

export type Weekday = enums.Weekday
export type Month = enums.Month
export type Element = enums.Element
export type Number = enums.Number
export type Mode = enums.MODE

export interface RelativeTime {
	/** Pre-configured relative time formatter */							format?: Intl.RelativeTimeFormat;
	/** Default style for relative time */										style?: Intl.RelativeTimeFormatStyle;
}

export interface FormatOptions extends Intl.DateTimeFormatOptions {
	timeZone?: string;
	calendar?: string;
	locale?: string | string[];
}

export interface IntlOptions {
	/** relative time formatting configuration */							relativeTimeFormat?: RelativeTime | ((value: number, unit: any) => string);
	/** multi-unit duration formatting configuration */				durationFormat?: any | ((duration: any) => string);
	/** absolute unit duration formatting configuration */		numberFormat?: Intl.NumberFormatOptions | ((value: number, unit: any) => string);
}

export interface PlannerOptions {
	/** preferred parse-order of layouts */										layoutOrder?: (string | symbol)[];
	/** enable parse planner pre-filtering */									preFilter?: boolean;
}

export interface MonthDay {
	/** locale-names that prefer 'mm-dd-yy' date order */			locales?: string[] | readonly string[];
	/** swap parse-order of layouts */												layouts?: LayoutPair[] | readonly LayoutPair[];
	/** timezones to use for MDY fallback (per locale) */			timezones?: Record<string, string[] | readonly string[]>;
	/** indicates if MDY parsing order is currently active */ active?: boolean | undefined;
	/** @internal indicates if the active flag was explicitly set by the user */ isExplicit?: boolean | undefined;
	/** @internal resolved locale and timezone metadata */		resolvedLocales?: { locale: string, timeZones: string[] }[];
}

/** Type for consistency in expected arguments for helper functions */
export interface Params<T> {
	(tempo?: DateTime, options?: Options): T;									// parse DateTime, default to Temporal.Instance.now()
	(options: Options): T;																		// provide just the Options (use {value:'XXX'} for specific DateTime)
}

export namespace Internal {
	export type Registry = Map<symbol, RegExp>
	export type TokenEvaluator = (zdt: Temporal.ZonedDateTime, context: { modifiers: string[], config: Config }) => string | number | bigint;

	/** the Options object found in a config-module, or passed to a call to Tempo.init({}) or 'new Tempo({})' */
	export interface BaseOptions {
		/** localStorage key */																	store: string;
		/** globalThis Discovery Symbol */											discovery: string | symbol | Discovery;
		/** additional console.log for tracking */							debug: DebugLevel;
		/** catch or throw Errors */														catch: boolean;
		/** suppress console output during catch */							silent: boolean;
		/** Temporal timeZone */																timeZone: Temporal.TimeZoneLike;
		/** Temporal calendar */																calendar: Temporal.CalendarLike;
		/** locale (e.g. en-AU) */															locale: string | string[];
		/** pivot year for two-digit years */										pivot: number;
		/** hemisphere for term.qtr or term.szn */							sphere: enums.COMPASS | undefined;
		/** internationalization configuration (relativeTime, etc.) */ intl?: IntlOptions;
		/** parse planner configuration (layoutOrder, etc.) */  planner?: PlannerOptions;
		/** Precision to measure timestamps (ms | us) */				timeStamp?: TimeStamp;
		/** initialization strategy ('auto'|'strict'|'defer') */mode?: enums.MODE;
		/** regional date-parsing configuration */							monthDay: MonthDay | boolean;
		/** custom data augmentation registries */							registry?: {
		formats?: Property<any>;
		locales?: Record<string, Record<string, string | Function>>;
		modifiers?: Record<string, string | string[]>;
		tokens?: Record<string, TokenEvaluator>;
		snippets?: Snippet | RegistryOption<Pattern>;
		layouts?: Layout | RegistryOption<Pattern>;
		events?: Event | RegistryOption<Logic>;
		periods?: Period | RegistryOption<Logic>;
		ignores?: Ignore;
	};
		/** plugins to be automatically extended */							plugins: (TempoPlugin | TermPlugin) | (TempoPlugin | TermPlugin)[];
		/** supplied value to parse */													value: DateTime;
		/** @internal temporary anchor used during parsing */		anchor: any;
		/** @internal accumulated parse results */							result?: Match[] | undefined;
		/** license key for premium features */									license?: string | undefined;
	}

	/** high-precision precision to measure timestamps (ms | us) */
	export type TimeStamp = 'ss' | 'ms' | 'us' | 'ns'

	/** internal metadata for a plugin to track installation */
	export interface PluginContainer extends TempoPlugin {
		installed?: boolean;
	}

	/** the encapsulated state of a Tempo instance */
	export interface State {																	// 'global' and 'local' variables
		/** current defaults for all Tempo instances */					config: Config;
		/** parsing rules */																		parse: Parse;
		/** @internal current valid configuration options */		OPTION: Set<string>;
		/** @internal valid Temporal units for ZonedDateTime */	ZONED_DATE_TIME: Set<string>;
		/** @internal keys explicitly provided during init */		userProvidedKeys: Set<string>;

		/** @internal current recursion depth during parsing */	parseDepth?: number;
		/** @internal current matches during parsing */					matches?: Match[];
		/** @internal current anchor during parsing */					anchor?: Temporal.ZonedDateTime;
		/** @internal current ZonedDateTime during parsing */		zdt?: Temporal.ZonedDateTime;
		/** @internal has the parse operation errored? */				errored?: boolean;
		/** @internal Alias engine for this Tempo instance */		aliasEngine?: AliasEngine;
		/** @internal Pattern compiler for this Tempo instance */	patternCompiler?: PatternCompiler;
		/** @internal database of plugins scoped to this state */pluginsDb: { terms: TermPlugin[]; plugins: TempoPlugin[] };
		/** @internal internal cache engine for static terms and string parses */cache: BoundedCache<string, string>;
		/** @internal installed-plugin dedup tracker; a ScopedSet for sandboxes (delegates has() to global rt.installed), undefined for the global state */installed?: Set<any> | ScopedSet<any>;
		/** @internal sandbox-local license state; runtime license is centralized on TempoRuntime */license?: Internal.LicenseState;
	}

	/** debug a Tempo instantiation */
	export type MatchExtend = { type: 'Event' | 'Period', value: string | number | Function }
	export type MatchSource = 'default' | 'global' | 'local' | `plugin:${string}`
	export type Match = {
		/** pattern which matched the input */									match?: string | undefined;
		/** groups from the pattern match */										groups?: Groups;
		/** was this a nested/anchored parse? */								isAnchored?: boolean;
		/** anchor value used for this match */									anchor?: Temporal.ZonedDateTime;
		/** where this match came from: 'default', 'global', 'local', or `plugin:${string}` */ source?: MatchSource;
		/** the language/locale this term matched against */		locale?: string;
	} & (TypeValue<any> | MatchExtend)

	/** Debugging results of a parse operation. See `doc/tempo.api.md`. */
	export interface Parse {
		/** regional date-parsing configuration */							monthDay: MonthDay;
		/** preferred parse-order of layouts */									planner: PlannerOptions;
		/** Symbol registry */																	token: Token;
		/** Tempo snippets to aid in parsing */									snippet: Snippet;
		/** Tempo layout strings */															layout: Layout;
		/** Map of regex-patterns to match input-string */			pattern: Registry;
		/** configured Events */																event: Event;
		/** configured Periods */																period: Period;
		/** noise words to ignore during parsing */							ignore: Record<string, string>;
		/** pivot year for two-digit years */										pivot: number;
		/** parsing match result */															result: Match[];
		/** was this a nested/anchored parse? */								isAnchored?: boolean;
		/** anchor value used for this parse operation */				anchor?: Temporal.ZonedDateTime;
		/** initialization strategy ('auto'|'strict'|'defer') */mode: enums.MODE;
		/** @internal is parsing currently deferred? */					lazy: boolean;
		/** @internal lazy delegator for formats */							format?: any;
		/** @internal lazy delegator for terms */								term?: any;
		/** @internal localized Master Guard scanner */					guard?: { test(str: string): boolean };
		/** @internal localized Noise Word scanner */						ignorePattern?: RegExp;
		/** @internal reverse-lookup map for localized months */monthMap?: Record<string, { value: number; locale: string }>;
		/** @internal reverse-lookup map for localized weekdays */weekdayMap?: Record<string, { value: number; locale: string }>;
	}

	/** drop the parse-only Options */
	export type OptionsKeep = Omit<BaseOptions, "monthDay" | "planner" | "layoutOrder" | "preFilter" | "pivot" | "snippet" | "layout" | "event" | "period" | "ignore" | "value">

	/** Instance configuration derived from supply, storage, and discovery. */
	export interface Config extends Required<Omit<OptionsKeep, "formats" | "locales" | "registry" | "license" | "localize">> {
		/** license key for premium features */									license?: string;
		/** scope for configuration mutations */								scope: 'global' | 'local';
		/** custom data augmentation registries */							registry: { formats: FormatRegistry, locales: Record<string, Record<string, string | Function>>, modifiers?: Record<string, string | string[]>, tokens?: Record<string, TokenEvaluator> };
		/** index-signature */																	readonly [key: string]: any;
	}

	/** structured configuration for Global Discovery via Symbol.for('$Tempo') */
	export interface Discovery {
		/** pre-defined config options for Tempo.#global */			options?: Options | (() => Options);
		/** aliases to merge in the TimeZone dictionary */			timeZones?: Record<string, string>;
		/** regional date-parsing configuration */							monthDay?: MonthDay;
		/** parse planner configuration (layoutOrder, etc.) */  planner?: PlannerOptions;
		/** aliases to merge in the Number-Word dictionary */		numbers?: Record<string, number>;
		/** term plugins to be registered via Tempo.addTerm() */terms?: TermPlugin | TermPlugin[];
		/** internationalization configuration (relativeTime, etc.) */intl?: IntlOptions;
		/** @deprecated Provide configuration inside `registry: { formats: ... }` */formats?: Property<any>;
		/** @deprecated Provide configuration inside `registry: { locales: ... }` */locales?: Record<string, Record<string, string | Function>>;
		/** custom data augmentation registries */							registry?: { formats?: Property<any>, locales?: Record<string, Record<string, string | Function>>, modifiers?: Record<string, string | string[]>, tokens?: Record<string, TokenEvaluator> };
		/** noise words to ignore during parsing via Tempo.ignore() */ignore?: Ignore;
		/** plugins to be automatically extended via Tempo.extend() */plugins?: (TempoPlugin | TermPlugin) | (TempoPlugin | TermPlugin)[];
	}

	export interface LicenseScope {
		exp?: number;
		updated_at?: number;
	}

	/** structure of the verified license reckoning */
	export interface ValidationResult {
		status: enums.LICENSE;
		role?: string;
		scopes: Record<string, Internal.LicenseScope>;
		expires?: number | string;
		issuedAt?: number;
		issuer?: string;
		jti?: string;
		error?: string;
	}

	/** structure of the dynamic #tempo/license chunk */
	export interface LicensingModule {
		Validator: new (jwt: string) => {
			verify(): Promise<ValidationResult>;
			syncRevocation(jwsUrl: string, currentJti: string): Promise<{ revoked: boolean, success: boolean }>;
		};
	}

	export interface LicenseState {
		status: enums.LICENSE;
		key?: string;
		role?: string;
		scopes: Record<string, Internal.LicenseScope>;
		jws?: Pledge<Internal.ValidationResult>;
		expires?: number | string;
		issuedAt?: number;
		issuer?: string;
		subject?: string;
		audience?: string;
		jti?: string;
		error?: string;
	}
}

export type MatchResult = Internal.Match;
