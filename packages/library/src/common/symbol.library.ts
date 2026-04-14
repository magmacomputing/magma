/**
 * Centralized registry for all Global Symbols used across the Magma monorepo.
 * These symbols utilize Symbol.for() to ensure consistency across module boundaries.
 */

const $Target = Symbol.for('$LibraryTarget');
const $Discover = Symbol.for('$LibraryDiscover');
const $Extensible = Symbol.for('$LibraryExtensible');
const $Inspect = Symbol.for('nodejs.util.inspect.custom');
const $Logify = Symbol.for('$LibraryLogify');
const $Registry = Symbol.for('$LibraryRegistry');
const $Register = Symbol.for('$LibraryRegister');

/** identify and mark a Logify configuration object */			export function markConfig<T extends object>(obj: T): T {
	if (!(obj as any)[$Logify] && Object.isExtensible(obj)) {
		Object.defineProperty(obj, $Logify, { value: true, enumerable: false, writable: true, configurable: true });
	}
	return obj;
}

export default {
/** key to use for identifying the raw target of a Proxy */	$Target,
/** key to trigger full discovery of all lazy properties */	$Discover,
/** key to identify objects that should remain extensible */$Extensible,
/** NodeJS custom inspection symbol for the Proxy pattern */$Inspect,
/** unique marker to identify a Logify configuration object */$Logify,
/** key to identify the global type registry */							$Registry,
/** key to identify the global registration hook */					$Register,
}

