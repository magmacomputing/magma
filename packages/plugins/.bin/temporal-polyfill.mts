import { Temporal } from '@js-temporal/polyfill';

if (typeof globalThis.Temporal === 'undefined' || Object.getOwnPropertyDescriptor(globalThis.Temporal, 'Now')?.configurable === false) {
	const src = typeof globalThis.Temporal !== 'undefined' ? globalThis.Temporal : Temporal;
	const configurableTemporal = Object.create(Object.getPrototypeOf(src));
	for (const k of Reflect.ownKeys(src)) {
		const desc = Object.getOwnPropertyDescriptor(src, k);
		if (desc) {
			Object.defineProperty(configurableTemporal, k, {
				...desc,
				configurable: true,
				...('writable' in desc ? { writable: true } : {}),
			});
		}
	}
	Object.defineProperty(globalThis, 'Temporal', {
		value: configurableTemporal,
		enumerable: false,
		configurable: true,
		writable: true,
	});
}