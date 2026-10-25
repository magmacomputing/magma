import { Immutable, StringTag } from '#library/decorator.library.js';
import { isFunction, isCallable, isDefined } from '#library/assertion.library.js';
import { enumify } from './enumerate.library.js';
import { Finalizer } from './finalizer.class.js';
import type { ValueOf } from '#library/type.library.js';

/**
 * State flag enum for the two-phase push-dirty / pull-clean DAG.
 * Created using Tempo's standard enumify feature.
 * @internal
 */
export const StateFlag = enumify(['CLEAN', 'CHECK_DIRTY', 'DIRTY']);
export type StateFlag = ValueOf<typeof StateFlag>;

declare module '#library/type.library.js' {
	interface TypeValueMap<T> {
		Signify: { type: 'Signify'; value: WritableSignal<T> };
		'Signify.State': { type: 'Signify.State'; value: State<T> };
		'Signify.Computed': { type: 'Signify.Computed'; value: Computed<T> };
		'Signify.subtle.Watcher': { type: 'Signify.subtle.Watcher'; value: Watcher };
	}
}

/**
 * Internal tracking context interface for consumer nodes.
 * @internal
 */
export interface SignifyConsumerNode {
	/** Receives notification that an upstream dependency has become dirty. */
	notifyDirty(source: SignifyNode): void;
	/** Receives notification that an upstream dependency may be dirty. */
	notifyCheckDirty(source: SignifyNode): void;
}

/**
 * Common node interface for anything that can be a source of reactive values.
 * @internal
 */
export interface SignifyNode {
	readonly epoch: number;
	addConsumer(consumer: SignifyConsumerNode): void;
	removeConsumer(consumer: SignifyConsumerNode): void;
	poll(): boolean;
}

/**
 * Global active evaluation context stack.
 */
let activeConsumer: SignifyConsumerNode | null = null;
const consumerStack: (SignifyConsumerNode | null)[] = [];
let trackingSuppressed = false;

/**
 * Pushes a consumer node onto the tracking stack.
 */
function pushConsumer(consumer: SignifyConsumerNode | null): void {
	consumerStack.push(activeConsumer);
	activeConsumer = consumer;
}

/**
 * Pops the current consumer node and restores the previous context.
 */
function popConsumer(): void {
	activeConsumer = consumerStack.pop() ?? null;
}

/**
 * Options accepted by Signify.State and Signify.Computed.
 */
export interface SignifyOptions<T> {
	/**
	 * Custom equality comparator.
	 * If returns true, new values are considered equal to previous and do not notify consumers.
	 * Default: `Object.is`.
	 */
	equals?: ((this: any, a: T, b: T) => boolean) | undefined;
}

/** Forward-compatibility alias for TC39 Signal options */
export type SignalOptions<T> = SignifyOptions<T>;

/**
 * ## Signify.State
 *
 * Primary reactive source representing a mutable, read-write state container.
 * Notifies all dependent computations and watchers when mutated.
 * @internal Prefer `signify()` or `Signify.State`.
 */
@Immutable
@StringTag('Signify.State')
export class State<T> implements SignifyNode {
	#value: T;
	#epoch = 0;
	readonly #equals: ((this: any, a: T, b: T) => boolean) | undefined;
	readonly #consumers = new Set<SignifyConsumerNode>();

	constructor(initialValue: T, options?: SignifyOptions<T>) {
		this.#value = initialValue;
		this.#equals = options?.equals;
		Object.freeze(this);
	}

	get epoch(): number {
		return this.#epoch;
	}

	/**
	 * Returns the current value and registers a dependency if called inside an active computed context.
	 */
	get(): T {
		if (activeConsumer && !trackingSuppressed) {
			this.addConsumer(activeConsumer);
			if (activeConsumer instanceof Computed)
				activeConsumer.recordSource(this, this.#epoch);
		}
		return this.#value;
	}

	/**
	 * Updates the current value.
	 * If the new value differs from the previous value, marks all dependent consumers dirty.
	 */
	set(newValue: T): void {
		const isEqual = isFunction(this.#equals)
			? this.#equals(this.#value, newValue)
			: Object.is(this.#value, newValue);

		if (isEqual) return;

		this.#value = newValue;
		this.#epoch++;

		if (this.#consumers.size > 0) {
			// Clone to avoid concurrent mutation hazards during notifications
			const consumers = [...this.#consumers];
			for (const consumer of consumers)
				consumer.notifyDirty(this);
		}
	}

	addConsumer(consumer: SignifyConsumerNode): void {
		this.#consumers.add(consumer);
	}

	removeConsumer(consumer: SignifyConsumerNode): void {
		this.#consumers.delete(consumer);
	}

	poll(): boolean {
		return false;
	}
}

/**
 * ## Signify.Computed
 *
 * Derived, memoized computation with lazy evaluation and dynamic dependency tracking.
 * Only recomputes when its recorded dependencies have actually changed.
 * @internal Prefer `Signify.computed()` or `Signify.Computed`.
 */
@Immutable
@StringTag('Signify.Computed')
export class Computed<T> implements SignifyNode, SignifyConsumerNode, Disposable {
	readonly #computation: () => T;
	readonly #equals: ((this: any, a: T, b: T) => boolean) | undefined;

	#value: T | undefined = undefined;
	#error: unknown = undefined;
	#hasError = false;

	#state: number = StateFlag.DIRTY;
	#epoch = 0;
	#isEvaluating = false;
	#disposed = false;

	/** Sources this computation depends on -> epoch at evaluation time */
	#sources = new Map<SignifyNode, number>();
	/** Temporary tracking set during calculation */
	#newSources: Map<SignifyNode, number> | null = null;
	/** Consumers that depend on this computation */
	readonly #consumers = new Set<SignifyConsumerNode>();

	/** Teardown function for GC finalizer unregistration */
	#cancelFinalizer: (() => boolean) | undefined = undefined;

	constructor(computation: () => T, options?: SignifyOptions<T>) {
		if (!isFunction(computation))
			throw new TypeError('Signify.Computed requires a function calculation argument');

		this.#computation = computation;
		this.#equals = options?.equals;

		// Wire GC finalizer safety: automatically unhook sources if this instance is reclaimed
		const sources = this.#sources;
		const consumerRef = new WeakRef(this);
		this.#cancelFinalizer = Finalizer.register(this, () => {
			const consumer = consumerRef.deref();
			for (const [source] of sources) {
				if (consumer)
					source.removeConsumer(consumer);
			}
			sources.clear();
		});
		Object.freeze(this);
	}

	get epoch(): number {
		return this.#epoch;
	}

	/**
	 * Returns the memoized value, recalculating lazily if dependencies have changed.
	 */
	get(): T {
		if (this.#disposed)
			throw new Error('Cannot read from a disposed Signify.Computed');

		// Circular dependency check
		if (this.#isEvaluating)
			throw new RangeError('Circular dependency detected in Signify.Computed');

		// Register with current active consumer (if any)
		if (activeConsumer && !trackingSuppressed) {
			this.addConsumer(activeConsumer);
			if (activeConsumer instanceof Computed)
				activeConsumer.recordSource(this, this.#epoch);
		}

		// Recompute if dirty, or poll sources if check-dirty
		if (this.#state === StateFlag.CHECK_DIRTY)
			this.#checkSources();

		if (this.#state === StateFlag.DIRTY)
			this.#recompute();

		if (this.#hasError)
			throw this.#error;

		return this.#value!;
	}

	/**
	 * Polls upstream dependencies to determine if recomputation is needed.
	 * Returns true if this computed's value or epoch changed.
	 */
	poll(): boolean {
		if (this.#state === StateFlag.CHECK_DIRTY)
			this.#checkSources();

		if (this.#state === StateFlag.DIRTY) {
			const prevEpoch = this.#epoch;
			this.#recompute();
			return this.#epoch !== prevEpoch;
		}

		return false;
	}

	/**
	 * Checks each source to determine if an upstream node truly changed.
	 */
	#checkSources(): void {
		for (const [source, recordedEpoch] of this.#sources) {
			source.poll();
			if (source.epoch !== recordedEpoch) {
				this.#state = StateFlag.DIRTY;
				return;
			}
		}
		// If none of our sources changed, our memoized value remains valid!
		this.#state = StateFlag.CLEAN;
	}

	#recompute(): void {
		this.#isEvaluating = true;
		this.#newSources = new Map<SignifyNode, number>();
		pushConsumer(this);

		let nextValue: T | undefined = undefined;
		let nextError: unknown = undefined;
		let caught = false;

		try {
			nextValue = this.#computation();
		} catch (err) {
			nextError = err;
			caught = true;
		} finally {
			popConsumer();
			this.#isEvaluating = false;
		}

		// Dynamic dependency diffing (unhook sources no longer accessed)
		const newSources = this.#newSources!;
		this.#newSources = null;

		for (const [oldSource] of this.#sources) {
			if (!newSources.has(oldSource))
				oldSource.removeConsumer(this);
		}
		this.#sources = newSources;

		this.#state = StateFlag.CLEAN;

		if (caught) {
			this.#hasError = true;
			this.#error = nextError;
			this.#epoch++;
			return;
		}

		const hasPrevious = !this.#hasError && isDefined(this.#value);
		const isChanged = !hasPrevious || (isFunction(this.#equals)
			? !this.#equals(this.#value!, nextValue!)
			: !Object.is(this.#value, nextValue));

		this.#hasError = false;
		this.#error = undefined;

		if (isChanged) {
			this.#value = nextValue;
			this.#epoch++;
		}
	}

	/**
	 * Internal hook called by State or other Computeds during evaluation to record a source.
	 */
	recordSource(source: SignifyNode, epoch: number): void {
		if (this.#newSources) {
			this.#newSources.set(source, epoch);
		}
	}

	notifyDirty(_source: SignifyNode): void {
		if (this.#state !== StateFlag.DIRTY) {
			this.#state = StateFlag.DIRTY;
			this.#notifyConsumers();
		}
	}

	notifyCheckDirty(_source: SignifyNode): void {
		if (this.#state === StateFlag.CLEAN) {
			this.#state = StateFlag.CHECK_DIRTY;
			for (const consumer of this.#consumers) {
				consumer.notifyCheckDirty(this);
			}
		}
	}

	#notifyConsumers(): void {
		if (this.#consumers.size === 0) return;
		const consumers = [...this.#consumers];
		for (const consumer of consumers)
			consumer.notifyDirty(this);
	}

	addConsumer(consumer: SignifyConsumerNode): void {
		this.#consumers.add(consumer);
	}

	removeConsumer(consumer: SignifyConsumerNode): void {
		this.#consumers.delete(consumer);
	}

	/**
	 * Unhooks this computed node from all upstream sources and cancels GC finalization.
	 */
	dispose(): void {
		if (this.#disposed) return;
		this.#disposed = true;

		if (this.#cancelFinalizer) {
			this.#cancelFinalizer();
			this.#cancelFinalizer = undefined;
		}

		for (const [source] of this.#sources)
			source.removeConsumer(this);

		this.#sources.clear();
		this.#consumers.clear();
	}

	[Symbol.dispose](): void {
		this.dispose();
	}
}

/**
 * ## Signify.subtle.Watcher
 *
 * Low-level observer designed for schedulers and effect engines.
 * Observes a set of signals and invokes a notify callback when any become dirty.
 * @internal Prefer `Signify.subtle.Watcher` or `Signal.subtle.Watcher`.
 */
@Immutable
@StringTag('Signify.subtle.Watcher')
export class Watcher implements SignifyConsumerNode, Disposable {
	readonly #notify: (this: Watcher) => void;
	readonly #sources = new Set<SignifyNode>();
	readonly #pending = new Set<SignifyNode>();
	#disposed = false;

	constructor(notify: (this: Watcher) => void) {
		if (!isFunction(notify))
			throw new TypeError('Signify.subtle.Watcher requires a notify callback function');

		this.#notify = notify;
		Object.freeze(this);
	}

	/**
	 * Watches one or more signals for changes.
	 */
	watch(...signals: (State<any> | Computed<any>)[]): void {
		if (this.#disposed) return;
		for (const sig of signals) {
			if (!this.#sources.has(sig)) {
				this.#sources.add(sig);
				sig.addConsumer(this);
			}
		}
	}

	/**
	 * Stops watching one or more signals.
	 */
	unwatch(...signals: (State<any> | Computed<any>)[]): void {
		for (const sig of signals) {
			if (this.#sources.delete(sig)) {
				sig.removeConsumer(this);
				this.#pending.delete(sig);
			}
		}
	}

	/**
	 * Returns the signals that have become dirty since the last call, clearing the pending set.
	 */
	getPending(): (State<any> | Computed<any>)[] {
		const items = [...this.#pending] as (State<any> | Computed<any>)[];
		this.#pending.clear();
		return items;
	}

	notifyDirty(source: SignifyNode): void {
		if (this.#disposed) return;
		const wasEmpty = this.#pending.size === 0;
		this.#pending.add(source);
		if (wasEmpty) {
			try {
				this.#notify.call(this);
			} catch (err) {
				console.error('Signify.subtle.Watcher notify callback error:', err);
			}
		}
	}

	notifyCheckDirty(source: SignifyNode): void {
		this.notifyDirty(source);
	}

	/**
	 * Detaches all watched signals.
	 */
	dispose(): void {
		if (this.#disposed) return;
		this.#disposed = true;
		for (const source of this.#sources)
			source.removeConsumer(this);

		this.#sources.clear();
		this.#pending.clear();
	}

	[Symbol.dispose](): void {
		this.dispose();
	}
}

/**
 * Executes a function with dependency tracking temporarily suppressed.
 * Any signals read inside `fn` will not be recorded as dependencies.
 * @internal Prefer `Signify.subtle.untrack` or `Signal.subtle.untrack`.
 */
export function untrack<T>(fn: () => T): T {
	const prevSuppressed = trackingSuppressed;
	trackingSuppressed = true;
	try {
		return fn();
	} finally {
		trackingSuppressed = prevSuppressed;
	}
}

/**
 * Returns the currently evaluating computed signal, or undefined if not inside a computed.
 * @internal Prefer `Signify.subtle.currentComputed` or `Signal.subtle.currentComputed`.
 */
export function currentComputed(): Computed<any> | undefined {
	return activeConsumer instanceof Computed ? activeConsumer : undefined;
}

/**
 * Ergonomic callable writable signal returned by `signify(initialValue)`.
 */
export interface WritableSignal<T> extends SignifyNode {
	/** Read the current value and register dependency tracking */
	(): T;
	/** Update the value, notify dependent consumers, and return the updated value */
	(value: T): T;
	/** Explicit TC39 getter */
	get(): T;
	/** Explicit TC39 setter */
	set(value: T): void;
	/** Property getter/setter */
	value: T;
	/** Readonly epoch version counter */
	readonly epoch: number;
	readonly [Symbol.toStringTag]: 'Signify';
}

/**
 * Ergonomic callable readonly signal returned by `Signify.computed(fn)` or `Signify.from(stream, initial)`.
 */
export interface ReadonlySignal<T> extends SignifyNode, Disposable {
	/** Read the current memoized value and register dependency tracking */
	(): T;
	/** Explicit TC39 getter */
	get(): T;
	/** Property getter */
	readonly value: T;
	/** Readonly epoch version counter */
	readonly epoch: number;
	/** Explicit disposal */
	dispose(): void;
	readonly [Symbol.toStringTag]: 'Signify.Computed';
}

/**
 * Handle returned by `Signify.effect(fn)` supporting explicit cleanup.
 */
export interface EffectSubscription extends Disposable {
	/** Detaches the effect from all signals and runs cleanup */
	dispose(): void;
	/** Whether this effect has been disposed */
	readonly closed: boolean;
}

const scheduleMicrotask = isCallable((globalThis as any)?.queueMicrotask)
	? queueMicrotask
	: (fn: () => void) => Promise.resolve().then(fn);

/**
 * Creates an ergonomic, callable writable signal.
 * - Call `sig()` to read the value.
 * - Call `sig(newValue)` to update the value and return it.
 * - Or access `.value`, `.get()`, `.set()`.
 */
export function signify<T>(initialValue: T, options?: SignifyOptions<T>): WritableSignal<T> {
	const state = new State<T>(initialValue, options);

	const accessor = function (this: any, ...args: [T?]): any {
		if (args.length === 0)
			return state.get();

		state.set(args[0] as T);
		return state.get();
	} as WritableSignal<T>;

	Object.defineProperties(accessor, {
		get: { value: () => state.get(), writable: false, configurable: false },
		set: { value: (val: T) => state.set(val), writable: false, configurable: false },
		value: {
			get: () => state.get(),
			set: (val: T) => state.set(val),
			configurable: false,
			enumerable: true
		},
		epoch: {
			get: () => state.epoch,
			configurable: false,
			enumerable: true
		},
		addConsumer: { value: (c: SignifyConsumerNode) => state.addConsumer(c), writable: false, configurable: false },
		removeConsumer: { value: (c: SignifyConsumerNode) => state.removeConsumer(c), writable: false, configurable: false },
		poll: { value: () => state.poll(), writable: false, configurable: false },
		[Symbol.toStringTag]: { value: 'Signify', writable: false, configurable: false }
	});

	return Object.freeze(accessor);
}

/**
 * Creates an ergonomic, callable computed signal.
 * Lazily evaluated and memoized.
 */
export function computed<T>(computation: () => T, options?: SignifyOptions<T>): ReadonlySignal<T> {
	const comp = new Computed<T>(computation, options);

	const accessor = function (this: any): T {
		return comp.get();
	} as ReadonlySignal<T>;

	Object.defineProperties(accessor, {
		get: { value: () => comp.get(), writable: false, configurable: false },
		value: {
			get: () => comp.get(),
			configurable: false,
			enumerable: true
		},
		epoch: {
			get: () => comp.epoch,
			configurable: false,
			enumerable: true
		},
		addConsumer: { value: (c: SignifyConsumerNode) => comp.addConsumer(c), writable: false, configurable: false },
		removeConsumer: { value: (c: SignifyConsumerNode) => comp.removeConsumer(c), writable: false, configurable: false },
		poll: { value: () => comp.poll(), writable: false, configurable: false },
		dispose: { value: () => comp.dispose(), writable: false, configurable: false },
		[Symbol.dispose]: { value: () => comp.dispose(), writable: false, configurable: false },
		[Symbol.toStringTag]: { value: 'Signify.Computed', writable: false, configurable: false }
	});

	return Object.freeze(accessor);
}

/**
 * Runs a side-effect function immediately and re-runs it on a microtask whenever
 * any reactive signals read during its evaluation change.
 * 
 * Supports returning a cleanup callback: `() => void | (() => void)`.
 * Returns an `EffectSubscription` with `.dispose()` and `[Symbol.dispose]()`.
 */
export function effect(fn: () => void | (() => void)): EffectSubscription {
	if (!isCallable(fn))
		throw new TypeError('Signify.effect requires a function argument');

	let cleanup: (() => void) | void = undefined;
	let isClosed = false;
	let isScheduled = false;

	let comp: Computed<void | (() => void)> | null = null;
	let watcher: Watcher | null = null;

	const run = () => {
		if (isClosed) return;
		isScheduled = false;

		// Execute cleanup from prior evaluation
		if (isCallable(cleanup)) {
			try {
				cleanup();
			} catch (err) {
				console.error('Signify.effect cleanup error:', err);
			}
			cleanup = undefined;
		}

		if (watcher && comp)
			watcher.getPending();

		try {
			cleanup = comp?.get();
		} catch (err) {
			console.error('Signify.effect evaluation error:', err);
		}
	};

	const schedule = () => {
		if (isClosed || isScheduled) return;
		isScheduled = true;
		scheduleMicrotask(run);
	};

	comp = new Computed(fn);
	watcher = new Watcher(schedule);
	watcher.watch(comp);

	// Evaluate immediately
	run();

	const subscription: EffectSubscription = {
		get closed(): boolean {
			return isClosed;
		},
		dispose(): void {
			if (isClosed) return;
			isClosed = true;

			if (isCallable(cleanup)) {
				try {
					cleanup();
				} catch (err) {
					console.error('Signify.effect cleanup error:', err);
				}
				cleanup = undefined;
			}

			if (watcher) {
				watcher.dispose();
				watcher = null;
			}
			if (comp) {
				comp.dispose();
				comp = null;
			}
		},
		[Symbol.dispose](): void {
			this.dispose();
		}
	};

	return Object.freeze(subscription);
}

/**
 * Bridges an async source (such as Pledge or Reactive) into a synchronous Signify signal.
 * Dispatches to the source's native `.toSignal()` implementation.
 */
function from<T, D = undefined>(
	source: { toSignal(initial?: D): ReadonlySignal<T | D> },
	initialValue?: D
): ReadonlySignal<T | D> {
	if (source && isCallable((source as any).toSignal))
		return (source as any).toSignal(initialValue);
	throw new TypeError('Signify.from requires an object implementing .toSignal()');
}

// Aliases for export assignment
const StateClass = State;
const ComputedClass = Computed;
const WatcherClass = Watcher;
const untrackFn = untrack;
const currentComputedFn = currentComputed;
const StateFlagConst = StateFlag;
const computedFn = computed;
const effectFn = effect;
const fromFn = from;

/**
 * Primary reactive namespace in @magmacomputing/library.
 */
export namespace Signify {
	export const State = StateClass;
	export type State<T> = InstanceType<typeof StateClass<T>>;

	export const Computed = ComputedClass;
	export type Computed<T> = InstanceType<typeof ComputedClass<T>>;

	export const StateFlag = StateFlagConst;
	export type StateFlag = ValueOf<typeof StateFlagConst>;

	export const computed = computedFn;
	export const effect = effectFn;
	export const from = fromFn;

	export namespace subtle {
		export const Watcher = WatcherClass;
		export type Watcher = InstanceType<typeof WatcherClass>;
		export const untrack = untrackFn;
		export const currentComputed = currentComputedFn;
	}
}

/**
 * Declaration merging for the callable `signify` function.
 * Exposes static constructor and helper methods on the callable function.
 */
export namespace signify {
	export const State = StateClass;
	export type State<T> = InstanceType<typeof StateClass<T>>;

	export const Computed = ComputedClass;
	export type Computed<T> = InstanceType<typeof ComputedClass<T>>;

	export const StateFlag = StateFlagConst;
	export type StateFlag = ValueOf<typeof StateFlagConst>;

	export const computed = computedFn;
	export const effect = effectFn;
	export const from = fromFn;

	export namespace subtle {
		export const Watcher = WatcherClass;
		export type Watcher = InstanceType<typeof WatcherClass>;
		export const untrack = untrackFn;
		export const currentComputed = currentComputedFn;
	}
}

// Attach Signify static namespace members to the signify callable factory
Object.assign(signify, {
	State: StateClass,
	Computed: ComputedClass,
	StateFlag: StateFlagConst,
	computed: computedFn,
	effect: effectFn,
	from: fromFn,
	subtle: Signify.subtle,
});

/**
 * Resolves the host environment's native TC39 Signal implementation if present,
 * validating via assertion.library that it satisfies the required contract (State, Computed, Watcher).
 */
const NativeSignal = (() => {
	try {
		const candidate = (globalThis as any)?.Signal;
		if (
			isCallable(candidate?.State) &&
			isCallable(candidate?.Computed) &&
			isCallable(candidate?.subtle?.Watcher)
		) {
			return candidate;
		}
	} catch {
		// Guard against throwing proxy getters or sandbox security traps on globalThis
	}
	return undefined;
})();

/**
 * TC39 Signal namespace mirror for forward compatibility.
 * Automatically delegates to native `globalThis.Signal` when available (Stage 4+),
 * or falls back to Tempo's `Signify` engine.
 */
export namespace Signal {
	export const State = (NativeSignal?.State ?? StateClass) as typeof StateClass;
	export type State<T> = InstanceType<typeof StateClass<T>>;

	export const Computed = (NativeSignal?.Computed ?? ComputedClass) as typeof ComputedClass;
	export type Computed<T> = InstanceType<typeof ComputedClass<T>>;

	export namespace subtle {
		export const Watcher = (NativeSignal?.subtle?.Watcher ?? WatcherClass) as typeof WatcherClass;
		export type Watcher = InstanceType<typeof WatcherClass>;
		export const untrack = (NativeSignal?.subtle?.untrack ?? untrackFn) as typeof untrackFn;
		export const currentComputed = (NativeSignal?.subtle?.currentComputed ?? currentComputedFn) as typeof currentComputedFn;
	}
}

// Guarantee complete immutability of the reactive namespaces against external monkey-patching
Object.freeze(Signify.subtle);
Object.freeze(Signify);
Object.freeze(signify.subtle);
Object.freeze(signify);
Object.freeze(Signal.subtle);
Object.freeze(Signal);

