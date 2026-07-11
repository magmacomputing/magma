import { Logger, type DebugLevel } from '#library/logger.class.js';
import { markConfig } from '#library/symbol.library.js';
import { asArray } from '#library/coercion.library.js';
import { ifDefined } from '#library/object.library.js';
import { secure } from '#library/proxy.library.js';
import { cleanify } from '#library/serialize.library.js';
import { Immutable } from '#library/class.library.js';
import { isEmpty, isObject } from '#library/assertion.library.js';

declare module '#library/type.library.js' {
	interface TypeValueMap<T> {
		Pledge: { type: 'Pledge', value: Pledge<T> };
	}
}

const _dbg = new Logger('[Pledge]');
let _static = {} as Pledge.Constructor;
const _STATE = secure({
	Pending: Symbol('pending'),
	Resolved: Symbol('resolved'),
	Rejected: Symbol('rejected')
});

/**
 * Wrap a Promise's resolve/reject/finally methods for later fulfilment.  
 * with useful methods for tracking the state of the Promise, chaining fulfilment, etc.  
 ```
	new Pledge<T>({tag: string, onResolve?: () => void, onReject?: () => void, onSettle?: () => void})
	new Pledge<T>(tag?: string)
 ```
 */
@Immutable
export class Pledge<T> {
	#pledge: PromiseWithResolvers<T>;
	#status = {} as Pledge.Status<T>;

	static get STATE() { return _STATE; }

	/** initialize future Pledge instances */
	static init(arg?: Pledge.Constructor | string) {
		if (isObject(arg)) {
			if (isEmpty(arg))
				_static = {};																// reset static values

			markConfig(_static);
			Object.assign(_static,
				ifDefined({ tag: arg.tag, debug: arg.debug, catch: arg.catch, silent: arg.silent }),
				ifDefined({ onResolve: arg.onResolve, onReject: arg.onReject, onSettle: arg.onSettle, }),
			)
		} else {
			markConfig(_static);
			Object.assign(_static, ifDefined({ tag: arg, }));
		}

		_dbg.debug(_static, _static);

		return Pledge.status;
	}

	/** reset static defaults */
	static [Symbol.dispose]() { Pledge.init({}) }

	static get status() {
		return { ..._static, state: _STATE.Pending } as Pledge.Status<typeof Pledge>;
	}

	constructor(arg?: Pledge.Constructor | string) {
		const opts = isObject(arg) ? arg : { tag: arg as string };
		const config = { ..._static, ...ifDefined({ tag: opts.tag, debug: opts.debug, catch: opts.catch, silent: opts.silent }) };

		if (Promise.withResolvers) {
			this.#pledge = Promise.withResolvers();
		} else {
			let res: any, rej: any;
			const promise = new Promise<T>((resolve, reject) => {
				res = resolve;
				rej = reject;
			});
			this.#pledge = { promise, resolve: res, reject: rej };
		}
		this.#status = markConfig({ state: _STATE.Pending, ...config });

		const onResolve = asArray(_static.onResolve).concat(asArray(opts.onResolve));
		const onReject = asArray(_static.onReject).concat(asArray(opts.onReject));
		const onSettle = asArray(_static.onSettle).concat(asArray(opts.onSettle));

		const runSafely = <A extends any[]>(callbacks: ((...args: A) => any)[], ...args: A) => {
			callbacks.forEach(cb => {
				try {
					cb(...args);
				} catch (err) {
					_dbg.warn(this.#status, 'Pledge callback failed', err);
				}
			});
		}

		if (onResolve.length)
			this.#pledge.promise.then(val => runSafely(onResolve, val));
		if (onReject.length)
			this.#pledge.promise.catch(err => runSafely(onReject, err));
		if (onSettle.length)
			this.#pledge.promise.finally(() => runSafely(onSettle));

		if (this.#status.catch)
			this.#pledge.promise.catch(err => _dbg.warn(this.#status, err));

		return Object.freeze(this) as this;
	}

	get [Symbol.toStringTag]() {
		return 'Pledge'
	}

	[Symbol.dispose]() {
		if (this.isPending) {
			try {
				this.promise.catch(() => {});
			} catch {
				// best-effort; preserve disposal semantics even if promise is unavailable
			}
			this.reject(new Error(`Pledge disposed`));						// dispose
		}
	}

	get status() {
		return cleanify(this.#status);
	}

	get promise() {
		return this.#pledge.promise;
	}

	get state() {
		return this.#status.state.description;
	}

	get isPending() {
		return this.#status.state === _STATE.Pending;
	}
	get isResolved() {
		return this.#status.state === _STATE.Resolved;
	}
	get isRejected() {
		return this.#status.state === _STATE.Rejected;
	}
	get isSettled() {
		return this.#status.state !== _STATE.Pending;
	}

	toString() {
		return JSON.stringify(this.status);
	}

	resolve(value: T) {
		if (this.isPending) {
			this.#status.settled = value;
			this.#status.state = _STATE.Resolved;
			_dbg.debug(this.#status, 'Resolved');									// debug
			this.#pledge.resolve(value);													// resolve
		}
		// else _dbg.warn(this.#status, `Pledge was already ${this.state}`);

		return this.#pledge.promise;
	}

	reject(error: any) {
		if (this.isPending) {
			this.#status.error = error;
			this.#status.state = _STATE.Rejected;
			_dbg.debug(this.#status, 'Rejected', error);					// debug
			this.#pledge.reject(error);														// reject
		}
		// else _dbg.warn(this.#status, `Pledge was already ${this.state}`);

		return this.#pledge.promise;
	}

	/** make Pledge 'then-able' by forwarding to internal promise */
	then<TResult1 = T, TResult2 = never>(
		onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
		onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
	): Promise<TResult1 | TResult2> {
		return this.promise.then(onfulfilled, onrejected);
	}
}

export namespace Pledge {
	export type Resolve = (val?: any) => any;									// function to call after Pledge resolves
	export type Reject = (err: Error) => any;									// function to call after Pledge rejects
	export type Settle = () => void;													// function to call after Pledge settles

	export type Constructor = {
		tag?: string | undefined;
		onResolve?: Pledge.Resolve | Pledge.Resolve[] | undefined;
		onReject?: Pledge.Reject | Pledge.Reject[] | undefined;
		onSettle?: Pledge.Settle | Pledge.Settle[] | undefined;
		debug?: DebugLevel;
		catch?: boolean;
		silent?: boolean;
	}

	export interface Status<T> {
		tag?: string | undefined;
		debug?: Pledge.Constructor["debug"];
		catch?: Pledge.Constructor["catch"];
		silent?: Pledge.Constructor["silent"];
		state: symbol;
		settled?: T | undefined;
		error?: any | undefined;
	}
}
