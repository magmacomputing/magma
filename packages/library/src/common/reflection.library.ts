import { distinct, ownKeys, ownEntries } from '#library/primitive.library.js';
import { asType, getType } from '#library/type.library.js';
import { isEmpty, isFunction, isPrimitive } from '#library/assertion.library.js';
import type { Obj, KeyOf, Primitives } from '#library/type.library.js';

/** mutate Object | Array by excluding values with specified primitive 'types' */
export function exclude<T extends Obj>(obj: T, ...types: (Primitives | Lowercase<Primitives>)[]) {
	const exclusions = distinct(types.map(item => item.toLowerCase())) as typeof types;

	if (obj && typeof obj === 'object') {											// only works on Objects and Arrays
		const keys = [] as KeyOf<T>[];

		(ownEntries(obj) as [KeyOf<T>, Obj][])
			.forEach(([key, value]) => {
				const type = getType(value);

				if (['Object', 'Array'].includes(type))							// recurse into object
					exclude(value, ...exclusions);

				if (isPrimitive(value) && exclusions.includes(type.toLowerCase() as Primitives))
					keys.push(key)
			})

		if (!isEmpty(keys))																			// if any values to be excluded
			omit(obj, ...keys);
	}

	return obj;																								// return Object reference, even though Object has been mutated
}

/** mutate Object | Array reference with properties removed */
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
			keys
				.sort()
				.reverse()																					// remove from end-to-start to preserve indexes
				.forEach(key => value.splice(Number(key), 1));			// remove Array index
			break;

		case 'Object':
			(isEmpty(keys) ? ownKeys(value) : keys)								// if no {keys}, assume all ownKeys
				.forEach(key => Reflect.deleteProperty(value, key));
	}

	return value;																							// return Object reference, even though Object has been mutated
}

/** remove all ownKeys from an Object | Array */
export function purge<T extends Obj>(obj: T) {
	return omit(obj);
}

/** reset Object */
export function reset<T extends Obj>(orig: T, obj?: T) {
	return Object.assign(purge(orig), { ...obj });
}

/** return an Object containing all 'own' and 'inherited' enumerable properties */
export function allObject<T extends Obj>(json: T) {
	return Object.fromEntries(ownEntries(json, true));
}

/** create a new object and shadow-copy all own-descriptors from the source */
export const allDescriptors = <T extends object>(source: T) => {
	return Object.defineProperties({}, Object.getOwnPropertyDescriptors(source)) as T;
}

/** get a string-array of 'getter' names for an object */
export const getAccessors = (obj: any = {}) => {
	return ownAccessors(obj, 'get');
}

/** get a string-array of 'setter' names for an object */
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
 * Define a lazy method on a prototype that reifies itself upon first access.  
 * This allows heavy logic to be deferred (or even loaded via plugin)  
 * while maintaining a clean, synchronous public API.
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