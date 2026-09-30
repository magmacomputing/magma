import { StringTag } from '#library/decorator.library.js';
import { isFunction, isObject, isString } from '#library/assertion.library.js';
import { Pledge } from './pledge.class.js';
import { Finalizer } from './finalizer.class.js';

declare module '#library/type.library.js' {
	interface TypeValueMap<T> {
		Reactive: { type: 'Reactive'; value: Reactive<T> };
		'Reactive.Subscription': { type: 'Reactive.Subscription'; value: Reactive.Subscription };
	}
}

/**
 * Disposable subscription handle returned by event subscriptions (`stream.on(...)`).
 * Supports explicit resource management via `using sub = stream.on(...)`.
 */
@StringTag('Reactive.Subscription')
class ReactiveSubscription implements Disposable {
	#closed = false;
	readonly #cleanup: () => void;
	readonly #abortListener?: (() => void) | undefined;
	readonly #signal?: AbortSignal | undefined;

	constructor(cleanup: () => void, signal?: AbortSignal) {
		this.#cleanup = cleanup;
		this.#signal = signal;

		if (signal) {
			if (signal.aborted) {
				this.unsubscribe();
			} else {
				this.#abortListener = () => this.unsubscribe();
				signal.addEventListener('abort', this.#abortListener, { once: true });
			}
		}
	}

	/** Whether the subscription has been detached */
	get closed(): boolean {
		return this.#closed;
	}

	/** Detaches the listener from the source stream */
	unsubscribe(): void {
		if (this.#closed) return;
		this.#closed = true;
		if (this.#signal && this.#abortListener)
			this.#signal.removeEventListener('abort', this.#abortListener);

		this.#cleanup();
	}

	/** TC39 explicit resource management hook (calls unsubscribe) */
	[Symbol.dispose](): void {
		this.unsubscribe();
	}
}

/**
 * Unified namespace for Reactive types and options.
 */
export namespace Reactive {
	/** Disposable subscription handle type */
	export type Subscription = ReactiveSubscription;

	/** Event types supported by Reactive instances */
	export type EventType = 'data' | 'error' | 'end' | 'stop';

	/** Listener callback for data events */
	export type Listener<T> = (value: T, stop: () => void) => void;

	/** Listener callback for error events */
	export type ErrorListener = (error: Error, stop: () => void) => void;

	/** Listener callback for end/stop events */
	export type EndListener = () => void;

	/** Options for event subscriptions */
	export interface SubscriptionOptions {
		/** Optional AbortSignal to automatically detach the listener when aborted */
		signal?: AbortSignal | undefined;
		/** If true, automatically unregisters the listener after its first invocation */
		once?: boolean | undefined;
	}

	/** Configuration options for Reactive instances */
	export interface Options<T = any> {
		/** Optional diagnostic tag */
		tag?: string | undefined;
		/** Maximum buffered items for pull-mode consumers (default: Infinity) */
		bufferSize?: number | undefined;
		/** If true, unhandled errors are suppressed and routed to error listeners (default: false) */
		catch?: boolean | undefined;
		/** If true, registers GC finalization safety hook (default: true) */
		finalizer?: boolean | undefined;
	}

	/** Current operational state snapshot of a Reactive instance */
	export interface State {
		readonly tag?: string | undefined;
		readonly active: boolean;
		readonly completed: boolean;
		readonly emitted: number;
		readonly subscribers: number;
		readonly queued: number;
		readonly buffered: number;
	}
}

interface ReactiveCleanupState<T> {
	completed: boolean;
	readonly waiters: Pledge<IteratorResult<T, void>>[];
	readonly endListeners: Set<Reactive.EndListener>;
	readonly dataListeners: Set<Reactive.Listener<T>>;
	readonly errorListeners: Set<Reactive.ErrorListener>;
}

function cleanupReactiveState<T>(state: ReactiveCleanupState<T>): void {
	if (state.completed) return;
	state.completed = true;

	if (state.waiters.length > 0) {
		const queue = state.waiters.splice(0);
		for (const waiter of queue) {
			if (waiter.isPending)
				waiter.resolve({ done: true, value: undefined });
		}
	}

	if (state.endListeners.size > 0) {
		const listeners = [...state.endListeners];
		for (const listener of listeners) {
			try {
				listener();
			} catch (err) {
				console.error('Reactive end listener failed:', err);
			}
		}
	}

	state.dataListeners.clear();
	state.errorListeners.clear();
	state.endListeners.clear();
}

/**
 * ## Reactive
 *
 * Universal, zero-dependency async reactive stream combining push-based event emission
 * and pull-based `AsyncIterable` iteration with native TC39 resource management
 * (`using` / `await using`) and Garbage Collection finalization safety.
 *
 * @example
 * ```ts
 * const stream = new Reactive<number>();
 *
 * // Consumer 1: Pull-mode
 * queueMicrotask(async () => {
 *   const val = await stream.pull(); // 42
 * });
 *
 * // Producer: Push-mode
 * stream.push(42);
 * ```
 */
@StringTag('Reactive')
export class Reactive<T> implements AsyncIterable<T>, AsyncIterator<T, void, unknown>, Disposable, AsyncDisposable {
	static readonly Subscription = ReactiveSubscription;

	readonly #tag?: string | undefined;
	readonly #bufferSize: number;
	readonly #catch: boolean;

	#active = true;
	#completed = false;
	#emitted = 0;
	#buffer: T[] = [];
	#waiters: Pledge<IteratorResult<T, void>>[] = [];
	#dataListeners = new Set<Reactive.Listener<T>>();
	#errorListeners = new Set<Reactive.ErrorListener>();
	#endListeners = new Set<Reactive.EndListener>();
	#stopCallback: () => void;
	readonly #cleanupState: ReactiveCleanupState<T>;
	#unregisterFinalizer?: (() => boolean) | undefined;

	constructor(arg?: Reactive.Options<T> | string) {
		const opts: Reactive.Options<T> = isObject(arg) ? arg : isString(arg) ? { tag: arg } : {};
		this.#tag = opts.tag;
		this.#bufferSize = typeof opts.bufferSize === 'number' && opts.bufferSize >= 0 ? opts.bufferSize : Infinity;
		this.#catch = Boolean(opts.catch);
		this.#stopCallback = () => this.complete();

		const cleanupState: ReactiveCleanupState<T> = {
			completed: false,
			waiters: this.#waiters,
			endListeners: this.#endListeners,
			dataListeners: this.#dataListeners,
			errorListeners: this.#errorListeners,
		};
		this.#cleanupState = cleanupState;

		if (opts.finalizer !== false) {
			this.#unregisterFinalizer = Finalizer.register(this, () => {
				cleanupReactiveState(cleanupState);
			});
		}
	}

	/** Identifies this object as a Reactive instance */
	get isReactive(): boolean {
		return true;
	}

	/** Returns the operational state of this stream */
	get state(): Reactive.State {
		return {
			tag: this.#tag,
			active: this.#active,
			completed: this.#completed,
			emitted: this.#emitted,
			subscribers: this.#dataListeners.size + this.#errorListeners.size + this.#endListeners.size,
			queued: this.#waiters.length,
			buffered: this.#buffer.length,
		};
	}

	// ── Producer Methods ───────────────────────────────────────────────────────

	/**
	 * Pushes data into the stream (producer mode) or registers a listener (consumer mode).
	 *
	 * @param arg - A data value to emit, or a listener callback to subscribe
	 * @returns True if the value was successfully emitted; false if completed or inactive; `Reactive.Subscription` if registering a listener
	 */
	push(value: T): boolean;
	push(listener: Reactive.Listener<T>): Reactive.Subscription;
	push(arg: T | Reactive.Listener<T>): boolean | Reactive.Subscription {
		if (isFunction(arg)) {
			return this.on('data', arg as Reactive.Listener<T>);
		}

		if (!this.#active || this.#completed) return false;

		this.#emitted++;

		// 1. Dispatch to pending pull waiter if any
		let dispatchedToWaiter = false;
		while (this.#waiters.length > 0) {
			const waiter = this.#waiters.shift()!;
			if (waiter.isPending) {
				waiter.resolve({ done: false, value: arg as T });
				dispatchedToWaiter = true;
				break;
			}
		}

		// 2. Buffer for future pull consumers if buffer space is available and not consumed by push listeners
		if (!dispatchedToWaiter && this.#dataListeners.size === 0 && this.#buffer.length < this.#bufferSize)
			this.#buffer.push(arg as T);

		// 3. Dispatch to all push listeners
		if (this.#dataListeners.size > 0) {
			const listeners = [...this.#dataListeners];
			for (const listener of listeners) {
				try {
					listener(arg as T, this.#stopCallback);
				} catch (err: any) {
					this.error(err instanceof Error ? err : new Error(String(err)));
				}
			}
		}

		return true;
	}

	/**
	 * Broadcasts a value to ALL pending pull waiters and push listeners simultaneously.
	 *
	 * @param value - The value to broadcast
	 * @returns True if the value was successfully emitted; false if completed or inactive
	 */
	broadcast(value: T): boolean {
		if (!this.#active || this.#completed) return false;

		this.#emitted++;

		// 1. Dispatch to all pending pull waiters
		if (this.#waiters.length > 0) {
			const waiters = this.#waiters.splice(0);
			for (const waiter of waiters) {
				if (waiter.isPending)
					waiter.resolve({ done: false, value });
			}
		}

		// 2. Dispatch to all push listeners
		if (this.#dataListeners.size > 0) {
			const listeners = [...this.#dataListeners];
			for (const listener of listeners) {
				try {
					listener(value, this.#stopCallback);
				} catch (err: any) {
					this.error(err instanceof Error ? err : new Error(String(err)));
				}
			}
		}

		return true;
	}

	/**
	 * Emits a value to active pull-mode consumers or push-mode listeners.
	 *
	 * @alias push
	 * @param value - The value to emit
	 * @returns True if the value was successfully emitted; false if completed or inactive
	 */
	emit(value: T): boolean {
		return this.push(value);
	}

	#error?: Error;

	/**
	 * Emits an error to registered error listeners or rejects pending pull consumers.
	 *
	 * @param err - The error instance to dispatch
	 */
	error(err: Error): void {
		if (this.#completed) return;

		this.#error = err;

		if (this.#errorListeners.size > 0) {
			const listeners = [...this.#errorListeners];
			for (const listener of listeners) {
				try {
					listener(err, this.#stopCallback);
				} catch (e) {
					console.error('Reactive error listener failed:', e);
				}
			}
		}

		const hadWaiters = this.#waiters.length > 0;
		if (hadWaiters) {
			const queue = this.#waiters.splice(0);
			for (const waiter of queue) {
				if (waiter.isPending) {
					if (this.#catch) {
						waiter.resolve({ done: true, value: undefined });
					} else {
						waiter.reject(err);
					}
				}
			}
		}

		if (this.#catch) {
			this.complete();
		} else if (this.#errorListeners.size === 0 && !hadWaiters) {
			console.error('Unhandled Reactive error:', err);
		}
	}

	/**
	 * Completes and closes the reactive stream.
	 *
	 * @param terminalValue - Optional final value to emit prior to closing
	 */
	complete(terminalValue?: T): void {
		if (this.#completed) return;

		if (terminalValue !== undefined) {
			this.push(terminalValue);
		}

		this.#completed = true;
		this.#active = false;

		cleanupReactiveState(this.#cleanupState);

		if (this.#unregisterFinalizer) {
			this.#unregisterFinalizer();
			this.#unregisterFinalizer = undefined;
		}
	}

	/**
	 * Alias for `complete()`.
	 *
	 * @alias complete
	 * @param terminalValue - Optional final value to emit prior to closing
	 */
	stop(terminalValue?: T): void {
		this.complete(terminalValue);
	}

	// ── Consumer Methods (Push) ────────────────────────────────────────────────

	/**
	 * Subscribes to stream events with optional AbortSignal and once configuration.
	 * Returns a disposable Subscription handle for explicit resource management (`using sub = ...`).
	 *
	 * @param event - 'data', 'error', 'end', or 'stop'
	 * @param listener - Callback to invoke when the event fires
	 * @param options - Subscription options (AbortSignal, once)
	 * @returns A disposable Subscription handle
	 */
	on(event: 'data', listener: Reactive.Listener<T>, options?: Reactive.SubscriptionOptions): Reactive.Subscription;
	on(event: 'error', listener: Reactive.ErrorListener, options?: Reactive.SubscriptionOptions): Reactive.Subscription;
	on(event: 'end' | 'stop', listener: Reactive.EndListener, options?: Reactive.SubscriptionOptions): Reactive.Subscription;
	on(event: Reactive.EventType, listener: any, options?: Reactive.SubscriptionOptions): Reactive.Subscription {
		if (!isFunction(listener))
			return new Reactive.Subscription(() => { });

		if (options?.signal?.aborted)
			return new Reactive.Subscription(() => { }, options.signal);

		let actualListener = listener;
		if (options?.once) {
			actualListener = (...args: any[]) => {
				sub.unsubscribe();
				listener(...args);
			};
		}

		let cleanup: () => void;

		if (event === 'data') {
			this.#dataListeners.add(actualListener);
			cleanup = () => {
				this.#dataListeners.delete(actualListener);
			};
			// Flush any existing buffered items to the new push listener
			if (this.#buffer.length > 0) {
				const buffered = [...this.#buffer];
				this.#buffer = [];
				for (const item of buffered)
					actualListener(item, this.#stopCallback);
			}
		} else if (event === 'error') {
			this.#errorListeners.add(actualListener);
			cleanup = () => {
				this.#errorListeners.delete(actualListener);
			};
		} else if (event === 'end' || event === 'stop') {
			if (this.#completed) {
				queueMicrotask(() => actualListener());
				cleanup = () => { };
			} else {
				this.#endListeners.add(actualListener);
				cleanup = () => {
					this.#endListeners.delete(actualListener);
				};
			}
		} else {
			cleanup = () => { };
		}

		const sub = new Reactive.Subscription(cleanup, options?.signal);
		return sub;
	}

	/**
	 * Subscribes to a single event occurrence.
	 *
	 * @param event - Event name
	 * @param listener - Callback function
	 * @param options - Subscription options
	 * @returns A disposable Subscription handle
	 */
	once(event: 'data', listener: Reactive.Listener<T>, options?: Omit<Reactive.SubscriptionOptions, 'once'>): Reactive.Subscription;
	once(event: 'error', listener: Reactive.ErrorListener, options?: Omit<Reactive.SubscriptionOptions, 'once'>): Reactive.Subscription;
	once(event: 'end' | 'stop', listener: Reactive.EndListener, options?: Omit<Reactive.SubscriptionOptions, 'once'>): Reactive.Subscription;
	once(event: Reactive.EventType, listener: any, options?: Omit<Reactive.SubscriptionOptions, 'once'>): Reactive.Subscription {
		return this.on(event as any, listener, { ...options, once: true });
	}

	/**
	 * Unsubscribes a previously registered event listener.
	 *
	 * @param event - Event name
	 * @param listener - Listener function to remove
	 * @returns `this` for chaining
	 */
	off(event: Reactive.EventType, listener: Function): this {
		if (event === 'data') this.#dataListeners.delete(listener as any);
		else if (event === 'error') this.#errorListeners.delete(listener as any);
		else if (event === 'end' || event === 'stop') this.#endListeners.delete(listener as any);
		return this;
	}

	// ── Lifecycle & Cancellation ───────────────────────────────────────────────

	/**
	 * Returns a new Reactive stream that mirrors the source but completes automatically
	 * when the given notifier (AbortSignal, Promise, or trigger Reactive stream) fires.
	 *
	 * @param notifier - An AbortSignal, Promise, or Reactive stream bounding this stream's lifecycle.
	 * @returns A new Reactive stream
	 */
	until(notifier: AbortSignal | Promise<any> | Reactive<any>): Reactive<T> {
		const output = new Reactive<T>({
			tag: this.#tag ? `${this.#tag}.until` : 'Reactive.until',
			bufferSize: this.#bufferSize,
			catch: this.#catch,
		});

		const stop = () => {
			subData.unsubscribe();
			subError.unsubscribe();
			subEnd.unsubscribe();
			output.complete();
		};

		const subData = this.on('data', (val) => output.push(val));
		const subError = this.on('error', (err) => output.error(err));
		const subEnd = this.on('end', () => output.complete());
		output.on('end', () => {
			subData.unsubscribe();
			subError.unsubscribe();
			subEnd.unsubscribe();
		});

		if (notifier instanceof AbortSignal) {
			if (notifier.aborted) {
				stop();
			} else {
				notifier.addEventListener('abort', stop, { once: true });
			}
		} else if (notifier != null && typeof (notifier as any).then === 'function') {
			(notifier as Promise<unknown>).then(stop, stop);
		} else if (notifier != null && typeof (notifier as any).on === 'function') {
			const trigger = notifier as Reactive<unknown>;
			trigger.on('data', stop, { once: true });
			trigger.on('end', stop, { once: true });
		}

		return output;
	}

	// ── Consumer Methods (Pull) ────────────────────────────────────────────────

	/**
	 * Pulls the next available value directly from the stream.
	 *
	 * @returns A promise resolving to the next item `T`, or `undefined` if completed
	 */
	async pull(): Promise<T | undefined> {
		const res = await this.next();
		return res.done ? undefined : res.value;
	}

	/**
	 * Advances the async iterator to the next available item.
	 */
	async next(): Promise<IteratorResult<T, void>> {
		if (this.#buffer.length > 0) {
			const value = this.#buffer.shift()!;
			return { done: false, value };
		}

		if (this.#error && !this.#catch) {
			throw this.#error;
		}

		if (this.#completed || !this.#active) {
			return { done: true, value: undefined };
		}

		const waiter = new Pledge<IteratorResult<T, void>>(this.#tag ? `${this.#tag}.waiter` : 'Reactive.waiter');
		this.#waiters.push(waiter);
		return waiter.promise;
	}

	/**
	 * Closes the async iterator and marks the stream as completed.
	 */
	async return(): Promise<IteratorResult<T, void>> {
		this.complete();
		return { done: true, value: undefined };
	}

	/**
	 * Throws an error into the stream, rejecting pending waiters and stopping the stream.
	 */
	async throw(err?: any): Promise<IteratorResult<T, void>> {
		const errorObj = err instanceof Error ? err : new Error(String(err));
		this.error(errorObj);
		this.complete();
		return { done: true, value: undefined };
	}

	/** Returns this instance as an AsyncIterator */
	[Symbol.asyncIterator](): AsyncIterator<T, void, unknown> {
		return this;
	}

	// ── Resource Management ────────────────────────────────────────────────────

	/** Synchronous disposal hook (`using stream = new Reactive()`) */
	[Symbol.dispose](): void {
		this.complete();
	}

	/** Asynchronous disposal hook (`await using stream = new Reactive()`) */
	async [Symbol.asyncDispose](): Promise<void> {
		this.complete();
	}

	// ── Static Factories ───────────────────────────────────────────────────────

	/**
	 * Creates a `Reactive` stream from an iterable, async iterable, or Promise.
	 *
	 * @param source - The source collection or promise
	 * @param options - Optional configuration options
	 * @returns A Reactive stream instance
	 */
	static from<V>(
		source: Iterable<V> | AsyncIterable<V> | Promise<V>,
		options?: Reactive.Options<V>
	): Reactive<V> {
		const stream = new Reactive<V>(options);

		if (source && typeof (source as any)[Symbol.asyncIterator] === 'function') {
			(async () => {
				try {
					for await (const item of source as AsyncIterable<V>) {
						if (!stream.state.active) break;
						stream.push(item);
					}
					stream.complete();
				} catch (err: any) {
					stream.error(err instanceof Error ? err : new Error(String(err)));
					stream.complete();
				}
			})();
		} else if (source && typeof (source as any)[Symbol.iterator] === 'function') {
			try {
				for (const item of source as Iterable<V>) {
					if (!stream.state.active) break;
					stream.push(item);
				}
				stream.complete();
			} catch (err: any) {
				stream.error(err instanceof Error ? err : new Error(String(err)));
				stream.complete();
			}
		} else if (source && isFunction((source as any).then)) {
			(source as Promise<V>)
				.then((val) => {
					stream.push(val);
					stream.complete();
				})
				.catch((err) => {
					stream.error(err instanceof Error ? err : new Error(String(err)));
					stream.complete();
				});
		}

		return stream;
	}
}

export default Reactive;
