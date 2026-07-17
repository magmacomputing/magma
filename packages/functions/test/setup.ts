import { Temporal } from '@js-temporal/polyfill';

if (typeof globalThis.Temporal === 'undefined') {
	Object.defineProperty(globalThis, 'Temporal', {
		value: Temporal,
		enumerable: false,
		configurable: true,
		writable: true,
	});
}
