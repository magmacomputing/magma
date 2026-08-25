import { objectify, stringify } from '#library/serialize.library.js';
import { CONTEXT, getContext } from '#library/utility.library.js';
import { isDefined, isUndefined, isString } from '#library/assertion.library.js';

const context = getContext();

/** simplified in-memory storage for restricted browser contexts */
const mockStorage: Storage = {
	length: 0,
	clear: () => { },
	getItem: (_key: string) => null,
	key: (_index: number) => null,
	removeItem: (_key: string) => { },
	setItem: (_key: string, _value: string) => { },
};

/** safely attempt to retrieve a Storage object from the global context */
const getSafeStorage = (name: 'localStorage' | 'sessionStorage' = 'localStorage'): Storage => {
	try {
		return context.global?.[name] ?? mockStorage;
	} catch {
		return mockStorage;
	}
};

let storage = context.type === CONTEXT.Browser
	? getSafeStorage()
	: mockStorage;

const nodeStorage = new Map<string, string>();
const deletedKeys = new Set<string>();

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
			store = nodeStorage.get(key) ?? (deletedKeys.has(key) ? undefined : context.global.process?.env?.[key]);
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
			if (set) {
				nodeStorage.set(key, stash);
				deletedKeys.delete(key);
				if (context.global.process?.env) context.global.process.env[key] = stash;
			} else {
				nodeStorage.delete(key);
				deletedKeys.add(key);
				if (context.global.process?.env) delete context.global.process.env[key];
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