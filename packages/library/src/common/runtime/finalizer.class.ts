import { StringTag } from '#library/decorator.library.js';
import { isFunction } from '#library/assertion.library.js';

/**
 * Global singleton finalization registry for general cleanup callbacks.
 */
const GLOBAL_FINALIZER_REGISTRY = new FinalizationRegistry<() => void>((cleanup) => {
	try {
		if (isFunction(cleanup)) cleanup();
	} catch (err) {
		console.error('Finalizer callback error:', err);
	}
});

/**
 * ## Finalizer
 * Wrapper around FinalizationRegistry providing typed, safe resource cleanup
 * callbacks triggered when objects are reclaimed by the Garbage Collector.
 */
@StringTag('Finalizer')
export class Finalizer<T = void> {
	readonly #registry: FinalizationRegistry<T>;

	constructor(callback: (heldValue: T) => void) {
		this.#registry = new FinalizationRegistry((heldValue: T) => {
			try {
				callback(heldValue);
			} catch (err) {
				console.error('Finalizer callback error:', err);
			}
		});
	}

	/**
	 * Returns true to identify this instance as a Finalizer.
	 */
	get isFinalizer(): boolean {
		return true;
	}

	/**
	 * Registers a target object with a held value and optional unregister token.
	 *
	 * @param target - The object to observe for garbage collection
	 * @param heldValue - The value passed to the cleanup callback
	 * @param unregisterToken - Optional token to unregister the callback prior to GC
	 */
	register(target: WeakKey, heldValue: T, unregisterToken?: WeakKey): void {
		this.#registry.register(target, heldValue, unregisterToken);
	}

	/**
	 * Unregisters a previously registered finalizer callback.
	 *
	 * @param unregisterToken - The token used during registration
	 * @returns True if a registration was found and removed
	 */
	unregister(unregisterToken: WeakKey): boolean {
		return this.#registry.unregister(unregisterToken);
	}

	/**
	 * Registers an object to execute a cleanup callback when garbage collected.
	 * Returns a function to cancel the finalizer registration prior to GC.
	 *
	 * @param target - The target object to observe for garbage collection
	 * @param cleanup - The teardown callback to execute upon GC reclamation
	 * @param unregisterToken - Optional token used for unregistration (defaults to a unique token object)
	 * @returns A teardown function that cancels the finalization registration without retaining target
	 */
	static register(
		target: WeakKey,
		cleanup: () => void,
		unregisterToken?: WeakKey
	): () => boolean {
		const token = unregisterToken ?? Object.create(null);
		GLOBAL_FINALIZER_REGISTRY.register(target, cleanup, token);
		return () => GLOBAL_FINALIZER_REGISTRY.unregister(token);
	}
}
