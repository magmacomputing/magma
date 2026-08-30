import { distinct, ownKeys, ownEntries } from '#library/primitive.library.js';
import { asType, getType } from '#library/type.library.js';
import { isEmpty, isFunction, isPrimitive, isReference, isSymbol } from '#library/assertion.library.js';
import type { Obj, KeyOf, Primitives } from '#library/type.library.js';

/**
 * Recursively removes properties whose values match the specified type names.
 *
 * @param obj - The object or array to mutate
 * @param types - The type names to exclude, such as `Function` or `String`
 * @returns The mutated object reference
 */
export function exclude<T extends Obj>(obj: T, ...types: (Primitives | Lowercase<Primitives>)[]) {
	const exclusions = distinct(types.map(item => item.toLowerCase())) as typeof types;
	return _exclude(obj, exclusions as string[], new WeakSet<object>());
}

/**
 * Recursively removes properties whose primitive values match the specified type names.
 *
 * @param exclusions - Primitive type names whose matching properties should be removed
 * @param visited - Object references already traversed during the current operation
 * @returns The original object reference after matching properties are removed
 * @internal
 */
function _exclude<T extends Obj>(obj: T, exclusions: string[], visited: WeakSet<object>): T {
	if (isReference(obj)) {
		if (visited.has(obj)) return obj;
		visited.add(obj);

		const keys = [] as KeyOf<T>[];

		(ownEntries(obj) as [KeyOf<T>, Obj][])
			.forEach(([key, value]) => {
				const type = getType(value);

				if (['Object', 'Array'].includes(type) && isReference(value))
					_exclude(value, exclusions, visited);

				if (isPrimitive(value) && exclusions.includes(type.toLowerCase() as Primitives))
					keys.push(key);
			});

		if (!isEmpty(keys))																			// if any values to be excluded
			omit(obj, ...keys);
	}

	return obj;																								// return Object reference, even though Object has been mutated
}

/**
 * Mutates an object or array by removing specified properties or indices.
 * If no keys are provided, it removes all properties (like a clear operation).
 * 
 * @param obj - The object or array to mutate
 * @param keys - The keys or indices to omit
 * @returns The mutated object reference
 * @example
 * ```ts
 * omit({ a: 1, b: 2 }, 'a'); // { b: 2 }
 * ```
 */
export function omit<T extends Obj>(obj: T): T							// TODO: consider including Map and Set objects ??
export function omit<T extends Obj>(obj: T, ...keys: PropertyKey[]): T
export function omit<T extends Obj>(obj: T, ...keys: PropertyKey[]) {
	const { type, value } = asType(obj);

	switch (type) {
		case 'Array':
			if (isEmpty(keys)) {
				value.length = 0;																		// clear Array
				break;
			}
			distinct(
				keys
					.filter(k => !isSymbol(k))
					.map(k => Number(k))
					.filter(idx => Number.isInteger(idx) && idx >= 0 && idx < value.length)
			)
				.sort((a, b) => b - a)
				.forEach(index => value.splice(index, 1));
			break;

		case 'Object':
			(isEmpty(keys) ? ownKeys(value) : keys)								// if no {keys}, assume all ownKeys
				.forEach(key => Reflect.deleteProperty(value, key));
	}

	return value;																							// return Object reference, even though Object has been mutated
}

/**
 * Removes all own properties from an object or array.
 * 
 * @param obj - The object or array to purge
 * @returns The mutated object reference
 * @example
 * ```ts
 * purge({ a: 1 }); // {}
 * ```
 */
export function purge<T extends Obj>(obj: T) {
	return omit(obj);
}

/**
 * Resets an object by purging all its existing own properties and replacing them
 * with the properties from another object.
 * 
 * @param orig - The original object to reset
 * @param obj - The object containing the new properties
 * @returns The mutated original object reference
 * @example
 * ```ts
 * reset(target, { newProp: 1 });
 * ```
 */
export function reset<T extends Obj>(orig: T, obj?: T) {
	return Object.assign(purge(orig), { ...obj });
}

/**
 * Returns a new object containing all 'own' and 'inherited' enumerable properties 
 * from the prototype chain of the provided object.
 * 
 * @param json - The object to extract properties from
 * @returns A plain object containing the flattened properties
 * @example
 * ```ts
 * const flat = allObject(myInstance);
 * ```
 */
export function allObject<T extends Obj>(json: T) {
	return Object.fromEntries(ownEntries(json, true));
}

/**
 * Creates a new object and shadow-copies all own-descriptors (including getters/setters)
 * from the source object.
 * 
 * @param source - The object to copy descriptors from
 * @returns A new object with identical descriptors
 * @example
 * ```ts
 * const clone = allDescriptors(source);
 * ```
 */
export const allDescriptors = <T extends object>(source: T) => {
	return Object.defineProperties({}, Object.getOwnPropertyDescriptors(source)) as T;
}

/**
 * Retrieves a distinct array of 'getter' names from an object and its prototype chain.
 * 
 * @param obj - The object to inspect
 * @returns An array of property keys that have getter functions
 * @example
 * ```ts
 * const getters = getAccessors(myInstance);
 * ```
 */
export const getAccessors = (obj: any = {}) => {
	return ownAccessors(obj, 'get');
}

/**
 * Retrieves a distinct array of 'setter' names from an object and its prototype chain.
 * 
 * @param obj - The object to inspect
 * @returns An array of property keys that have setter functions
 * @example
 * ```ts
 * const setters = setAccessors(myInstance);
 * ```
 */
export const setAccessors = (obj: any = {}) => {
	return ownAccessors(obj, 'set');
}

const ownAccessors = (obj: any = {}, type: 'get' | 'set') => {
	const keys: PropertyKey[] = [];
	const limit = 50;
	let depth = 0;

	// 1. Walk the Instance Prototype chain (for instance accessors)
	let proto = obj.prototype || Object.getPrototypeOf(obj);
	while (proto && proto !== Object.prototype && ++depth < limit) {
		const descriptors = Object.getOwnPropertyDescriptors(proto);
		Reflect.ownKeys(descriptors).forEach(key => {
			if (isFunction((descriptors as any)[key][type]))
				keys.push(key);
		});
		proto = Object.getPrototypeOf(proto);
	}

	// 2. Walk the Constructor chain (for static accessors)
	let constructor = isFunction(obj) ? obj : (obj as any).constructor;
	depth = 0;
	while (constructor && constructor !== Function.prototype && constructor !== Object.prototype && ++depth < limit) {
		const descriptors = Object.getOwnPropertyDescriptors(constructor);
		Reflect.ownKeys(descriptors).forEach(key => {
			if (isFunction((descriptors as any)[key][type]))
				keys.push(key);
		});
		constructor = Object.getPrototypeOf(constructor);
	}

	return distinct(keys as string[]);
}

/**
 * Defines a lazy method on a prototype that reifies (shadows) itself upon first access.
 * This allows heavy logic to be deferred while maintaining a clean, synchronous public API.
 * 
 * @param target - The prototype or object to define the method on
 * @param key - The method name
 * @param factory - A function returning the actual method implementation
 * @example
 * ```ts
 * lazyMethod(MyClass.prototype, 'heavy', () => function() { return 42; });
 * ```
 */
export function lazyMethod<T extends object>(target: T, key: PropertyKey, factory: (this: T) => Function) {
	Object.defineProperty(target, key, {
		configurable: true,
		enumerable: false,																			// methods are usually non-enumerable
		get() {
			const impl = factory.call(this);

			if (Reflect.isExtensible(this)) {
				Object.defineProperty(this, key, {									// reify on the instance (shadowing prototype)
					value: impl,
					writable: true,
					configurable: true,
					enumerable: false
				});
			}

			return impl;
		}
	});
}

