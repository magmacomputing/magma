import { sym } from '#library/symbol.library.js';
import { getType, protoType, asType } from '#library/type.library.js';
import type { Type, Primitive, Nullish, Temporals, Property, GetType } from '#library/type.library.js';

/** assert value is one of a list of Types */
export const isType = <T>(obj: unknown, ...types: Type[]): obj is T => types.includes(getType(obj));

/** Type-Guards: assert \<obj> is of \<type> */
export const isPrimitive = (obj?: unknown): obj is Primitive => isType(obj, 'String', 'Number', 'BigInt', 'Boolean', 'Symbol', 'Undefined', 'Void', 'Null', 'Empty');
export const isReference = (obj?: unknown): obj is Object => !isPrimitive(obj);
export const isIterable = <T>(obj: unknown): obj is Iterable<T> => Symbol.iterator in Object(obj) && !isString(obj);

export const isString = (obj: unknown): obj is string => isType<string>(obj, 'String');
export const isNumber = (obj: unknown): obj is number => isType<number>(obj, 'Number');
export const isFiniteNumber = (obj: unknown): obj is number => isType<number>(obj, 'Number') && isFinite(obj as number);

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
export const isInteger = (obj: unknown): obj is bigint => isType<bigint>(obj, 'BigInt');
export const isIntegerLike = (obj: unknown): obj is string => isType<string>(obj, 'String') && /^-?[0-9]+n$/.test(obj as string);
export const isDigit = (obj: unknown): obj is number | bigint => isType<number | bigint>(obj, 'Number', 'BigInt');
export const isBoolean = (obj: unknown): obj is boolean => isType<boolean>(obj, 'Boolean');
export const isArray = <T = any>(obj: unknown): obj is T[] => isType<T[]>(obj, 'Array');
export const isArrayLike = <T = any>(obj: any): obj is ArrayLike<T> => protoType(obj) === 'Object' && 'length' in obj && Object.keys(obj).every(key => key === 'length' || !isNaN(Number(key)));
export const isObject = <T = any>(obj: unknown): obj is Property<T> => isType<Property<T>>(obj, 'Object');
export const isDate = (obj: unknown): obj is Date => isType<Date>(obj, 'Date');
export const isRegExp = (obj: unknown): obj is RegExp => isType<RegExp>(obj, 'RegExp');
export const isRegExpLike = (obj: unknown): obj is string => isType<string>(obj, 'String') && /^\/.*\/$/.test(obj as string);
export const isSymbol = (obj: unknown): obj is symbol => isType<symbol>(obj, 'Symbol');
export const isSymbolFor = (obj: unknown): obj is symbol => isType<symbol>(obj, 'Symbol') && Symbol.keyFor(obj as symbol) !== undefined;
export const isPropertyKey = (obj: unknown): obj is PropertyKey => isType<PropertyKey>(obj, 'String', 'Number', 'Symbol');

export const isNull = (obj: unknown): obj is null => isType<null>(obj, 'Null');
export const isNullish = (obj: unknown): obj is Nullish => isType<Nullish>(obj, 'Null', 'Undefined', 'Void', 'Empty');
export const isUndefined = (obj: unknown): obj is undefined => isType<undefined>(obj, 'Undefined', 'Void', 'Empty');
export const isDefined = <T>(obj: T): obj is NonNullable<T> => !isNullish(obj);

export const isClass = (obj: unknown): obj is Function => isType<Function>(obj, 'Class');
export const isFunction = (obj: unknown): obj is Function => isType<Function>(obj, 'Function', 'AsyncFunction');
export const isPromise = <T = any>(obj: unknown): obj is Promise<T> => isType<Promise<T>>(obj, 'Promise');
export const isMap = <T = any, K = any>(obj: unknown): obj is Map<K, T> => isType<Map<K, T>>(obj, 'Map');
export const isSet = <T = any>(obj: unknown): obj is Set<T> => isType<Set<T>>(obj, 'Set');
export const isError = (err: unknown): err is Error => isType<Error>(err, 'Error');

export const isTemporal = (obj: unknown): obj is Temporals => protoType(obj).startsWith('Temporal.') || (!!(globalThis as any).Temporal && (
	(obj as any) instanceof (globalThis as any).Temporal.Instant ||
	(obj as any) instanceof (globalThis as any).Temporal.ZonedDateTime ||
	(obj as any) instanceof (globalThis as any).Temporal.PlainDate ||
	(obj as any) instanceof (globalThis as any).Temporal.PlainTime ||
	(obj as any) instanceof (globalThis as any).Temporal.PlainDateTime ||
	(obj as any) instanceof (globalThis as any).Temporal.Duration ||
	(obj as any) instanceof (globalThis as any).Temporal.PlainYearMonth ||
	(obj as any) instanceof (globalThis as any).Temporal.PlainMonthDay
));

export const isInstant = (obj: unknown): obj is Temporal.Instant => isType<Temporal.Instant>(obj, 'Temporal.Instant') || (!!(globalThis as any).Temporal?.Instant && (obj as any) instanceof (globalThis as any).Temporal.Instant) || (!!obj && (obj as any)[Symbol.toStringTag] === 'Temporal.Instant') || (!!obj && typeof (obj as any).toZonedDateTimeISO === 'function' && isUndefined((obj as any).timeZoneId) && isUndefined((obj as any).timeZone));
export const isZonedDateTime = (obj: unknown): obj is Temporal.ZonedDateTime => isType<Temporal.ZonedDateTime>(obj, 'Temporal.ZonedDateTime') || (!!(globalThis as any).Temporal?.ZonedDateTime && (obj as any) instanceof (globalThis as any).Temporal.ZonedDateTime) || (!!obj && (obj as any)[Symbol.toStringTag] === 'Temporal.ZonedDateTime') || (!!obj && typeof (obj as any).toInstant === 'function' && (isDefined((obj as any).timeZoneId) || isDefined((obj as any).timeZone)));
export const isPlainDate = (obj: unknown): obj is Temporal.PlainDate => isType<Temporal.PlainDate>(obj, 'Temporal.PlainDate') || (!!(globalThis as any).Temporal?.PlainDate && (obj as any) instanceof (globalThis as any).Temporal.PlainDate) || (!!obj && (obj as any)[Symbol.toStringTag] === 'Temporal.PlainDate') || (!!obj && typeof (obj as any).toZonedDateTime === 'function' && isUndefined((obj as any).timeZoneId) && isUndefined((obj as any).timeZone) && isDefined((obj as any).daysInMonth) && isUndefined((obj as any).hour) && isUndefined((obj as any).minute) && isUndefined((obj as any).second) && isUndefined((obj as any).nanosecond));
export const isPlainTime = (obj: unknown): obj is Temporal.PlainTime => isType<Temporal.PlainTime>(obj, 'Temporal.PlainTime') || (!!(globalThis as any).Temporal?.PlainTime && (obj as any) instanceof (globalThis as any).Temporal.PlainTime) || (!!obj && (obj as any)[Symbol.toStringTag] === 'Temporal.PlainTime') || (!!obj && typeof (obj as any).toPlainDateTime === 'function' && isUndefined((obj as any).daysInMonth));
export const isPlainDateTime = (obj: unknown): obj is Temporal.PlainDateTime => isType<Temporal.PlainDateTime>(obj, 'Temporal.PlainDateTime') || (!!(globalThis as any).Temporal?.PlainDateTime && (obj as any) instanceof (globalThis as any).Temporal.PlainDateTime) || (!!obj && (obj as any)[Symbol.toStringTag] === 'Temporal.PlainDateTime') || (!!obj && typeof (obj as any).toZonedDateTime === 'function' && isUndefined((obj as any).timeZoneId) && isUndefined((obj as any).timeZone) && (isDefined((obj as any).hour) || isDefined((obj as any).minute) || isDefined((obj as any).second) || isDefined((obj as any).nanosecond)));
export const isDuration = (obj: unknown): obj is Temporal.Duration => isType<Temporal.Duration>(obj, 'Temporal.Duration') || (!!(globalThis as any).Temporal?.Duration && (obj as any) instanceof (globalThis as any).Temporal.Duration) || (!!obj && (obj as any)[Symbol.toStringTag] === 'Temporal.Duration');
export const isDurationLike = (obj: unknown): obj is Temporal.DurationLike | string | Temporal.Duration => isString(obj) || isDuration(obj) || (isObject(obj) && (
	'years' in obj || 'months' in obj || 'weeks' in obj || 'days' in obj ||
	'hours' in obj || 'minutes' in obj || 'seconds' in obj ||
	'milliseconds' in obj || 'microseconds' in obj || 'nanoseconds' in obj
));
export const isZonedDateTimeLike = (obj: unknown): obj is Temporal.ZonedDateTimeLike | string | Temporal.ZonedDateTime => isString(obj) || isZonedDateTime(obj) || (isObject(obj) && (
	'year' in obj || 'month' in obj || 'day' in obj || 'hour' in obj || 'minute' in obj || 'second' in obj ||
	'millisecond' in obj || 'microsecond' in obj || 'nanosecond' in obj || 'monthCode' in obj || 'offset' in obj || 'timeZone' in obj || 'calendar' in obj
));
export const isPlainYearMonth = (obj: unknown): obj is Temporal.PlainYearMonth => isType<Temporal.PlainYearMonth>(obj, 'Temporal.PlainYearMonth') || (!!(globalThis as any).Temporal?.PlainYearMonth && (obj as any) instanceof (globalThis as any).Temporal.PlainYearMonth);
export const isPlainMonthDay = (obj: unknown): obj is Temporal.PlainMonthDay => isType<Temporal.PlainMonthDay>(obj, 'Temporal.PlainMonthDay') || (!!(globalThis as any).Temporal?.PlainMonthDay && (obj as any) instanceof (globalThis as any).Temporal.PlainMonthDay);

// non-standard Objects
export const isEnum = <E extends Property<any>>(obj: unknown): obj is GetType<'Enumify', E> => isType<GetType<'Enumify', E>>(obj, 'Enumify');
export const isPledge = <P = any>(obj: unknown): obj is GetType<'Pledge', P> => isType<GetType<'Pledge', P>>(obj, 'Pledge');

/** assert value for secure() */
export const isExtensible = (obj: any): obj is any => !!(obj?.[sym.$Extensible]);
export const isTarget = (obj: any): obj is any => !!(obj?.[sym.$Target]);

/** object has no values */
export const isEmpty = <T>(obj?: T) => false
	|| isNullish(obj)
	|| (isObject(obj) && (Reflect.ownKeys(obj).length === 0))
	|| (isString(obj) && (obj.trim().length === 0))
	|| Number.isNaN(obj as any)
	|| (isArray(obj) && (obj.length === 0))
	|| (isSet(obj) && (obj.size === 0))
	|| (isMap(obj) && (obj.size === 0))

export function assertCondition(condition: boolean, message?: string): asserts condition {
	if (!condition)
		throw new Error(message);
}
export function assertString(str: unknown): asserts str is string { assertCondition(isString(str), `Invalid string: ${str}`) };
export function assertNever(val: never): asserts val is never { throw new Error(`Unexpected object: ${val}`) };
