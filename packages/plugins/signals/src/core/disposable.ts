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
	let frozenValue: T | undefined = undefined;
	let hasFrozenValue = false;
	let frozenEpoch = 0;

	const readValue = (): T => (isDisposed && hasFrozenValue) ? (frozenValue as T) : source.get();

	const accessor = function (this: any): T {
		return readValue();
	} as DisposableSignal<T>;

	const unregisterFinalizer = Finalizer.register(accessor, onDispose);

	const dispose = (): void => {
		if (isDisposed)
			return;
		try {
			frozenValue = source.get();
			hasFrozenValue = true;
			frozenEpoch = source.epoch;
		} catch {
			// Ignore if source was already disposed
		}
		isDisposed = true;
		unregisterFinalizer();
		onDispose();
		if (typeof (source as any).dispose === 'function')
			(source as any).dispose();
	};

	Object.defineProperties(accessor, {
		get: { value: readValue, writable: false, configurable: false },
		value: {
			get: readValue,
			configurable: false,
			enumerable: true,
		},
		epoch: {
			get: () => (isDisposed ? frozenEpoch : source.epoch),
			configurable: false,
			enumerable: true,
		},
		disposed: {
			get: () => isDisposed,
			configurable: false,
			enumerable: true,
		},
		addConsumer: {
			value: (consumer: any) => {
				if (!isDisposed)
					source.addConsumer(consumer);
			},
			writable: false,
			configurable: false,
		},
		removeConsumer: { value: (consumer: any) => source.removeConsumer(consumer), writable: false, configurable: false },
		poll: {
			value: () => (isDisposed ? false : source.poll()),
			writable: false,
			configurable: false,
		},
		dispose: { value: dispose, writable: false, configurable: false },
		[Symbol.dispose]: { value: dispose, writable: false, configurable: false },
		[Symbol.toStringTag]: { value: tag, writable: false, configurable: false },
	});

	return Object.freeze(accessor);
}
