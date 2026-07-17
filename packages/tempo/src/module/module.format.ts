import '#library/temporal.polyfill.js';
import { pad, toTitleCase } from '#library/string.library.js';
import { deepMerge } from '#library/object.library.js';
import { suffix } from '#library/number.library.js';
import { ifNumeric } from '#library/coercion.library.js';
import { isString, isObject, isZonedDateTime, isInstant, isPlainDate, isPlainDateTime, isUndefined, isDefined, isFunction } from '#library/assertion.library.js';
import { formatDayPeriod, getDTF, getPR, getISOWeekOfYear } from '#library/international.library.js';
import { delegator } from '#library/proxy.library.js';

import { isTempo, enums, Match, getRuntime, NumericPattern, BigIntPattern, hasOwn, $Internal } from '#tempo/support';
import { defineInterpreterModule } from '../plugin/plugin.util.js';
import { findTermPlugin } from '../plugin/term/term.util.js';
import type { Tempo } from '../tempo.class.js';

declare module '../tempo.class.js' {
	interface Tempo {
		/** applies a format to the instance. */									format(options: import('../tempo.type.js').FormatOptions): string;
		/** applies a format to the instance. */									format(fmt: BigIntPattern, options?: any): bigint;
		/** applies a format to the instance. */									format(fmt: NumericPattern, options?: any): number;
		/**
		 * Applies a format to the instance.
		 * Format strings are validated at compile time — any unrecognised `{token}`
		 * will produce an IDE error showing the bad token name.
		 * @see {@link import('../tempo.type.js').TempoFormatTokens} to extend the token set.
		 */
		format<S extends string>(
			fmt: string extends S
				? S																							// variable string — no validation, accept as-is
				: string extends import('../tempo.type.js').ValidateFormat<S>
				? S																						// ValidateFormat<S> is `string` → all tokens valid, accept
				: import('../tempo.type.js').ValidateFormat<S>,	// ValidateFormat<S> is an error literal → mismatch forces IDE error
			options?: any
		): string | number | bigint;
		/** applies a format to the instance (zero-argument — returns a pre-built format proxy). */	format(): string | number | bigint;
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
export function format(obj: any, options: import('../tempo.type.js').FormatOptions): string;
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
		if (options.intl) config.intl = deepMerge(baseConfig?.intl || {}, options.intl);

		if (options.registry) {
			config.registry = { ...baseConfig?.registry, ...options.registry };
			if (options.registry.formats) config.registry.formats = { ...baseConfig?.registry?.formats, ...options.registry.formats };
			if (options.registry.locales) config.registry.locales = { ...baseConfig?.registry?.locales, ...options.registry.locales };
			if (options.registry.tokens) config.registry.tokens = { ...baseConfig?.registry?.tokens, ...options.registry.tokens };
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

	// auto-meridiem: if {h12} is present and {mer} is absent, append it after the last time component
	if (template.includes('{h12') && !template.includes('{mer')) {
		const hMatch = template.match(/\{h12[^}]*\}/);
		let merMod = '';
		let skipMeridiem = false;
		if (hMatch) {
			const modifiers = hMatch[0].toLowerCase();
			if (modifiers.includes('raw')) skipMeridiem = true;

			if (modifiers.includes('upper')) merMod += ':upper';
			if (modifiers.includes('lower')) merMod += ':lower';
			if (modifiers.includes('dots')) merMod += ':dots';
			if (modifiers.includes('locale')) merMod += ':locale';
			if (modifiers.includes('space')) merMod += ':space';
		}

		if (!skipMeridiem) {
			const lastSearch = (rgx: RegExp) => {
				const matches = [...template.matchAll(rgx)];
				return matches.length ? matches[matches.length - 1].index! : -1;
			}
			const hIndex = lastSearch(/\{h12[^}]*\}/g);
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
				const prefix = merMod.includes(':space') ? ' ' : '';
				const cleanMod = merMod.replace(/:space/g, '');
				template = template.slice(0, end) + `${prefix}{mer${cleanMod}}` + template.slice(end);
			}
		}
	}

	const result = template.replace(new RegExp(Match.formatBraces, 'g'), (_match: string, fullToken: string) => {
		const [token, ...modifiers] = fullToken.split(':');
		let res: any;

		switch (token) {
			case 'yyyy': res = pad(zdt.year, 4); break;
			case 'yy': res = pad(zdt.year % 100); break;
			case 'yw': res = pad(getISOWeekOfYear(zdt).yearOfWeek, 4); break;
			case 'ww': case 'wy': res = pad(getISOWeekOfYear(zdt).weekOfYear); break;
			case 'yyww': case 'yywy': {
				const { weekOfYear, yearOfWeek } = getISOWeekOfYear(zdt);
				res = pad(yearOfWeek, 4) + pad(weekOfYear);
				break;
			}
			case 'era': {
				const dtfOptions = (config?.intl?.dateTimeFormat || {}) as any;
				res = getDTF(config?.locale, {
					timeZone: zdt.timeZoneId,
					calendar: zdt.calendarId,
					era: dtfOptions.era ?? 'short'
				}).formatToParts(zdt.epochMilliseconds).find(p => p.type === 'era')?.value ?? '';
				break;
			}
			case 'eon':
				res = (zdt.eraYear ?? Math.abs(zdt.year <= 0 ? zdt.year - 1 : zdt.year)).toString();
				break;
			case 'mm': res = pad(zdt.month); break;
			case 'mon': res = enums.MONTHS.keyOf(zdt.month as any); break;
			case 'mmm': res = enums.MONTH.keyOf(zdt.month as any); break;
			case 'dd': res = pad(zdt.day); break;
			case 'day': res = zdt.day.toString(); break;
			case 'dow': res = zdt.dayOfWeek.toString(); break;
			case 'wkd': res = enums.WEEKDAYS.keyOf(zdt.dayOfWeek as any); break;
			case 'www': res = enums.WEEKDAY.keyOf(zdt.dayOfWeek as any); break;
			case 'h24': case 'hh': res = pad(zdt.hour); break;
			case 'h12': res = pad(zdt.hour > 12 ? zdt.hour % 12 : zdt.hour || 12); break;
			case 'mer': res = zdt.hour >= 12 ? 'pm' : 'am'; break;
			case 'mi': res = pad(zdt.minute); break;
			case 'ss': res = pad(zdt.second); break;
			case 'ms': res = pad(zdt.millisecond, 3); break;
			case 'us': res = pad(zdt.microsecond, 3); break;
			case 'ns': res = pad(zdt.nanosecond, 3); break;
			case 'ff': res = `${pad(zdt.millisecond, 3)}${pad(zdt.microsecond, 3)}${pad(zdt.nanosecond, 3)}`; break;
			case 'dmy':
			case 'mdy':
			case 'ymd': {
				const isShort = modifiers.includes('yy') || modifiers.includes('year');
				const y = pad(isShort ? zdt.year % 100 : zdt.year, isShort ? 2 : 4);
				const m = pad(zdt.month);
				const d = pad(zdt.day);
				if (token === 'dmy') res = `${d}${m}${y}`;
				else if (token === 'mdy') res = `${m}${d}${y}`;
				else res = `${y}${m}${d}`;
				break;
			}
			/** @deprecated Use {dmy:yy} modifier instead */
			case 'dmy6': res = `${pad(zdt.day)}${pad(zdt.month)}${pad(zdt.year % 100)}`; break;
			/** @deprecated Use {mdy:yy} modifier instead */
			case 'mdy6': res = `${pad(zdt.month)}${pad(zdt.day)}${pad(zdt.year % 100)}`; break;
			/** @deprecated Use {ymd:yy} modifier instead */
			case 'ymd6': res = `${pad(zdt.year % 100)}${pad(zdt.month)}${pad(zdt.day)}`; break;
			case 'hms': res = `${pad(zdt.hour)}${pad(zdt.minute)}${pad(zdt.second)}`; break;
			case 'ts': res = ((config?.timeStamp ?? 'ms') === 'ss')
				? Math.trunc(zdt.epochMilliseconds / 1000).toString()
				: zdt.epochMilliseconds.toString(); break;
			case 'nano': res = zdt.epochNanoseconds.toString(); break;
			case 'tz': res = zdt.timeZoneId; break;
			case 'cal': res = zdt.calendarId; break;
			default: {
				const customTokens = (config?.registry as any)?.tokens ?? {};
				const customTokenFn = customTokens[token];
				if (hasOwn(customTokens, token) && isFunction(customTokenFn)) {
					res = customTokenFn(zdt, { modifiers, config });
				} else if (token.startsWith('#') && isTempo(obj)) {
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

		const dtOptions = config?.intl?.dateTimeFormat ?? {};

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
				case 'dots': {
					if (token === 'mer' || token === 'era')
						res = String(res).replace(/\./g, '').split('').join('.') + '.';
					break;
				}
				case 'locale': {
					try {
						if (token.startsWith('#') && isTempo(obj)) {
							const termKey = token.slice(1);
							const termName = termKey.split('.')[0];
							const plugin = findTermPlugin(termName, (obj.constructor as any)[$Internal]());

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
							const tzOpts = { ...dtOptions, timeZone: zdt.timeZoneId, calendar: zdt.calendarId };
							if (token === 'mon') res = getDTF(config?.locale, { ...tzOpts, month: 'long' }).format(zdt.epochMilliseconds);
							else if (token === 'mmm') res = getDTF(config?.locale, { ...tzOpts, month: 'short' }).format(zdt.epochMilliseconds);
							else if (token === 'wkd') res = getDTF(config?.locale, { ...tzOpts, weekday: 'long' }).format(zdt.epochMilliseconds);
							else if (token === 'www') res = getDTF(config?.locale, { ...tzOpts, weekday: 'short' }).format(zdt.epochMilliseconds);
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
				case 'z':
					if (token === 'tz') res = zdt.offset.endsWith(':00') ? zdt.offset.slice(0, -3) : zdt.offset;
					break;
				case 'zz':
					if (token === 'tz') res = zdt.offset;
					break;
				case 'zzz':
					if (token === 'tz') res = zdt.offset.replace(':', '');
					break;
				case 'zzzz':
					if (token === 'tz') {
						const parts = getDTF(config?.locale, { ...dtOptions, timeZone: zdt.timeZoneId, timeZoneName: 'short' }).formatToParts(zdt.epochMilliseconds);
						res = parts.find(p => p.type === 'timeZoneName')?.value ?? zdt.timeZoneId;
					}
					break;
				case 'zzzzz':
					if (token === 'tz') {
						const parts = getDTF(config?.locale, { ...dtOptions, timeZone: zdt.timeZoneId, timeZoneName: 'long' }).formatToParts(zdt.epochMilliseconds);
						res = parts.find(p => p.type === 'timeZoneName')?.value ?? zdt.timeZoneId;
					}
					break;
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
