import { Temporal } from '@js-temporal/polyfill';

// Filter only Node's experimental localStorage warning without hiding real deprecation or memory leak warnings
if (typeof process !== 'undefined' && process.on) {
	const existingWarningListeners = process.listeners('warning');
	process.removeAllListeners('warning');
	process.on('warning', (warning) => {
		if (warning.name === 'ExperimentalWarning' && warning.message.includes('localStorage')) return;
		if (existingWarningListeners.length > 0) {
			existingWarningListeners.forEach((listener) => listener(warning));
		} else {
			console.warn(`[${warning.name}] ${warning.message}`);
		}
	});
}

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
