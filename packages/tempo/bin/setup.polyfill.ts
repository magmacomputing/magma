/**
 * Test/Dev Polyfill Bootstrap
 *
 * This file loads the @js-temporal/polyfill into
 * globalThis so that the passive assertion in
 * temporal.polyfill.ts succeeds.
 *
 * This is the "bring your own polyfill" entry point
 * for development and testing environments that do
 * not yet have native Temporal support.
 */
import { Temporal } from '@js-temporal/polyfill';

if (typeof globalThis.Temporal === 'undefined') {
	Object.defineProperty(globalThis, 'Temporal', {
		value: Temporal,
		enumerable: false,
		configurable: true,
		writable: true,
	});
}
