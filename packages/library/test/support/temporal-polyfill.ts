/**
 * Test / REPL harness: installs `@js-temporal/polyfill` onto `globalThis.Temporal`
 * when the runtime has no native Temporal (Node < 26).
 *
 * The polyfill's `Temporal` namespace is frozen (`Now` is non-configurable), which breaks
 * Vitest 5 fake timers: `vi.useFakeTimers()` clones the namespace descriptors and then
 * redefines `Now`, throwing `TypeError: Cannot redefine property: Now`.
 * We therefore install a shallow copy whose own properties are configurable/writable.
 *
 * This is intentionally NOT part of the published library: the library never installs
 * a polyfill or mutates `globalThis` (see `src/common/temporal/temporal.polyfill.ts`).
 */
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

export { };
