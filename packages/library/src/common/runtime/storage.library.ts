import { objectify, stringify } from '#library/serialize.library.js';
import { CONTEXT, getContext } from '#library/utility.library.js';
import { isDefined, isUndefined, isString, isCallable, isNumber } from '#library/assertion.library.js';
import { BoundedCache } from '#library/cache.class.js';
import { Finalizer } from './finalizer.class.js';
import { signify, type WritableSignal } from './signify.library.js';

const context = getContext();

/** Creates an in-memory Storage object fallback for environments without native Storage support */
export const createMemoryStorage = (maxSize = 1000, ttl = Infinity): Storage => {
	const map = new BoundedCache<string, string>(maxSize, ttl);
	return {
		get length() { return map.size; },
		clear: () => map.clear(),
		getItem: (key: string) => map.get(key) ?? null,
		key: (index: number) => Array.from(map.keys())[index] ?? null,
		removeItem: (key: string) => { map.delete(key); },
		setItem: (key: string, value: string) => { map.set(key, String(value)); },
	}
}

const memoryStores = new Map<string, Storage>();

/**
 * Retrieves or creates a named in-memory Storage instance for environments without native Storage support.
 *
 * @param name - The identifier for the memory storage instance
 * @returns A Storage-compatible object backed by in-memory Map
 */
export const getMemoryStorage = (name: string): Storage => {
	let store = memoryStores.get(name);
	if (!store) {
		store = createMemoryStorage();
		memoryStores.set(name, store);
	}
	return store;
};

/** Safely attempt to retrieve a Storage object from globalThis or fallback to memory storage */
export const getSafeStorage = (name: 'localStorage' | 'sessionStorage' = 'localStorage'): Storage => {
	try {
		const target = globalThis?.[name];
		if (
			target &&
			isCallable(target.getItem) &&
			isCallable(target.setItem) &&
			isCallable(target.removeItem) &&
			isCallable(target.clear) &&
			isCallable(target.key) &&
			isNumber(target.length)
		) return target;
	} catch {
		// Ignore SecurityError / ReferenceError in restricted sandboxes
	}
	return getMemoryStorage(name);
}

let storage = context.type === CONTEXT.Browser
	? getSafeStorage()
	: createMemoryStorage();

export const nodeStorage = new BoundedCache<string, string | undefined>(1000, Infinity);

/**
 * Selects the active browser storage mechanism (localStorage or sessionStorage).
 * 
 * @param store - The storage type to use (default: 'local')
 * @returns The selected Storage object
 */
export function selStorage(store: 'local' | 'session' = 'local') {
	const name = (store + 'Storage') as `${typeof store}Storage`;
	return storage = getSafeStorage(name);
}

/**
 * Helper to safely retrieve environment variable values without static AST process.env MemberExpressions.
 * Uses dynamic reflection to avoid bundler optimizations and static analysis.
 *
 * @param key - The environment variable name to retrieve
 * @returns The environment variable value, or undefined if not available
 * @internal
 */
const getEnvVar = (key: string): string | undefined => {
	try {
		const proc = Reflect.get(context.global, 'process');
		if (!proc || typeof proc !== 'object') return undefined;
		const env = Reflect.get(proc, 'env');
		if (!env || typeof env !== 'object') return undefined;
		return Reflect.get(env, key);
	} catch {
		return undefined;
	}
}

/**
 * Retrieves a value from the active storage mechanism across any runtime environment
 * (Browser, NodeJS, Deno, GoogleAppsScript). Rebuilds serialized objects automatically.
 * 
 * @param key - The storage key to lookup
 * @param dflt - The fallback value if the key does not exist
 * @returns The deserialized value, or the default value
 * @example
 * ```ts
 * const user = getStorage<{ name: string }>('user', { name: 'Guest' });
 * ```
 */
export function getStorage<T>(): T;
export function getStorage<T>(key: string): T | undefined;
export function getStorage<T>(key: string | undefined, dflt?: T): T;
export function getStorage<T>(key?: string, dflt?: T): T | undefined {
	let store: string | undefined | null;

	if (isUndefined(key))
		return dflt ?? {} as T;

	switch (context.type) {
		case CONTEXT.Browser:
			store = storage.getItem(key);
			break;

		case CONTEXT.NodeJS:
			store = nodeStorage.has(key) ? nodeStorage.get(key) : getEnvVar(key);
			break;

		case CONTEXT.Deno:
			store = context.global.Deno.env.get(key);
			break;

		case CONTEXT.GoogleAppsScript:
			store = context.global.PropertiesService?.getUserProperties().getProperty(key);
			break;

		case CONTEXT.WebWorker:
		case CONTEXT.Unknown:
			store = undefined;
			break;

		default:
			throw new Error(`Cannot determine Javascript context: ${context.type}`);
	}

	return isString(store)
		? objectify<T>(store)																		// rebuild object from its stringified representation
		: dflt;
}

/** Options for fine-grained cache control in server storage contexts */
export interface ServerStorageOptions {
	/** Custom time-to-live in milliseconds for this specific entry */
	ttl?: number;
	/** If true, registers as an immortal static key immune to LRU capacity eviction and TTL */
	static?: boolean;
}

/**
 * Sets or deletes a value in the active storage mechanism across any runtime environment.
 * Automatically serializes objects for safe storage.
 * 
 * @param key - The storage key to set
 * @param val - The value to store (if undefined, the key is deleted)
 * @param options - Optional cache control options (server context only)
 * @example
 * ```ts
 * setStorage('user', { name: 'Alice' });
 * setStorage('user', undefined); // deletes 'user'
 * setStorage('coords', { lat: 10, lng: 20 }, { ttl: 86400000 }); // expires after 24h
 * ```
 */
export function setStorage<T>(key: string, val?: T): void;
export function setStorage<T>(key: string, val: T | undefined, options: ServerStorageOptions): void;
export function setStorage<T>(key: string, val?: T, options?: ServerStorageOptions): void {
	const stash = isDefined(val) ? stringify(val) : undefined;
	const set = isDefined(stash);

	switch (context.type) {
		case CONTEXT.Browser:
			try {
				set
					? storage.setItem(key, stash)
					: storage.removeItem(key);
			} catch (e) {
				console.warn(`[Storage] Failed to ${set ? 'setItem' : 'removeItem'} for key '${key}':`, e);
			}
			break;

		case CONTEXT.NodeJS:
			if (!set) {
				nodeStorage.set(key, undefined, options?.ttl);
			} else if (options?.static) {
				nodeStorage.setStatic(key, stash);
			} else {
				nodeStorage.set(key, stash, options?.ttl);
			}
			break;

		case CONTEXT.Deno:
			set
				? context.global.Deno.env.set(key, stash)
				: context.global.Deno.env.delete(key);
			break;

		case CONTEXT.GoogleAppsScript:
			set
				? context.global.PropertiesService?.getUserProperties().setProperty(key, stash)
				: context.global.PropertiesService?.getUserProperties().deleteProperty(key)
			break;

		case CONTEXT.WebWorker:
		case CONTEXT.Unknown:
			break;

		default:
			throw new Error(`Cannot determine Javascript context: ${context.type}`);
	}
}

/**
 * Clears in-memory storage entries across environments (NodeJS nodeStorage, Browser memory storage).
 */
export function clearStorage(): void {
	switch (context.type) {
		case CONTEXT.Browser:
			try {
				for (const store of memoryStores.values())
					store.clear();
			} catch {
				// ignore
			}
			break;

		case CONTEXT.NodeJS:
			nodeStorage.clear();
			storage.clear();
			break;

		default:
			storage.clear();
			break;
	}
}

/**
 * Safely determines if the current execution context is in a unit-testing environment (e.g. Vitest, Jest, or CI).
 * Uses universal getStorage API to avoid direct environment variable AST inspection.
 *
 * @returns True if running in a test suite or CI environment
 */
export const isTestEnvironment = (): boolean => {
	return Boolean(
		context.global.VITEST ||
		context.global.__VITEST_ENVIRONMENT__ ||
		getStorage<boolean>('TEMPO_TESTING', false) ||
		getStorage<string>('NODE_ENV', '') === 'test' ||
		getStorage<boolean>('CI', false)
	);
};

interface StorageSignalBinding {
	update: (val: any) => void;
	defaultValue: any;
}

const STORAGE_SUBSCRIBERS = new Map<string, Set<StorageSignalBinding>>();
let storageListenerRegistered = false;

function ensureStorageListener(): void {
	if (storageListenerRegistered) return;
	if (context.type === CONTEXT.Browser && isCallable(context.global?.addEventListener)) {
		try {
			context.global.addEventListener('storage', (event: any) => {
				if (event.key === null) {
					// localStorage.clear() occurred: reload all bound keys with defaults
					for (const [key, bindings] of STORAGE_SUBSCRIBERS.entries()) {
						for (const binding of bindings) {
							const updated = getStorage(key, binding.defaultValue);
							binding.update(updated);
						}
					}
				} else if (STORAGE_SUBSCRIBERS.has(event.key)) {
					const bindings = STORAGE_SUBSCRIBERS.get(event.key)!;
					for (const binding of bindings) {
						const updated = getStorage(event.key, binding.defaultValue);
						binding.update(updated);
					}
				}
			});
			storageListenerRegistered = true;
		} catch {
			// ignore in restricted environments
		}
	}
}

function notifyStorageSubscribers(key: string, val: any, exclude?: StorageSignalBinding): void {
	const bindings = STORAGE_SUBSCRIBERS.get(key);
	if (bindings) {
		for (const binding of bindings) {
			if (binding !== exclude)
				binding.update(val);
		}
	}
}

/**
 * Creates a reactive WritableSignal synchronized with persistent storage.
 * - Call `sig()` to read the stored value (with automatic dependency tracking).
 * - Call `sig(newValue)` or set `sig.value = newValue` to update the signal and persist to storage.
 * - In browser environments, automatically listens to window 'storage' events for cross-tab synchronization.
 * 
 * @param key - The storage key to bind
 * @param defaultValue - Optional fallback value if key does not exist
 * @returns A WritableSignal bound to the persistent storage key
 * @internal
 */
export function toSignal<T>(key: string, defaultValue?: T): WritableSignal<T> {
	ensureStorageListener();

	let initial = getStorage<T>(key);
	if (isUndefined(initial) && isDefined(defaultValue)) {
		setStorage(key, defaultValue);
		notifyStorageSubscribers(key, defaultValue);
		initial = defaultValue;
	}
	const sig = signify<T>((initial ?? defaultValue) as T);

	const binding: StorageSignalBinding = {
		update: (val: any) => sig.set(val),
		defaultValue,
	};

	let keyBindings = STORAGE_SUBSCRIBERS.get(key);
	if (!keyBindings) {
		keyBindings = new Set();
		STORAGE_SUBSCRIBERS.set(key, keyBindings);
	}
	keyBindings.add(binding);

	let isDisposed = false;
	const dispose = () => {
		if (isDisposed) return;
		isDisposed = true;
		const set = STORAGE_SUBSCRIBERS.get(key);
		if (set) {
			set.delete(binding);
			if (set.size === 0) {
				STORAGE_SUBSCRIBERS.delete(key);
			}
		}
	};

	const accessor = function (this: any, ...args: [T?]): any {
		if (args.length === 0)
			return sig();

		const val = args[0] as T;
		setStorage(key, val);
		sig(val);
		notifyStorageSubscribers(key, val, binding);
		return val;
	} as WritableSignal<T>;

	Object.defineProperties(accessor, {
		get: { value: () => sig.get(), writable: false, configurable: false },
		set: {
			value: (val: T) => {
				setStorage(key, val);
				sig.set(val);
				notifyStorageSubscribers(key, val, binding);
			},
			writable: false,
			configurable: false
		},
		value: {
			get: () => sig.value,
			set: (val: T) => {
				setStorage(key, val);
				sig.value = val;
				notifyStorageSubscribers(key, val, binding);
			},
			configurable: false,
			enumerable: true
		},
		epoch: {
			get: () => sig.epoch,
			configurable: false,
			enumerable: true
		},
		addConsumer: { value: (c: any) => sig.addConsumer(c), writable: false, configurable: false },
		removeConsumer: { value: (c: any) => sig.removeConsumer(c), writable: false, configurable: false },
		poll: { value: () => sig.poll(), writable: false, configurable: false },
		dispose: { value: dispose, writable: false, configurable: false },
		[Symbol.dispose]: { value: dispose, writable: false, configurable: false },
		[Symbol.toStringTag]: { value: 'Signify', writable: false, configurable: false }
	});

	Finalizer.register(accessor, dispose);
	return Object.freeze(accessor);
}

// /** Alias for toSignal */
// export const storageSignal = toSignal;