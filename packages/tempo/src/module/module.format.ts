import '#library/temporal.polyfill.js';
import { pad, toTitleCase } from '#library/string.library.js';
import { suffix } from '#library/number.library.js';
import { ifNumeric } from '#library/coercion.library.js';
import { isString, isObject, isZonedDateTime, isInstant, isPlainDate, isPlainDateTime, isUndefined, isDefined, isFunction } from '#library/assertion.library.js';
import { formatDayPeriod, getDTF, getPR } from '#library/international.library.js';
import { delegator } from '#library/proxy.library.js';

import { isTempo, enums, Match, getRuntime, NumericPattern, BigIntPattern } from '#tempo/support';
import { defineInterpreterModule } from '../plugin/plugin.util.js';
import type { Tempo } from '../tempo.class.js';


declare module '../tempo.class.js' {
	interface Tempo {
		/** applies a format to the instance. */								format(options: Intl.DateTimeFormatOptions & { timeZone?: string; calendar?: string }): string;
		/** applies a format to the instance. */								format(fmt: BigIntPattern, options?: any): bigint;
		/** applies a format to the instance. */								format(fmt: NumericPattern, options?: any): number;
		/** applies a format to the instance. */								format(fmt?: any, options?: any): any;
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
export function format(obj?: any): any;
export function format(obj: any, options: Intl.DateTimeFormatOptions & { timeZone?: string; calendar?: string }): string;
export function format(obj: any, fmt: BigIntPattern, options?: any): bigint;
export function format(obj: any, fmt: NumericPattern, options?: any): number;
export function format(obj: any, fmt: string | symbol, options?: any): string;
export function format(obj?: any, fmt?: any, options?: any): any {
	const state = getRuntime().state;
	const baseConfig = isTempo(obj) ? obj.config : state?.config;
	let config = baseConfig;
	if (isObject(fmt) && isUndefined(options)) {
		options = fmt;
		fmt = undefined;
	}

	if (options) {
		config = { ...baseConfig, ...options };
		if (options.intl) config.intl = { ...baseConfig?.intl, ...options.intl };

		if (options.registry) {
			config.registry = { ...baseConfig?.registry, ...options.registry };
			if (options.registry.formats) config.registry.formats = { ...baseConfig?.registry?.formats, ...options.registry.formats };
			if (options.registry.locales) config.registry.locales = { ...baseConfig?.registry?.locales, ...options.registry.locales };
		}
	}
	const formats = Object.assign({}, enums.FORMAT, config?.registry?.formats);
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
			zdt = (obj as any).includes('[')
				? Temporal.ZonedDateTime.from(obj as any)
				: ((obj as any).includes('T')
					? Temporal.PlainDateTime.from(obj as any).toZonedDateTime(tz)
					: Temporal.PlainDate.from(obj as any).toZonedDateTime(tz));
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

	if (config?.timeZone && zdt?.timeZoneId && zdt.timeZoneId !== config.timeZone) {
		try {
			zdt = zdt.withTimeZone(config.timeZone);
		} catch (e) { }
	}
	if (config?.calendar && zdt?.calendarId && zdt.calendarId !== config.calendar) {
		try {
			zdt = zdt.withCalendar(config.calendar);
		} catch (e) { }
	}

	if (isUndefined(fmt)) {
		if (options) {
			try {
				// Defensive performance boost: Once V8 natively supports Temporal, this memoized instance will succeed.
				return getDTF(config?.locale, options).format(zdt);
			} catch (e) {
				// Fallback: Node < 22 lacks native Temporal support in Intl, so we format the epoch.
				const fallbackOptions = { timeZone: zdt.timeZoneId, ...options };
				if (zdt.calendarId !== 'iso8601' && !fallbackOptions.calendar)
					fallbackOptions.calendar = zdt.calendarId;

				return getDTF(config?.locale, fallbackOptions).format(zdt.epochMilliseconds);
			}
		}
		return delegator(formats, (prop) => format(zdt, prop));
	}

	if (!isZonedDateTime(zdt)) return '';

	let template = (isString(fmt) && formats && (fmt as string in formats))
		? (formats as Record<string, string>)[fmt as string]
		: String(fmt);

	// auto-meridiem: if {h12} or {HH} is present and {mer} is absent, append it after the last time component
	if (/(?:\{h12|\{HH)/.test(template) && !template.toLowerCase().includes('{mer')) {
		const hMatch = template.match(/\{(h12|HH)[^}]*\}/);
		let merMod = '';
		let skipMeridiem = false;
		if (hMatch) {
			const modifiers = hMatch[0].toLowerCase();
			if (modifiers.includes('raw')) skipMeridiem = true;
			if (modifiers.includes('upper')) merMod = ':upper';
			else if (modifiers.includes('lower')) merMod = ':lower';

			if (modifiers.includes('locale')) merMod += ':locale';
		}

		if (!skipMeridiem) {
			const lastSearch = (rgx: RegExp) => {
				const matches = [...template.matchAll(rgx)];
				return matches.length ? matches[matches.length - 1].index! : -1;
			}
			const hIndex = Math.max(lastSearch(/\{h12[^}]*\}/g), lastSearch(/\{HH[^}]*\}/g));
			const miIndex = lastSearch(/\{mi[^}]*\}/g);
			const ssIndex = lastSearch(/\{ss[^}]*\}/g);
			const subIndex = Math.max(
				lastSearch(/\{ms[^}]*\}/g),
				lastSearch(/\{us[^}]*\}/g),
				lastSearch(/\{ns[^}]*\}/g),
				lastSearch(/\{ff[^}]*\}/g)
			);
			const index = Math.max(hIndex, miIndex, ssIndex, subIndex);

			if (index !== -1) {
				const end = template.indexOf('}', index) + 1;
				template = template.slice(0, end) + `{mer${merMod}}` + template.slice(end);
			}
		}
	}

	const result = template.replace(new RegExp(Match.formatBraces, 'g'), (_match: string, fullToken: string) => {
		const [token, ...modifiers] = fullToken.split(':');
		let res: any;

		switch (token) {
			case 'yyyy': res = pad(zdt.year, 4); break;
			case 'yy': res = pad(zdt.year % 100); break;
			case 'yw': res = pad(zdt.yearOfWeek, 4); break;
			case 'yyww': res = pad(zdt.yearOfWeek, 4) + pad(zdt.weekOfYear); break;
			case 'mm': res = pad(zdt.month); break;
			case 'mon': res = enums.MONTHS.keyOf(zdt.month as any); break;
			case 'mmm': res = enums.MONTH.keyOf(zdt.month as any); break;
			case 'dd': res = pad(zdt.day); break;
			case 'day': res = zdt.day.toString(); break;
			case 'dow': res = zdt.dayOfWeek.toString(); break;
			case 'wkd': res = enums.WEEKDAYS.keyOf(zdt.dayOfWeek as any); break;
			case 'www': res = enums.WEEKDAY.keyOf(zdt.dayOfWeek as any); break;
			case 'ww': res = pad(zdt.weekOfYear); break;
			case 'DAY': res = suffix(zdt.day); break;
			case 'WW': res = suffix(zdt.weekOfYear); break;
			case 'MM': res = suffix(zdt.month); break;
			case 'hh': res = pad(zdt.hour); break;
			case 'h12':
			case 'HH': res = pad(zdt.hour > 12 ? zdt.hour % 12 : zdt.hour || 12); break;
			case 'mer': res = zdt.hour >= 12 ? 'pm' : 'am'; break;
			case 'MER': res = zdt.hour >= 12 ? 'PM' : 'AM'; break;
			case 'mi': res = pad(zdt.minute); break;
			case 'ss': res = pad(zdt.second); break;
			case 'ms': res = pad(zdt.millisecond, 3); break;
			case 'us': res = pad(zdt.microsecond, 3); break;
			case 'ns': res = pad(zdt.nanosecond, 3); break;
			case 'ff': res = `${pad(zdt.millisecond, 3)}${pad(zdt.microsecond, 3)}${pad(zdt.nanosecond, 3)}`; break;
			case 'dmy': res = `${pad(zdt.day)}${pad(zdt.month)}${pad(zdt.year, 4)}`; break;
			case 'mdy': res = `${pad(zdt.month)}${pad(zdt.day)}${pad(zdt.year, 4)}`; break;
			case 'ymd': res = `${pad(zdt.year, 4)}${pad(zdt.month)}${pad(zdt.day)}`; break;
			case 'hms': res = `${pad(zdt.hour)}${pad(zdt.minute)}${pad(zdt.second)}`; break;
			case 'ts': res = ((config?.timeStamp ?? 'ms') === 'ss')
				? Math.trunc(zdt.epochMilliseconds / 1000).toString()
				: zdt.epochMilliseconds.toString(); break;
			case 'nano': res = zdt.epochNanoseconds.toString(); break;
			case 'tz': res = zdt.timeZoneId; break;
			case 'cal': res = zdt.calendarId; break;
			default: {
				if (token.startsWith('#') && isTempo(obj)) {
					const termObj = (obj as unknown as Tempo).term[token.slice(1)];
					if (isObject(termObj)) {
						res = termObj.label ?? termObj.key ?? `{${token}}`;
					} else {
						res = termObj ?? `{${token}}`;
					}
				} else {
					res = `{${token}}`;
				}
				break;
			}
		}

		if (res === `{${token}}` || modifiers.length === 0) return res;

		for (const mod of modifiers) {
			switch (mod.toLowerCase()) {
				case 'lower':
					res = String(res).toLocaleLowerCase(config?.locale);
					break;
				case 'upper':
					res = String(res).toLocaleUpperCase(config?.locale);
					break;
				case 'title':
					res = toTitleCase(String(res), config?.locale);
					break;
				case 'ord': {
					const val = parseInt(String(res), 10);
					const localeStr = Array.isArray(config?.locale) ? config.locale[0] : config?.locale;
					const lang = localeStr?.split('-')[0] ?? 'en';
					const dict = config?.registry?.locales?.[lang]?.['ordinal'];

					if (isObject(dict)) {
						const pr = getPR(config?.locale, { type: 'ordinal' });
						const category = pr.select(val);
						res = `${val}${dict[category] ?? dict.other ?? suffix(val)}`;
					} else if (isFunction(dict)) {
						res = dict(val);
					} else {
						res = suffix(val);
					}
					break;
				}
				case 'raw':
					if (/^[0-9]+$/.test(String(res)))
						res = BigInt(String(res)).toString();
					break;
				case 'locale': {
					try {
						if (token.startsWith('#') && isTempo(obj)) {
							const termKey = token.slice(1);
							const termName = termKey.split('.')[0];
							const plugin = (obj.constructor as any)._termMap?.get(termName);

							if (plugin) {
								const termVal = (obj as unknown as Tempo).term[termKey];
								const localeStr = Array.isArray(config?.locale) ? config.locale[0] : config?.locale;
								const lang = localeStr?.split('-')[0] ?? 'en';
								let locRes: any;
								let valStr: string;
								let baseKey: string | undefined;

								if (isObject(termVal)) {
									valStr = String(termVal.label ?? termVal.key ?? termVal.id);
									baseKey = String(termVal.key ?? termVal.id);
								} else {
									valStr = String(termVal);
								}

								// 1. Global Registry (user override)
								if (config?.registry?.locales?.[lang]?.[valStr])
									locRes = config.registry.locales[lang][valStr];

								// 2. Term's Bundled Dictionary (plugin default)
								else {
									const searchKey = baseKey ?? valStr;
									const flatGroups = Array.isArray(plugin.groups) ? plugin.groups : (isObject(plugin.groups) ? Object.values(plugin.groups).flat() : []);
									const group = flatGroups.find((g: any) => g.key === searchKey);
									if (group && isObject(group.locale))
										locRes = group.locale[lang] ?? group.locale.en;

								}

								// 3. Execution or Assignment
								if (isDefined(locRes))
									res = isFunction(locRes) ? locRes(config?.locale) : locRes;
							}
						} else {
							const dtOptions = config?.intl?.dateTimeFormat ?? {};
							if (token === 'mon') res = zdt.toLocaleString(config?.locale, { ...dtOptions, month: 'long' });
							else if (token === 'mmm') res = zdt.toLocaleString(config?.locale, { ...dtOptions, month: 'short' });
							else if (token === 'wkd') res = zdt.toLocaleString(config?.locale, { ...dtOptions, weekday: 'long' });
							else if (token === 'www') res = zdt.toLocaleString(config?.locale, { ...dtOptions, weekday: 'short' });
							else if (token === 'mer') {
								const period = formatDayPeriod(zdt.epochMilliseconds, config?.locale, { ...dtOptions, hour: 'numeric', hour12: true, timeZone: tz });
								if (period) res = period;
							}
						}
					} catch (e) {
						// Fallback to the current base token string
					}
					break;
				}
			}
		}

		return res;
	});

	const tokens = template.match(new RegExp(Match.formatBraces, 'g'));
	const isNumericOutput = BigIntPattern.includes(template as any) || NumericPattern.includes(template as any) || (tokens && tokens.length > 1 && /^[0-9]+$/.test(result));
	return (isNumericOutput ? ifNumeric(result, true) : result) as any;
}

/**
 * Format Module Plugin
 */
// @ts-ignore
export const FormatModule: Tempo.Module = defineInterpreterModule('FormatModule', function (this: Tempo, fmt: any, options?: any) {
	if (!this.isValid) return '' as unknown as any;
	return format(this, fmt, options);
});
