import { objectify, stringify } from '#library/serialize.library.js';
import { CONTEXT, getContext } from '#library/utility.library.js';
import { isDefined, isUndefined, isString } from '#library/assertion.library.js';

const context = getContext();

/** Creates an in-memory Storage object fallback for environments without native Storage support */
export const createMemoryStorage = (): Storage => {
	const map = new Map<string, string>();
	return {
		get length() { return map.size; },
		clear: () => map.clear(),
		getItem: (key: string) => map.get(key) ?? null,
		key: (index: number) => Array.from(map.keys())[index] ?? null,
		removeItem: (key: string) => { map.delete(key); },
		setItem: (key: string, value: string) => { map.set(key, String(value)); },
	};
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
			typeof target.getItem === 'function' &&
			typeof target.setItem === 'function' &&
			typeof target.removeItem === 'function' &&
			typeof target.clear === 'function' &&
			typeof target.key === 'function' &&
			typeof target.length === 'number'
		) return target;
	} catch {
		// Ignore SecurityError / ReferenceError in restricted sandboxes
	}
	return getMemoryStorage(name);
}

let storage = context.type === CONTEXT.Browser
	? getSafeStorage()
	: createMemoryStorage();

const nodeStorage = new Map<string, string | undefined>();

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

/**
 * Sets or deletes a value in the active storage mechanism across any runtime environment.
 * Automatically serializes objects for safe storage.
 * 
 * @param key - The storage key to set
 * @param val - The value to store (if undefined, the key is deleted)
 * @example
 * ```ts
 * setStorage('user', { name: 'Alice' });
 * setStorage('user', undefined); // deletes 'user'
 * ```
 */
export function setStorage<T>(key: string, val?: T) {
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
			nodeStorage.set(key, stash);
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