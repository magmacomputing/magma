import type {
	ReadonlySignal,
	Interval as TempoInterval,
	Tempo,
	WatchIntlOptions,
	IntlWatcher,
} from 'tempo-kit/plugin/sdk';

/**
 * A readonly reactive signal that supports explicit and `using`-based disposal.
 */
export interface DisposableSignal<T> extends ReadonlySignal<T> {
	/** Whether this signal has been disposed. */
	readonly disposed: boolean;
	/** Stops any underlying timers/subscriptions and releases resources. */
	dispose(): void;
	/** `Symbol.dispose` alias for `using` declarations. */
	[Symbol.dispose](): void;
}

/**
 * Options for `toRelativeSignal` / `tempo.toRelativeSignal()`.
 */
export interface RelativeSignalOptions {
	/** Explicit BCP 47 locale override (defaults to reactive `Tempo.signals.locale`). */
	locale?: string;
	/** `Intl.RelativeTimeFormat` style (`'long' | 'short' | 'narrow'`, default `'narrow'`). */
	style?: Intl.RelativeTimeFormatStyle;
	/** `Intl.RelativeTimeFormat` numeric mode (`'always' | 'auto'`, default `'auto'`). */
	numeric?: Intl.RelativeTimeFormatNumeric;
	/** Custom clock function returning current epoch milliseconds (default `Date.now`). */
	now?: () => number;
	/** @internal Reactive locale signal source for sandbox-scoped formatting. */
	localeSource?: ReadonlySignal<string>;
}

/**
 * Options for `intervalSignal` / `interval.toSignal()`.
 */
export interface IntervalSignalOptions {
	/**
	 * Update interval in milliseconds for `progress` while the interval is active (default `1000`).
	 * Set to `false` or `0` to disable periodic progress ticks.
	 */
	progressInterval?: number | false;
	/** Custom clock function returning current epoch milliseconds (default `Date.now`). */
	now?: () => number;
	/** @internal Reactive locale signal source for sandbox-scoped formatting. */
	localeSource?: ReadonlySignal<string>;
}

/**
 * Reactive state projection for a temporal `Interval`.
 */
export interface IntervalSignalState extends Disposable {
	/** `true` while `now` is within `[start, end)`. */
	readonly isCurrent: ReadonlySignal<boolean>;
	/** `true` once `now >= end`. */
	readonly isPast: ReadonlySignal<boolean>;
	/** `true` while `now < start`. */
	readonly isFuture: ReadonlySignal<boolean>;
	/** Normalized elapsed ratio in `[0, 1]` (`0` before start, `1` at/after end). */
	readonly progress: ReadonlySignal<number>;
	/** Whether this signal group has been disposed. */
	readonly disposed: boolean;
	/** Stops all boundary timers and progress tickers. */
	dispose(): void;
	/** `Symbol.dispose` alias for `using` declarations. */
	[Symbol.dispose](): void;
}

/**
 * Reactive global configuration signals synchronized with `Tempo.init()`.
 */
export interface ConfigSignals {
	/** Reactive BCP 47 locale signal. */
	readonly locale: ReadonlySignal<string>;
	/** Reactive IANA time zone identifier signal. */
	readonly timeZone: ReadonlySignal<string>;
}

/**
 * Options accepted by `SignalsPlugin` and config signal initializers.
 */
export interface SignalsPluginOptions {
	/** Fallback locale before `Tempo.init()` specifies one. */
	locale?: string;
	/** Fallback time zone before `Tempo.init()` specifies one. */
	timeZone?: string;
}

/**
 * Accepted temporal target inputs for `toRelativeSignal`.
 */
export type RelativeSignalTarget =
	| Tempo
	| Temporal.ZonedDateTime
	| Temporal.Instant
	| { epoch?: { ms?: number; ns?: bigint } }
	| { epochMilliseconds?: number; epochNanoseconds?: bigint }
	| string
	| number
	| bigint;

/**
 * Options for {@link watchSystemConfig} and `Tempo.signals.watchSystem`.
 */
export interface WatchSystemConfigOptions extends WatchIntlOptions {
	/** Sync `Tempo.init({ locale })` on system locale changes (default: `true`). */
	locale?: boolean;
	/** Sync `Tempo.init({ timeZone })` on system time-zone changes (default: `true`). */
	timeZone?: boolean;
	/** Target `Tempo` class or sandbox (default: `Tempo`). */
	target?: typeof Tempo;
}

/**
 * Static `Tempo.signals` namespace mounted by `SignalsPlugin`.
 */
export interface TempoSignalsNamespace {
	/** Reactive global locale signal synchronized with `Tempo.init()`. */
	readonly locale: ReadonlySignal<string>;
	/** Reactive global time zone signal synchronized with `Tempo.init()`. */
	readonly timeZone: ReadonlySignal<string>;
	/** Creates an adaptive, self-updating relative-time signal for a temporal target. */
	relative(target: RelativeSignalTarget, options?: RelativeSignalOptions): DisposableSignal<string>;
	/** Creates a boundary-scheduled reactive state projection for an `Interval`. */
	interval(interval: TempoInterval<any>, options?: IntervalSignalOptions): IntervalSignalState;
	/** Watches host locale/time-zone changes and calls `Tempo.init()` automatically. */
	watchSystem(options?: WatchSystemConfigOptions): IntlWatcher;
	/** Detaches global configuration observers registered by `SignalsPlugin`. */
	dispose(): void;
	/** `Symbol.dispose` alias for `using` declarations. */
	[Symbol.dispose](): void;
}

declare module 'tempo-kit' {
	namespace Tempo {
		/**
		 * Reactive TC39 Signals namespace (`locale`, `timeZone`, `relative`, `interval`).
		 */
		const signals: TempoSignalsNamespace;
	}

	interface Tempo {
		/**
		 * Returns an adaptive `DisposableSignal<string>` that formats this `Tempo`
		 * relative to the current time and updates only at unit-bucket boundaries.
		 */
		toRelativeSignal(options?: RelativeSignalOptions): DisposableSignal<string>;
	}

	interface Interval<T = any> {
		/**
		 * Returns a boundary-scheduled `IntervalSignalState` tracking `isCurrent`,
		 * `isPast`, `isFuture`, and normalized `progress` for this interval.
		 */
		toSignal(options?: IntervalSignalOptions): IntervalSignalState;
	}
}
