/**
 * Centralized registry for all Global Symbols used across the Magma monorepo.
 * These symbols utilize Symbol.for() to ensure consistency across module boundaries.
 */

/** Global symbol for identifying target objects in the library system */
export const $Target: unique symbol = Symbol.for('$LibraryTarget') as any;
/** Global symbol for marking discoverable entities in the library system */
export const $Discover: unique symbol = Symbol.for('$LibraryDiscover') as any;
/** Global symbol for tracking extensible objects in the library system */
export const $Extensible: unique symbol = Symbol.for('$LibraryExtensible') as any;
/** Global symbol for Node.js custom inspection (used by util.inspect) */
export const $Inspect: unique symbol = Symbol.for('nodejs.util.inspect.custom') as any;
/** Global symbol for identifying logging configuration objects */
export const $LogConfig: unique symbol = Symbol.for('$LibraryLogConfig') as any;
/** Global symbol for accessing the type registry */
export const $Registry: unique symbol = Symbol.for('$LibraryRegistry') as any;
/** Global symbol for marking registered types */
export const $Register: unique symbol = Symbol.for('$LibraryRegister') as any;
/** Global symbol for accessing the serializer registry */
export const $SerializerRegistry: unique symbol = Symbol.for('$LibrarySerializerRegistry') as any;
/** Global symbol for marking class members exempt from immutability enforcement */
export const $Mutable: unique symbol = Symbol.for('$LibraryMutable') as any;
/** Global symbol for brand-checking class instances across module boundaries */
export const $Identity: unique symbol = Symbol.for('$LibraryIdentity') as any;
/** Global symbol for opting out of class decorator subclass wrapping */
export const $Unwrapped: unique symbol = Symbol.for('$LibraryUnwrapped') as any;

export const sym = {
	$Target, $Discover, $Extensible, $Inspect, $LogConfig, $Registry, $Register, $SerializerRegistry, $Identity, $Mutable, $Unwrapped
} as const;

import type { LooseSymbol, ValueOf } from '#library/type.library.js';

/**
 * Union of all global symbols managed by the library registry.
 */
export type LibrarySymbol = ValueOf<typeof sym>

/**
 * @internal
 * Attaches or updates a non-enumerable global symbol on an object if extensible and not already marked with the same value.
 *
 * @param obj - The target object to mark
 * @param symbol - The symbol identifier to attach
 * @param value - Optional payload or boolean marker (default: true)
 * @returns The target object
 * @example
 * ```ts
 * markSymbol(target, sym.$Extensible);
 * ```
 */
export function markSymbol<T extends object>(obj: T, symbol: LooseSymbol<LibrarySymbol>, value: any = true): T {
	if (obj !== null && (typeof obj === 'object' || typeof obj === 'function') && typeof symbol === 'symbol' && !(symbol in obj && (obj as any)[symbol] === value) && Object.isExtensible(obj)) {
		try {
			Object.defineProperty(obj, symbol, { value, enumerable: false, writable: true, configurable: true });
		} catch { }
	}
	return obj;
}

/**
 * Identifies and marks an object as a logging configuration object using a global symbol.
 * This allows the library to securely differentiate configs from regular objects.
 * 
 * @param obj - The configuration object to mark
 * @returns The marked object
 * @example
 * ```ts
 * const cfg = markConfig({ level: 'debug' });
 * ```
 */
export const markConfig = <T extends object>(obj: T): T => markSymbol(obj, sym.$LogConfig);

/**
 * Marks an object as explicitly extensible using a global symbol to exempt it from recursive deep-freezing.
 *
 * @param obj - The object to mark
 * @returns The marked object
 * @example
 * ```ts
 * const registry = markExtensible([]);
 * ```
 */
export const markExtensible = <T extends object>(obj: T): T => markSymbol(obj, sym.$Extensible);

