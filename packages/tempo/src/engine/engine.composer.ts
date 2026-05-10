import { getTemporalIds } from '#library/temporal.library.js';
import { isInstant, isZonedDateTime, isPlainDate, isPlainDateTime } from '#library/assertion.library.js';
import type { TemporalObject, TypeValue } from '#library/type.library.js';

import { isTempo, logError } from '#tempo/support';
import { hasOwn } from '#tempo/support/support.util.js';
import type { Tempo } from '#tempo/tempo.class.js';
import * as t from '../tempo.type.js';

/**
 * Logic to compose various input types into a Temporal.ZonedDateTime.  
 * Extracted from Tempo.#parse to reduce core class complexity.
 */
export function compose(
	arg: TypeValue<any>,
	today: Temporal.ZonedDateTime,
	tz: Temporal.TimeZoneLike,
	targetTz: string,
	targetCal: string,
	onResult?: (match: any) => void,
	unit: t.Internal.TimeStamp = 'ms',
	config?: any
): { dateTime: Temporal.ZonedDateTime, timeZone?: string | undefined } {
	const { type, value, zone: derivedTz, calendar: derivedCal } = arg as any;
	const finalTz = hasOwn(config, 'timeZone') ? targetTz : (derivedTz ?? targetTz);
	const finalCal = hasOwn(config, 'calendar') ? targetCal : (derivedCal ?? targetCal);

	let temporal: TemporalObject | Tempo = today;
	let timeZone: string | undefined;
	let dateTime: Temporal.ZonedDateTime | undefined;

	switch (type) {
		case 'Void':
		case 'Empty':
		case 'Undefined':
			onResult?.({ type, value });
			temporal = today;
			break;

		case 'String':
			try {
				const str = value.replace(/Z$/, '');
				const zdt = Temporal.ZonedDateTime.from(str.includes('[') ? str : `${str}[${tz}]`);
				timeZone = getTemporalIds(zdt)[0];
				temporal = zdt;
				onResult?.({ type, value: str, match: 'iso8601' });
			} catch (err) {
				try {
					temporal = Temporal.PlainDateTime.from(value, { overflow: 'constrain' });
				} catch (err2) {
					logError(config, `[Tempo#composer] Unrecognized or invalid ISO 8601 string: "${value}"`);
					return { dateTime: today };
				}
			}
			break;

		case 'Temporal.ZonedDateTime':
		case 'Temporal.PlainDate':
		case 'Temporal.PlainDateTime':
		case 'Temporal.Instant':
		case 'Tempo':
			temporal = value;
			break;

		case 'Temporal.PlainTime':
			temporal = today.withPlainTime(value);
			break;

		case 'Temporal.PlainYearMonth':
			temporal = value.toPlainDate({ day: Math.min(today.day, value.daysInMonth) });
			break;

		case 'Temporal.PlainMonthDay':
			temporal = value.toPlainDate({ year: today.year });
			break;

		case 'Date':
			onResult?.({ type, value });
			temporal = Temporal.Instant.fromEpochMilliseconds(value.getTime());
			break;

		case 'Number':
		case 'BigInt':
			{
				if (type === 'Number' && (Number.isNaN(value) || !Number.isFinite(value))) {
					logError(config, `Invalid Tempo number: ${value}`);
					temporal = today;
					break;
				}

				// 📏 Resolve multipliers for nanosecond conversion
				const scale = unit === 'ss' ? 1_000_000_000n : (unit === 'ms' ? 1_000_000n : (unit === 'us' ? 1_000n : 1n));
				let nano: bigint;

				if (type === 'Number' && !Number.isInteger(value)) {
					// Handle fractional numeric inputs (extract whole and fractional parts safely)
					const absVal = Math.abs(value);
					let wholeNumber = BigInt(Math.trunc(absVal));
					let fractionDigits = BigInt(Math.round((absVal - Math.trunc(absVal)) * 1_000_000_000));

					if (fractionDigits === 1_000_000_000n) {
						wholeNumber += 1n;
						fractionDigits = 0n;
					}

					nano = (wholeNumber * 1_000_000_000n + fractionDigits) * scale / 1_000_000_000n;
					if (value < 0) nano = -nano;
				} else {
					// 🔢 Handle Integers
					nano = BigInt(value) * scale;
				}

				// 🏷️ Log Result Metadata
				const matchName = unit === 'ss' ? 'Seconds' : (unit === 'ms' ? 'Milliseconds' : (unit === 'us' ? 'Microseconds' : 'Nanoseconds'));
				onResult?.({ type, value, match: matchName });

				temporal = Temporal.Instant.fromEpochNanoseconds(nano);
				break;
			}



		default:
			break;
	}

	// now analyze what kind of Temporal Object we have and convert to ZonedDateTime
	switch (true) {
		case isZonedDateTime(temporal):
			dateTime = temporal.withTimeZone(finalTz).withCalendar(finalCal);
			break;

		case isInstant(temporal):
			dateTime = temporal.toZonedDateTimeISO(finalTz).withCalendar(finalCal);
			break;

		case isPlainDate(temporal) || isPlainDateTime(temporal):
			dateTime = temporal.toZonedDateTime(finalTz).withCalendar(finalCal);
			break;

		case isTempo(temporal):
			dateTime = temporal.toDateTime().withTimeZone(finalTz).withCalendar(finalCal);
			break;

		default: {
			logError(config, `Cannot convert ${type} (value: ${String(temporal)}) to ZonedDateTime`);
			return { dateTime: today };
		}
	}

	return { dateTime: dateTime ?? today, timeZone };
}
