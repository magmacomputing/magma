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
/** Global symbol for marking objects that should skip immutability enforcement */
export const $ImmutableSkip: unique symbol = Symbol.for('$LibraryImmutableSkip') as any;
/** Global symbol for brand-checking class instances across module boundaries */
export const $Identity: unique symbol = Symbol.for('$LibraryIdentity') as any;

export const sym = {
	$Target, $Discover, $Extensible, $Inspect, $LogConfig, $Registry, $Register, $SerializerRegistry, $Identity, $ImmutableSkip
} as const;

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
export function markConfig<T extends object>(obj: T): T {
	if (!(obj as any)[sym.$LogConfig] && Object.isExtensible(obj))
		Object.defineProperty(obj, sym.$LogConfig, { value: true, enumerable: false, writable: true, configurable: true });

	return obj;
}
