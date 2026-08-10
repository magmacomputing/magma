import { toZonedDateTime } from '#library/temporal.library.js';

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
	});
});
