import { isTempo, Match } from '#tempo/support';
import { isNumeric, isInstant, isZonedDateTime, isPlainDate, isPlainDateTime } from '#library/assertion.library.js';
import type { TemporalObject, TypeValue } from '#library/type.library.js';
import type { Tempo } from '#tempo/tempo.class.js';
import * as t from '../tempo.type.js';

/**
 * Logic to compose various input types into a Temporal.ZonedDateTime.  
 * Extracted from Tempo.#parse to reduce core class complexity.
 */
export function compose(
	{ type, value }: TypeValue<any>,
	today: Temporal.ZonedDateTime,
	tz: Temporal.TimeZoneLike,
	targetTz: string,
	targetCal: string,
	onResult?: (match: any) => void,
	unit: t.Internal.TimeStamp = 'ms'
): { dateTime: Temporal.ZonedDateTime, timeZone?: string | undefined } {
	let temporal: TemporalObject | Tempo = today;
	let timeZone: string | undefined;
	let dateTime: Temporal.ZonedDateTime;

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
				const zdt = Temporal.ZonedDateTime.from(`${str}[${tz}]`);
				timeZone = zdt.timeZoneId;
				temporal = zdt;
				onResult?.({ type, value: str, match: 'iso8601' });
			} catch (err) {
				if (Match.date.test(value)) {
					try {
						temporal = Temporal.PlainDate.from(value);
						break;
					} catch { /* ignore and fallback */ }
				}

				try {
					temporal = Temporal.PlainDateTime.from(value);
				} catch (err2) {
					// security check: do not let native Date take a guess on garbage strings
					throw new Error(`Cannot parse Date: "${value}"`);
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
			{
				if (Number.isNaN(value) || !Number.isFinite(value))
					throw new RangeError(`Invalid Tempo number: ${value}`);

				// If it's an integer and we're in 'ms' mode, treat as milliseconds
				if (unit === 'ms' && Number.isInteger(value)) {
					onResult?.({ type, value, match: 'Milliseconds' });
					temporal = Temporal.Instant.fromEpochMilliseconds(value);
					break;
				}

				// If it's an integer and we're in 'ss' mode, treat as seconds
				if (unit === 'ss' && Number.isInteger(value)) {
					onResult?.({ type, value, match: 'Seconds' });
					temporal = Temporal.Instant.fromEpochMilliseconds(value * 1_000);
					break;
				}

				// If it's an integer and we're in 'us' mode, treat as microseconds
				if (unit === 'us' && Number.isInteger(value)) {
					onResult?.({ type, value, match: 'Microseconds' });
					temporal = Temporal.Instant.fromEpochNanoseconds(BigInt(value) * 1_000n);
					break;
				}

				// If it's an integer and we're in 'ns' mode, treat as nanoseconds
				if (unit === 'ns' && Number.isInteger(value)) {
					onResult?.({ type, value, match: 'Nanoseconds' });
					temporal = Temporal.Instant.fromEpochNanoseconds(BigInt(value));
					break;
				}

				// Otherwise treat as Seconds (with optional decimal nanoseconds)
				const negative = value < 0;
				const [seconds = BigInt(0), suffix = BigInt(0)] = value.toString().split('.').map(v => isNumeric(v) ? BigInt(v) : BigInt(0));
				let nano = BigInt(suffix.toString().substring(0, 9).padEnd(9, '0'));
				if (negative && nano > 0n) nano = -nano;

				onResult?.({ type, value, match: 'Seconds' });
				temporal = Temporal.Instant.fromEpochNanoseconds(seconds * BigInt(1_000_000_000) + nano);
				break;
			}

		case 'BigInt':
			onResult?.({ type, value, match: 'Nanoseconds' });
			temporal = Temporal.Instant.fromEpochNanoseconds(value);
			break;

		default:
			break;
	}

	// now analyze what kind of Temporal Object we have and convert to ZonedDateTime
	switch (true) {
		case isZonedDateTime(temporal):
			dateTime = temporal.withCalendar(targetCal);
			break;

		case isInstant(temporal):
			dateTime = temporal.toZonedDateTimeISO(targetTz).withCalendar(targetCal);
			break;

		case isPlainDate(temporal) || isPlainDateTime(temporal):
			dateTime = temporal.toZonedDateTime(targetTz).withCalendar(targetCal);
			break;

		case isTempo(temporal):
			dateTime = temporal.toDateTime().withCalendar(targetCal);
			break;

		default:
			throw new Error(`Cannot convert ${type} (value: ${String(temporal)}) to ZonedDateTime`);
	}

	return { dateTime, timeZone };
}
