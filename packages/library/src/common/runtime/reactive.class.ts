import { StringTag } from '#library/decorator.library.js';
import { isFunction, isObject, isString } from '#library/assertion.library.js';
import { Pledge } from './pledge.class.js';
import { Finalizer } from './finalizer.class.js';

declare module '#library/type.library.js' {
	interface TypeValueMap<T> {
		Reactive: { type: 'Reactive'; value: Reactive<T> };
	}
}

/**
 * Unified namespace for Reactive types and options.
 */
export namespace Reactive {
	/** Event types supported by Reactive instances */
	export type EventType = 'data' | 'error' | 'end' | 'stop';

	/** Listener callback for data events */
	export type Listener<T> = (value: T, stop: () => void) => void;

	/** Listener callback for error events */
	export type ErrorListener = (error: Error, stop: () => void) => void;

	/** Listener callback for end/stop events */
	export type EndListener = () => void;

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
	#unregisterFinalizer?: (() => boolean) | undefined;

	constructor(arg?: Reactive.Options<T> | string) {
		const opts: Reactive.Options<T> = isObject(arg) ? arg : isString(arg) ? { tag: arg } : {};
		this.#tag = opts.tag;
		this.#bufferSize = typeof opts.bufferSize === 'number' && opts.bufferSize >= 0 ? opts.bufferSize : Infinity;
		this.#catch = Boolean(opts.catch);
		this.#stopCallback = () => this.complete();

		if (opts.finalizer !== false) {
			const onGC = () => {
				this.complete();
			};
			this.#unregisterFinalizer = Finalizer.register(this, onGC);
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
	 * @returns True if the value was successfully emitted; false if completed or inactive; `this` if registering a listener
	 */
	push(value: T): boolean;
	push(listener: Reactive.Listener<T>): this;
	push(arg: T | Reactive.Listener<T>): boolean | this {
		if (isFunction(arg)) {
			return this.on('data', arg as Reactive.Listener<T>);
		}

		if (!this.#active || this.#completed) return false;

		this.#emitted++;

		// 1. Dispatch to pending pull waiter if any
		if (this.#waiters.length > 0) {
			const waiter = this.#waiters.shift()!;
			if (waiter.isPending)
				waiter.resolve({ done: false, value: arg as T });
		} else if (this.#buffer.length < this.#bufferSize) {
			// 2. Buffer for future pull consumers if buffer space is available
			this.#buffer.push(arg as T);
		}

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

		if (this.#waiters.length > 0) {
			const queue = this.#waiters;
			this.#waiters = [];
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
		} else if (this.#errorListeners.size === 0 && this.#waiters.length === 0) {
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

		// Resolve all remaining pull waiters with done: true
		if (this.#waiters.length > 0) {
			const queue = this.#waiters;
			this.#waiters = [];
			for (const waiter of queue) {
				if (waiter.isPending) {
					waiter.resolve({ done: true, value: undefined });
				}
			}
		}

		// Notify end listeners
		if (this.#endListeners.size > 0) {
			const listeners = [...this.#endListeners];
			for (const listener of listeners) {
				try {
					listener();
				} catch (err) {
					console.error('Reactive end listener failed:', err);
				}
			}
		}

		this.#dataListeners.clear();
		this.#errorListeners.clear();
		this.#endListeners.clear();

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
	 * Subscribes to stream events.
	 *
	 * @param event - 'data', 'error', 'end', or 'stop'
	 * @param listener - Callback to invoke when the event fires
	 * @returns `this` for chaining
	 */
	on(event: 'data', listener: Reactive.Listener<T>): this;
	on(event: 'error', listener: Reactive.ErrorListener): this;
	on(event: 'end' | 'stop', listener: Reactive.EndListener): this;
	on(event: Reactive.EventType, listener: any): this {
		if (!isFunction(listener)) return this;

		if (event === 'data') {
			this.#dataListeners.add(listener);
			// Flush any existing buffered items to the new push listener
			if (this.#buffer.length > 0) {
				const buffered = [...this.#buffer];
				this.#buffer = [];
				for (const item of buffered)
					listener(item, this.#stopCallback);
			}
		} else if (event === 'error') {
			this.#errorListeners.add(listener);
		} else if (event === 'end' || event === 'stop') {
			if (this.#completed) {
				queueMicrotask(() => listener());
			} else {
				this.#endListeners.add(listener);
			}
		}

		return this;
	}

	/**
	 * Subscribes to a single event occurrence.
	 *
	 * @param event - Event name
	 * @param listener - Callback function
	 * @returns `this` for chaining
	 */
	once(event: 'data', listener: Reactive.Listener<T>): this;
	once(event: 'error', listener: Reactive.ErrorListener): this;
	once(event: 'end' | 'stop', listener: Reactive.EndListener): this;
	once(event: Reactive.EventType, listener: any): this {
		if (!isFunction(listener)) return this;
		const wrapper = (...args: any[]) => {
			this.off(event, wrapper);
			listener(...args);
		};
		return this.on(event as any, wrapper as any);
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
