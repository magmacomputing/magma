import { sym } from '#library/symbol.library.js';
import { getType, protoType, asType } from '#library/type.library.js';
import type { Type, Primitive, Nullish, Temporals, Property, GetType } from '#library/type.library.js';

/** assert value is one of a list of Types */
export const isType = <T>(obj: unknown, ...types: Type[]): obj is T => types.includes(getType(obj));

/** Type-Guards: assert \<obj> is of \<type> */
export const isPrimitive = (obj?: unknown): obj is Primitive => isType(obj, 'String', 'Number', 'BigInt', 'Boolean', 'Symbol', 'Undefined', 'Void', 'Null', 'Empty');
export const isReference = (obj?: unknown): obj is Object => !isPrimitive(obj);
export const isIterable = <T>(obj: unknown): obj is Iterable<T> => Symbol.iterator in Object(obj) && !isString(obj);

export const isString = <T>(obj?: T): obj is Extract<T, string> => isType(obj, 'String');
export const isNumber = <T>(obj?: T): obj is Extract<T, number> => isType(obj, 'Number') && isFinite(obj as number);

/** test if can convert String to Numeric */
export function isNumeric(str?: any): boolean {
	const type = typeof str;
	switch (type) {
		case 'number': return isFinite(str);
		case 'bigint': return true;
		case 'string': {
			const val = str.trim();
			if (val.length === 0) return false;
			return /^-?[0-9]+n$/.test(val) || (!isNaN(parseFloat(val)) && isFinite(Number(val)));
		}
		default: return false;
	}
}
export const isInteger = <T>(obj?: T): obj is Extract<T, bigint> => isType(obj, 'BigInt');
export const isIntegerLike = <T>(obj?: T): obj is Extract<T, string> => isType(obj, 'String') && /^-?[0-9]+n$/.test(obj as string);
export const isDigit = <T>(obj?: T): obj is Extract<T, number | bigint> => isType(obj, 'Number', 'BigInt');
export const isBoolean = <T>(obj?: T): obj is Extract<T, boolean> => isType(obj, 'Boolean');
export const isArray = <T>(obj: unknown): obj is T[] => isType(obj, 'Array');
export const isArrayLike = <T>(obj: any): obj is ArrayLike<T> => protoType(obj) === 'Object' && 'length' in obj && Object.keys(obj).every(key => key === 'length' || !isNaN(Number(key)));
export const isObject = <T>(obj?: T): obj is Extract<T, object> => isType(obj, 'Object');
export const isDate = <T>(obj?: T): obj is Extract<T, Date> => isType(obj, 'Date');
export const isRegExp = <T>(obj?: T): obj is Extract<T, RegExp> => isType(obj, 'RegExp');
export const isRegExpLike = <T>(obj?: T): obj is Extract<T, string> => isType(obj, 'String') && /^\/.*\/$/.test(obj as string);
export const isSymbol = <T>(obj?: T): obj is Extract<T, symbol> => isType(obj, 'Symbol');
export const isSymbolFor = <T>(obj?: T): obj is Extract<T, symbol> => isType<symbol>(obj, 'Symbol') && Symbol.keyFor(obj) !== undefined;
export const isPropertyKey = (obj?: unknown): obj is PropertyKey => isType<PropertyKey>(obj, 'String', 'Number', 'Symbol');

export const isNull = <T>(obj?: T): obj is Extract<T, null> => isType(obj, 'Null');
export const isNullish = <T>(obj: T): obj is Extract<T, Nullish> => isType<undefined | null | void>(obj, 'Null', 'Undefined', 'Void', 'Empty');
export const isUndefined = <T>(obj?: T): obj is undefined => isType<undefined>(obj, 'Undefined', 'Void', 'Empty');
export const isDefined = <T>(obj: T): obj is NonNullable<T> => !isNullish(obj);

export const isClass = <T>(obj?: T): obj is Extract<T, Function> => isType(obj, 'Class');
export const isFunction = <T>(obj?: T): obj is Extract<T, Function> => isType(obj, 'Function', 'AsyncFunction', 'Class');
export const isPromise = <T>(obj?: T): obj is Extract<T, Promise<any>> => isType(obj, 'Promise');
export const isMap = <T, K = any, V = any>(obj?: T): obj is Extract<T, Map<K, V>> => isType(obj, 'Map');
export const isSet = <T, K = any>(obj?: T): obj is Extract<T, Set<K>> => isType(obj, 'Set');
export const isError = <T>(err?: T): err is Extract<T, Error> => isType(err, 'Error');

export const isTemporal = <T>(obj: T): obj is Extract<T, Temporals> => protoType(obj).startsWith('Temporal.') || (!!(globalThis as any).Temporal && (
	(obj as any) instanceof (globalThis as any).Temporal.Instant ||
	(obj as any) instanceof (globalThis as any).Temporal.ZonedDateTime ||
	(obj as any) instanceof (globalThis as any).Temporal.PlainDate ||
	(obj as any) instanceof (globalThis as any).Temporal.PlainTime ||
	(obj as any) instanceof (globalThis as any).Temporal.PlainDateTime ||
	(obj as any) instanceof (globalThis as any).Temporal.Duration ||
	(obj as any) instanceof (globalThis as any).Temporal.PlainYearMonth ||
	(obj as any) instanceof (globalThis as any).Temporal.PlainMonthDay
));

export const isInstant = <T>(obj: T): obj is Extract<T, Temporal.Instant> => isType(obj, 'Temporal.Instant') || (!!(globalThis as any).Temporal?.Instant && (obj as any) instanceof (globalThis as any).Temporal.Instant) || (!!obj && (obj as any)[Symbol.toStringTag] === 'Temporal.Instant');
export const isZonedDateTime = <T>(obj: T): obj is Extract<T, Temporal.ZonedDateTime> => isType(obj, 'Temporal.ZonedDateTime') || (!!(globalThis as any).Temporal?.ZonedDateTime && (obj as any) instanceof (globalThis as any).Temporal.ZonedDateTime) || (!!obj && (obj as any)[Symbol.toStringTag] === 'Temporal.ZonedDateTime');
export const isPlainDate = <T>(obj: T): obj is Extract<T, Temporal.PlainDate> => isType(obj, 'Temporal.PlainDate') || (!!(globalThis as any).Temporal?.PlainDate && (obj as any) instanceof (globalThis as any).Temporal.PlainDate) || (!!obj && (obj as any)[Symbol.toStringTag] === 'Temporal.PlainDate');
export const isPlainTime = <T>(obj: T): obj is Extract<T, Temporal.PlainTime> => isType(obj, 'Temporal.PlainTime') || (!!(globalThis as any).Temporal?.PlainTime && (obj as any) instanceof (globalThis as any).Temporal.PlainTime) || (!!obj && (obj as any)[Symbol.toStringTag] === 'Temporal.PlainTime');
export const isPlainDateTime = <T>(obj: T): obj is Extract<T, Temporal.PlainDateTime> => isType(obj, 'Temporal.PlainDateTime') || (!!(globalThis as any).Temporal?.PlainDateTime && (obj as any) instanceof (globalThis as any).Temporal.PlainDateTime) || (!!obj && (obj as any)[Symbol.toStringTag] === 'Temporal.PlainDateTime');
export const isDuration = <T>(obj: T): obj is Extract<T, Temporal.Duration> => isType(obj, 'Temporal.Duration') || (!!(globalThis as any).Temporal?.Duration && (obj as any) instanceof (globalThis as any).Temporal.Duration) || (!!obj && (obj as any)[Symbol.toStringTag] === 'Temporal.Duration');
export const isDurationLike = <T>(obj: T): obj is Extract<T, Temporal.DurationLike | string | Temporal.Duration> => isString(obj) || isDuration(obj) || (isObject(obj) && (
	'years' in obj || 'months' in obj || 'weeks' in obj || 'days' in obj ||
	'hours' in obj || 'minutes' in obj || 'seconds' in obj ||
	'milliseconds' in obj || 'microseconds' in obj || 'nanoseconds' in obj
));
export const isZonedDateTimeLike = <T>(obj: T): obj is Extract<T, Temporal.ZonedDateTimeLike | string | Temporal.ZonedDateTime> => isString(obj) || isZonedDateTime(obj) || (isObject(obj) && (
	'year' in obj || 'month' in obj || 'day' in obj || 'hour' in obj || 'minute' in obj || 'second' in obj ||
	'millisecond' in obj || 'microsecond' in obj || 'nanosecond' in obj || 'monthCode' in obj || 'offset' in obj || 'timeZone' in obj || 'calendar' in obj
));
export const isPlainYearMonth = <T>(obj: T): obj is Extract<T, Temporal.PlainYearMonth> => isType(obj, 'Temporal.PlainYearMonth') || (!!(globalThis as any).Temporal?.PlainYearMonth && (obj as any) instanceof (globalThis as any).Temporal.PlainYearMonth);
export const isPlainMonthDay = <T>(obj: T): obj is Extract<T, Temporal.PlainMonthDay> => isType(obj, 'Temporal.PlainMonthDay') || (!!(globalThis as any).Temporal?.PlainMonthDay && (obj as any) instanceof (globalThis as any).Temporal.PlainMonthDay);

// non-standard Objects
export const isEnum = <T, E extends Property<any>>(obj?: T): obj is Extract<T, GetType<'Enumify', E>> => isType(obj, 'Enumify');
export const isPledge = <T, P = any>(obj?: T): obj is Extract<T, GetType<'Pledge', P>> => isType(obj, 'Pledge');

/** assert value for secure() */
export const isExtensible = (obj: any): obj is any => !!(obj?.[sym.$Extensible]);
export const isTarget = (obj: any): obj is any => !!(obj?.[sym.$Target]);

/** object has no values */
export const isEmpty = <T>(obj?: T) => false
	|| isNullish(obj)
	|| (isObject(obj) && (Reflect.ownKeys(obj).length === 0))
	|| (isString(obj) && (obj.trim().length === 0))
	|| (isNumber(obj) && (isNaN(obj as any) === true))
	|| (isArray(obj) && (obj.length === 0))
	|| (isSet(obj) && (obj.size === 0))
	|| (isMap(obj) && (obj.size === 0))

export function assertCondition(condition: boolean, message?: string): asserts condition {
	if (!condition)
		throw new Error(message);
}
export function assertString(str: unknown): asserts str is string { assertCondition(isString(str), `Invalid string: ${str}`) };
export function assertNever(val: never): asserts val is never { throw new Error(`Unexpected object: ${val}`) };
