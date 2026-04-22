import '#library/temporal.polyfill.js';
import { pad } from '#library/string.library.js';
import { ifNumeric } from '#library/coercion.library.js';
import { isString, isObject, isZonedDateTime, isInstant, isPlainDate, isPlainDateTime, isUndefined, isDefined } from '#library/type.library.js';

import { isTempo, enums, Match, getRuntime } from '#tempo/support';
import { defineInterpreterModule } from '../plugin/plugin.util.js';
import { NumericPattern } from '../support/tempo.enum.js';
import type { Tempo } from '../tempo.class.js';

declare module '../tempo.class.js' {
	interface Tempo {
		/** applies a format to the instance. */								format(fmt: any): any;
	}
}

/**
 * Standalone Formatter
 * Returns a formatted string or number from a Temporal.ZonedDateTime or Tempo instance.
 *
 * @example
 * import { format } from '@magmacomputing/tempo/format';
 * const str = format(Temporal.Now.zonedDateTimeISO(), '{yyyy}-{mm}-{dd}');
 *
 * // Proxy usage (zero or one argument)
 * const weekDate = format(zdt).weekDate;
 * const stamp = format().logStamp; // defaults to 'Now'
 */
export function format(obj?: Temporal.ZonedDateTime | any): any;
export function format(obj: Temporal.ZonedDateTime | any, fmt: NumericPattern): number;
export function format(obj: Temporal.ZonedDateTime | any, fmt: string | symbol): string;
export function format(obj?: Temporal.ZonedDateTime | any, fmt?: string | symbol): string | number | any {
	const state = getRuntime().state;
	const config = isTempo(obj) ? obj.config : state?.config;
	const tz = config?.timeZone ?? 'UTC';

	let zdt: any;
	switch (true) {
		case isTempo(obj):
			zdt = (obj as any).toDateTime();
			break;
		case isZonedDateTime(obj):
			zdt = obj;
			break;
		case isInstant(obj):
			zdt = (obj as any).toZonedDateTimeISO(tz);
			break;
		case isString(obj):
			zdt = (obj as any).includes('[') ? Temporal.ZonedDateTime.from(obj as any) : ((obj as any).includes('T') ? Temporal.PlainDateTime.from(obj as any).toZonedDateTime(tz) : Temporal.PlainDate.from(obj as any).toZonedDateTime(tz));
			break;
		case isPlainDateTime(obj):
		case isPlainDate(obj):
			zdt = (obj as any).toZonedDateTime(tz);
			break;
		case obj === undefined:
			zdt = Temporal.Now.zonedDateTimeISO(tz);
			break;
		default:
			zdt = obj;
	}

	if (isUndefined(fmt)) {
		const formats = config?.formats ?? enums.FORMAT;
		return new Proxy({} as any, {
			get(_, prop: string) {
				if (!isString(prop) || prop === 'constructor' || prop === 'then') return undefined;
				return format(zdt, prop);
			},
			ownKeys() {
				return Object.keys(formats);
			},
			getOwnPropertyDescriptor(t, prop: string) {
				if (isString(prop) && isDefined(formats[prop])) {
					return {
						enumerable: true,
						configurable: true
					};
				}
				return undefined;
			}
		});
	}

	if (!isZonedDateTime(zdt)) return '';

	const formats = config?.formats ?? enums.FORMAT;

	let template = (isString(fmt) && formats && (typeof (formats as any).has === 'function' ? (formats as any).has(fmt as string) : Object.prototype.hasOwnProperty.call(formats, fmt as string)))
		? (formats as Record<string, string>)[fmt as string]
		: String(fmt);

	// auto-meridiem: if {HH} is present and {mer} is absent, append it after the last time component
	if (template.includes('{HH}') && !template.includes('{mer}') && !template.includes('{MER}')) {
		const index = Math.max(template.lastIndexOf('{HH}'), template.lastIndexOf('{mi}'), template.lastIndexOf('{ss}'));
		if (index !== -1) {
			const end = template.indexOf('}', index) + 1;
			template = template.slice(0, end) + '{mer}' + template.slice(end);
		}
	}

	const result = template.replace(new RegExp(Match.braces, 'g'), (_match: string, token: string) => {
		switch (token) {
			case 'yyyy': return pad(zdt.year, 4);
			case 'yy': return pad(zdt.year % 100);
			case 'yw': return pad(zdt.yearOfWeek, 4);
			case 'yyww': return pad(zdt.yearOfWeek, 4) + pad(zdt.weekOfYear);
			case 'mm': return pad(zdt.month);
			case 'mon': return enums.MONTHS.keyOf(zdt.month as any);
			case 'mmm': return enums.MONTH.keyOf(zdt.month as any);
			case 'dd': return pad(zdt.day);
			case 'day': return zdt.day.toString();
			case 'dow': return zdt.dayOfWeek.toString();
			case 'wkd': return enums.WEEKDAYS.keyOf(zdt.dayOfWeek as any);
			case 'www': return enums.WEEKDAY.keyOf(zdt.dayOfWeek as any);
			case 'ww': return pad(zdt.weekOfYear);
			case 'hh': return pad(zdt.hour);
			case 'HH': return pad(zdt.hour > 12 ? zdt.hour % 12 : zdt.hour || 12);
			case 'mer': return zdt.hour >= 12 ? 'pm' : 'am';
			case 'MER': return zdt.hour >= 12 ? 'PM' : 'AM';
			case 'mi': return pad(zdt.minute);
			case 'ss': return pad(zdt.second);
			case 'ms': return pad(zdt.millisecond, 3);
			case 'us': return pad(zdt.microsecond, 3);
			case 'ns': return pad(zdt.nanosecond, 3);
			case 'ff': return `${pad(zdt.millisecond, 3)}${pad(zdt.microsecond, 3)}${pad(zdt.nanosecond, 3)}`;
			case 'hhmiss': return `${pad(zdt.hour)}${pad(zdt.minute)}${pad(zdt.second)}`;
			case 'ts': return ((config?.timeStamp ?? 'ms') === 'ss')
				? Math.trunc(zdt.epochMilliseconds / 1000).toString()
				: zdt.epochMilliseconds.toString();
			case 'nano': return zdt.epochNanoseconds.toString();
			case 'tz': return zdt.timeZoneId;
			default: {
				if (token.startsWith('#') && isTempo(obj)) {
					const res = (obj as Tempo).term[token.slice(1)];
					if (isObject(res)) return res.label ?? res.key ?? `{${token}}`;
					return res ?? `{${token}}`;
				}
				return `{${token}}`;
			}
		}
	});

	const tokens = template.match(new RegExp(Match.braces, 'g'));
	const isNumericOutput = (NumericPattern as readonly string[]).includes(template as any) || (tokens && tokens.length > 1 && /^[0-9]+$/.test(result));
	return (isNumericOutput ? ifNumeric(result, true) : result) as any;
}

/**
 * Format Module Plugin
 */
// @ts-ignore
export const FormatModule: Tempo.Module = defineInterpreterModule('FormatModule', function (this: Tempo, fmt: any) {
	if (!this.isValid) return '' as unknown as any;
	return format(this, fmt);
});
