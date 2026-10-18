import { toZonedDateTime, toPlainDate, getOffsets, resolveTwoDigitYear, resolveFractionalSeconds } from '#library/temporal.library.js';

describe('Temporal Library Helpers', () => {
	describe('toZonedDateTime', () => {
		it('should append [tz] to plain ISO strings', () => {
			const zdt = toZonedDateTime('2024-01-01T12:00:00', 'Australia/Sydney');
			expect(zdt.timeZoneId).toBe('Australia/Sydney');
			expect(zdt.toString()).toContain('[Australia/Sydney]');
		});

		it('should NOT append [tz] to strings that already have a bracketed zone', () => {
			const zdt = toZonedDateTime('2024-01-01T12:00:00[UTC]', 'Australia/Sydney');
			expect(zdt.timeZoneId).toBe('UTC');
			expect(zdt.toString()).not.toContain('[Australia/Sydney]');
		});

		it('should NOT append [tz] to strings that have both an offset and a bracket', () => {
			const input = '2024-01-01T12:00:00+11:00[Australia/Sydney]';
			const zdt = toZonedDateTime(input, 'UTC');
			expect(zdt.timeZoneId).toBe('Australia/Sydney');
			expect(zdt.toString()).not.toContain('[UTC]');
		});

		it('should convert "Z" designated strings to the requested timezone preserving instant', () => {
			const bag = '2024-01-01T12:00:00Z';
			const zdt = toZonedDateTime(bag, 'Australia/Sydney');
			expect(zdt.timeZoneId).toBe('Australia/Sydney');
			expect(zdt.epochNanoseconds).toBe(Temporal.Instant.from(bag).epochNanoseconds);
			expect(zdt.hour).toBe(23);
			expect(zdt.day).toBe(1);
			expect(zdt.toString()).toBe('2024-01-01T23:00:00+11:00[Australia/Sydney]');
		});

		it('should normalize space-separated date-time and offset strings', () => {
			const zdtSpace = toZonedDateTime('2024-01-01 12:00:00', 'Australia/Sydney');
			expect(zdtSpace.timeZoneId).toBe('Australia/Sydney');
			expect(zdtSpace.hour).toBe(12);

			const zdtSpacedZone = toZonedDateTime('2024-01-01 12:00:00 [Australia/Sydney]', 'UTC');
			expect(zdtSpacedZone.timeZoneId).toBe('Australia/Sydney');

			const zdtSpacedZ = toZonedDateTime('2024-01-01 12:00:00 Z', 'Australia/Sydney');
			expect(zdtSpacedZ.hour).toBe(23);
		});

		it('should apply fallback timezone to calendar-only bracket annotations', () => {
			const zdt = toZonedDateTime('2024-01-01T12:00:00[u-ca=iso8601]', 'Australia/Sydney');
			expect(zdt.timeZoneId).toBe('Australia/Sydney');
			expect(zdt.hour).toBe(12);
			expect(zdt.calendarId).toBe('iso8601');
			expect(zdt.toString()).toContain('[Australia/Sydney]');
		});

		it('should parse date-only values using the fallback timezone', () => {
			const zdt = toZonedDateTime('2026-08-10', 'Australia/Sydney');
			expect(zdt.timeZoneId).toBe('Australia/Sydney');
			expect(zdt.year).toBe(2026);
			expect(zdt.month).toBe(8);
			expect(zdt.day).toBe(10);
			expect(zdt.hour).toBe(0);
			expect(zdt.minute).toBe(0);
			expect(zdt.toString()).toContain('[Australia/Sydney]');
		});

		it('should canonicalize identical string calls to the same ZonedDateTime instance', () => {
			const zdt1 = toZonedDateTime('2026-09-29T09:00:00', 'Australia/Sydney');
			const zdt2 = toZonedDateTime('2026-09-29T09:00:00', 'Australia/Sydney');
			expect(zdt1).toBe(zdt2);
		});
	});

	describe('toPlainDate', () => {
		it('should convert strings to PlainDate and reuse cached instances', () => {
			const pd1 = toPlainDate('2026-09-29');
			const pd2 = toPlainDate('2026-09-29');
			expect(pd1.toString()).toBe('2026-09-29');
			expect(pd1).toBe(pd2);
		});
	});

	describe('getOffsets', () => {
		it('should return timezone offsets for Jan and Jul and reuse cached offset results', () => {
			const offsets1 = getOffsets('Australia/Sydney', 2024);
			const offsets2 = getOffsets('Australia/Sydney', 2024);
			expect(typeof offsets1.jan).toBe('number');
			expect(typeof offsets1.jul).toBe('number');
			expect(offsets1).toBe(offsets2);
		});
	});

	describe('resolveTwoDigitYear', () => {
		it('should resolve two-digit years using default 75-year sliding window with numeric reference year', () => {
			// With reference 2026 and pivot 75: window is 1951..2050
			expect(resolveTwoDigitYear(26, 75, 2026)).toBe(2026);
			expect(resolveTwoDigitYear(0, 75, 2026)).toBe(2000);
			expect(resolveTwoDigitYear(50, 75, 2026)).toBe(2050);
			expect(resolveTwoDigitYear(51, 75, 2026)).toBe(1951);
			expect(resolveTwoDigitYear(99, 75, 2026)).toBe(1999);
		});

		it('should support Temporal object as reference date', () => {
			const refZdt = Temporal.ZonedDateTime.from('2026-10-24T12:00:00[UTC]');
			expect(resolveTwoDigitYear(24, 75, refZdt)).toBe(2024);
			expect(resolveTwoDigitYear(80, 75, refZdt)).toBe(1980);

			const refPd = Temporal.PlainDate.from('1990-06-15');
			// With reference 1990 and pivot 75: window is 1915..2014
			expect(resolveTwoDigitYear(90, 75, refPd)).toBe(1990);
			expect(resolveTwoDigitYear(14, 75, refPd)).toBe(2014);
			expect(resolveTwoDigitYear(15, 75, refPd)).toBe(1915);
		});

		it('should support custom pivot thresholds (e.g. 50 years or 70 years)', () => {
			// Fixed pivot 70 relative to 2045: window 1975..2074
			expect(resolveTwoDigitYear(75, 70, 2045)).toBe(1975);
			expect(resolveTwoDigitYear(74, 70, 2045)).toBe(2074);
		});

		it('should return numbers >= 100 or negative unchanged', () => {
			expect(resolveTwoDigitYear(2026)).toBe(2026);
			expect(resolveTwoDigitYear(1984)).toBe(1984);
			expect(resolveTwoDigitYear(-5)).toBe(-5);
		});
	});

	describe('resolveFractionalSeconds', () => {
		it('should return zeroes for undefined or empty input', () => {
			expect(resolveFractionalSeconds()).toEqual({ millisecond: 0, microsecond: 0, nanosecond: 0 });
			expect(resolveFractionalSeconds('')).toEqual({ millisecond: 0, microsecond: 0, nanosecond: 0 });
		});

		it('should parse 3-digit millisecond fractions', () => {
			expect(resolveFractionalSeconds('123')).toEqual({ millisecond: 123, microsecond: 0, nanosecond: 0 });
		});

		it('should parse 6-digit microsecond fractions', () => {
			expect(resolveFractionalSeconds('123456')).toEqual({ millisecond: 123, microsecond: 456, nanosecond: 0 });
		});

		it('should parse 9-digit nanosecond fractions', () => {
			expect(resolveFractionalSeconds('123456789')).toEqual({ millisecond: 123, microsecond: 456, nanosecond: 789 });
		});

		it('should right-pad short fractions up to 9 digits', () => {
			expect(resolveFractionalSeconds('5')).toEqual({ millisecond: 500, microsecond: 0, nanosecond: 0 });
			expect(resolveFractionalSeconds('05')).toEqual({ millisecond: 50, microsecond: 0, nanosecond: 0 });
		});

		it('should truncate fractions longer than 9 digits', () => {
			expect(resolveFractionalSeconds('123456789999')).toEqual({ millisecond: 123, microsecond: 456, nanosecond: 789 });
		});
	});
});
