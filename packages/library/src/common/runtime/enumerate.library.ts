import { asType, getType } from '#library/type.library.js';
import { isNumber, isNumeric, isFunction } from '#library/assertion.library.js';
import { ownEntries } from '#library/primitive.library.js';
import { secure, proxify } from '#library/proxy.library.js';
import { Serializable, StringTag } from '#library/decorator.library.js';
import { memoizeMethod } from '#library/function.library.js';
import type { Property, Index, KeyOf, ValueOf, Invert, LooseKey } from '#library/type.library.js';

declare module '#library/type.library.js' {
	interface TypeValueMap<T = any> {
		Enumify: { type: 'Enumify', value: Enum.wrap<T> };
	}

	interface IgnoreOfMap extends EnumMethods { }
}

/** Enum methods */
export type EnumMethods<T extends Property<any> = any> = {
	/** @deprecated Use `Enum.count(enumObj)` instead. Prototype methods will be removed in v5.0.0. */
	count(): number;
	/** @deprecated Use `Enum.keys(enumObj)` instead. Prototype methods will be removed in v5.0.0. */
	keys(): readonly KeyOf<T>[];
	/** @deprecated Use `Enum.values(enumObj)` instead. Prototype methods will be removed in v5.0.0. */
	values(): readonly ValueOf<T>[];
	/** @deprecated Use `Enum.entries(enumObj)` instead. Prototype methods will be removed in v5.0.0. */
	entries(): readonly (readonly [KeyOf<T>, ValueOf<T>])[];
	/** @deprecated Use `Enum.invert(enumObj)` instead. Prototype methods will be removed in v5.0.0. */
	invert(): Readonly<Invert<T>>;
	/** @deprecated Use `Enum.has(enumObj, key)` instead. Prototype methods will be removed in v5.0.0. */
	has(key: LooseKey<KeyOf<T>>): boolean;
	/** @deprecated Use `Enum.hasOwn(enumObj, key)` instead. Prototype methods will be removed in v5.0.0. */
	hasOwn(key: LooseKey<KeyOf<T>> | PropertyKey): boolean;
	/** @deprecated Use `Enum.get(enumObj, key)` instead. Prototype methods will be removed in v5.0.0. */
	get(key: LooseKey<KeyOf<T>> | PropertyKey): ValueOf<T> | undefined;
	/** @deprecated Use `Enum.includes(enumObj, search)` instead. Prototype methods will be removed in v5.0.0. */
	includes(search: LooseKey<ValueOf<T>>): boolean;
	/** @deprecated Use `Enum.keyOf(enumObj, search)` instead. Prototype methods will be removed in v5.0.0. */
	keyOf(search: LooseKey<ValueOf<T>>): KeyOf<T>;
	/** @deprecated Iterate over `Enum.entries(enumObj)` instead. Prototype methods will be removed in v5.0.0. */
	forEach(fn: (entry: readonly [KeyOf<T>, ValueOf<T>], index: number, enumify: EnumifyType<any>) => void, thisArg?: any): void;
	/** @deprecated Filter over `Enum.entries(enumObj)` instead. Prototype methods will be removed in v5.0.0. */
	filter(fn: (entry: readonly [KeyOf<T>, ValueOf<T>], index: number, enumify: EnumifyType<any>) => boolean, thisArg?: any): EnumifyType<Partial<T>>;
	/** @deprecated Map over `Enum.entries(enumObj)` instead. Prototype methods will be removed in v5.0.0. */
	map(fn: (entry: readonly [KeyOf<T>, ValueOf<T>], index: number, enumify: EnumifyType<any>) => any, thisArg?: any): EnumifyType<Property<any>>;
	/** @deprecated Use `Enum.extend(enumObj, list)` instead. Prototype methods will be removed in v5.0.0. */
	extend<const E extends any[] | Property<any>>(list: E, frozen?: boolean): EnumifyType<any>;
	/** iterate through all Enum entries */
	readonly [Symbol.iterator]: () => IterableIterator<readonly [KeyOf<T>, ValueOf<T>]>;
	/** used to identify the Enumify type */
	readonly [Symbol.toStringTag]: 'Enumify';
}

/** Enum properties & methods */
export type EnumifyType<T extends Property<any> = any> = Readonly<T> & Omit<EnumMethods<T>, keyof T>;

/** key to use for identifying Enumify objects */
const tag = 'Enumify';

const ENUM: any = secure(Object.create(null, {
	keys: memoizeMethod('keys', function (this: any): any[] { return ownEntries(this, true).map(([key]: any) => key); }),
	values: memoizeMethod('values', function (this: any): any[] { return ownEntries(this, true).map(([_, val]: any) => val); }),
	entries: memoizeMethod('entries', function (this: any): any[] { return ownEntries(this, true).map(([key, val]: any) => Object.freeze([key, val])); }),
	invert: memoizeMethod('invert', function (this: any): Record<string, any> { return Object.fromEntries(ENUM.entries.call(this).map(([key, val]: any) => [val, key])); }),

	has: value(function (this: any, key: PropertyKey) { return ENUM.keys.call(this).includes(key as any); }),
	hasOwn: value(function (this: any, key: PropertyKey) { return Object.prototype.hasOwnProperty.call(this, key); }),
	get: value(function (this: any, key: PropertyKey) { return ENUM.has.call(this, key) ? this[key] : undefined; }),
	count: value(function (this: any) { return ENUM.keys.call(this).length; }),
	includes: value(function (this: any, search: any) { return ENUM.values.call(this).includes(search); }),
	keyOf: value(function (this: any, search: any) { return ENUM.invert.call(this)[search]; }),
	extend: value(function (this: any, list: any, frozen?: boolean): any { return (enumify as any).call(this, list, frozen); }),

	forEach: value(function (this: any, fn: (entry: [any, any], index: number, enumify: any) => void, thisArg?: any) {
		ENUM.entries.call(this).forEach((entry: any, index: number) => fn.call(thisArg, entry, index, this));
	}),
	filter: value(function (this: any, fn: (entry: [any, any], index: number, enumify: any) => boolean, thisArg?: any): any {
		return enumify(ENUM.entries.call(this).reduce((acc: Property<any>, entry: any, index: number) => (fn.call(thisArg, entry, index, this) ? Object.assign(acc, { [entry[0]]: entry[1] }) : acc), {} as Property<any>));
	}),
	map: value(function (this: any, fn: (entry: [any, any], index: number, enumify: any) => any, thisArg?: any): any {
		return enumify(ENUM.entries.call(this).reduce((acc: Property<any>, entry: any, index: number) => Object.assign(acc, { [entry[0]]: fn.call(thisArg, entry, index, this) }), {} as Property<any>));
	}),

	[Symbol.iterator]: value(function* (this: any) { for (const entry of ENUM.entries.call(this)) yield entry as any; }),
	[Symbol.toStringTag]: { enumerable: false, configurable: false, writable: false, value: tag }
}));

function value(val: any) {
	return { enumerable: false, configurable: false, writable: false, value: val }
}

/**
 * # Enum
 * Static reflection and helper suite for Enumify objects.
 * Immune to member property shadowing and recommended over legacy prototype methods.
 */
const enumMethods = {
	/** Check if a key exists in an Enum or any inherited parent Enum */
	has<T extends Property<any>>(enumObj: T, key: LooseKey<KeyOf<T>> | PropertyKey): key is KeyOf<T> {
		return ENUM.has.call(enumObj, key);
	},

	/** Check if a key exists directly as an own property on an Enum (mirrors Object.hasOwn) */
	hasOwn<T extends Property<any>>(enumObj: T, key: LooseKey<KeyOf<T>> | PropertyKey): key is KeyOf<T> {
		return Object.prototype.hasOwnProperty.call(enumObj, key);
	},

	/** Safely retrieve a member value by key, returning undefined if absent */
	get<T extends Property<any>>(enumObj: T, key: LooseKey<KeyOf<T>> | PropertyKey): ValueOf<T> | undefined {
		return ENUM.get.call(enumObj, key);
	},

	/** Safely extract all enum member keys, immune to shadowing */
	keys<T extends Property<any>>(enumObj: T): readonly KeyOf<T>[] {
		return ENUM.keys.call(enumObj);
	},

	/** Safely extract all enum member values, immune to shadowing */
	values<T extends Property<any>>(enumObj: T): readonly ValueOf<T>[] {
		return ENUM.values.call(enumObj);
	},

	/** Safely extract [key, value] pairs, immune to shadowing */
	entries<T extends Property<any>>(enumObj: T): readonly (readonly [KeyOf<T>, ValueOf<T>])[] {
		return ENUM.entries.call(enumObj);
	},

	/** Safely look up the key corresponding to a given value (reverse mapping) */
	keyOf<T extends Property<any>>(enumObj: T, search: LooseKey<ValueOf<T>> | any): KeyOf<T> | undefined {
		return ENUM.keyOf.call(enumObj, search);
	},

	/** Safely check if a value exists in an enum */
	includes<T extends Property<any>>(enumObj: T, search: LooseKey<ValueOf<T>> | any): boolean {
		return ENUM.includes.call(enumObj, search);
	},

	/** Safely count total entries in an enum */
	count<T extends Property<any>>(enumObj: T): number {
		return ENUM.count.call(enumObj);
	},

	/** 
	 * Safely invert an enum into a Value -> Key lookup dictionary.
	 * Supports aliased enums (last-key-wins on duplicate values).
	 */
	invert<T extends Property<any>>(enumObj: T): Readonly<Invert<T>> {
		return ENUM.invert.call(enumObj);
	},

	/** Extend an enum with new entries */
	extend<const E extends any[] | Property<any>>(enumObj: any, list: E, frozen?: boolean): EnumifyType<any> {
		return (enumify as any).call(enumObj, list, frozen);
	},

	/** Custom instance-of check supporting `val instanceof Enum` or predicate checking */
	[Symbol.hasInstance](instance: any): boolean {
		return instance != null && (instance[Symbol.toStringTag] === 'Enumify' || isFunction(instance?.has));
	}
};

export const Enum: Readonly<typeof enumMethods> = Object.freeze(Object.assign(Object.create(null), enumMethods));

/** namespace for Enum type-helpers */
export namespace Enum {
	/** Enum properties & methods */ export type wrap<T = any> = T extends Property<any> ? EnumifyType<T> : any;
	/** Enum methods (filtered) */ export type methods<T = any> = keyof EnumifyType<any>;
	/** Enum own properties */ export type props<T = any> = Readonly<T>;
}

/**
 * # Enumify
 * create a Proxy-based Registry (Enum) from an Object or Array.  
 * Enums are immutable (frozen) and provide methods for iteration, search, and extension.  
 * 
 * @example
 * ```typescript
 * const Status = enumify(['Active', 'Inactive', 'Pending']);
 * console.log(Status.Active);															// 0
 * console.log(Enum.has(Status, 'Active'));									// true
 * console.log(Enum.keys(Status));													// ['Active', 'Inactive', 'Pending']
 * ```
 */
export function enumify<const T extends readonly any[]>(list: T, frozen?: boolean): Enum.wrap<Index<T>>;
export function enumify<const T extends Property<any>>(list: T, frozen?: boolean): Enum.wrap<T>;
export function enumify<T>(this: any, list: T, frozen = true): any {
	const type = getType(this);
	const proto = (type !== 'Module' && isFunction(this?.has)) ? this : ENUM;
	const arg = asType(list);
	const target = Object.create(proto);

	switch (arg.type) {
		case 'Enumify':
		case 'Object':
			Object.defineProperties(target, Object.getOwnPropertyDescriptors(arg.value));
			break;

		case 'Array':
			(arg.value as string[]).forEach((key, index) => {
				if (isNumeric(key))
					throw new TypeError(`Enumify: numeric keys are not supported ("${key}").`);
				if (Object.prototype.hasOwnProperty.call(target, key))
					throw new TypeError(`Enumify: duplicate member key "${key}" found in array definition.`);
				Object.defineProperty(target, key, {
					value: index,
					enumerable: true,
					writable: false,
					configurable: false
				});
			});
			break;

		default:
			throw new TypeError(`Enumify: invalid argument type: ${arg.type}`);
	}

	return proxify(target, true, frozen);											// proxy is ALWAYS frozen (read-only), but target is only 'locked' if requested
}

/** create an entry in the Serialization Registry to describe how to rebuild an Enum */
@Serializable
@StringTag('Enumify')
export class Enumify {
	constructor(list: Property<any>) {
		return enumify(list);
	}
}
