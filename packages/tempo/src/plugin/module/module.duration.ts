import { isString, isObject, isDefined, isUndefined } from '#library/type.library.js';
import { singular } from '#library/string.library.js';
import { getAccessors } from '#library/reflection.library.js';
import { ifDefined } from '#library/object.library.js';
import { getRelativeTime } from '#library/international.library.js';

import { defineInterpreterModule, interpret } from '../plugin.util.js';
import enums from '../../tempo.enum.js';
import type { Tempo } from '../../tempo.class.js';

declare module '../../tempo.class.js' {
	namespace Tempo {
		/** returns a full Tempo Duration object (EDO) for the given input */
		function duration(input: any): Tempo.Duration;
	}

	interface Tempo {
		/** time duration until (returns Duration) */						until(dateTimeOrOpts?: Tempo.DateTime | Tempo.Options, opts?: Tempo.Options): Tempo.Duration;
		/** time duration until (with unit, returns number) */	until(unit: Tempo.Unit, opts?: Tempo.Options): number;
		/** time duration until another date-time (with unit ) */until(dateTimeOrOpts: Tempo.DateTime | Tempo.Options, unit: Tempo.Unit): number;
		/** fallback: union of possible returns */							until(optsOrDate?: Tempo.DateTime | Tempo.Until | Tempo.Options, optsOrUntil?: Tempo.Options | Tempo.Until): number | Tempo.Duration;

		/** time elapsed since (with unit) */										since(until: Tempo.Until, opts?: Tempo.Options): string;
		/** time elapsed since another date-time (with unit) */	since(dateTimeOrOpts: Tempo.DateTime | Tempo.Options, until: Tempo.Until): string;
		/** time elapsed since another date-time (w'out unit) */since(dateTimeOrOpts?: Tempo.DateTime | Tempo.Options, opts?: Tempo.Options): string;
		/** time elapsed since another date-time */							since(optsOrDate?: any, optsOrUntil?: any): string;
	}
}

/**
 * Convert a Temporal.Duration to a full Tempo.Duration object (EDO).
 */
function toDuration(dur: Temporal.Duration): Tempo.Duration {
	return getAccessors(dur)
		.reduce((acc, d) => Object.assign(acc, ifDefined({ [d]: (dur as any)[d] })),
			{
				iso: dur.toString(),
				sign: dur.sign,
				blank: dur.blank,
				unit: undefined
			} as Tempo.Duration);
}

/**
 * Internal implementation of Tempo.until and Tempo.since  
 * (moved out of tempo.class.ts to reduce core bundle size)
 */
function duration(this: Tempo, type: 'until' | 'since', arg?: any, until?: any) {
	const since = type === 'since';
	let value, opts: any = {}, unit: any;

	switch (true) {
		case isString(arg) && enums.ELEMENT.values().includes(singular(arg)):
			unit = arg;
			({ value, ...opts } = until || {});
			break;
		case isString(arg):
			value = arg;
			if (isObject(until))
				({ unit, ...opts } = until as any)
			else unit = until;
			break;
		case isObject(arg) && isString(until):
			unit = until;
			({ value, ...opts } = arg as any);
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

	const diffZone = selfZdt.timeZoneId !== offsetZdt.timeZoneId;
	const dur = selfZdt.until(offsetZdt.withCalendar(selfZdt.calendarId), { largestUnit: diffZone ? 'hours' : (unit ?? 'years') });

	if (isDefined(unit))
		unit = `${singular(unit)}s`;

	if (isUndefined(unit) || since) {
		const res = toDuration(dur);
		if (unit) res.unit = unit;

		if (!since) return res;

		// --- since logic ---
		const date = [dur.years, dur.months, dur.days] as const;
		const time = [dur.hours, dur.minutes, dur.seconds] as const;
		const fraction = [dur.milliseconds, dur.microseconds, dur.nanoseconds]
			.map(Math.abs)
			.map(nbr => nbr.toString().padStart(3, '0'))
			.join('')

		const locale = (this as any).config['locale'];
		const rtf = opts['rtfFormat'] || (this as any).config['rtfFormat'];

		const getFormatted = (val: number, u: any) => {
			if (rtf instanceof Intl.RelativeTimeFormat) return rtf.format(val, u);
			const style = opts['rtfStyle'] || (this as any).config['rtfStyle'] || 'narrow';
			return getRelativeTime(val, u, locale, style);
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
duration.toDuration = (input: string | Temporal.DurationLikeObject) => {
	const dur = Temporal.Duration.from(input);
	return toDuration(dur);
}

/**
 * Functional Module to attach duration methods to Tempo.
 */
export const DurationModule: Tempo.Module = defineInterpreterModule('DurationModule', duration, {
	duration(this: typeof Tempo, input: any) {
		return interpret(this, 'DurationModule', 'toDuration', false, input);
	}
});
