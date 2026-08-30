import { isFunction, isNullish, isObject } from '#library/assertion.library.js';
import type { Evaluable, AsyncEvaluable, Evaluated, AsyncEvaluated } from '#library/type.library.js';

/**
 * Evaluates candidate synchronous scalars or supplier functions in order, returning the first defined result (lazy coalesce).
 * If a candidate is a function, it is invoked with zero arguments.
 * Candidates after the first defined value are never evaluated (short-circuiting).
 * If all candidates evaluate to undefined, returns undefined.
 * Any exception thrown by an evaluated supplier function bubbles directly to the caller.
 * 
 * @param values - One or more scalars or synchronous supplier functions to evaluate in sequence
 * @returns The first resolved defined value, or undefined if none resolved
 * @example
 * ```ts
 * evaluate(42); // 42
 * evaluate(() => 'UTC'); // 'UTC'
 * evaluate(undefined, 'fallback'); // 'fallback'
 * evaluate(undefined, () => undefined, () => 'dynamic-fallback', 'final'); // 'dynamic-fallback'
 * ```
 */
export function evaluate<T>(first: Evaluable<T> | undefined, fallback: Evaluable<T>, ...rest: Evaluable<T>[]): T;
export function evaluate<T>(...values: (Evaluable<T> | undefined)[]): T | undefined;
export function evaluate<T>(...values: (Evaluable<T> | undefined)[]): T | undefined {
	for (const val of values) {
		const resolved = isFunction(val) ? (val as () => T)() : val;
		if (resolved !== undefined) return resolved as T;
	}
	return undefined;
}

/**
 * Evaluates candidate synchronous or asynchronous scalars, Promises, or supplier functions in order, returning the first defined result (async lazy coalesce).
 * Supplier functions represent deferred asynchronous work and are invoked lazily only when reached during evaluation.
 * Rejection handlers are attached upfront to direct Promise candidates to prevent unobserved rejections if iteration short-circuits on an earlier defined candidate.
 * If all candidates evaluate to undefined, returns undefined.
 * Any exception or rejection thrown by an evaluated candidate bubbles directly to the caller.
 * 
 * @param values - One or more scalars, Promises, or async supplier functions to evaluate in sequence
 * @returns A Promise resolving to the first defined value, or undefined if none resolved
 * @example
 * ```ts
 * await evaluateAsync('apiKey123'); // 'apiKey123'
 * await evaluateAsync(undefined, async () => fetchSecret(), 'defaultKey'); // 'secret'
 * ```
 */
export function evaluateAsync<T>(first: AsyncEvaluable<T> | undefined, fallback: AsyncEvaluable<T>, ...rest: AsyncEvaluable<T>[]): Promise<T>;
export function evaluateAsync<T>(...values: (AsyncEvaluable<T> | undefined)[]): Promise<T | undefined>;
/**
 * Evaluates asynchronous candidates in order and stops at the first defined value.
 *
 * @param values - Values, promises, or supplier functions to evaluate.
 * @returns The first defined result, or `undefined` if all candidates resolve to `undefined`.
 */
export async function evaluateAsync<T>(...values: (AsyncEvaluable<T> | undefined)[]): Promise<T | undefined> {
	const promises = values.map(val => {
		if (!isFunction(val)) {
			const p = Promise.resolve(val);
			p.catch(() => { });
			return p;
		}
		return undefined;
	});

	for (let i = 0; i < values.length; i++) {
		const val = values[i];
		const resolved = isFunction(val) ? await (val as () => T | Promise<T>)() : await promises[i];
		if (resolved !== undefined) return resolved as T;
	}
	return undefined;
}

/**
 * Resolves all top-level properties of a configuration object synchronously.
 * For each property whose value is a function, executes the function and sets the property to its return value.
 * 
 * @param config - The configuration object to evaluate
 * @returns A new object with all properties synchronously resolved
 * @example
 * ```ts
 * const evaluated = evaluateConfig({
 *   timeZone: () => 'America/New_York',
 *   locale: 'en-US'
 * });
 * // { timeZone: 'America/New_York', locale: 'en-US' }
 * ```
 */
export function evaluateConfig<T extends object>(config: T): Evaluated<T> {
	if (isNullish(config) || !isObject(config)) return config as any;
	const result = { ...config } as any;

	for (const key of Object.keys(config) as (keyof T)[]) {
		const val = config[key];
		result[key] = isFunction(val) ? (val as () => any)() : val;
	}

	return result;
}

/**
 * Resolves all top-level properties of a configuration object asynchronously.
 * For each property whose value is a function or Promise, executes/awaits the value and sets the property.
 * 
 * @param config - The configuration object to evaluate
 * @returns A Promise resolving to a new object with all properties resolved
 * @example
 * ```ts
 * const evaluated = await evaluateConfigAsync({
 *   key: async () => fetchKey(),
 *   url: 'https://api.openai.com/v1'
 * });
 * // { key: 'sk-...', url: 'https://api.openai.com/v1' }
 * ```
 */
export async function evaluateConfigAsync<T extends object>(config: T): Promise<AsyncEvaluated<T>> {
	if (isNullish(config) || !isObject(config)) return config as any;
	const result = { ...config } as any;
	const keys = Object.keys(config) as (keyof T)[];
	const values = await Promise.all(
		keys.map(key => {
			const val = config[key];
			return isFunction(val) ? (val as () => any)() : val;
		})
	);

	for (let i = 0; i < keys.length; i++)
		result[keys[i]] = values[i];

	return result;
}
