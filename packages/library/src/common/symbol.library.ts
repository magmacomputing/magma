/**
 * Centralized registry for all Global Symbols used across the Magma monorepo.
 * These symbols utilize Symbol.for() to ensure consistency across module boundaries.
 */

export const $Target: unique symbol = Symbol.for('$LibraryTarget') as any;
export const $Discover: unique symbol = Symbol.for('$LibraryDiscover') as any;
export const $Extensible: unique symbol = Symbol.for('$LibraryExtensible') as any;
export const $Inspect: unique symbol = Symbol.for('nodejs.util.inspect.custom') as any;
export const $LogConfig: unique symbol = Symbol.for('$LibraryLogConfig') as any;
export const $Registry: unique symbol = Symbol.for('$LibraryRegistry') as any;
export const $Register: unique symbol = Symbol.for('$LibraryRegister') as any;
export const $SerializerRegistry: unique symbol = Symbol.for('$LibrarySerializerRegistry') as any;
export const $ImmutableSkip: unique symbol = Symbol.for('$LibraryImmutableSkip') as any;
export const $Identity: unique symbol = Symbol.for('$LibraryIdentity') as any;

export const sym = {
	$Target, $Discover, $Extensible, $Inspect, $LogConfig, $Registry, $Register, $SerializerRegistry, $Identity, $ImmutableSkip
} as const;

/** identify and mark a logging configuration object */
export function markConfig<T extends object>(obj: T): T {
	if (!(obj as any)[sym.$LogConfig] && Object.isExtensible(obj))
		Object.defineProperty(obj, sym.$LogConfig, { value: true, enumerable: false, writable: true, configurable: true });

	return obj;
}
