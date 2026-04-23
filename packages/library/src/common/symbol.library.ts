/**
 * Centralized registry for all Global Symbols used across the Magma monorepo.
 * These symbols utilize Symbol.for() to ensure consistency across module boundaries.
 */

export const sym = {
	/** key to use for identifying the raw target of a Proxy */
	$Target: Symbol.for('$LibraryTarget'),
	/** key to trigger full discovery of all lazy properties */
	$Discover: Symbol.for('$LibraryDiscover'),
	/** key to identify objects that should remain extensible */
	$Extensible: Symbol.for('$LibraryExtensible'),
	/** NodeJS custom inspection symbol for the Proxy pattern */
	$Inspect: Symbol.for('nodejs.util.inspect.custom'),
	/** unique marker to identify a Logify configuration object */
	$Logify: Symbol.for('$LibraryLogify'),
	/** key to identify the global type registry */
	$Registry: Symbol.for('$LibraryRegistry'),
	/** key to identify the global registration hook */
	$Register: Symbol.for('$LibraryRegister'),
	/** key to identify the global serialization registry */
	$SerializerRegistry: Symbol.for('$LibrarySerializerRegistry'),
	/** universal key to identify a trusted Class or Instance brand */
	$Identity: Symbol.for('$LibraryIdentity'),
} as const;

/** identify and mark a Logify configuration object */
export function markConfig<T extends object>(obj: T): T {
	if (!(obj as any)[sym.$Logify] && Object.isExtensible(obj))
		Object.defineProperty(obj, sym.$Logify, { value: true, enumerable: false, writable: true, configurable: true });

	return obj;
}
