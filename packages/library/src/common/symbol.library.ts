/**
 * Centralized registry for all Global Symbols used across the Magma monorepo.
 * These symbols utilize Symbol.for() to ensure consistency across module boundaries.
 */

export const $Target: unique symbol = Symbol.for('$LibraryTarget') as any;
export const $Discover: unique symbol = Symbol.for('$LibraryDiscover') as any;
export const $Extensible: unique symbol = Symbol.for('$LibraryExtensible') as any;
export const $Inspect: unique symbol = Symbol.for('nodejs.util.inspect.custom') as any;
export const $Logify: unique symbol = Symbol.for('$LibraryLogify') as any;
export const $Registry: unique symbol = Symbol.for('$LibraryRegistry') as any;
export const $Register: unique symbol = Symbol.for('$LibraryRegister') as any;
export const $SerializerRegistry: unique symbol = Symbol.for('$LibrarySerializerRegistry') as any;
export const $Identity: unique symbol = Symbol.for('$LibraryIdentity') as any;

export const sym = {
	$Target, $Discover, $Extensible, $Inspect, $Logify, $Registry, $Register, $SerializerRegistry, $Identity
} as const;

/** identify and mark a Logify configuration object */
export function markConfig<T extends object>(obj: T): T {
	if (!(obj as any)[sym.$Logify] && Object.isExtensible(obj))
		Object.defineProperty(obj, sym.$Logify, { value: true, enumerable: false, writable: true, configurable: true });

	return obj;
}
