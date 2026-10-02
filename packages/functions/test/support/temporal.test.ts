import {
	unwrapTemporal,
	getTemporal,
	extractDateParts,
	coerceZonedDateTime,
	extractEpochMs,
	toEpochMs,
} from '../../src/support/index.js';
import { Tempo } from '@magmacomputing/tempo';

describe('unwrapTemporal', () => {
	it('should unwrap Tempo instance to its underlying Temporal.ZonedDateTime', () => {
		const t = new Tempo('2026-07-01T12:00:00Z');
		const unwrapped = unwrapTemporal(t);
		expect(unwrapped).toBe(t.zdt);
		expect(unwrapped.day).toBe(1);
		expect(unwrapped.month).toBe(7);
		expect(unwrapped.year).toBe(2026);
	});

	it('should pass through native Temporal objects without modification', () => {
		const TemporalAPI = getTemporal();
		const pd = TemporalAPI.PlainDate.from('2026-08-15');
		expect(unwrapTemporal(pd)).toBe(pd);

		const zdt = TemporalAPI.ZonedDateTime.from('2026-08-15T10:00:00+00:00[UTC]');
		expect(unwrapTemporal(zdt)).toBe(zdt);
	});

	it('should pass through duck-typed objects without a zdt property', () => {
		const duck = { day: 5, month: 10 };
		expect(unwrapTemporal(duck)).toBe(duck);
	});

	it('should unwrap custom objects with a zdt property', () => {
		const inner = { day: 25, year: 2026 };
		const wrapper = { zdt: inner };
		expect(unwrapTemporal(wrapper)).toBe(inner);
	});

	it('should return nullish or non-object primitives as-is', () => {
		expect(unwrapTemporal(null as any)).toBe(null);
		expect(unwrapTemporal(undefined as any)).toBe(undefined);
		expect(unwrapTemporal('2026-01-01' as any)).toBe('2026-01-01');
		expect(unwrapTemporal(123 as any)).toBe(123);
	});
});

describe('extractDateParts', () => {
	it('should extract parts and detect Tempo source type', () => {
		const t = new Tempo('2024-02-15');
		const parts = extractDateParts(t);
		expect(parts.type).toBe('Tempo');
		expect(parts.year).toBe(2024);
		expect(parts.month).toBe(2);
		expect(parts.day).toBe(15);
		expect(parts.daysInMonth).toBe(29);
		expect(parts.dayOfWeek).toBe(4); // Thursday
		expect(parts.target).toBe(t.zdt);
	});

	it('should extract parts and detect native Temporal source type', () => {
		const TemporalAPI = getTemporal();
		const pd = TemporalAPI.PlainDate.from('2026-10-03');
		const parts = extractDateParts(pd);
		expect(parts.type).toBe('Temporal');
		expect(parts.year).toBe(2026);
		expect(parts.month).toBe(10);
		expect(parts.day).toBe(3);
		expect(parts.dayOfWeek).toBe(6); // Saturday
		expect(parts.target).toBe(pd);
	});

	it('should extract parts and detect Date source type', () => {
		const d = new Date(2026, 6, 1); // July 1, 2026
		const parts = extractDateParts(d);
		expect(parts.type).toBe('Date');
		expect(parts.year).toBe(2026);
		expect(parts.month).toBe(7);
		expect(parts.day).toBe(1);
		expect(parts.dayOfWeek).toBe(3); // Wednesday
		expect(parts.target).toBe(d);
	});

	it('should extract parts and detect string source type for ISO dates', () => {
		const parts = extractDateParts('2024-02-29');
		expect(parts.type).toBe('string');
		expect(parts.year).toBe(2024);
		expect(parts.month).toBe(2);
		expect(parts.day).toBe(29);
		expect(parts.dayOfWeek).toBe(4); // Thursday
	});

	it('should extract year-only ISO strings', () => {
		const parts = extractDateParts('2025');
		expect(parts.type).toBe('string');
		expect(parts.year).toBe(2025);
		expect(parts.month).toBeUndefined();
		expect(parts.day).toBeUndefined();
	});

	it('should extract parts and detect number source type for calendar years', () => {
		const parts = extractDateParts(2024);
		expect(parts.type).toBe('number');
		expect(parts.year).toBe(2024);
		expect(parts.month).toBeUndefined();
	});

	it('should extract parts and detect number source type for epoch timestamps', () => {
		const ts = new Date(2026, 9, 5).getTime(); // Oct 5, 2026 (Monday in local time)
		const parts = extractDateParts(ts);
		expect(parts.type).toBe('number');
		expect(parts.year).toBe(2026);
		expect(parts.month).toBe(10);
		expect(parts.day).toBe(5);
		expect(parts.dayOfWeek).toBe(1);
	});

	it('should extract parts and detect duck-typed object source type', () => {
		const duck = { year: 2026, month: 4, day: 15, dayOfWeek: 3 };
		const parts = extractDateParts(duck);
		expect(parts.type).toBe('object');
		expect(parts.year).toBe(2026);
		expect(parts.month).toBe(4);
		expect(parts.day).toBe(15);
		expect(parts.dayOfWeek).toBe(3);
	});

	it('should classify non-date inputs as unknown', () => {
		expect(extractDateParts(null).type).toBe('unknown');
		expect(extractDateParts(undefined).type).toBe('unknown');
		expect(extractDateParts(true).type).toBe('unknown');
	});

	it('should reject out-of-bounds ISO date strings without normalizing dayOfWeek', () => {
		const invalidMonth = extractDateParts('2024-99-01');
		expect(invalidMonth.dayOfWeek).toBeUndefined();

		const invalidDay = extractDateParts('2024-02-30');
		expect(invalidDay.dayOfWeek).toBeUndefined();
	});

	it('should correctly calculate dayOfWeek for years 0000-0099 without 1900 century offset', () => {
		const y0001 = extractDateParts('0001-01-01');
		expect(y0001.year).toBe(1);
		expect(y0001.dayOfWeek).toBe(1); // Monday

		const y0000 = extractDateParts('0000-01-01');
		expect(y0000.year).toBe(0);
		expect(y0000.dayOfWeek).toBe(6); // Saturday

		const y0099 = extractDateParts('0099-01-01');
		expect(y0099.year).toBe(99);
		expect(y0099.dayOfWeek).toBe(4); // Thursday
	});

	it('should reject malformed trailing date components such as 2024-02-300 without partial match', () => {
		const res = extractDateParts('2024-02-300');
		expect(res.year).toBeUndefined();
		expect(res.month).toBeUndefined();
		expect(res.day).toBeUndefined();
		expect(res.dayOfWeek).toBeUndefined();
	});
});

describe('coerceZonedDateTime', () => {
	it('should coerce Tempo instances preserving timezone', () => {
		const t = new Tempo('2026-10-02T15:30:00+09:00[Asia/Tokyo]');
		const zdt = coerceZonedDateTime(t);
		expect(zdt.year).toBe(2026);
		expect(zdt.month).toBe(10);
		expect(zdt.day).toBe(2);
		expect(zdt.timeZoneId).toBe('Asia/Tokyo');
	});

	it('should coerce native Temporal.PlainDate using fallback timezone', () => {
		const TemporalAPI = getTemporal();
		const pd = TemporalAPI.PlainDate.from('2026-10-02');
		const zdt = coerceZonedDateTime(pd, 'Australia/Sydney');
		expect(zdt.year).toBe(2026);
		expect(zdt.month).toBe(10);
		expect(zdt.day).toBe(2);
		expect(zdt.timeZoneId).toBe('Australia/Sydney');
	});

	it('should coerce JS Date objects', () => {
		const date = new Date(Date.UTC(2026, 9, 2, 12, 0, 0));
		const zdt = coerceZonedDateTime(date, 'UTC');
		expect(zdt.year).toBe(2026);
		expect(zdt.month).toBe(10);
		expect(zdt.day).toBe(2);
	});

	it('should coerce epoch timestamps (number)', () => {
		const ms = Date.UTC(2026, 9, 2, 0, 0, 0);
		const zdt = coerceZonedDateTime(ms, 'UTC');
		expect(zdt.year).toBe(2026);
		expect(zdt.month).toBe(10);
		expect(zdt.day).toBe(2);
	});

	it('should coerce ISO date strings and full ISO timestamps', () => {
		const zdtFromDate = coerceZonedDateTime('2026-10-02', 'America/New_York');
		expect(zdtFromDate.year).toBe(2026);
		expect(zdtFromDate.month).toBe(10);
		expect(zdtFromDate.day).toBe(2);
		expect(zdtFromDate.timeZoneId).toBe('America/New_York');

		const zdtFromZdt = coerceZonedDateTime('2026-10-02T10:00:00+02:00[Europe/Paris]');
		expect(zdtFromZdt.timeZoneId).toBe('Europe/Paris');
	});

	it('should coerce duck-typed { year, month, day } objects', () => {
		const duck = { year: 2026, month: 10, day: 2 };
		const zdt = coerceZonedDateTime(duck, 'UTC');
		expect(zdt.year).toBe(2026);
		expect(zdt.month).toBe(10);
		expect(zdt.day).toBe(2);
	});

	it('should throw TypeError for invalid or unrecognizable inputs', () => {
		expect(() => coerceZonedDateTime(null as any)).toThrow(TypeError);
		expect(() => coerceZonedDateTime(undefined as any)).toThrow(TypeError);
	});
});

describe('extractEpochMs & toEpochMs', () => {
	it('extracts epoch milliseconds from Tempo instances', () => {
		const t = new Tempo('2026-10-02T00:00:00Z');
		expect(extractEpochMs(t)).toBe(Date.UTC(2026, 9, 2));
		expect(toEpochMs(t)).toBe(Date.UTC(2026, 9, 2));
	});

	it('extracts epoch milliseconds from JS Dates and numeric timestamps', () => {
		const dt = new Date('2026-05-15T12:00:00Z');
		expect(extractEpochMs(dt)).toBe(dt.getTime());
		expect(extractEpochMs(1234567890)).toBe(1234567890);
	});

	it('extracts epoch milliseconds from ISO strings', () => {
		const ms = extractEpochMs('2026-01-01T00:00:00.000Z');
		expect(ms).toBe(Date.UTC(2026, 0, 1));
	});

	it('returns undefined / fallback for invalid or nullish inputs', () => {
		expect(extractEpochMs(null)).toBeUndefined();
		expect(extractEpochMs(undefined)).toBeUndefined();
		expect(extractEpochMs('not-a-date')).toBeUndefined();
		expect(toEpochMs('not-a-date', 999)).toBe(999);
	});
});
