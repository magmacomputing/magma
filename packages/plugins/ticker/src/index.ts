import { Tempo } from '@magmacomputing/tempo';
import {
	enums, Enum, definePlugin, attachStatics,
	isObject, isFunction, isDefined, isEmpty, isNumeric, isString, isNumber,
	instant, normaliseFractionalDurations,
	isRRuleString, getNextRRuleEpoch, isCronString, getNextCronEpoch,
	isUndefined, Finalizer, Reactive, cast, logError,
} from '@magmacomputing/tempo/plugin/sdk';

export { isCronString };

declare module '@magmacomputing/tempo' {
	namespace Tempo {
		/** An array of snapshots for all currently active tickers. */
		const tickers: Ticker.Snapshot[];

		/**
		 * Creates a new Ticker instance to schedule recurring events.
		 * 
		 * @param interval - The ticker interval, cron string, rrule, or options configuration
		 * @param callback - Optional callback to execute on each tick
		 * @returns A Ticker.Instance that can be awaited, iterated, or listened to
		 */
		function ticker(options: Ticker.Options): Ticker.Instance;
		function ticker(interval?: Ticker.Interval): Ticker.Instance;
		function ticker(callback: Ticker.Callback): Ticker.Instance;
		function ticker(interval: Ticker.Interval, callback: Ticker.Callback): Ticker.Instance;
		function ticker(interval: Ticker.Interval, options: Ticker.Options): Ticker.Instance;
		function ticker(options: Ticker.Options, callback: Ticker.Callback): Ticker.Instance;
		function ticker(options: Ticker.Options, extraOptions: Ticker.Options): Ticker.Instance;
	}
}

interface ActiveTickerEntry {
	ref: WeakRef<Ticker.Instance>;
	token: object;
}

/**
 * ### ACTIVE_TICKERS
 * Internal weak registry for all active tickers.
 */
const ACTIVE_TICKERS = new Set<ActiveTickerEntry>();

/**
 * ## Ticker
 * Ticker namespace object.
 * Provides access to currently active tickers.
 */
export const Ticker = {
	get active(): Ticker.Snapshot[] {
		const result: Ticker.Snapshot[] = [];
		for (const entry of ACTIVE_TICKERS) {
			const t = entry.ref.deref();
			if (isUndefined(t) || t.info.stopped) {
				ACTIVE_TICKERS.delete(entry);
			} else {
				const { label, next, ticks, limit, interval, rrule, cron, stopped, ntp } = t.info;
				result.push({ ticker: t, label, next, ticks, limit, interval, rrule, cron, stopped, ntp });
			}
		}
		return result;
	},
};

/**
 * Unified namespace for Ticker types and public API.
 */
export namespace Ticker {
	/** ticker interval allowed types (interpreted as seconds) */
	export type Interval = number | string | bigint;

	/** ticker configuration and stop conditions */
	export type Options = {
		label?: string;
		cron?: string;
		rrule?: string | { rrule: string;[key: string]: any };
		years?: number; months?: number; weeks?: number; days?: number;
		hours?: number; minutes?: number; seconds?: number;
		milliseconds?: number; microseconds?: number; nanoseconds?: number;
		yy?: number; mm?: number; ww?: number; dd?: number;
		hh?: number; mi?: number; ss?: number;
		ms?: number; us?: number; ns?: number;
		limit?: number;
		until?: Tempo.DateTime | Tempo.Options;
		seed?: Tempo.DateTime | Tempo.Options;
		catch?: boolean;
		ntp?: boolean;
		timeZone?: Tempo.BaseOptions['timeZone'];
		[key: `#${string}`]: number | string;
	};

	/** callback function for Tempo.ticker() */
	export type Callback = (t: Tempo, stop: () => void) => void;

	/** Internal descriptor for Ticker methods and properties */
	export interface Descriptor extends AsyncGenerator<Tempo, any>, AsyncDisposable, Disposable {
		pulse(): Tempo;
		pull(): Promise<Tempo | undefined>;
		until(notifier: AbortSignal | Promise<any> | Reactive<any>): Reactive<Tempo>;
		on(event: 'pulse' | 'catch' | 'stop', cb: (t: Tempo, stop: () => void) => void): this;
		stop(terminalValue?: Tempo): void;
		readonly info: {
			label: string | undefined;
			next: Tempo;
			ticks: number;
			limit: number | undefined;
			interval: Record<string, any>;
			rrule: string | undefined;
			cron: string | undefined;
			stopped: boolean;
			ntp: boolean;
		};
	}

	/** Unified Ticker interface supporting generators, events, and manual pulsing (callable as stop()) */
	export interface Instance extends Descriptor {
		(): void;
	}

	/** Summary of an active ticker */
	export type Snapshot = Descriptor['info'] & { ticker: Instance };
}

/**
 * Stateful internal class for Tempo.Ticker instances.
 * Composes with Reactive<Tempo> for push/pull streams and lifecycle management.
 */
class TickerInstance implements Ticker.Descriptor {
	#TempoClass: typeof Tempo;
	#label: string | undefined;
	#payload: Record<string, any> = {};
	#rrule: string | undefined;
	#cron: string | undefined;
	#next: Tempo;
	#until: Tempo | undefined;
	#limit: number | undefined;
	#ticks = 0;
	#stopped = false;
	#genFirstYielded = false;
	#isForward = true;
	#isInstant = false;
	#isShorthand = false;
	#schedId: any;
	#reactive: Reactive<Tempo>;
	#catchListeners = new Set<Ticker.Callback>();
	#stopListeners = new Set<Ticker.Callback>();
	#hasInvalidSchedule = false;
	#isCatch = false;
	#useNtp = false;
	#isNtpCalibratedSeeded = false;
	#hasExplicitFutureSeed = false;
	#options: any;
	#selfRef!: WeakRef<Ticker.Instance>;
	#activeEntry: ActiveTickerEntry | undefined = undefined;

	constructor(TempoClass: typeof Tempo, arg1: any, arg2?: any) {
		this.#TempoClass = TempoClass;

		// ── Overload Parsing ─────────────────────────────────────────────────
		let rawOptions: any = {};
		let cb: Ticker.Callback | undefined;

		const isDateLike = (obj: any) => isObject(obj) && ('epoch' in obj || 'epochMilliseconds' in obj || 'toZonedDateTimeISO' in obj || 'getTime' in obj);
		const isOptions = (obj: any) => isObject(obj) && !isDateLike(obj);

		switch (true) {
			case isFunction(arg1):
				cb = arg1;
				break;
			case isOptions(arg1):
				Object.assign(rawOptions, arg1);
				if (isFunction(arg2)) cb = arg2;
				else if (isOptions(arg2)) Object.assign(rawOptions, arg2);
				break;
			default:
				if (isDefined(arg1)) {
					if (isCronString(arg1)) {
						rawOptions.cron = arg1;
					} else if (isRRuleString(arg1)) {
						rawOptions.rrule = arg1;
					} else {
						const num = Number(arg1);
						if (isNumeric(arg1)) rawOptions.seconds = num;
						else rawOptions.seed = arg1;
					}
				}
				if (isFunction(arg2)) cb = arg2;
				else if (isOptions(arg2)) Object.assign(rawOptions, arg2);
		}

		if (isDefined(rawOptions.interval) && isUndefined(rawOptions.seconds) && isUndefined(rawOptions.cron) && isUndefined(rawOptions.rrule)) {
			const intVal = rawOptions.interval;
			if (isCronString(intVal)) rawOptions.cron = intVal;
			else if (isRRuleString(intVal)) rawOptions.rrule = intVal;
			else if (isNumeric(intVal)) rawOptions.seconds = Number(intVal);
			else rawOptions.seed = intVal;
		}

		// ── Initialization ───────────────────────────────────────────────────
		const { label, limit: lmt, until: stopAt, seed: startAt, rrule: rruleOption, cron: cronOption, ntp: useNtp, ...rest } = rawOptions;
		this.#options = rest;
		this.#label = label;
		this.#limit = lmt;
		this.#useNtp = Boolean(useNtp);
		this.#isNtpCalibratedSeeded = Boolean(this.#useNtp && (this.#TempoClass as any).ntp?.isCalibrated);
		if (rruleOption)
			this.#rrule = isString(rruleOption) ? rruleOption : rruleOption.rrule;
		this.#isCatch = Boolean(rawOptions.catch ?? this.#TempoClass.config?.catch);

		this.#reactive = new Reactive<Tempo>({
			tag: this.#label ?? 'Ticker',
			catch: this.#isCatch,
		});

		if (isDefined(cronOption)) {
			if (!isCronString(cronOption)) {
				this.#hasInvalidSchedule = true;
				logError(new Error(`Invalid Ticker cron schedule: ${String(cronOption)}`), { catch: this.#isCatch, ...this.#options });
			} else {
				this.#cron = cronOption;
			}
		}

		if (cb) this.#reactive.on('data', (t) => cb(t, () => this.stop()));

		for (const [key, val] of Object.entries(rest))
			if (isDefined(val) && (key.startsWith('#') || Enum.has(enums.DURATIONS, key) || Enum.has(enums.ELEMENT, key)))
				this.#payload[key] = val;

		const isSeed = isDefined(rawOptions.seed);
		const isRRule = isDefined(this.#rrule);
		const isCron = isDefined(this.#cron);
		const isInterval = !isEmpty(this.#payload) || (isDefined(rawOptions.seconds) && isNumber(rawOptions.seconds));

		if (isDefined(arg1) && !isOptions(arg1) && !isInterval && !isSeed && !isRRule && !isCron && !cb)
			logError(new Error(`Invalid Ticker interval, seed, cron, or rrule: ${String(arg1)}`), { catch: this.#isCatch, ...this.#options });

		this.#until = stopAt ? new this.#TempoClass(isOptions(stopAt) ? undefined : stopAt, isOptions(stopAt) ? { ...rest, ...stopAt } : rest) : undefined;

		if (isEmpty(this.#payload) && !isRRule && !isCron && !this.#hasInvalidSchedule) {
			if (isDefined(startAt)) this.#limit ??= 1;
			else this.#payload.seconds = 1;
		}

		normaliseFractionalDurations(this.#payload);
		if (isDefined(startAt)) {
			this.#next = new this.#TempoClass(isOptions(startAt) ? undefined : startAt, isOptions(startAt) ? { ...rest, ...startAt } : rest);
			this.#hasExplicitFutureSeed = (!isOptions(startAt) || isDefined((startAt as any).epoch)) && this.#next.epoch.ms > instant().epochMilliseconds;
		} else if (this.#useNtp && isFunction((this.#TempoClass as any).ntp?.now)) {
			this.#next = (this.#TempoClass as any).ntp.now(rest);
		} else {
			this.#next = new this.#TempoClass(undefined, rest);
		}
	}

	/** explicitly set the proxy-self (called by factory) */
	bootstrap(proxy: Ticker.Instance) {
		this.#selfRef = new WeakRef(proxy);
		this.#activeEntry = { ref: this.#selfRef, token: Object.create(null) };

		// ── Validation ───────────────────────────────────────────────
		if (this.#limit === 0) {
			this.stop();
			return proxy;
		}
		if (this.#hasInvalidSchedule) {
			this.stop();
			return proxy;
		}
		if (!this.#next.isValid) {
			this.stop();
			logError(new Error(`Invalid Ticker seed: ${String(this.#next)}`), this.#next.config);
		} else if (this.#until && !this.#until.isValid) {
			this.stop();
			logError(new Error(`Invalid Ticker boundary: ${String(this.#until)}`), this.#next.config);
		} else {
			try {
				if (this.#cron || this.#rrule) {
					this.#isForward = true;
					this.#isInstant = false;
					ACTIVE_TICKERS.add(this.#activeEntry);
					this.#runBootstrap();
				} else {
					// ── Mode Detection ──────────────────────────────────────────
					// Directional shorthand ('>', '<') implies absolute snapping via .set()
					// Numeric durations or named ranges imply relative shifting via .add()
					const hasShorthand = Object.entries(this.#payload).some(([k, v]) =>
						k.startsWith('#') && isString(v) && /^[<>]/.test(v.trim())
					);
					const hasRelative = Object.keys(this.#payload).some(k => !k.startsWith('#'));

					if (hasShorthand && hasRelative)
						throw new Error(`Ambiguous Ticker payload: cannot mix directional shorthand terms (e.g. '>') with relative durations (e.g. 'hours'). Use one or the other.`);

					this.#isShorthand = hasShorthand;
					const hasTermKey = Object.keys(this.#payload).some(k => k.startsWith('#'));
					const firstStep = this.#isShorthand ? this.#next.set(this.#payload) : this.#next.add(this.#payload);
					if (!firstStep.isValid) throw new Error(`Invalid Ticker payload resolution for ${JSON.stringify(this.#payload)}`);
					this.#isForward = this.#TempoClass.compare(firstStep, this.#next) >= 0;
					this.#isInstant = firstStep.epoch.ns === this.#next.epoch.ns;
					if (hasTermKey) this.#next = firstStep;

					ACTIVE_TICKERS.add(this.#activeEntry);
					this.#runBootstrap();
				}
			} catch (e: any) {
				this.stop();
				const msg = `Invalid Ticker payload resolution for ${JSON.stringify(this.#payload)}`;
				logError(new Error(msg), this.#next.config);
				queueMicrotask(() => this.#catchListeners.forEach(l => l(this.#next, () => this.stop())));
				this.#isForward = true;
				this.#isInstant = false;
			}
		}
		return proxy;
	}

	#delayMs() {
		const isCalibrated = this.#useNtp && Boolean((this.#TempoClass as any).ntp?.isCalibrated);
		if (isCalibrated && !this.#isNtpCalibratedSeeded && !this.#hasExplicitFutureSeed && this.#ticks === 0 && isFunction((this.#TempoClass as any).ntp?.now)) {
			this.#next = (this.#TempoClass as any).ntp.now(this.#options);
			const hasTermKey = Object.keys(this.#payload).some(k => k.startsWith('#'));
			if (hasTermKey)
				this.#next = this.#isShorthand ? this.#next.set(this.#payload) : this.#next.add(this.#payload);
			this.#isNtpCalibratedSeeded = true;
		}
		const currentEpochMs = (isCalibrated && isFunction((this.#TempoClass as any).ntp?.now))
			? (this.#TempoClass as any).ntp.now().epoch.ms
			: instant().epochMilliseconds;
		const diff = Math.round(this.#next.epoch.ms - currentEpochMs);
		if (diff > 0) return Math.min(diff, 2_147_483_647);

		if (!this.#isForward) {
			const stepMs = Math.abs(Math.round(this.#next.add(this.#payload).epoch.ms - this.#next.epoch.ms));
			return Math.max(20, Math.min(50, stepMs || 1000));
		}

		return 0;
	}

	#safePulse(): Tempo {
		try {
			return this.pulse();
		} catch (e: any) {
			const catchListeners = [...this.#catchListeners];
			this.stop();
			catchListeners.forEach(l => l(this.#next, () => this.stop()));
			if (!this.#isCatch)
				throw e;

			return this.#next;
		}
	}

	#scheduleNext() {
		if (this.#stopped || this.#isInstant) return;
		this.#schedId = setTimeout(() => {
			if (!this.#stopped) {
				this.#safePulse();
				this.#scheduleNext();
			}
		}, this.#delayMs());
	}

	#runBootstrap() {
		if ((this.#reactive.state.subscribers > 0 || this.#reactive.state.queued > 0) && !this.#stopped && !this.#schedId) {
			const delay = this.#delayMs();
			if (delay > 0) {
				this.#schedId = setTimeout(() => {
					if (!this.#stopped) {
						this.#safePulse();
						this.#scheduleNext();
					}
				}, delay);
			} else {
				this.#safePulse();
				this.#scheduleNext();
			}
		}
	}

	pulse(): Tempo {
		if (this.#stopped) return new (this.#TempoClass as any)(null, this.#next.config);

		const t = this.#next;
		if (!t.isValid) {
			const catchListeners = [...this.#catchListeners];
			this.stop();
			catchListeners.forEach(l => l(t, () => this.stop()));
			return t;
		}

		if (this.#cron) {
			const nextMs = getNextCronEpoch(this.#cron, t.epoch.ms, t.tz);
			this.#next = new (this.#TempoClass as any)(nextMs, t.config);
		} else if (this.#rrule) {
			const nextMs = getNextRRuleEpoch(this.#rrule, t.epoch.ms);
			this.#next = new (this.#TempoClass as any)(nextMs, t.config);
		} else {
			this.#next = this.#isInstant ? t : (this.#isShorthand ? t.set(this.#payload) : t.add(this.#payload));
		}

		this.#ticks++;

		const willStop = (this.#limit !== undefined && this.#ticks >= this.#limit) ||
			(isDefined(this.#until) && ((this.#isForward && this.#TempoClass.compare(t, this.#until) >= 0) || (!this.#isForward && this.#TempoClass.compare(t, this.#until) <= 0)));

		if (this.#stopped && this.#limit === 0) return t;

		// Cast pulse to all concurrent pull waiters and push listeners
		this.#reactive.cast(t);

		if (willStop)
			this.stop();

		return t;
	}

	on(event: 'pulse' | 'catch' | 'stop', cb: Ticker.Callback) {
		if (event === 'pulse') {
			this.#reactive.on('data', (t) => cb(t, () => this.stop()));
			this.#runBootstrap();
		} else if (event === 'catch') {
			this.#catchListeners.add(cb);
		} else if (event === 'stop') {
			this.#stopListeners.add(cb);
		}
		return this;
	}

	stop(terminalValue?: Tempo) {
		if (this.#stopped) return;
		this.#stopped = true;
		if (this.#activeEntry) {
			ACTIVE_TICKERS.delete(this.#activeEntry);
			this.#activeEntry = undefined;
		}
		if (this.#schedId) {
			clearTimeout(this.#schedId);
			this.#schedId = undefined;
		}

		const stopListeners = [...this.#stopListeners];
		this.#stopListeners.clear();
		this.#catchListeners.clear();

		this.#reactive.complete(terminalValue);

		for (const l of stopListeners) {
			l(this.#next, () => undefined);
		}
	}

	get [Symbol.toStringTag](): string {
		return 'Tempo.Ticker';
	}

	get info() {
		return {
			label: this.#label,
			next: this.#next,
			ticks: this.#ticks,
			limit: this.#limit,
			interval: { ...this.#payload },
			rrule: this.#rrule,
			cron: this.#cron,
			stopped: this.#stopped,
			ntp: this.#useNtp,
		};
	}

	async pull(): Promise<Tempo | undefined> {
		const res = await this.next();
		return res.done ? undefined : res.value;
	}

	until(notifier: AbortSignal | Promise<any> | Reactive<any>): Reactive<Tempo> {
		const stream = this.#reactive.until(notifier);
		this.#runBootstrap();
		return stream;
	}

	async next(): Promise<IteratorResult<Tempo, any>> {
		if (this.#stopped || this.#isInstant) return { done: true, value: undefined };

		const promise = this.#reactive.next();

		if (!this.#genFirstYielded) {
			this.#genFirstYielded = true;
			const delay = this.#delayMs();
			if (delay > 0) {
				this.#runBootstrap();
			} else {
				queueMicrotask(() => {
					if (!this.#stopped || this.#reactive.state.queued > 0) {
						this.#safePulse();
						this.#scheduleNext();
					}
				});
			}
		} else {
			this.#runBootstrap();
		}

		const res = await promise;
		if (res.done) return { done: true, value: undefined };
		if (res.value && res.value.isValid) return { done: false, value: res.value };
		return { done: true, value: undefined };
	}

	async return(): Promise<IteratorResult<Tempo, any>> {
		this.stop();
		return { done: true, value: undefined };
	}

	async throw(e: any): Promise<IteratorResult<Tempo, any>> {
		this.stop();
		throw e;
	}

	async [Symbol.asyncDispose]() {
		this.stop();
	}

	[Symbol.asyncIterator]() {
		return this.#selfRef?.deref() ?? (this as any);
	}

	[Symbol.dispose]() {
		this.stop();
	}
}

/**
 * Creates and initializes a callable ticker instance.
 *
 * @param TempoClass - The `Tempo` class used by the ticker.
 * @param arg1 - The ticker schedule, options, or pulse callback.
 * @param arg2 - An optional ticker options object or pulse callback.
 * @returns The initialized ticker instance.
 */
function createTicker(TempoClass: typeof Tempo, arg1: any, arg2?: any): Ticker.Instance {
	const instance = new TickerInstance(TempoClass, arg1, arg2);
	const proxy = new Proxy((() => instance.stop()) as any, {
		get: (_, prop) => {
			if (prop === 'pulse') return instance.pulse.bind(instance);
			if (prop === 'pull') return instance.pull.bind(instance);
			if (prop === 'until') return instance.until.bind(instance);
			if (prop === 'on') {
				return (event: any, cb: any) => {
					instance.on(event, cb);
					return proxy;
				};
			}
			if (prop === 'stop') return instance.stop.bind(instance);
			if (prop === 'next') return instance.next.bind(instance);
			if (prop === 'return') return instance.return.bind(instance);
			if (prop === 'throw') return instance.throw.bind(instance);
			if (prop === 'info') return instance.info;
			if (prop === Symbol.asyncIterator) return () => proxy;
			if (prop === Symbol.asyncDispose) return instance[Symbol.asyncDispose].bind(instance);
			if (prop === Symbol.dispose) return instance[Symbol.dispose].bind(instance);
			return (instance as any)[prop];
		},
		apply: (target) => target(),
	});

	Finalizer.register(proxy, () => {
		instance.stop();
	});

	return instance.bootstrap(cast<Ticker.Instance>(proxy));
}

const tickersDescriptor = {
	get: () => Ticker.active,
};

/**
 * Options for configuring the Ticker plugin.
 */
export type TickerPluginOptions = Ticker.Options & { interval?: Ticker.Interval };

/**
 * ## TickerPlugin
 * The Community Ticker Plugin.
 * Exposes the `Tempo.ticker()` factory and `Tempo.tickers` registry.
 */
export const TickerPlugin = definePlugin({
	name: 'ticker',
	install(this: typeof Tempo, TempoClass: typeof Tempo, options?: any) {
		const opts = options as TickerPluginOptions | undefined;
		const installedClass = TempoClass || this;
		const tickerFactory = function (this: any, arg1?: any, arg2?: any): Ticker.Instance {
			const cls = (this as any)?.prototype ? this : ((this as any)?.constructor?.prototype ? (this as any).constructor : installedClass);
			const defaultOpts = opts ?? (cls as any)?.config?.pluginOptions?.ticker;
			if (defaultOpts && isObject(defaultOpts)) {
				if (isUndefined(arg1))
					return createTicker(cls, defaultOpts);

				if (isFunction(arg1) && isUndefined(arg2))
					return createTicker(cls, defaultOpts, arg1);

				if (isObject(arg1) && !isFunction(arg1))
					return createTicker(cls, { ...defaultOpts, ...arg1 }, arg2);
			}
			return createTicker(cls, arg1, arg2);
		};

		attachStatics(installedClass, {
			ticker: tickerFactory,
			tickers: tickersDescriptor,
		});
	},
});

export default TickerPlugin;
