import { Tempo } from '#tempo';
import {
	QuarterTerm,
	QUARTER_KEYS,
	SeasonTerm,
	SEASON_KEYS,
	TimelineTerm,
	TIMEOFDAY_KEYS,
	ZodiacTerm,
	ZODIAC_KEYS,
	EasternTerm,
	EASTERN_ANIMAL_KEYS,
	CulturalTerms,
} from '../src/index.js';

describe('Term Unified Logic (Mutation & Identity)', () => {
	// 2024-05-15 is in Q2 (Apr-Jun) in Northern hemisphere
	const testDate = '2024-05-15T12:00:00+10:00[Australia/Sydney]';

	beforeEach(() => {
		Tempo.init();
	});

	it('should jump to the start of a term using #term syntax in set()', () => {
		const t = new Tempo(testDate, { catch: true, sphere: 'north' });
		const start = t.set({ start: '#quarter' });
		expect(start.format('{yyyy}-{mm}-{dd}')).toBe('2024-04-01');
	});

	it('should support short keys as synonyms in set()', () => {
		const t = new Tempo(testDate, { catch: true, sphere: 'north' });
		const start = t.set({ start: '#qtr' });
		expect(start.format('{yyyy}-{mm}-{dd}')).toBe('2024-04-01');
	});

	it('should jump to the end of a term using set()', () => {
		const t = new Tempo(testDate, { catch: true, sphere: 'north' });
		const end = t.set({ end: '#quarter' });
		// End of Q2 is 2024-06-30 23:59:59...
		expect(end.format('{yyyy}-{mm}-{dd}')).toBe('2024-06-30');
		expect(end.hh).toBe(23);
		expect(end.mi).toBe(59);
		expect(end.ss).toBe(59);
	});

	it('should jump to the mid-point of a term using set()', () => {
		const t = new Tempo('2024-05-15', { catch: true, sphere: 'north' }); // Q2: Apr, May, Jun (91 days)
		const mid = t.set({ mid: '#quarter' });
		// Mid of 91 days (Apr 1 to Jun 30)
		// Apr(30) + May(15.5) -> May 16
		expect(mid.mm).toBe(5);
		expect(mid.dd).toBe(16);
	});

	it('should format labels using {#qtr} (Key) and {#quarter} (Scope)', () => {
		const t = new Tempo(testDate, { catch: true, sphere: 'north' });
		// Default Quarter plugin doesn't have a label, so both should return Q2
		expect(t.format('{#qtr}')).toBe('Q2');
		expect(t.format('{#quarter}')).toBe('Second Quarter');
	});

	it('should respect custom labels if provided in the Range object', () => {
		// 1. Register a custom term that returns a labelled Range
		Tempo.use({
			key: 'custom',
			define() {
				return {
					key: 'custom_2024',
					year: 2024,
					start: new Tempo('2024-01-01'),
					end: new Tempo('2024-12-31'),
					label: 'Year 2024'
				};
			}
		});

		// 2. Format a string using the custom term placeholder
		const t = new Tempo('2024-05-15');
		expect(t.format('{#custom}')).toBe('Year 2024');
	});

	it('should return the original placeholder for unknown terms in format()', () => {
		const t = new Tempo(testDate, { catch: true, sphere: 'north' });
		expect(t.format('{#nonexistent}')).toBe('{#nonexistent}');
	});

	it('should throw an error for invalid terms when catch is false', () => {
		const t = new Tempo(testDate, { catch: false, sphere: 'north', silent: true });
		expect(() => t.set({ start: '#invalid' })).toThrow(/Unknown Term identifier\: #invalid/);
	});

	it('should correctly resolve quarters in the Southern Hemisphere', () => {
		const t = new Tempo(testDate, { catch: true, sphere: 'south' }); // 2024-05-15
		// May is in Q4 for the Southern Hemisphere (Jul start)
		expect(t.format('{#qtr}')).toBe('Q4');
		expect(t.set({ start: '#quarter' }).format('{yyyy}-{mm}-{dd}')).toBe('2024-04-01');
	});

	it('should support granular sphere matching (e.g. SouthSouthWest)', () => {
		// Even though ranges are defined for 'south', 'SouthSouthWest' should match it via .includes()
		const t = new Tempo(testDate, { catch: true, sphere: 'SouthSouthWest' });
		expect(t.format('{#qtr}')).toBe('Q4');
		expect(t.set({ start: '#quarter' }).format('{yyyy}-{mm}-{dd}')).toBe('2024-04-01');
	});

	it('should match sphere values case-insensitively', () => {
		// Verify that all-caps 'SOUTH' produces the same results as lowercase 'south'
		const t = new Tempo(testDate, { catch: true, sphere: 'SOUTH' });
		expect(t.format('{#qtr}')).toBe('Q4');
		expect(t.set({ start: '#quarter' }).format('{yyyy}-{mm}-{dd}')).toBe('2024-04-01');

		// Also verify all-caps granular matching 'SOUTHSOUTHWEST' works like 'SouthSouthWest'
		const t2 = new Tempo(testDate, { catch: true, sphere: 'SOUTHSOUTHWEST' });
		expect(t2.format('{#qtr}')).toBe('Q4');
		expect(t2.set({ start: '#quarter' }).format('{yyyy}-{mm}-{dd}')).toBe('2024-04-01');
	});

	describe('Term Range Boundaries (Fluent & Immutable)', () => {
		it('should return start and end as Tempo instances', () => {
			const t = new Tempo(testDate, { catch: true, sphere: 'north' });
			const q = t.term.quarter;

			expect(q.start).toBeInstanceOf(Tempo);
			expect(q.end).toBeInstanceOf(Tempo);
			expect(q.start.format('{yyyy}-{mm}-{dd}')).toBe('2024-04-01');
		});

		it('should ensure the Range object and its boundaries are frozen', () => {
			const t = new Tempo(testDate, { catch: true, sphere: 'north' });
			const q = t.term.quarter;

			expect(Object.isFrozen(q)).toBe(true);
			expect(Object.isFrozen(q.start)).toBe(true);
			expect(Object.isFrozen(q.end)).toBe(true);
		});
	});

	describe('Standardized Term Range Keys (.keys)', () => {
		it('QuarterTerm exposes frozen keys reference without redundant plural properties', () => {
			expect(QuarterTerm.keys).toBe(QUARTER_KEYS);
			expect((QuarterTerm as any).quarters).toBeUndefined();
			expect(Object.isFrozen(QUARTER_KEYS)).toBe(true);

			const t = new Tempo(testDate, { catch: true, sphere: 'north' });
			expect(t.term.quarter.keys).toBe(QUARTER_KEYS);
			expect((t.term.quarter as any).quarters).toBeUndefined();
		});

		it('SeasonTerm exposes frozen keys reference without redundant plural properties', () => {
			expect(SeasonTerm.keys).toBe(SEASON_KEYS);
			expect((SeasonTerm as any).seasons).toBeUndefined();
			expect(Object.isFrozen(SEASON_KEYS)).toBe(true);

			const t = new Tempo(testDate, { catch: true, sphere: 'north' });
			expect(t.term.season.keys).toBe(SEASON_KEYS);
			expect((t.term.season as any).seasons).toBeUndefined();
		});

		it('TimelineTerm exposes frozen keys reference without redundant plural properties', () => {
			expect(TimelineTerm.keys).toBe(TIMEOFDAY_KEYS);
			expect((TimelineTerm as any).periods).toBeUndefined();
			expect((TimelineTerm as any).timesOfDay).toBeUndefined();
			expect(Object.isFrozen(TIMEOFDAY_KEYS)).toBe(true);

			const t = new Tempo(testDate, { catch: true, sphere: 'north' });
			expect(t.term.timeOfDay.keys).toBe(TIMEOFDAY_KEYS);
			expect((t.term.timeOfDay as any).periods).toBeUndefined();
			expect((t.term.timeOfDay as any).timesOfDay).toBeUndefined();
		});

		it('ZodiacTerm exposes frozen keys reference without redundant plural properties', () => {
			Tempo.use(CulturalTerms);
			expect(ZodiacTerm.keys).toBe(ZODIAC_KEYS);
			expect((ZodiacTerm as any).signs).toBeUndefined();
			expect((ZodiacTerm as any).zodiacs).toBeUndefined();
			expect(Object.isFrozen(ZODIAC_KEYS)).toBe(true);

			const t = new Tempo(testDate, { catch: true, sphere: 'north' });
			expect(t.term.zodiac.keys).toBe(ZODIAC_KEYS);
			expect((t.term.zodiac as any).signs).toBeUndefined();
			expect((t.term.zodiac as any).zodiacs).toBeUndefined();
		});

		it('EasternTerm exposes frozen keys reference without redundant plural properties', () => {
			Tempo.use(CulturalTerms);
			expect(EasternTerm.keys).toBe(EASTERN_ANIMAL_KEYS);
			expect((EasternTerm as any).animals).toBeUndefined();
			expect((EasternTerm as any).signs).toBeUndefined();
			expect(Object.isFrozen(EASTERN_ANIMAL_KEYS)).toBe(true);

			const t = new Tempo(testDate, { catch: true, sphere: 'north' });
			expect(t.term.shengxiao.keys).toBe(EASTERN_ANIMAL_KEYS);
			expect((t.term.shengxiao as any).animals).toBeUndefined();
			expect((t.term.shengxiao as any).signs).toBeUndefined();
		});
	});
});
