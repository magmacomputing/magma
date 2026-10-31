import { asType, getType } from '#library/type.library.js';
import { isNumeric } from '#library/assertion.library.js';
import { ownEntries } from '#library/primitive.library.js';
import { secure, proxify } from '#library/proxy.library.js';
import { Serializable, StringTag } from '#library/decorator.library.js';
import type { Property, Index, KeyOf, ValueOf, Invert, LooseKey } from '#library/type.library.js';

declare module '#library/type.library.js' {
	interface TypeValueMap<T = any> {
		Enumify: { type: 'Enumify', value: Enum.wrap<T> };
	}
}

/** key to use for identifying Enumify objects */
const tag = 'Enumify';

/** Enum iterator & metadata methods */
export type EnumMethods<T extends Property<any> = any> = {
	/** iterate through all Enum entries */
	readonly [Symbol.iterator]: () => IterableIterator<readonly [KeyOf<T>, ValueOf<T>]>;
	/** used to identify the Enumify type */
	readonly [Symbol.toStringTag]: typeof tag;
};

/** Enum properties with symbol metadata */
export type EnumifyType<T extends Property<any> = any> = Readonly<T> & EnumMethods<T>;

const keysCache = new WeakMap<object, readonly any[]>();
const valuesCache = new WeakMap<object, readonly any[]>();
const entriesCache = new WeakMap<object, readonly (readonly [any, any])[]>();
const invertCache = new WeakMap<object, Readonly<Record<string, any>>>();

const ENUM: any = secure(Object.create(null, {
	[Symbol.iterator]: { value: function* (this) { for (const entry of Enum.entries(this)) yield entry; } },
	[Symbol.toStringTag]: { value: tag }
}));

/**
 * # Enum
 * Static reflection and helper suite for Enumify objects.
 * Immune to member property shadowing and replaces legacy prototype methods.
 */
const enumMethods = {
	/** Check if a key exists in an Enum or any inherited parent Enum */
	has<T extends Property<any>>(enumObj: T, key: LooseKey<KeyOf<T>> | PropertyKey): key is KeyOf<T> {
		return enumMethods.keys(enumObj).includes(key as any);
	},

	/** Check if a key exists directly as an own property on an Enum (mirrors Object.hasOwn) */
	hasOwn<T extends Property<any>>(enumObj: T, key: LooseKey<KeyOf<T>> | PropertyKey): key is KeyOf<T> {
		return Object.hasOwn(enumObj, key);
	},

	/** Safely retrieve a member value by key, returning undefined if absent */
	get<T extends Property<any>>(enumObj: T, key: LooseKey<KeyOf<T>> | PropertyKey): ValueOf<T> | undefined {
		return enumMethods.has(enumObj, key) ? (enumObj as any)[key] : undefined;
	},

	/** Safely extract all enum member keys, immune to shadowing */
	keys<T extends Property<any>>(enumObj: T): readonly KeyOf<T>[] {
		let cached = keysCache.get(enumObj);
		if (!cached) {
			const keys = Object.freeze(ownEntries(enumObj, true).map(([key]: any) => key));
			keysCache.set(enumObj, keys);
			cached = keys;
		}
		return cached as any;
	},

	/** Safely extract all enum member values, immune to shadowing */
	values<T extends Property<any>>(enumObj: T): readonly ValueOf<T>[] {
		let cached = valuesCache.get(enumObj);
		if (!cached) {
			const values = Object.freeze(ownEntries(enumObj, true).map(([_, val]: any) => val));
			valuesCache.set(enumObj, values);
			cached = values;
		}
		return cached as any;
	},

	/** Safely extract [key, value] pairs, immune to shadowing */
	entries<T extends Property<any>>(enumObj: T): readonly (readonly [KeyOf<T>, ValueOf<T>])[] {
		let cached = entriesCache.get(enumObj);
		if (!cached) {
			const pairs: readonly (readonly [any, any])[] = Object.freeze(ownEntries(enumObj, true).map(([key, val]: any) => Object.freeze([key, val] as const)));
			entriesCache.set(enumObj, pairs);
			cached = pairs;
		}
		return cached as any;
	},

	/** Safely look up the key corresponding to a given value (reverse mapping) */
	keyOf<T extends Property<any>>(enumObj: T, search: LooseKey<ValueOf<T>> | any): KeyOf<T> | undefined {
		return (enumMethods.invert(enumObj) as any)[search];
	},

	/** Safely check if a value exists in an enum */
	includes<T extends Property<any>>(enumObj: T, search: LooseKey<ValueOf<T>> | any): boolean {
		return enumMethods.values(enumObj).includes(search);
	},

	/** Safely count total entries in an enum */
	count<T extends Property<any>>(enumObj: T): number {
		return enumMethods.keys(enumObj).length;
	},

	/** 
	 * Safely invert an enum into a Value -> Key lookup dictionary.
	 * Supports aliased enums (last-key-wins on duplicate values).
	 */
	invert<T extends Property<any>>(enumObj: T): Readonly<Invert<T>> {
		let cached = invertCache.get(enumObj);
		if (!cached) {
			const inverted = Object.freeze(Object.fromEntries(enumMethods.entries(enumObj).map(([key, val]: any) => [val, key])));
			invertCache.set(enumObj, inverted);
			cached = inverted;
		}
		return cached as any;
	},

	/** Extend an enum with new entries */
	extend: extendEnum,

	/** Custom instance-of check supporting `val instanceof Enum` or predicate checking */
	[Symbol.hasInstance](instance: any): boolean {
		return instance != null && instance[Symbol.toStringTag] === 'Enumify';
	}
};

function extendEnum<T extends Property<any>, const E extends readonly any[]>(enumObj: T, list: E, frozen?: boolean): Enum.wrap<Omit<T, keyof Index<E>> & Index<E>>;
function extendEnum<T extends Property<any>, const E extends Property<any>>(enumObj: T, list: E, frozen?: boolean): Enum.wrap<Omit<T, keyof E> & E>;
function extendEnum(enumObj: any, list: any, frozen?: boolean): any {
	return (enumify as any).call(enumObj, list, frozen);
}

export const Enum: Readonly<typeof enumMethods> = Object.freeze(Object.assign(Object.create(null), enumMethods));

/** namespace for Enum type-helpers */
export namespace Enum {
	/** Enum properties & methods */ export type wrap<T = any> = T extends Property<any> ? EnumifyType<T> : any;
	/** Enum static method keys */ export type methods = keyof typeof enumMethods;
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
	const isEnum = type !== 'Module' && this instanceof Enum;
	const proto = isEnum ? this : ENUM;
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
				if (Object.hasOwn(target, key))
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
	constructor(list: Property<any> | readonly any[]) {
		return enumify(list as any);
	}
}
