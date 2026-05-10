import { isBoolean } from '#library/assertion.library.js';

import { sym, Token } from './support.symbol.js';
import { asType } from '#library/type.library.js';
import { asArray } from '#library/coercion.library.js';
import { isSymbol, isUndefined, isDefined, isString, isRegExp, isNullish, isObject, isEmpty } from '#library/assertion.library.js';
import { ownEntries, ownKeys, unwrap } from '#library/primitive.library.js';
import { getRuntime } from './support.runtime.js';
import { Match, Snippet, Layout } from './support.default.js';
import enums from './support.enum.js';
import type * as t from '../tempo.type.js';

/** @internal normalize layout-order options into a clean string array */
export function normalizeLayoutOrder(value: unknown): string[] {
	return asArray(value)
		.map(v => String(v).trim())
		.filter(Boolean);
}

/** @internal set a mutable, enumerable property on a target */
export const setProperty = <T>(target: object, key: PropertyKey, value: T) => {
	if (Object.isExtensible(target)) {
		Object.defineProperty(target, key, { value, writable: true, configurable: true, enumerable: true });
	} else {
		console.warn(`[tempo] setProperty: Cannot define property '${String(key)}' on non-extensible object`, target);
	}
}

/** @internal set multiple mutable, enumerable properties on a target */
export const setProperties = (target: object, properties: Record<PropertyKey, any>) => {
	ownEntries(properties).forEach(([key, value]) => setProperty(target, key, value));
}

/** @internal Centralized Error Logger — retrieves the shared Logify instance from the TempoRuntime */
export function logError(config: any, ...msg: any[]) {
	const rt = getRuntime();
	rt.logger?.error(config ?? rt.state?.config, ...msg);
}

/** @internal Centralized Warning Logger — retrieves the shared Logify instance from the TempoRuntime */
export function logWarn(config: any, ...msg: any[]) {
	const rt = getRuntime();
	rt.logger?.warn(config ?? rt.state?.config, ...msg);
}

/** @internal Centralized Debug Logger — retrieves the shared Logify instance from the TempoRuntime */
export function logDebug(config: any, ...msg: any[]) {
	const rt = getRuntime();
	rt.logger?.debug(config ?? rt.state?.config, ...msg);
}

/** @internal check if an object is a proxy */
export const isProxy = (obj: any): boolean => !!obj && !!(obj as any)[sym.$Target];

/** @internal check if an object has an own property (respects Proxy/Shadowing) */
export const hasOwn = (obj: any, key: PropertyKey): boolean => {
	if (isNullish(obj)) return false;
	return Object.hasOwn(unwrap(obj), key);
}

/** @internal get the prototype of an object */
export const proto = (obj: any): any => Object.getPrototypeOf(unwrap(obj));

/** @internal create a new shadowed object from a prototype */
export function create<T extends object>(obj: any, name: string): T {
	const prototype = proto(obj);
	if (!isObject(prototype)) {
		logError(null, `[Tempo#create] Failed to create shadowed object for '${name}'. Proto(obj) is null or not an object.`);
		return {} as T;
	}

	const entry = prototype[name];
	if (!isObject(entry)) {
		logError(null, `[Tempo#create] Failed to create shadowed object for '${name}'. The prototype entry from proto(obj) is missing or not an object (received: ${typeof entry}).`);
		return {} as T;
	}

	return { ...entry } as T;
}

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

	return (Token as any)[key!] ?? (sym as any)[key!] ?? Symbol.for(`$Tempo.${key as string}`);
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

/**
 * @internal Normalize a MonthDay configuration value against a base.
 * @param value The user-supplied value to normalize
 * @param base The base/default value (e.g., Tempo.MONTH_DAY)
 */
export function resolveMonthDay(value: t.MonthDay | boolean = {}, base: t.MonthDay): t.MonthDay {
	const isExplicit = isBoolean(value) || isDefined((value as t.MonthDay).active);
	if (isBoolean(value)) value = { active: value } as t.MonthDay;
	const warned = new Set<string>();

	// 1. Merge Locales and Layouts (Additive)
	const localesList = [...new Set([...asArray(base.locales), ...asArray(value.locales)])];
	const layoutsList = [...new Set([...asArray(base.layouts), ...asArray(value.layouts)])];

	// 2. Merge TimeZones (Deep Additive)
	const tzs: Record<string, string[]> = { ...base.timezones } as any;
	if (value.timezones) {
		Object.entries(value.timezones).forEach(([k, v]) => {
			try {
				const normalized = new Intl.Locale(k).baseName;
				tzs[normalized] = [...new Set([...asArray(tzs[normalized] || []), ...asArray(v)])];
			} catch {
				tzs[k] = [...new Set([...asArray(tzs[k] || []), ...asArray(v)])];
			}
		});
	}

	// 3. Resolve to Internal Format
	const resolvedLocales = localesList.map(mdy => {
		const intl = new Intl.Locale(mdy);
		const tzs_intl = (intl as any).getTimeZones?.() ?? [];
		const fallback = tzs[intl.baseName] ?? [];

		if (tzs_intl.length === 0 && fallback.length === 0 && !warned.has(intl.baseName)) {
			warned.add(intl.baseName);
			// Optionally: warn here if needed
		}

		return {
			locale: intl.baseName,
			timeZones: tzs_intl.length > 0 ? tzs_intl : fallback
		}
	});

	return {
		...value,
		isExplicit: isExplicit || (base as any).isExplicit,
		locales: localesList as any,
		layouts: layoutsList as any,
		timezones: tzs,
		resolvedLocales
	}
}
