import {
	DAYS_IN_WEEK,
	DAY_MAP,
	MONTH_MAP,
	ISO_WEEKDAY_NAMES,
	getDaysInMonth,
	isLeapYear,
	fromUtcParts,
	isValidDate,
	shiftDateByDays,
	withUtcParts,
	resolveDayOfYear,
	getIsoWeek,
	fromIsoWeek,
	resolveIsoCalendarYear,
	civilToDays,
	daysToCivil,
	isoWeekdayFromDays,
	epochMsFromParts,
	partsFromEpochMs,
	toJulianDay,
	EPOCH_JULIAN_DAY,
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

	test('partsFromEpochMs extracts all components with 1-indexed month and weekday', () => {
		// Sunday 2026-08-09T14:35:45.123Z
		const date = new Date(Date.UTC(2026, 7, 9, 14, 35, 45, 123));
		const parts = partsFromEpochMs(date.getTime());

		expect(parts.year).toBe(2026);
		expect(parts.month).toBe(8);
		expect(parts.day).toBe(9);
		expect(parts.weekday).toBe(7);
		expect(parts.hours).toBe(14);
		expect(parts.minutes).toBe(35);
		expect(parts.seconds).toBe(45);
		expect(parts.milliseconds).toBe(123);
	});

	test('partsFromEpochMs.weekday converts JS Date Sunday (0) to ISO Sunday (7)', () => {
		// Sunday Aug 9, 2026
		const sunday = new Date(Date.UTC(2026, 7, 9));
		expect(sunday.getUTCDay()).toBe(0);
		expect(partsFromEpochMs(sunday.getTime()).weekday).toBe(7);

		// Monday Aug 10, 2026
		const monday = new Date(Date.UTC(2026, 7, 10));
		expect(monday.getUTCDay()).toBe(1);
		expect(partsFromEpochMs(monday.getTime()).weekday).toBe(1);

		// Friday Aug 7, 2026
		const friday = new Date(Date.UTC(2026, 7, 7));
		expect(friday.getUTCDay()).toBe(5);
		expect(partsFromEpochMs(friday.getTime()).weekday).toBe(5);

		// Saturday Aug 8, 2026
		const saturday = new Date(Date.UTC(2026, 7, 8));
		expect(saturday.getUTCDay()).toBe(6);
		expect(partsFromEpochMs(saturday.getTime()).weekday).toBe(6);
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

		// Round-trip symmetry with partsFromEpochMs
		const original = new Date('2026-11-25T17:45:30.250Z');
		const parts = partsFromEpochMs(original.getTime());
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

	test('shiftDateByDays adds or subtracts days without mutating original date', () => {
		const base = new Date('2026-02-28T12:00:00.000Z');
		const next = shiftDateByDays(base, 1);
		expect(next.toISOString()).toBe('2026-03-01T12:00:00.000Z');
		expect(base.toISOString()).toBe('2026-02-28T12:00:00.000Z'); // Unmutated

		const prev = shiftDateByDays(base, -7);
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

	test('resolveDayOfYear resolves day of year to month and day', () => {
		expect(resolveDayOfYear(2026, 1)).toEqual({ month: 1, day: 1 });
		expect(resolveDayOfYear(2026, 32)).toEqual({ month: 2, day: 1 });
		expect(resolveDayOfYear(2026, 365)).toEqual({ month: 12, day: 31 });
		expect(resolveDayOfYear(2026, 366)).toBeUndefined(); // non-leap year

		// Leap year
		expect(resolveDayOfYear(2024, 60)).toEqual({ month: 2, day: 29 });
		expect(resolveDayOfYear(2024, 366)).toEqual({ month: 12, day: 31 });

		// Out of range
		expect(resolveDayOfYear(2026, 0)).toBeUndefined();
		expect(resolveDayOfYear(2026, 400)).toBeUndefined();
	});

	test('getIsoWeek computes ISO week and week-year', () => {
		// Both fields supplied
		expect(getIsoWeek({ year: 2026, month: 1, day: 1, weekOfYear: 1, yearOfWeek: 2026 })).toEqual({
			weekOfYear: 1,
			yearOfWeek: 2026,
		});

		// 2026-01-01 was Thursday -> week 1 of 2026
		expect(getIsoWeek({ year: 2026, month: 1, day: 1 })).toEqual({
			weekOfYear: 1,
			yearOfWeek: 2026,
		});

		// 2024-12-30 was Monday -> week 1 of 2025
		expect(getIsoWeek({ year: 2024, month: 12, day: 30 })).toEqual({
			weekOfYear: 1,
			yearOfWeek: 2025,
		});
	});

	test('fromIsoWeek resolves ISO week date to calendar year, month, and day', () => {
		// Week 1 of 2026, day 1 (Monday)
		expect(fromIsoWeek(2026, 1, 1)).toEqual({ year: 2025, month: 12, day: 29 });
		// Week 1 of 2026, day 4 (Thursday) -> 2026-01-01
		expect(fromIsoWeek(2026, 1, 4)).toEqual({ year: 2026, month: 1, day: 1 });
	});

	test('resolveIsoCalendarYear handles year boundaries and disambiguation', () => {
		// Dec 30 with targetIsoYear 2025 -> calendar year 2024
		expect(resolveIsoCalendarYear(2025, 12, 30)).toBe(2024);
		// Normal date inside the year
		expect(resolveIsoCalendarYear(2026, 6, 15)).toBe(2026);
		// Boundary date that uniquely belongs to targetIsoYear
		expect(resolveIsoCalendarYear(2025, 1, 1)).toBe(2025);
		expect(resolveIsoCalendarYear(2025, 12, 31)).toBe(2024);

		// Ambiguous date without expectedDayOfWeek returns undefined
		expect(resolveIsoCalendarYear(2026, 1, 1)).toBeUndefined();
		// Disambiguated by expectedDayOfWeek: 2026-01-01 is Thursday (4), 2027-01-01 is Friday (5)
		expect(resolveIsoCalendarYear(2026, 1, 1, 4)).toBe(2026);
		expect(resolveIsoCalendarYear(2026, 1, 1, 5)).toBe(2027);

		// Ambiguous Dec 29: in 2015, Dec 29 is Tuesday (2, week 53 of 2015); in 2014, Dec 29 is Monday (1, week 1 of 2015)
		expect(resolveIsoCalendarYear(2015, 12, 29)).toBeUndefined();
		expect(resolveIsoCalendarYear(2015, 12, 29, 1)).toBe(2014);
		expect(resolveIsoCalendarYear(2015, 12, 29, 2)).toBe(2015);

		// Year 0 leap day handling (0000-02-29 is Tuesday, ISO week 9 of year 0)
		expect(resolveIsoCalendarYear(0, 2, 29)).toBe(0);
	});

	describe('Pure Integer Euclidean Calendar Primitives', () => {
		test('civilToDays and daysToCivil round-trip identically across historical and future epochs', () => {
			// Unix Epoch anchor: 1970-01-01 -> Day 0
			expect(civilToDays(1970, 1, 1)).toBe(0);
			expect(daysToCivil(0)).toEqual({ year: 1970, month: 1, day: 1 });

			// Historical leap year: 2000-02-29
			const leap2000Days = civilToDays(2000, 2, 29);
			expect(daysToCivil(leap2000Days)).toEqual({ year: 2000, month: 2, day: 29 });

			// Century non-leap year: 1900-02-28
			const days1900 = civilToDays(1900, 2, 28);
			expect(daysToCivil(days1900)).toEqual({ year: 1900, month: 2, day: 28 });

			// Future leap year: 2024-02-29
			const leap2024Days = civilToDays(2024, 2, 29);
			expect(daysToCivil(leap2024Days)).toEqual({ year: 2024, month: 2, day: 29 });

			// Year 2026: 2026-10-23
			const days2026 = civilToDays(2026, 10, 23);
			expect(daysToCivil(days2026)).toEqual({ year: 2026, month: 10, day: 23 });

			// Matches Date.UTC epoch days count exactly
			const expectedDays2026 = Math.floor(Date.UTC(2026, 9, 23) / 86400000);
			expect(days2026).toBe(expectedDays2026);
		});

		test('isoWeekdayFromDays returns 1..7 (Monday..Sunday) matching Date.getUTCDay', () => {
			// 1970-01-01 was Thursday (4)
			expect(isoWeekdayFromDays(0)).toBe(4);
			// 1970-01-02 was Friday (5)
			expect(isoWeekdayFromDays(1)).toBe(5);
			// 1970-01-03 was Saturday (6)
			expect(isoWeekdayFromDays(2)).toBe(6);
			// 1970-01-04 was Sunday (7)
			expect(isoWeekdayFromDays(3)).toBe(7);
			// 1970-01-05 was Monday (1)
			expect(isoWeekdayFromDays(4)).toBe(1);

			// Test negative days (prior to 1970)
			// 1969-12-31 was Wednesday (3) -> Day -1
			expect(isoWeekdayFromDays(-1)).toBe(3);
			// 1969-12-30 was Tuesday (2) -> Day -2
			expect(isoWeekdayFromDays(-2)).toBe(2);
			// 1969-12-29 was Monday (1) -> Day -3
			expect(isoWeekdayFromDays(-3)).toBe(1);
			// 1969-12-28 was Sunday (7) -> Day -4
			expect(isoWeekdayFromDays(-4)).toBe(7);
		});

		test('epochMsFromParts and partsFromEpochMs provide exact bidirectional roundtrips', () => {
			const ms = epochMsFromParts(2026, 8, 9, 10, 30, 45, 500);
			expect(ms).toBe(Date.UTC(2026, 7, 9, 10, 30, 45, 500));

			const parts = partsFromEpochMs(ms);
			expect(parts).toEqual({
				year: 2026,
				month: 8,
				day: 9,
				weekday: 7, // Sunday
				hours: 10,
				minutes: 30,
				seconds: 45,
				milliseconds: 500,
			});

			// Negative timestamp roundtrip
			const msHistorical = epochMsFromParts(1969, 7, 20, 20, 17, 40, 0); // Apollo 11 moon landing
			expect(msHistorical).toBe(Date.UTC(1969, 6, 20, 20, 17, 40, 0));
			const partsHistorical = partsFromEpochMs(msHistorical);
			expect(partsHistorical.year).toBe(1969);
			expect(partsHistorical.month).toBe(7);
			expect(partsHistorical.day).toBe(20);
			expect(partsHistorical.hours).toBe(20);
			expect(partsHistorical.minutes).toBe(17);
			expect(partsHistorical.seconds).toBe(40);
		});

		test('civilToDays normalizes out-of-range months matching Date.UTC behavior', () => {
			// Month 13 of 2026 rolls over to Jan 2027
			expect(civilToDays(2026, 13, 1)).toBe(civilToDays(2027, 1, 1));
			// Month 0 of 2026 rolls back to Dec 2025
			expect(civilToDays(2026, 0, 1)).toBe(civilToDays(2025, 12, 1));
			// Month -1 of 2026 rolls back to Nov 2025
			expect(civilToDays(2026, -1, 1)).toBe(civilToDays(2025, 11, 1));
		});

		test('toJulianDay computes Julian Day Number across numbers, Date, and Temporal objects', () => {
			// Unix Epoch: 1970-01-01 -> 2440588
			expect(toJulianDay(1970, 1, 1)).toBe(EPOCH_JULIAN_DAY);
			expect(toJulianDay(new Date(Date.UTC(1970, 0, 1)))).toBe(2440588);
			expect(toJulianDay({ year: 1970, month: 1, day: 1 })).toBe(2440588);

			// J2000.0 epoch: 2000-01-01 -> 2451545
			expect(toJulianDay(2000, 1, 1)).toBe(2451545);
			expect(toJulianDay(new Date(Date.UTC(2000, 0, 1)))).toBe(2451545);
			expect(toJulianDay({ year: 2000, month: 1, day: 1 })).toBe(2451545);
		});
	});
});
