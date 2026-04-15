/**
 * This file verifies native Temporal API support.
 * It does NOT import or bundle any polyfill.
 * If Temporal is not available, a clear error is thrown.
 *
 * Consumers who need polyfill support should load one
 * (e.g. `@js-temporal/polyfill`) at their application
 * entry point, before importing this library.
 */

if (typeof globalThis.Temporal === 'undefined') {
	throw new Error(
		'Temporal API is not available. ' +
		'Please use a runtime with native Temporal support (Node 22+, Deno, Bun) ' +
		'or load a polyfill (e.g. @js-temporal/polyfill) before importing this library.'
	);
}

export { }
