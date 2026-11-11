import { Tempo } from '#tempo';
import { ZodiacTerm } from '#tempo/terms';

describe('Tempo Shorthand Suite (Comprehensive)', () => {
	beforeEach(() => {
		Tempo.init({ timeZone: 'Australia/Sydney', sphere: 'south' });
		Tempo.use(ZodiacTerm);
	});

	describe('Quarter Shorthand (#qtr)', () => {
		test('forward shift (#qtr.>) from mid-period', () => {
			const t = new Tempo('2024-12-25'); // Q4 ISO Calendar (Oct-Dec)
			const next = t.set('#qtr.>');
			expect(next.format('{yyyy}-{mm}-{dd} ({#qtr})')).toBe('2025-01-01 (Q1)');
		});

		test('multi-step forward shift (#qtr.>2)', () => {
			const t = new Tempo('2024-12-25'); // Q4 ISO Calendar
			const next2 = t.set('#qtr.>2');
			// Q4 (Dec 25) -> Q1 (Jan 1) -> Q2 (Apr 1)
			expect(next2.format('{yyyy}-{mm}-{dd} ({#qtr})')).toBe('2025-04-01 (Q2)');
		});

		test('backward shift (#qtr.<)', () => {
			const t = new Tempo('2025-01-15'); // Q1 ISO Calendar
			const prev = t.set('#qtr.<');
			expect(prev.format('{yyyy}-{mm}-{dd} ({#qtr})')).toBe('2024-10-01 (Q4)');
		});
	});

	describe('Season Shorthand (#season)', () => {
		test('next season in south (#season.>)', () => {
			const t = new Tempo('2024-12-25'); // Summer in South (Dec 1)
			const next = t.set('#season.>');
			expect(next.format('{yyyy}-{mm}-{dd} ({#season})')).toBe('2025-03-01 (Autumn)');
		});
	});

	describe('Zodiac Shorthand (#zodiac)', () => {
		test('next zodiac sign (#zodiac.>)', () => {
			const t = new Tempo('2024-04-15'); // Aries
			const next = t.set('#zodiac.>');
			expect(next.format('{#zodiac}')).toBe('Taurus'); // Taurus starts ~Apr 20
		});
	});

	describe('Timeline Shorthand (#tod)', () => {
		test('next time of day (#tod.>)', () => {
			const t = new Tempo('2024-04-15T10:00:00'); // Midmorning
			const next = t.set('#tod.>');
			expect(next.format('{#tod}')).toBe('Midday'); // Midday is 12:00
		});
	});

	describe('Environment & Type Safety', () => {
		test('Tempo constructor casting timeZone to string', () => {
			// This test verifies the fix for tempo.class:209 / #setSphere
			const mockTz = { toString: () => 'Australia/Sydney' };

			// If our fix works, this should not throw and should resolve the sphere correctly.
			const t = new Tempo('2024-01-01', { timeZone: mockTz as any });
			expect(t.config.sphere).toBe('south');
		});
	});
});
