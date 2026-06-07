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

import { asError } from './coercion.library.js';

// 🛡️ Sane Implementation Check
// Some early native implementations (e.g. Node 22.0.x) are incomplete and crash on basic arithmetic.
// If you encounter "unimplemented code" or V8_Fatal crashes, manually load a polyfill before Tempo.
try {
	// Minimal test for a feature known to be a stub in early implementations
	if (typeof Temporal.Now.zonedDateTimeISO === 'function') {
		const zdt = Temporal.Now.zonedDateTimeISO();
		if (typeof zdt.add !== 'function') throw new Error('Incomplete Temporal implementation');
	}
} catch (err: unknown) {
	const error = asError(err);
	console.warn('Tempo: Native Temporal implementation appears incomplete. Consider loading a polyfill.', error);
	if (error.message !== 'Incomplete Temporal implementation')
		throw error;
}

export { }
