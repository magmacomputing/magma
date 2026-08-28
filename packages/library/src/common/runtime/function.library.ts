import { secure } from '#library/proxy.library.js';
import { isInteger, isFunction, isReference, isMap, isSet } from '#library/assertion.library.js';
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
		if (value === undefined) return '\u0000__undefined__\u0000';
		if (isInteger(value)) return `\u0000__bigint:${value}__\u0000`;
		if (isFunction(value)) return `function:${value.name || 'anonymous'}`;

		if (isReference(value)) {
			if (seen.has(value)) return '<Circular>';
			seen.add(value);

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
		const key = (this !== undefined && this !== globalThis)
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
