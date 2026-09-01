import { enumify } from '#library/enumerate.library.js';
import { isEmpty, isFunction } from '#library/assertion.library.js';
import { StringTag } from '#library/decorator.library.js';
import type { ValueOf } from '#library/type.library.js';

/**
 * A Wrapper Class around HammerJS.
 * Manages single, double, and triple tap events on a given element.
 * 
 * @example
 * ```ts
 * const tapper = new Tapper('#my-button', [Tapper.EVENT.SingleTap, () => console.log('Tapped!')]);
 * ```
 */
@StringTag('Tapper')
export class Tapper {
	static EVENT = enumify({
		SingleTap: 'singleTap',
		DoubleTap: 'doubleTap',
		TripleTap: 'tripleTap',
	});

	[Symbol.iterator] = () => {
		const iterator = this.list()[Symbol.iterator]();
		return { next: () => iterator.next(), }
	}

	[Symbol.dispose]() {
		this.destroy();																					// destroy Hammer instances
	}

	#hammer: HammerManager[] = [];

	constructor(elm: string, ...setup: (Tapper.Callback | Tapper.Tuple)[]) {
		const self = this;

		$(elm).each(function () {
			const tripleTap = new Hammer.Tap({ event: Tapper.EVENT.TripleTap, taps: 3 });
			const doubleTap = new Hammer.Tap({ event: Tapper.EVENT.DoubleTap, taps: 2 });
			const singleTap = new Hammer.Tap({ event: Tapper.EVENT.SingleTap, taps: 1 });

			tripleTap.recognizeWith([doubleTap, singleTap]);
			doubleTap.recognizeWith([singleTap]).requireFailure([tripleTap]);
			singleTap.requireFailure([tripleTap, doubleTap]);

			const hammer = new Hammer.Manager(this);
			hammer.add(tripleTap);
			hammer.add(doubleTap);
			hammer.add(singleTap);

			self.#hammer.push(hammer);
		})

		self.on(...setup);
	}

	/** 
	 * Register a list of callbacks to fire on 'singleTap', or a tuple of events/callbacks to fire.
	 * 
	 * @param events - Callbacks for singleTap or Tuples of [Event, Callback]
	 * @returns The Tapper instance for chaining
	 */
	on(...events: (Tapper.Callback | Tapper.Tuple)[]) {
		events
			.forEach(arg => {
				if (isFunction(arg)) {															// assume Callback to register for
					this.#hammer.forEach(hammer => hammer.off(Tapper.EVENT.SingleTap));
					this.#hammer.forEach(hammer => hammer.on(Tapper.EVENT.SingleTap, arg));
				} else {
					const [event, cb] = arg;
					this.#hammer.forEach(hammer => hammer.off(event));	// just in case, turn off old listener
					this.#hammer.forEach(hammer => hammer.on(event, cb));	// start new listener
				}
			})

		return this;
	}

	/** 
	 * Stop event listeners. Defaults to 'all' listeners on this instance if none specified.
	 * 
	 * @param events - Specific events to stop listening for
	 * @returns The Tapper instance for chaining
	 */
	off(...events: Tapper.EVENT[]) {
		if (isEmpty(events))
			events.push(...Tapper.EVENT.values());

		events
			.forEach(event => this.#hammer.forEach(hammer => hammer.off(event)))

		return this;
	}

	/**
	 * Enable or disable specific event listeners (or all if none specified).
	 * 
	 * @param enable - Whether to enable or disable the events
	 * @param events - Specific events to target
	 * @returns The Tapper instance for chaining
	 */
	enable(enable = true, ...events: Tapper.EVENT[]) {
		if (isEmpty(events))
			events.push(...Tapper.EVENT.values());

		this.#hammer
			.forEach(hammer => events														// for each Hammer
				.forEach(event => hammer.get(event)?.set({ enable }))	// for each Event
			)

		return this;
	}

	/** 
	 * List details about the active Hammer instances managed by this Tapper.
	 * 
	 * @returns Array of Hammer instance details
	 */
	list() {
		return this.#hammer.map((hammer: any) => ({
			element: hammer.element,
			handlers: hammer.handlers
		}))
	}

	/** 
	 * Stop all event listeners on this instance.
	 * 
	 * @returns The Tapper instance for chaining
	 */
	clear() {
		return this.off();
	}

	/** 
	 * Detach and destroy all underlying Hammer instances.
	 */
	destroy() {
		this.#hammer.forEach(hammer => hammer.destroy());
	}
}

/**
 * Namespace containing type definitions for the Tapper touch gesture handler.
 */
export namespace Tapper {
	export type EVENT = ValueOf<typeof Tapper.EVENT>					// typeof Event enum

	export type Tuple = [Tapper.EVENT, Tapper.Callback]
	export type Callback = (evt: HammerInput) => void
}
