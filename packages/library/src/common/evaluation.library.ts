import { isFunction, isNullish, isObject } from '#library/assertion.library.js';
import type { Evaluable, AsyncEvaluable } from '#library/type.library.js';

/**
 * Evaluates a synchronous scalar or supplier function.
 * If the input is a function, it is invoked with zero arguments and its return value is returned.
 * If the resolved value is undefined and a fallback is provided, the fallback is evaluated and returned.
 * Otherwise, the scalar value is returned as-is.
 * Any exception thrown by the supplier function bubbles directly to the caller.
 * 
 * @param value - The scalar value or synchronous supplier function to evaluate
 * @param fallback - Optional default value or supplier to evaluate if `value` is undefined
 * @returns The resolved synchronous value
 * @example
 * ```ts
 * evaluate(42); // 42
 * evaluate(() => 'UTC'); // 'UTC'
 * evaluate(undefined, 'fallback'); // 'fallback'
 * evaluate(undefined, () => 'dynamic-fallback'); // 'dynamic-fallback'
 * ```
 */
export function evaluate<T>(value: Evaluable<T> | undefined, fallback?: Evaluable<T>): T {
	const resolved = isFunction(value) ? (value as () => T)() : value;
	if (resolved !== undefined) return resolved as T;
	return (isFunction(fallback)
		? (fallback as () => T)()
		: fallback) as T;
}

/**
 * Evaluates a synchronous or asynchronous scalar, Promise, or supplier function.
 * If the input is a function, it is invoked and its result is awaited.
 * If the resolved value is undefined and a fallback is provided, the fallback is evaluated and returned.
 * Otherwise, the scalar or Promise is resolved and returned.
 * Any exception or rejection bubbles directly to the caller.
 * 
 * @param value - The scalar value, Promise, or supplier function to evaluate
 * @param fallback - Optional default value, Promise, or async supplier to evaluate if `value` is undefined
 * @returns A Promise resolving to the evaluated value
 * @example
 * ```ts
 * await evaluateAsync('apiKey123'); // 'apiKey123'
 * await evaluateAsync(async () => fetchSecret()); // 'secret'
 * await evaluateAsync(undefined, async () => fetchDefault()); // 'default'
 * ```
 */
export async function evaluateAsync<T>(value: AsyncEvaluable<T> | undefined, fallback?: AsyncEvaluable<T>): Promise<T> {
	const resolved = isFunction(value) ? await (value as () => T | Promise<T>)() : await value;
	if (resolved !== undefined) return resolved as T;
	return (isFunction(fallback)
		? await (fallback as () => T | Promise<T>)()
		: await fallback) as T;
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
export function evaluateConfig<T extends object>(config: T): { [K in keyof T]: T[K] extends () => infer R ? R : T[K] } {
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
export async function evaluateConfigAsync<T extends object>(config: T): Promise<{ [K in keyof T]: T[K] extends () => infer R ? Awaited<R> : Awaited<T[K]> }> {
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
