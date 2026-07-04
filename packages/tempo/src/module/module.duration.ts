import { getTemporalIds } from '#library/temporal.library.js';
import { isString, isObject, isDefined, isUndefined, isFunction } from '#library/assertion.library.js';
import { singular } from '#library/string.library.js';
import { getAccessors } from '#library/reflection.library.js';
import { ifDefined } from '#library/object.library.js';
import { getRelativeTime, formatNumber, formatDuration, formatList } from '#library/international.library.js';

import { defineInterpreterModule, interpret, type TempoModule } from '../plugin/plugin.util.js';
import { enums, isTempo, TempoError } from '#tempo/support';
import { Tempo } from '../tempo.class.js';

declare module '../tempo.class.js' {
	namespace Tempo {
		/** returns a full Tempo Duration object (EDO) for the given input */
		function duration(input: any): Tempo.Duration;
	}

	interface Tempo {
		/** time duration until (returns Duration) */						until(dateTimeOrOpts?: Tempo.DateTime | Tempo.Options, opts?: Tempo.Options): Tempo.Duration;
		/** time duration until (with unit, returns number) */	until(unit: Tempo.Unit, opts?: Tempo.Options): number;
		/** time duration until another date-time (with unit) */until(dateTimeOrOpts: Tempo.DateTime | Tempo.Options, unit: Tempo.Unit): number;
		/** fallback: union of possible returns */							until(optsOrDate?: Tempo.DateTime | Tempo.Until | Tempo.Options, optsOrUntil?: Tempo.Options | Tempo.Until): number | Tempo.Duration;

		/** time elapsed since (with unit) */										since(until: Tempo.Until, opts?: Tempo.Options): string;
		/** time elapsed since another date-time (with unit) */	since(dateTimeOrOpts: Tempo.DateTime | Tempo.Options, until: Tempo.Until): string;
		/** time elapsed since another date-time (w'out unit) */since(dateTimeOrOpts?: Tempo.DateTime | Tempo.Options, opts?: Tempo.Options): string;
		/** time elapsed since another date-time */							since(optsOrDate?: any, optsOrUntil?: any): string;
	}
}

declare module '#library/type.library.js' {
	interface TypeValueMap<T> {
		'Tempo.Duration': { type: 'Tempo.Duration', value: Tempo.Duration };
	}
}

/**
 * Convert a Temporal.Duration to a full Tempo.Duration object (EDO).
 */
function toDuration(dur: Temporal.Duration, ctx: { relativeTo?: any, locale?: string, numberFormat?: any, durationFormat?: any } = {}): Tempo.Duration {
	const edo = getAccessors(dur)
		.reduce((acc, d) => Object.assign(acc, ifDefined({ [d]: (dur as any)[d] })),
			{
				iso: dur.toString(),
				sign: dur.sign,
				blank: dur.blank,
				unit: undefined
			} as Tempo.Duration);

	Object.defineProperty(edo, 'balance', {
		value: function (opts: any = {}) {
			const { nominal, largestUnit = 'year', relativeTo: customAnchor } = opts;

			if (nominal) {
				// Mathematical mapping logic
				let { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = dur;
				let totalDays = days + weeks * 7 + months * 30 + years * 365;

				years = Math.trunc(totalDays / 365);
				totalDays -= years * 365;

				months = Math.trunc(totalDays / 30);
				totalDays -= months * 30;

				weeks = Math.trunc(totalDays / 7);
				totalDays -= weeks * 7;

				days = totalDays;

				const newDur = Temporal.Duration.from({
					years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds,
					sign: dur.sign
				});

				return toDuration(newDur, { ...ctx, relativeTo: customAnchor || ctx.relativeTo });
			}

			// Strict Temporal balancing
			const anchor = customAnchor || ctx.relativeTo;
			if (!anchor)
				throw new TempoError("A relativeTo anchor is required for strict balancing. Pass an anchor or use { nominal: true } for mathematical balancing.");

			const balanced = dur.round({ largestUnit, relativeTo: anchor });

			return toDuration(balanced, { ...ctx, relativeTo: anchor });
		},
		enumerable: false
	});

	Object.defineProperty(edo, 'format', {
		value: function (opts: any = {}) {
			const { locales, ...intlOpts } = opts;
			const locale = locales || ctx.locale;

			if (isFunction(ctx.durationFormat))
				return ctx.durationFormat(this);

			// 1. Native Intl.DurationFormat
			if ('DurationFormat' in Intl)
				return formatDuration(this, locale, { ...(ctx.durationFormat || {}), ...intlOpts });

			// 2. Fallback Polyfill (combine all non-zero units)
			const units = ['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds', 'milliseconds', 'microseconds', 'nanoseconds'] as const;
			const parts: string[] = [];

			for (const u of units) {
				const val = this[u];
				if (val) {
					const unitName = singular(u);											// singularize unit name (e.g., 'years' -> 'year')
					parts.push(
						formatNumber(val, locale, {
							style: 'unit',
							unit: unitName,
							unitDisplay: 'long',
							...(ctx.numberFormat || {}),
						})
					);
				}
			}

			if (parts.length === 0) return '0';										// fallback for completely empty duration

			return formatList(parts, locale, 'conjunction', 'long');
		},
		enumerable: false
	});

	return edo;
}

/**
 * Internal implementation of Tempo.until and Tempo.since  
 * (moved out of tempo.class.ts to reduce core bundle size)
 */
function duration(this: Tempo, type: 'until' | 'since', arg?: any, until?: any) {
	const since = type === 'since';
	let value, opts: any = {}, unit: any;

	switch (true) {
		case isString(arg) && enums.ELEMENT.values().includes(singular(arg) as any):
			unit = arg;
			({ value, ...opts } = until || {});
			break;
		case isString(arg):
			value = arg;
			if (isObject(until))
				({ unit, ...opts } = until as any)
			else unit = until;
			break;
		case isObject(arg) && isTempo(arg):
			value = (arg as any).toDateTime();
			if (isObject(until)) ({ unit, ...opts } = until as any);
			else unit = until;
			break;
		case isObject(arg) && isObject(until):
			({ value, unit, ...opts } = Object.assign({ value: arg }, until) as any);
			break;
		case isString(until):
			unit = until;
			value = arg;
			break;
		case isObject(until):
			({ unit, ...opts } = until as any);
			value = arg;
			break;
		case isObject(arg) && isDefined((arg as any).unit):
			({ unit, value, ...opts } = arg as any);
			break;
		default:
			value = arg;
	}

	const selfZdt = this.toDateTime();
	const offset = new (this.constructor as any)(value, { ...opts, anchor: this, mode: enums.MODE.Strict });
	const offsetZdt = offset.toDateTime();

	const [selfTz, selfCal] = getTemporalIds(selfZdt);
	const [offsetTz] = getTemporalIds(offsetZdt);

	const diffZone = selfTz !== offsetTz;
	const dur = selfZdt.until(offsetZdt.withCalendar(selfCal), { largestUnit: diffZone ? 'hours' : (unit ?? 'years') });

	if (isDefined(unit))
		unit = `${singular(unit)}s`;

	if (isUndefined(unit) || since) {
		const locale = (this as any)?.config?.locale;
		const numberFormat = opts['intl']?.numberFormat || (this as any)?.config?.intl?.numberFormat;
		const durationFormat = opts['intl']?.durationFormat || (this as any)?.config?.intl?.durationFormat;
		const res = toDuration(dur, { relativeTo: selfZdt, locale, numberFormat, durationFormat });
		if (unit) res.unit = unit;

		if (!since) return res;

		// --- since logic ---
		const date = [dur.years, dur.months, dur.days] as const;
		const time = [dur.hours, dur.minutes, dur.seconds] as const;
		const fraction = [dur.milliseconds, dur.microseconds, dur.nanoseconds]
			.map(Math.abs)
			.map(nbr => nbr.toString().padStart(3, '0'))
			.join('')
		const rtConfig = (this as any).config.intl?.relativeTimeFormat;
		const rtOptions = opts['intl']?.relativeTimeFormat;

		const rtf = (isFunction(rtOptions) ? rtOptions : rtOptions?.format)
			|| (isFunction(rtConfig) ? rtConfig : rtConfig?.format)
			|| opts['rtfFormat'] || (this as any).config['rtfFormat'];

		const getOpt = (key: string, legacy: string, def: string) => 
			rtOptions?.[key] || rtConfig?.[key] || opts[legacy] || (this as any).config[legacy] || def;

		const getFormatted = (val: number, u: any) => {
			const su = singular(u);
			if (isFunction(rtf)) return rtf(val, su);
			if (rtf instanceof Intl.RelativeTimeFormat) return rtf.format(val, su);
			
			const style = getOpt('style', 'rtfStyle', 'narrow');
			const numeric = getOpt('numeric', 'rtfNumeric', 'always');
			
			return getRelativeTime(val, su as Intl.RelativeTimeFormatUnit, locale, style, numeric);
		}

		switch (res.unit) {
			case 'years': return getFormatted(date[0], res.unit);
			case 'months': return getFormatted(date[1], res.unit);
			case 'weeks': return getFormatted(res.weeks, res.unit);
			case 'days': return getFormatted(date[2], res.unit);
			case 'hours': return getFormatted(time[0], res.unit);
			case 'minutes': return getFormatted(time[1], res.unit);
			case 'seconds': return getFormatted(time[2], res.unit);
			case 'milliseconds':
			case 'microseconds':
			case 'nanoseconds':
				return `${fraction}`;
			default:
				return dur.toString();
		}
	}

	return dur.total({ relativeTo: selfZdt, unit });
}

/** 
 * Bi-directional conversion utility for ISO Durations.
 * string -> EDO
 * DurationLikeObject -> EDO (with iso string)
 */
(duration as any).toDuration = (input: string | Temporal.DurationLikeObject, ctx?: any) => {
	const dur = Temporal.Duration.from(input);
	return toDuration(dur, ctx);
}

/**
 * Functional Module to attach duration methods to Tempo.
 */
export const DurationModule: TempoModule = defineInterpreterModule('DurationModule', duration, {
	duration(this: typeof Tempo, input: any) {
		const ctx = {
			locale: this.config?.locale,
			numberFormat: this.config?.intl?.numberFormat,
			durationFormat: this.config?.intl?.durationFormat,
		};
		return interpret(this, 'DurationModule', 'toDuration', false, input, ctx);
	}
});
