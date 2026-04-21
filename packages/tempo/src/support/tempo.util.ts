import { sym, Token } from './tempo.symbol.js';
import { asType, isSymbol, isUndefined, isString } from '#library/type.library.js';
import { ownEntries } from '#library/primitive.library.js';
import { getRuntime } from './tempo.runtime.js';

/** @internal set a mutable, enumerable property on a target */
export const setProperty = <T>(target: object, key: PropertyKey, value: T) =>
	Object.defineProperty(target, key, { value, writable: true, configurable: true, enumerable: true });

/** @internal return the Prototype parent of an object */
export const proto = (obj: object) => Object.getPrototypeOf(obj);

/** @internal test object has own property with the given key */
export const hasOwn = (obj: object, key: string) => Object.hasOwn(obj, key);

/** @internal create an object based on a prototype */
export const create = <T extends object>(obj: object, name: string): T => {
	const entry = proto(obj)[name];
	if (typeof entry !== 'object' || entry === null) {
		throw new TypeError(`[Tempo#create] Failed to create shadowed object for '${name}'. The prototype entry from proto(obj) is missing or not an object (received: ${typeof entry}).`);
	}
	return Object.create(entry);
};

/** @internal resolve a key to a symbol from Token or sym registries */
export function getSymbol(key?: string | symbol): symbol {
	if (isSymbol(key))
		return key as symbol;

	if (isUndefined(key)) {
		const runtime = getRuntime();
		const usr = `usr.${++runtime.usrCount}`;								// allocate a prefixed 'user' key
		return (Token as any)[usr] = Symbol(usr);								// add to Symbol register
	}

	if (isString(key) && (key as string).includes('.')) {
		const description = (key as string).split('.').pop()!;	// use last segment as description
		return (Token as any)[key as string] ??= Symbol(description);
	}

	return (Token as any)[key!] ?? (sym as any)[key!] ?? Symbol.for(key as string);
}

/** @internal helper to normalize snippet/layout Options into the target Config */
export function collect(target: Record<symbol, any>, value: any, convert: (v: any) => any) {
	const itm = asType(value);

	switch (itm.type) {
		case 'Object':
			ownEntries(itm.value as Record<string, any>)
				.forEach(([k, v]) => target[getSymbol(k)] = convert(v));
			break;
		case 'String':
		case 'RegExp':
			target[getSymbol()] = convert(itm.value);
			break;
		case 'Array':
			(itm.value as any[]).forEach(elm => collect(target, elm, convert));
			break;
	}
}

/** @internal standard date/time component order */
export const SCHEMA = [
	['year', 'yy'], ['month', 'mm'], ['day', 'dd'], ['hour', 'hh'], ['minute', 'mi'], ['second', 'ss'], ['millisecond', 'ms'], ['microsecond', 'us'], ['nanosecond', 'ns']
] as const;

/** @internal get the largest defined unit from a list of ranges */
export function getLargestUnit(list: any[]): string {
	for (const [unit] of SCHEMA) {
		if (list.some(r => r[unit] !== undefined)) return unit;
	}
	return 'nanosecond';
}

