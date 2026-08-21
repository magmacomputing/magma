import { Tempo } from '@magmacomputing/tempo';
import { isRRuleString, getNextRRuleEpoch } from '@magmacomputing/library';
import {
	enums, definePlugin, attachStatics, type TempoPlugin,
	isObject, isFunction, isDefined, isUndefined, isEmpty, isNumeric, isNumber, Pledge, asArray, instant, normaliseFractionalDurations,
} from '@magmacomputing/tempo/plugin-api';

declare module '@magmacomputing/tempo' {
	namespace Tempo {
		/** An array of snapshots for all currently active tickers. */
		const tickers: Ticker.Snapshot[];

		/**
		 * Creates a new Ticker instance to schedule recurring events.
		 * 
		 * @param interval - The ticker interval or options configuration
		 * @param callback - Optional callback to execute on each tick
		 * @returns A Ticker.Instance that can be awaited, iterated, or listened to
		 */
		function ticker(options: Ticker.Options): Ticker.Instance;
		function ticker(interval?: Ticker.Interval): Ticker.Instance;
		function ticker(callback: Ticker.Callback): Ticker.Instance;
		function ticker(interval: Ticker.Interval, callback: Ticker.Callback): Ticker.Instance;
		function ticker(options: Ticker.Options, callback: Ticker.Callback): Ticker.Instance;
		function ticker(options: Ticker.Options, extraOptions: Ticker.Options): Ticker.Instance;
	}
}

/**
 * ## Ticker
 * Ticker namespace object.
 * Provides access to currently active tickers.
 */
export const Ticker = {
	get active() {
		return asArray(ACTIVE_TICKERS)
			.map((t): Ticker.Snapshot => {
				const { label, next, ticks, limit, interval, rrule, stopped } = t.info;
				return { ticker: t, label, next, ticks, limit, interval, rrule, stopped };
			});
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
		[key: `#${string}`]: number | string;
	};

	/** callback function for Tempo.ticker() */
	export type Callback = (t: Tempo, stop: () => void) => void;

	/** Internal descriptor for Ticker methods and properties */
	export interface Descriptor extends AsyncGenerator<Tempo, any>, AsyncDisposable, Disposable {
		pulse(): Tempo;
		on(event: 'pulse' | 'catch' | 'stop', cb: (t: Tempo, stop: () => void) => void): this;
		stop(): void;
		readonly info: {
			label: string | undefined;
			next: Tempo;
			ticks: number;
			limit: number | undefined;
			interval: Record<string, any>;
			rrule: string | undefined;
			stopped: boolean;
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
 * ### ACTIVE_TICKERS
 * Internal registry for all active tickers.
 */
const ACTIVE_TICKERS = new Set<Ticker.Instance>();

/**
 * Stateful internal class for Tempo.Ticker instances.
 * Implements the AsyncGenerator and EventEmitter patterns.
 */
class TickerInstance implements Ticker.Descriptor {
	#TempoClass: typeof Tempo;
	#label: string | undefined;
	#payload: Record<string, any> = {};
	#rrule: string | undefined;
	#current: Tempo;
	#until: Tempo | undefined;
	#limit: number | undefined;
	#ticks = 0;
	#stopped = false;
	#genFirstYielded = false;
	#isForward = true;
	#isInstant = false;
	#isShorthand = false;
	#schedId: any;
	#waiter: Pledge<Tempo> | undefined;
	#listeners = new Set<Ticker.Callback>();
	#catchListeners = new Set<Ticker.Callback>();
	#stopListeners = new Set<Ticker.Callback>();
	#self!: Ticker.Instance;

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
					if (typeof arg1 === 'string' && isRRuleString(arg1)) {
						rawOptions.rrule = arg1;
					} else {
						const num = Number(arg1);
						if (isNumeric(arg1) && Number.isFinite(num)) rawOptions.seconds = num;
						else rawOptions.seed = arg1;
					}
				}
				if (isFunction(arg2)) cb = arg2;
				else if (isOptions(arg2)) Object.assign(rawOptions, arg2);
		}

		// ── Initialization ───────────────────────────────────────────────────
		const { label, limit: lmt, until: stopAt, seed: startAt, rrule: rruleOption, ...rest } = rawOptions;
		this.#label = label;
		this.#limit = lmt;
		if (rruleOption)
			this.#rrule = typeof rruleOption === 'string' ? rruleOption : rruleOption.rrule;

		if (cb) this.#listeners.add(cb);

		const durationKeys = new Set(Object.keys(enums.DURATIONS));
		for (const [key, val] of Object.entries(rest))
			if (isDefined(val) && (durationKeys.has(key) || key in enums.ELEMENT || key === 'ww' || key.startsWith('#')))
				this.#payload[key] = val;

		const isSeed = isDefined(rawOptions.seed);
		const isRRule = isDefined(this.#rrule);
		const isInterval = !isEmpty(this.#payload) || (isDefined(rawOptions.seconds) && isNumber(rawOptions.seconds));

		if (isDefined(arg1) && !isInterval && !isSeed && !isRRule && !cb) {
			const err = new Error(`Invalid Ticker interval or seed: ${String(arg1)}`);
			if (!this.#TempoClass.config?.catch) throw err;
			console.error(err.message);
		}

		this.#until = stopAt ? new this.#TempoClass(isOptions(stopAt) ? undefined : stopAt, isOptions(stopAt) ? { ...rest, ...stopAt } : rest) : undefined;

		if (isEmpty(this.#payload) && !isRRule) {
			if (isDefined(startAt) && isUndefined(this.#limit)) this.#limit = 1;
			else this.#payload.seconds = 1;
		}

		normaliseFractionalDurations(this.#payload);
		this.#current = new this.#TempoClass(isOptions(startAt) ? undefined : startAt, isOptions(startAt) ? { ...rest, ...startAt } : rest);
	}

	/** explicitly set the proxy-self (called by factory) */
	bootstrap(proxy: Ticker.Instance) {
		this.#self = proxy;

		// ── Validation ───────────────────────────────────────────────
		if (!this.#current.isValid) {
			this.stop();
			const err = new Error(`Invalid Ticker seed: ${String(this.#current)}`);
			if (!this.#current.config?.catch) throw err;
			console.error(err.message);
		} else if (this.#until && !this.#until.isValid) {
			this.stop();
			const err = new Error(`Invalid Ticker boundary: ${String(this.#until)}`);
			if (!this.#current.config?.catch) throw err;
			console.error(err.message);
		} else {
			try {
				if (this.#rrule) {
					this.#isForward = true;
					this.#isInstant = false;
					ACTIVE_TICKERS.add(this.#self);
					this.#runBootstrap();
				} else {
					// ── Mode Detection ──────────────────────────────────────────
					// Directional shorthand ('>', '<') implies absolute snapping via .set()
					// Numeric durations or named ranges imply relative shifting via .add()
					const hasShorthand = Object.entries(this.#payload).some(([k, v]) =>
						k.startsWith('#') && typeof v === 'string' && /^[<>]/.test(v.trim())
					);
					const hasRelative = Object.keys(this.#payload).some(k => !k.startsWith('#'));

					if (hasShorthand && hasRelative)
						throw new Error(`Ambiguous Ticker payload: cannot mix directional shorthand terms (e.g. '>') with relative durations (e.g. 'hours'). Use one or the other.`);

					this.#isShorthand = hasShorthand;
					const hasTermKey = Object.keys(this.#payload).some(k => k.startsWith('#'));
					const firstStep = this.#isShorthand ? this.#current.set(this.#payload) : this.#current.add(this.#payload);
					if (!firstStep.isValid) throw new Error(`Invalid Ticker payload resolution for ${JSON.stringify(this.#payload)}`);
					this.#isForward = this.#TempoClass.compare(firstStep, this.#current) >= 0;
					this.#isInstant = firstStep.epoch.ns === this.#current.epoch.ns;
					if (hasTermKey) this.#current = firstStep;

					ACTIVE_TICKERS.add(this.#self);
					this.#runBootstrap();
				}
			} catch (e: any) {
				this.stop();
				const msg = `Invalid Ticker payload resolution for ${JSON.stringify(this.#payload)}`;
				if (!this.#current.config?.catch) throw new Error(msg);
				console.error(msg, e);
				queueMicrotask(() => this.#catchListeners.forEach(l => l(this.#current, () => this.stop())));
				this.#isForward = true;
				this.#isInstant = false;
			}
		}
		return this.#self;
	}

	#delayMs() {
		return Math.max(0, Math.round(this.#current.epoch.ms - instant().epochMilliseconds));
	}

	#safePulse(): Tempo {
		try {
			const t = this.pulse();
			if (this.#waiter && this.#waiter.isPending) {
				this.#waiter.resolve(t);
				this.#waiter = undefined;
			}
			return t;
		} catch (e: any) {
			this.stop();
			if (this.#catchListeners.size > 0) {
				this.#catchListeners.forEach(l => l(this.#current, () => this.stop()));
			} else if (!this.#TempoClass.config?.catch) {
				throw e;
			}
			return this.#current;
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
		if ((this.#listeners.size > 0 || this.#waiter) && !this.#stopped && !this.#schedId) {
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
		if (this.#stopped) return new (this.#TempoClass as any)(null, this.#current.config);

		const t = this.#current;
		if (!t.isValid) {
			this.stop();
			this.#catchListeners.forEach(l => l(t, () => this.stop()));
			return t;
		}

		if (this.#rrule) {
			const nextMs = getNextRRuleEpoch(this.#rrule, t.epoch.ms);
			this.#current = new (this.#TempoClass as any)(nextMs, t.config);
		} else {
			this.#current = this.#isInstant ? t : (this.#isShorthand ? t.set(this.#payload) : t.add(this.#payload));
		}

		this.#ticks++;

		if (isDefined(this.#limit) && this.#ticks >= this.#limit) this.stop();
		if (isDefined(this.#until)) {
			const cmp = this.#TempoClass.compare(t, this.#until);
			if ((this.#isForward && cmp >= 0) || (!this.#isForward && cmp <= 0)) this.stop();
		}

		if (this.#stopped && isDefined(this.#limit) && this.#limit === 0) return t;

		this.#listeners.forEach(l => l(t, () => this.stop()));
		return t;
	}

	on(event: 'pulse' | 'catch' | 'stop', cb: Ticker.Callback) {
		if (event === 'pulse') {
			this.#listeners.add(cb);
			this.#runBootstrap();
		}
		if (event === 'catch') this.#catchListeners.add(cb);
		if (event === 'stop') this.#stopListeners.add(cb);
		return this;
	}

	stop() {
		if (this.#stopped) return;
		this.#stopped = true;
		ACTIVE_TICKERS.delete(this.#self);
		if (this.#schedId) {
			clearTimeout(this.#schedId);
			this.#schedId = undefined;
		}
		if (this.#waiter && this.#waiter.isPending) {
			this.#waiter.resolve(this.#current);
			this.#waiter = undefined;
		}
		this.#stopListeners.forEach(l => l(this.#current, () => undefined));
	}

	get info() {
		return {
			label: this.#label,
			next: this.#current.clone(),
			ticks: this.#ticks,
			limit: this.#limit,
			interval: { ...this.#payload },
			rrule: this.#rrule,
			stopped: this.#stopped,
		};
	}

	async next(): Promise<IteratorResult<Tempo, any>> {
		if (this.#stopped) return { done: true, value: undefined };
		if (!this.#genFirstYielded) {
			this.#genFirstYielded = true;
			const delay = this.#delayMs();
			if (delay > 0) {
				this.#waiter = new Pledge<Tempo>('Ticker.next');
				this.#runBootstrap();
				const res = await this.#waiter;
				if (this.#stopped) return { done: true, value: undefined };
				return { done: false, value: res ?? this.#current };
			}
			const t = this.#safePulse();
			if (this.#stopped && isDefined(this.#limit) && this.#limit === 0) return { done: true, value: undefined };
			return { done: false, value: t };
		}
		if (this.#isInstant) return { done: true, value: undefined };
		this.#waiter = new Pledge<Tempo>('Ticker.next');
		this.#runBootstrap();
		const res = await this.#waiter;
		if (this.#stopped) return { done: true, value: undefined };
		return { done: false, value: res ?? this.#current };
	}

	async return(): Promise<IteratorResult<Tempo, any>> {
		this.stop();
		return { done: true, value: undefined };
	}

	async throw(e: any): Promise<IteratorResult<Tempo, any>> {
		if (this.#waiter && this.#waiter.isPending) {
			this.#waiter.reject(e);
			this.#waiter = undefined;
		}
		this.stop();
		throw e;
	}

	async [Symbol.asyncDispose]() { this.stop(); }
	[Symbol.asyncIterator]() { return this.#self; }
	[Symbol.dispose]() { this.stop(); }
}

/**
 * ## TickerPlugin
 * The Community Ticker Plugin.
 * Exposes the `Tempo.ticker()` factory and `Tempo.tickers` registry.
 */
export const TickerPlugin: TempoPlugin = definePlugin({
	name: 'ticker',
	install(this: typeof Tempo, TempoClass: typeof Tempo) {
		attachStatics(TempoClass, {
			ticker: function (arg1: any, arg2?: any): Ticker.Instance {
				const instance = new TickerInstance(TempoClass, arg1, arg2);
				const proxy = new Proxy((() => instance.stop()) as any, {
					get: (_, prop) => {
						if (prop === 'pulse') return instance.pulse.bind(instance);
						if (prop === 'on') return instance.on.bind(instance);
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
				}) as unknown as Ticker.Instance;

				return instance.bootstrap(proxy);
			},
			tickers: {
				get: () => Ticker.active,
			},
		});
	},
});
