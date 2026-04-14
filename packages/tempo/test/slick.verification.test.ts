import { Tempo } from '#tempo';

describe('Tempo Shorthand Suite (Comprehensive)', () => {
	beforeEach(() => {
		Tempo.init({ timeZone: 'Australia/Sydney', sphere: 'south' });
	});

	describe('Quarter Shorthand (#qtr)', () => {
		test('forward shift (#qtr.>) from mid-period', () => {
			const t = new Tempo('2024-12-25'); // Q2 South (Oct-Dec)
			const next = t.set('#qtr.>');
			expect(next.format('{yyyy}-{mm}-{dd} ({#qtr})')).toBe('2025-01-01 (Q3)');
		});

		test('multi-step forward shift (#qtr.>2)', () => {
			const t = new Tempo('2024-12-25'); // Q2 South
			const next2 = t.set('#qtr.>2');
			// Q2 (Dec 25) -> Q3 (Jan 1) -> Q4 (Apr 1)
			expect(next2.format('{yyyy}-{mm}-{dd} ({#qtr})')).toBe('2025-04-01 (Q4)');
		});

		test('backward shift (#qtr.<)', () => {
			const t = new Tempo('2025-01-15'); // Q3 South
			const prev = t.set('#qtr.<');
			expect(prev.format('{yyyy}-{mm}-{dd} ({#qtr})')).toBe('2024-10-01 (Q2)');
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

	describe('Timeline Shorthand (#per)', () => {
		test('next daily period (#per.>)', () => {
			const t = new Tempo('2024-04-15T10:00:00'); // Midmorning
			const next = t.set('#per.>');
			expect(next.format('{#per}')).toBe('midday'); // Midday is 12:00
		});
	});

	describe('Ticker Shorthand Integration', () => {
		test('ticker with shorthand interval ({ "#qtr": ">" })', () => {
			const t = new Tempo('2024-12-25');
			const tick = Tempo.ticker({ seed: t, '#qtr': '>' });
			const pulse1 = tick.pulse();
			expect(pulse1.format('{yyyy}-{mm}-{dd} ({#qtr})')).toBe('2025-01-01 (Q3)');
			const pulse2 = tick.pulse();
			expect(pulse2.format('{yyyy}-{mm}-{dd} ({#qtr})')).toBe('2025-04-01 (Q4)');
		});

		test('ticker with multi-step shorthand ({ "#season": ">2" })', () => {
			const t = new Tempo('2024-12-25'); // Summer
			const tick = Tempo.ticker({ seed: t, '#season': '>2' });
			const pulse1 = tick.pulse();
			// Summer -> Autumn -> Winter
			expect(pulse1.format('{#season}')).toBe('Winter');
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
