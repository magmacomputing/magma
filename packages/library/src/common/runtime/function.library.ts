import { secure } from '#library/proxy.library.js';
import { isBigInt, isCallable, isFunction, isReference, isMap, isSet, isLocale, isUndefined, isDefined } from '#library/assertion.library.js';
import type { Property } from '#library/type.library.js';

// https://medium.com/codex/currying-in-typescript-ca5226c85b85
type PartialTuple<T extends any[], X extends any[] = []> =
	T extends [infer N, ...infer R]														// If the tuple provided has at least one required value
	? PartialTuple<R, [...X, N?]>															// recurse back in to this type with one less item
	: [...X, ...T]																						// else return an empty tuple so that too is a valid option

type PartialParameters<F extends (...args: any[]) => any> = PartialTuple<Parameters<F>>

type RemainingParameters<P extends any[], E extends any[]> =
	E extends [infer E1, ...infer EX]													// if the expected array has any required items...
	? P extends [infer P1, ...infer PX]												// then if the provided array has at least one required item,
	? RemainingParameters<PX, EX>															// 		then recurse with one item less in each array type
	: E																												// 		else the remaining args is unchanged
	: []																											// else there are no more arguments

type CurriedFunction<PROVIDED extends any[], FN extends (...args: any[]) => any> =
	<NEW_ARGS extends PartialTuple<RemainingParameters<PROVIDED, Parameters<FN>>>>(...args: NEW_ARGS) =>
		CurriedFunctionOrReturnValue<[...PROVIDED, ...NEW_ARGS], FN>

type CurriedFunctionOrReturnValue<PROVIDED extends any[], FN extends (...args: any[]) => any> =
	RemainingParameters<PROVIDED, Parameters<FN>> extends [any, ...any[]]
	? CurriedFunction<PROVIDED, FN>
	: ReturnType<FN>

type Curry<Args extends any[], Res> =
	Args extends [infer FirstArg, ...infer RestArgs]
	? (arg: FirstArg) => Curry<RestArgs, Res>
	: Res;

/**
 * Robust deterministic serialization for cache keys.
 * Handles BigInt, Map, Set, Function, Undefined, and circular references.
 *
 * @param val - The value to serialize
 * @param seen - Internal WeakSet to track circular references
 * @returns The serialized JSON string representation
 * @example
 * ```ts
 * serialize({ a: 1, b: undefined }); // '{"a":1,"b":"__undefined__"}'
 * ```
 */
function serialize(val: any, seen = new WeakSet()): string {
	return JSON.stringify(val, function (this: any, key: string, value: any) {
		if (isUndefined(value)) return '\u0000__undefined__\u0000';
		if (isBigInt(value)) return `\u0000__bigint:${value}__\u0000`;
		if (isFunction(value)) return `function:${value.name || 'anonymous'}`;

		if (isReference(value)) {
			if (seen.has(value)) return '<Circular>';
			seen.add(value);

			if (isLocale(value)) return value.toString();
			if (isMap(value)) return `map:[${Array.from(value.entries()).map(e => serialize(e, seen)).sort().join(',')}]`;
			if (isSet(value)) return `set:[${Array.from(value).map(v => serialize(v, seen)).sort().join(',')}]`;
		}
		return value;
	});
}

/**
 * Curries a function to allow partial application of its arguments.
 *
 * @param fn - The original function to curry
 * @returns A curried version of the function
 * @example
 * ```ts
 * const add = curry((a: number, b: number) => a + b);
 * add(1)(2); // 3
 * ```
 */
export function curry<Args extends any[], Res>(fn: (...args: Args) => Res): Curry<Args, Res> {
	return function curried(...args: any[]): any {
		return (args.length >= fn.length)
			? fn(...(args as Args))
			: (...nextArgs: any[]) => curried(...args, ...nextArgs)
	} as Curry<Args, Res>;
}

/**
 * Memoizes a function, caching its return values based on serialized arguments.
 *
 * @param fn - The function to memoize
 * @returns A memoized version of the function
 * @example
 * ```ts
 * const expensive = memoizeFunction((a, b) => a * b);
 * ```
 */
export function memoizeFunction<F extends (...args: any[]) => any>(fn: F): F {
	const cache = new Map<string, ReturnType<F>>();						// using a Map for better key handling than plain objects

	return function (this: any, ...args: Parameters<F>): ReturnType<F> {
		const key = (isDefined(this) && this !== globalThis)
			? serialize([this, ...args])
			: serialize(args);
		if (!cache.has(key)) {
			const result = fn.apply(this, args);									// call the original function with the correct context
			cache.set(key, result);                               // stash the result for subsequent calls
		}

		return cache.get(key)!;
	} as F;
}

const wm = new WeakMap<object, Map<string, any>>();

/**
 * Manually clears the memoization cache for an object instance.
 *
 * @param obj - The object whose cache should be cleared
 * @example
 * ```ts
 * clearCache(myInstance);
 * ```
 */
export function clearCache(obj: object) {
	wm.delete(obj);
}

/**
 * Defines a PropertyDescriptor for an object's memoized method.
 * Caches the results of method calls on a per-instance basis.
 *
 * @param name - The name of the method
 * @param fn - The method implementation
 * @returns A PropertyDescriptor containing the memoization logic
 * @example
 * ```ts
 * Object.defineProperty(target, 'calc', memoizeMethod('calc', () => 42));
 * ```
 */
export function memoizeMethod<Context = Property<any>, T = any>(name: PropertyKey, fn: (this: Context, ...args: any[]) => T) {
	return {
		enumerable: false,
		configurable: false,
		writable: false,
		value: function (this: Context, ...args: any[]) {
			const key = `${String(name)},${serialize(args)}`;
			let cache = wm.get(this as any);

			if (!cache) {																					// add a new Map into the WeakMap
				cache = new Map<string, any>();
				wm.set(this as any, cache);
			}

			if (!cache.has(key)) {																// first time for this method
				const result = fn.apply(this, args);								// evaluate the method
				secure(result as any);															// freeze the returned value (if object)
				cache.set(key, result);															// stash the result
			}

			return cache.get(key) as T;
		}
	} as PropertyDescriptor;
}

type Unary<A, B> = (value: A) => B;
type AsyncUnary<A, B> = (value: Awaited<A>) => B | PromiseLike<B>;

function assertStages(fns: readonly unknown[], name: string): void {
	for (const fn of fns) {
		if (!isCallable(fn))
			throw new TypeError(`${name}: expected every pipeline stage to be a function`);
	}
}

/**
 * Evaluates a value through a left-to-right sequence of unary functions.
 *
 * @param value - Initial input value
 * @param fns - Transformation stages applied sequentially
 * @returns The final transformed value
 * @example
 * ```ts
 * pipe(5, n => n * 2, n => n + 1); // 11
 * ```
 */
export function pipe<A>(value: A): A;
export function pipe<A, B>(value: A, fn1: Unary<A, B>): B;
export function pipe<A, B, C>(value: A, fn1: Unary<A, B>, fn2: Unary<B, C>): C;
export function pipe<A, B, C, D>(value: A, fn1: Unary<A, B>, fn2: Unary<B, C>, fn3: Unary<C, D>): D;
export function pipe<A, B, C, D, E>(value: A, fn1: Unary<A, B>, fn2: Unary<B, C>, fn3: Unary<C, D>, fn4: Unary<D, E>): E;
export function pipe<A, B, C, D, E, F>(value: A, fn1: Unary<A, B>, fn2: Unary<B, C>, fn3: Unary<C, D>, fn4: Unary<D, E>, fn5: Unary<E, F>): F;
export function pipe<A, B, C, D, E, F, G>(value: A, fn1: Unary<A, B>, fn2: Unary<B, C>, fn3: Unary<C, D>, fn4: Unary<D, E>, fn5: Unary<E, F>, fn6: Unary<F, G>): G;
export function pipe<A, B, C, D, E, F, G, H>(value: A, fn1: Unary<A, B>, fn2: Unary<B, C>, fn3: Unary<C, D>, fn4: Unary<D, E>, fn5: Unary<E, F>, fn6: Unary<F, G>, fn7: Unary<G, H>): H;
export function pipe<A, B, C, D, E, F, G, H, I>(value: A, fn1: Unary<A, B>, fn2: Unary<B, C>, fn3: Unary<C, D>, fn4: Unary<D, E>, fn5: Unary<E, F>, fn6: Unary<F, G>, fn7: Unary<G, H>, fn8: Unary<H, I>): I;
export function pipe<A, B, C, D, E, F, G, H, I, J>(value: A, fn1: Unary<A, B>, fn2: Unary<B, C>, fn3: Unary<C, D>, fn4: Unary<D, E>, fn5: Unary<E, F>, fn6: Unary<F, G>, fn7: Unary<G, H>, fn8: Unary<H, I>, fn9: Unary<I, J>): J;
export function pipe<A, B, C, D, E, F, G, H, I, J, K>(value: A, fn1: Unary<A, B>, fn2: Unary<B, C>, fn3: Unary<C, D>, fn4: Unary<D, E>, fn5: Unary<E, F>, fn6: Unary<F, G>, fn7: Unary<G, H>, fn8: Unary<H, I>, fn9: Unary<I, J>, fn10: Unary<J, K>): K;
export function pipe(value: any, ...fns: readonly Unary<any, any>[]): any {
	assertStages(fns, 'pipe');
	let current = value;
	for (const fn of fns)
		current = fn(current);
	return current;
}

/**
 * Composes functions left-to-right into a reusable pipeline function.
 * The first stage may accept multiple arguments and an explicit `this` receiver; subsequent stages are unary.
 *
 * @param fn1 - Initial function accepting the composed call arguments
 * @param fns - Subsequent unary transformation stages
 * @returns A composed function executing the pipeline left-to-right
 * @example
 * ```ts
 * const addAndDouble = flow((a: number, b: number) => a + b, n => n * 2);
 * addAndDouble(2, 3); // 10
 * ```
 */
export function flow<This, Args extends readonly any[], B>(fn1: (this: This, ...args: Args) => B): (this: This, ...args: Args) => B;
export function flow<This, Args extends readonly any[], B, C>(fn1: (this: This, ...args: Args) => B, fn2: Unary<B, C>): (this: This, ...args: Args) => C;
export function flow<This, Args extends readonly any[], B, C, D>(fn1: (this: This, ...args: Args) => B, fn2: Unary<B, C>, fn3: Unary<C, D>): (this: This, ...args: Args) => D;
export function flow<This, Args extends readonly any[], B, C, D, E>(fn1: (this: This, ...args: Args) => B, fn2: Unary<B, C>, fn3: Unary<C, D>, fn4: Unary<D, E>): (this: This, ...args: Args) => E;
export function flow<This, Args extends readonly any[], B, C, D, E, F>(fn1: (this: This, ...args: Args) => B, fn2: Unary<B, C>, fn3: Unary<C, D>, fn4: Unary<D, E>, fn5: Unary<E, F>): (this: This, ...args: Args) => F;
export function flow<This, Args extends readonly any[], B, C, D, E, F, G>(fn1: (this: This, ...args: Args) => B, fn2: Unary<B, C>, fn3: Unary<C, D>, fn4: Unary<D, E>, fn5: Unary<E, F>, fn6: Unary<F, G>): (this: This, ...args: Args) => G;
export function flow<This, Args extends readonly any[], B, C, D, E, F, G, H>(fn1: (this: This, ...args: Args) => B, fn2: Unary<B, C>, fn3: Unary<C, D>, fn4: Unary<D, E>, fn5: Unary<E, F>, fn6: Unary<F, G>, fn7: Unary<G, H>): (this: This, ...args: Args) => H;
export function flow<This, Args extends readonly any[], B, C, D, E, F, G, H, I>(fn1: (this: This, ...args: Args) => B, fn2: Unary<B, C>, fn3: Unary<C, D>, fn4: Unary<D, E>, fn5: Unary<E, F>, fn6: Unary<F, G>, fn7: Unary<G, H>, fn8: Unary<H, I>): (this: This, ...args: Args) => I;
export function flow<This, Args extends readonly any[], B, C, D, E, F, G, H, I, J>(fn1: (this: This, ...args: Args) => B, fn2: Unary<B, C>, fn3: Unary<C, D>, fn4: Unary<D, E>, fn5: Unary<E, F>, fn6: Unary<F, G>, fn7: Unary<G, H>, fn8: Unary<H, I>, fn9: Unary<I, J>): (this: This, ...args: Args) => J;
export function flow<This, Args extends readonly any[], B, C, D, E, F, G, H, I, J, K>(fn1: (this: This, ...args: Args) => B, fn2: Unary<B, C>, fn3: Unary<C, D>, fn4: Unary<D, E>, fn5: Unary<E, F>, fn6: Unary<F, G>, fn7: Unary<G, H>, fn8: Unary<H, I>, fn9: Unary<I, J>, fn10: Unary<J, K>): (this: This, ...args: Args) => K;
export function flow(fn1: (...args: any[]) => any, ...fns: readonly Unary<any, any>[]): (...args: any[]) => any {
	assertStages([fn1, ...fns], 'flow');
	return function (this: any, ...args: any[]): any {
		let current = fn1.apply(this, args);
		for (const fn of fns)
			current = fn(current);
		return current;
	};
}

/**
 * Evaluates a value (or promise) sequentially through sync or async unary stages.
 *
 * @param value - Initial input value or PromiseLike
 * @param fns - Synchronous or asynchronous transformation stages
 * @returns A Promise resolving to the final transformed value
 * @example
 * ```ts
 * await pipeAsync(5, async n => n * 2, n => n + 1); // 11
 * ```
 */
export function pipeAsync<A>(value: A | PromiseLike<A>): Promise<Awaited<A>>;
export function pipeAsync<A, B>(value: A | PromiseLike<A>, fn1: AsyncUnary<A, B>): Promise<Awaited<B>>;
export function pipeAsync<A, B, C>(value: A | PromiseLike<A>, fn1: AsyncUnary<A, B>, fn2: AsyncUnary<B, C>): Promise<Awaited<C>>;
export function pipeAsync<A, B, C, D>(value: A | PromiseLike<A>, fn1: AsyncUnary<A, B>, fn2: AsyncUnary<B, C>, fn3: AsyncUnary<C, D>): Promise<Awaited<D>>;
export function pipeAsync<A, B, C, D, E>(value: A | PromiseLike<A>, fn1: AsyncUnary<A, B>, fn2: AsyncUnary<B, C>, fn3: AsyncUnary<C, D>, fn4: AsyncUnary<D, E>): Promise<Awaited<E>>;
export function pipeAsync<A, B, C, D, E, F>(value: A | PromiseLike<A>, fn1: AsyncUnary<A, B>, fn2: AsyncUnary<B, C>, fn3: AsyncUnary<C, D>, fn4: AsyncUnary<D, E>, fn5: AsyncUnary<E, F>): Promise<Awaited<F>>;
export function pipeAsync<A, B, C, D, E, F, G>(value: A | PromiseLike<A>, fn1: AsyncUnary<A, B>, fn2: AsyncUnary<B, C>, fn3: AsyncUnary<C, D>, fn4: AsyncUnary<D, E>, fn5: AsyncUnary<E, F>, fn6: AsyncUnary<F, G>): Promise<Awaited<G>>;
export function pipeAsync<A, B, C, D, E, F, G, H>(value: A | PromiseLike<A>, fn1: AsyncUnary<A, B>, fn2: AsyncUnary<B, C>, fn3: AsyncUnary<C, D>, fn4: AsyncUnary<D, E>, fn5: AsyncUnary<E, F>, fn6: AsyncUnary<F, G>, fn7: AsyncUnary<G, H>): Promise<Awaited<H>>;
export function pipeAsync<A, B, C, D, E, F, G, H, I>(value: A | PromiseLike<A>, fn1: AsyncUnary<A, B>, fn2: AsyncUnary<B, C>, fn3: AsyncUnary<C, D>, fn4: AsyncUnary<D, E>, fn5: AsyncUnary<E, F>, fn6: AsyncUnary<F, G>, fn7: AsyncUnary<G, H>, fn8: AsyncUnary<H, I>): Promise<Awaited<I>>;
export function pipeAsync<A, B, C, D, E, F, G, H, I, J>(value: A | PromiseLike<A>, fn1: AsyncUnary<A, B>, fn2: AsyncUnary<B, C>, fn3: AsyncUnary<C, D>, fn4: AsyncUnary<D, E>, fn5: AsyncUnary<E, F>, fn6: AsyncUnary<F, G>, fn7: AsyncUnary<G, H>, fn8: AsyncUnary<H, I>, fn9: AsyncUnary<I, J>): Promise<Awaited<J>>;
export function pipeAsync<A, B, C, D, E, F, G, H, I, J, K>(value: A | PromiseLike<A>, fn1: AsyncUnary<A, B>, fn2: AsyncUnary<B, C>, fn3: AsyncUnary<C, D>, fn4: AsyncUnary<D, E>, fn5: AsyncUnary<E, F>, fn6: AsyncUnary<F, G>, fn7: AsyncUnary<G, H>, fn8: AsyncUnary<H, I>, fn9: AsyncUnary<I, J>, fn10: AsyncUnary<J, K>): Promise<Awaited<K>>;
export async function pipeAsync(value: any, ...fns: readonly AsyncUnary<any, any>[]): Promise<any> {
	try {
		assertStages(fns, 'pipeAsync');
	} catch (err) {
		Promise.resolve(value).catch(() => {});
		throw err;
	}
	let current = await value;
	for (const fn of fns)
		current = await fn(current);
	return current;
}
