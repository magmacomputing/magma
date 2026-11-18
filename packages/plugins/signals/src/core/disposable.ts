import { Finalizer, type SignifyNode } from '@magmacomputing/tempo/plugin/sdk';
import type { DisposableSignal } from '../types/index.js';

/**
 * Wraps a `SignifyNode` (such as `Signify.State` or `Signify.Computed`) into a frozen,
 * callable `DisposableSignal<T>` with automatic `Finalizer`-backed GC cleanup.
 *
 * @internal
 */
export function createDisposableSignal<T>(
	source: SignifyNode & { get(): T },
	onDispose: () => void,
	tag: 'Signify.Computed' | 'Signify' = 'Signify.Computed',
): DisposableSignal<T> {
	let isDisposed = false;

	const accessor = function (this: any): T {
		return source.get();
	} as DisposableSignal<T>;

	const unregisterFinalizer = Finalizer.register(accessor, onDispose);

	const dispose = (): void => {
		if (isDisposed)
			return;
		isDisposed = true;
		unregisterFinalizer();
		onDispose();
	};

	Object.defineProperties(accessor, {
		get: { value: () => source.get(), writable: false, configurable: false },
		value: {
			get: () => source.get(),
			configurable: false,
			enumerable: true,
		},
		epoch: {
			get: () => source.epoch,
			configurable: false,
			enumerable: true,
		},
		disposed: {
			get: () => isDisposed,
			configurable: false,
			enumerable: true,
		},
		addConsumer: { value: (consumer: any) => source.addConsumer(consumer), writable: false, configurable: false },
		removeConsumer: { value: (consumer: any) => source.removeConsumer(consumer), writable: false, configurable: false },
		poll: { value: () => source.poll(), writable: false, configurable: false },
		dispose: { value: dispose, writable: false, configurable: false },
		[Symbol.dispose]: { value: dispose, writable: false, configurable: false },
		[Symbol.toStringTag]: { value: tag, writable: false, configurable: false },
	});

	return Object.freeze(accessor);
}
