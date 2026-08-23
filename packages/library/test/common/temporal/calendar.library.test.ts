import {
	DAYS_IN_WEEK,
	DAY_MAP,
	MONTH_MAP,
	ISO_WEEKDAY_NAMES,
	getUtcParts,
	getDaysInMonth,
	isLeapYear,
	fromUtcParts,
	isValidDate,
	addUtcDays,
	withUtcParts,
} from '#library/calendar.library.js';
import type {
	UtcPartsOptions,
	DayKey,
	DayValue,
	MonthKey,
	MonthValue,
	IsoWeekdayNumber,
	IsoWeekdayName
} from '#library/calendar.library.js';

describe('calendar.library', () => {
	test('DAYS_IN_WEEK constant is 7', () => {
		expect(DAYS_IN_WEEK).toBe(7);
	});

	test('DAY_MAP maps 2-letter and 3-letter weekday abbreviations to ISO 1..7 indices', () => {
		expect(DAY_MAP.MO).toBe(1);
		expect(DAY_MAP.TU).toBe(2);
		expect(DAY_MAP.WE).toBe(3);
		expect(DAY_MAP.TH).toBe(4);
		expect(DAY_MAP.FR).toBe(5);
		expect(DAY_MAP.SA).toBe(6);
		expect(DAY_MAP.SU).toBe(7);

		expect(DAY_MAP.MON).toBe(1);
		expect(DAY_MAP.TUE).toBe(2);
		expect(DAY_MAP.WED).toBe(3);
		expect(DAY_MAP.THU).toBe(4);
		expect(DAY_MAP.FRI).toBe(5);
		expect(DAY_MAP.SAT).toBe(6);
		expect(DAY_MAP.SUN).toBe(7);

		// Type assertions
		const sampleDayKey: DayKey = 'MON';
		const sampleDayVal: DayValue = DAY_MAP[sampleDayKey];
		expect(sampleDayVal).toBe(1);
	});

	test('MONTH_MAP maps 3-letter month abbreviations to 1..12 indices', () => {
		expect(MONTH_MAP.JAN).toBe(1);
		expect(MONTH_MAP.FEB).toBe(2);
		expect(MONTH_MAP.MAR).toBe(3);
		expect(MONTH_MAP.APR).toBe(4);
		expect(MONTH_MAP.MAY).toBe(5);
		expect(MONTH_MAP.JUN).toBe(6);
		expect(MONTH_MAP.JUL).toBe(7);
		expect(MONTH_MAP.AUG).toBe(8);
		expect(MONTH_MAP.SEP).toBe(9);
		expect(MONTH_MAP.OCT).toBe(10);
		expect(MONTH_MAP.NOV).toBe(11);
		expect(MONTH_MAP.DEC).toBe(12);

		// Type assertions
		const sampleMonthKey: MonthKey = 'AUG';
		const sampleMonthVal: MonthValue = MONTH_MAP[sampleMonthKey];
		expect(sampleMonthVal).toBe(8);
	});

	test('ISO_WEEKDAY_NAMES maps ISO indices 1..7 to full English weekday names', () => {
		expect(ISO_WEEKDAY_NAMES[1]).toBe('Monday');
		expect(ISO_WEEKDAY_NAMES[2]).toBe('Tuesday');
		expect(ISO_WEEKDAY_NAMES[3]).toBe('Wednesday');
		expect(ISO_WEEKDAY_NAMES[4]).toBe('Thursday');
		expect(ISO_WEEKDAY_NAMES[5]).toBe('Friday');
		expect(ISO_WEEKDAY_NAMES[6]).toBe('Saturday');
		expect(ISO_WEEKDAY_NAMES[7]).toBe('Sunday');

		// Type assertions
		const sampleNum: IsoWeekdayNumber = 7;
		const sampleName: IsoWeekdayName = ISO_WEEKDAY_NAMES[sampleNum];
		expect(sampleName).toBe('Sunday');
	});

	test('getUtcParts extracts all components with 1-indexed month and weekday', () => {
		// Sunday 2026-08-09T14:35:45.123Z
		const date = new Date(Date.UTC(2026, 7, 9, 14, 35, 45, 123));
		const parts = getUtcParts(date);

		expect(parts.year).toBe(2026);
		expect(parts.month).toBe(8);
		expect(parts.day).toBe(9);
		expect(parts.weekday).toBe(7);
		expect(parts.hours).toBe(14);
		expect(parts.minutes).toBe(35);
		expect(parts.seconds).toBe(45);
		expect(parts.milliseconds).toBe(123);
	});

	test('getUtcParts defaults to current date when no argument is provided', () => {
		const now = new Date();
		const parts = getUtcParts();

		expect(parts.year).toBe(now.getUTCFullYear());
		expect(parts.month).toBe(now.getUTCMonth() + 1);
		expect(parts.day).toBe(now.getUTCDate());
		expect(parts.weekday).toBeGreaterThanOrEqual(1);
		expect(parts.weekday).toBeLessThanOrEqual(7);
		expect(typeof parts.hours).toBe('number');
		expect(typeof parts.minutes).toBe('number');
		expect(typeof parts.seconds).toBe('number');
		expect(typeof parts.milliseconds).toBe('number');
	});

	test('getUtcParts.weekday converts JS Date Sunday (0) to ISO Sunday (7)', () => {
		// Sunday Aug 9, 2026
		const sunday = new Date(Date.UTC(2026, 7, 9));
		expect(sunday.getUTCDay()).toBe(0);
		expect(getUtcParts(sunday).weekday).toBe(7);

		// Monday Aug 10, 2026
		const monday = new Date(Date.UTC(2026, 7, 10));
		expect(monday.getUTCDay()).toBe(1);
		expect(getUtcParts(monday).weekday).toBe(1);

		// Friday Aug 7, 2026
		const friday = new Date(Date.UTC(2026, 7, 7));
		expect(friday.getUTCDay()).toBe(5);
		expect(getUtcParts(friday).weekday).toBe(5);

		// Saturday Aug 8, 2026
		const saturday = new Date(Date.UTC(2026, 7, 8));
		expect(saturday.getUTCDay()).toBe(6);
		expect(getUtcParts(saturday).weekday).toBe(6);
	});

	test('getDaysInMonth returns correct days for each month including leap year February', () => {
		// Non-leap year 2026
		expect(getDaysInMonth(2026, 1)).toBe(31);  // Jan
		expect(getDaysInMonth(2026, 2)).toBe(28);  // Feb
		expect(getDaysInMonth(2026, 3)).toBe(31);  // Mar
		expect(getDaysInMonth(2026, 4)).toBe(30);  // Apr
		expect(getDaysInMonth(2026, 5)).toBe(31);  // May
		expect(getDaysInMonth(2026, 6)).toBe(30);  // Jun
		expect(getDaysInMonth(2026, 7)).toBe(31);  // Jul
		expect(getDaysInMonth(2026, 8)).toBe(31);  // Aug
		expect(getDaysInMonth(2026, 9)).toBe(30);  // Sep
		expect(getDaysInMonth(2026, 10)).toBe(31); // Oct
		expect(getDaysInMonth(2026, 11)).toBe(30); // Nov
		expect(getDaysInMonth(2026, 12)).toBe(31); // Dec

		// Leap year 2024
		expect(getDaysInMonth(2024, 2)).toBe(29);  // Feb leap
	});

	test('isLeapYear correctly determines leap years', () => {
		expect(isLeapYear(2024)).toBe(true);
		expect(isLeapYear(2000)).toBe(true);
		expect(isLeapYear(2026)).toBe(false);
		expect(isLeapYear(1900)).toBe(false);
		expect(isLeapYear(2100)).toBe(false);
	});

	test('fromUtcParts creates Date instances with 1-indexed month and clock values', () => {
		const options: UtcPartsOptions = {
			year: 2026,
			month: 8,
			day: 9,
			hours: 10,
			minutes: 30,
			seconds: 45,
			milliseconds: 500,
		}
		const date1 = fromUtcParts(options);
		expect(date1.toISOString()).toBe('2026-08-09T10:30:45.500Z');

		// Default clock values are 0
		const date2 = fromUtcParts({ year: 2026, month: 1, day: 15 });
		expect(date2.toISOString()).toBe('2026-01-15T00:00:00.000Z');

		// Round-trip symmetry with getUtcParts
		const original = new Date('2026-11-25T17:45:30.250Z');
		const parts = getUtcParts(original);
		const roundtrip = fromUtcParts(parts);
		expect(roundtrip.getTime()).toBe(original.getTime());
	});

	test('isValidDate checks calendar validity without date allocation or overflow', () => {
		expect(isValidDate(2026, 1, 31)).toBe(true);
		expect(isValidDate(2026, 2, 28)).toBe(true);
		expect(isValidDate(2026, 2, 29)).toBe(false); // Non-leap year
		expect(isValidDate(2024, 2, 29)).toBe(true);  // Leap year
		expect(isValidDate(2026, 4, 30)).toBe(true);
		expect(isValidDate(2026, 4, 31)).toBe(false); // April only has 30 days
		expect(isValidDate(2026, 0, 15)).toBe(false); // Month < 1
		expect(isValidDate(2026, 13, 15)).toBe(false); // Month > 12
		expect(isValidDate(2026, 5, 0)).toBe(false);  // Day < 1
	});

	test('addUtcDays adds or subtracts days without mutating original date', () => {
		const base = new Date('2026-02-28T12:00:00.000Z');
		const next = addUtcDays(base, 1);
		expect(next.toISOString()).toBe('2026-03-01T12:00:00.000Z');
		expect(base.toISOString()).toBe('2026-02-28T12:00:00.000Z'); // Unmutated

		const prev = addUtcDays(base, -7);
		expect(prev.toISOString()).toBe('2026-02-21T12:00:00.000Z');
	});

	test('withUtcParts updates specific calendar or clock parts while preserving others', () => {
		const base = new Date('2026-05-15T14:30:45.123Z');

		// Date update
		const updatedDate = withUtcParts(base, { month: 10, day: 31 });
		expect(updatedDate.toISOString()).toBe('2026-10-31T14:30:45.123Z');
		expect(base.toISOString()).toBe('2026-05-15T14:30:45.123Z'); // Unmutated

		// Clock update
		const updatedTime = withUtcParts(base, { hours: 9, minutes: 0 });
		expect(updatedTime.toISOString()).toBe('2026-05-15T09:00:45.123Z');

		// Combined update
		const fullUpdate = withUtcParts(base, { year: 2028, hours: 23, minutes: 59, seconds: 59, milliseconds: 999 });
		expect(fullUpdate.toISOString()).toBe('2028-05-15T23:59:59.999Z');
	});
});
