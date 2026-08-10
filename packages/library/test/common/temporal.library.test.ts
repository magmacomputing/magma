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

		it('should handle "Z" as a zone designator and pass it through (even if ZonedDateTime.from throws without a bracket)', () => {
			const bag = '2024-01-01T12:00:00Z';
			expect(() => toZonedDateTime(bag, 'Australia/Sydney')).toThrow(/time\s?zone/i);
		});
	});
});
