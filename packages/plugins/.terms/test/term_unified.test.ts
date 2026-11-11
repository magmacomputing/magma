import { Tempo } from '#tempo';
import { defineSpan, cast } from '@magmacomputing/tempo/plugin/sdk';
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
	// 2024-05-15 is in Q2 (Apr-Jun)
	const testDate = '2024-05-15T12:00:00+10:00[Australia/Sydney]';

	beforeEach(() => {
		Tempo.init();
	});

	it('should jump to the start of a term using #term syntax in set()', () => {
		const t = new Tempo(testDate, { catch: true });
		const start = t.set({ start: '#quarter' });
		expect(start.format('{yyyy}-{mm}-{dd}')).toBe('2024-04-01');
	});

	it('should support short keys as synonyms in set()', () => {
		const t = new Tempo(testDate, { catch: true });
		const start = t.set({ start: '#qtr' });
		expect(start.format('{yyyy}-{mm}-{dd}')).toBe('2024-04-01');
	});

	it('should jump to the end of a term using set()', () => {
		const t = new Tempo(testDate, { catch: true });
		const end = t.set({ end: '#quarter' });
		// End of Q2 is 2024-06-30 23:59:59...
		expect(end.format('{yyyy}-{mm}-{dd}')).toBe('2024-06-30');
		expect(end.hh).toBe(23);
		expect(end.mi).toBe(59);
		expect(end.ss).toBe(59);
	});

	it('should jump to the mid-point of a term using set()', () => {
		const t = new Tempo('2024-05-15', { catch: true }); // Q2: Apr, May, Jun (91 days)
		const mid = t.set({ mid: '#quarter' });
		// Mid of 91 days (Apr 1 to Jun 30)
		// Apr(30) + May(15.5) -> May 16
		expect(mid.mm).toBe(5);
		expect(mid.dd).toBe(16);
	});

	it('should format labels using {#qtr} (Key) and {#quarter} (Scope)', () => {
		const t = new Tempo(testDate, { catch: true });
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
		const t = new Tempo(testDate, { catch: true });
		expect(t.format('{#nonexistent}')).toBe('{#nonexistent}');
	});

	it('should throw an error for invalid terms when catch is false', () => {
		const t = new Tempo(testDate, { catch: false, silent: true });
		expect(() => t.set({ start: '#invalid' })).toThrow(/Unknown Term identifier\: #invalid/);
	});

	it('should strictly resolve calendar quarters globally (ISO 8601-2)', () => {
		const tSouth = new Tempo(testDate, { catch: true, sphere: 'south' }); // 2024-05-15
		const tNorth = new Tempo(testDate, { catch: true, sphere: 'north' });
		const tEquator = new Tempo(testDate, { catch: true, sphere: 'equator' });

		// May 15 is Q2 globally (April 1 start)
		expect(tSouth.format('{#qtr}')).toBe('Q2');
		expect(tNorth.format('{#qtr}')).toBe('Q2');
		expect(tEquator.format('{#qtr}')).toBe('Q2');
		expect(tSouth.term.quarter.key).toBe('Q2');
		expect(tSouth.set({ start: '#quarter' }).format('{yyyy}-{mm}-{dd}')).toBe('2024-04-01');
	});

	it('should support granular sphere matching for SeasonTerm (e.g. SouthSouthWest)', () => {
		// Season ranges are defined for 'south'; 'SouthSouthWest' should match it via .includes()
		const t = new Tempo(testDate, { catch: true, sphere: 'SouthSouthWest' });
		expect(t.format('{#szn}')).toBe('Autumn');
		expect(t.set({ start: '#szn' }).format('{yyyy}-{mm}-{dd}')).toBe('2024-03-01');
	});

	it('should match sphere values case-insensitively for SeasonTerm', () => {
		// Verify that all-caps 'SOUTH' produces the same results as lowercase 'south'
		const t = new Tempo(testDate, { catch: true, sphere: 'SOUTH' });
		expect(t.format('{#szn}')).toBe('Autumn');
		expect(t.set({ start: '#szn' }).format('{yyyy}-{mm}-{dd}')).toBe('2024-03-01');

		// Also verify all-caps granular matching 'SOUTHSOUTHWEST' works like 'SouthSouthWest'
		const t2 = new Tempo(testDate, { catch: true, sphere: 'SOUTHSOUTHWEST' });
		expect(t2.format('{#szn}')).toBe('Autumn');
		expect(t2.set({ start: '#szn' }).format('{yyyy}-{mm}-{dd}')).toBe('2024-03-01');
	});

	it('resolves equatorial seasons for sphere: "equator" and refuses to guess for non-polar/non-equatorial sphere', () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		try {
			// Equator resolves bimodal tropical seasons (Wet / Dry)
			const tEquator = new Tempo(testDate, { catch: true, sphere: 'equator' }); // May 15 -> Long Wet (Mar 1 - Jun 1)
			expect(tEquator.term.quarter.key).toBe('Q2'); // Calendar quarters remain deterministic
			expect(tEquator.term.season.key).toBe('Wet');
			expect(tEquator.term.season.label).toBe('Long Wet');
			expect(tEquator.term.season.symbol).toBe('CloudRain');
			expect(tEquator.term.season.span.start.format('{yyyy}-{mm}-{dd}')).toBe('2024-03-01');

			const tLongDry = new Tempo('2024-08-15T12:00:00Z', { catch: true, sphere: 'equator' });
			expect(tLongDry.term.season.key).toBe('Dry');
			expect(tLongDry.term.season.label).toBe('Long Dry');

			const tShortWet = new Tempo('2024-11-01T12:00:00Z', { catch: true, sphere: 'equator' });
			expect(tShortWet.term.season.key).toBe('Wet');
			expect(tShortWet.term.season.label).toBe('Short Wet');

			const tShortDry = new Tempo('2024-01-15T12:00:00Z', { catch: true, sphere: 'equator' });
			expect(tShortDry.term.season.key).toBe('Dry');
			expect(tShortDry.term.season.label).toBe('Short Dry');

			// Formatting {#szn} (key) vs {#season} (label) and lookup by distinct label
			expect(tEquator.format('{#szn}')).toBe('Wet');
			expect(tEquator.format('{#season}')).toBe('Long Wet');
			expect(tShortWet.format('{#season}')).toBe('Short Wet');
			const shortWetRange = SeasonTerm.define!.call(tEquator as any, 'Short Wet') as any;
			expect(shortWetRange?.key).toBe('Wet');
			expect(shortWetRange?.label).toBe('Short Wet');
			expect(shortWetRange?.span.start.format('{yyyy}-{mm}-{dd}')).toBe('2024-10-01');

			// When a key occurs twice (e.g. 'Wet'), define('Wet') should prefer the range containing the anchor
			const wetFromShortWet = SeasonTerm.define!.call(tShortWet as any, 'Wet') as any;
			expect(wetFromShortWet?.key).toBe('Wet');
			expect(wetFromShortWet?.label).toBe('Short Wet');
			expect(wetFromShortWet?.span.start.format('{yyyy}-{mm}-{dd}')).toBe('2024-10-01');

			const tEast = new Tempo(testDate, { catch: true, sphere: 'east' });
			expect(tEast.term.quarter.key).toBe('Q2'); // Quarters are universal
			expect(tEast.term.season).toBeUndefined(); // Seasons require valid sphere

			const tBoth = new Tempo(testDate, { catch: true, sphere: 'north-south' });
			expect(tBoth.term.quarter.key).toBe('Q2');
			expect(tBoth.term.season).toBeUndefined();
		} finally {
			warnSpy.mockRestore();
		}
	});

	describe('Term Range Boundaries & TermSpan (Fluent & Immutable)', () => {
		it('should return start, end, durations, and progress inside .span', () => {
			const t = new Tempo(testDate, { catch: true });
			const q = t.term.quarter;

			expect(q.span.start).toBeInstanceOf(Tempo);
			expect(q.span.end).toBeInstanceOf(Tempo);
			expect(q.span.start.format('{yyyy}-{mm}-{dd}')).toBe('2024-04-01');
			expect(q.span.end.format('{yyyy}-{mm}-{dd}')).toBe('2024-07-01');

			// Durations and progress
			expect(q.span.total).toBeDefined();
			expect(q.span.elapsed).toBeDefined();
			expect(q.span.remaining).toBeDefined();
			expect(typeof q.span.progress).toBe('number');
			expect(q.span.progress).toBeGreaterThan(0);
			expect(q.span.progress).toBeLessThan(1);

			// Internal template schema units are stripped from the root range object
			expect((q as any).month).toBeUndefined();
			expect((q as any).day).toBeUndefined();
		});

		it('should ensure the Range object and its boundaries are frozen', () => {
			const t = new Tempo(testDate, { catch: true });
			const q = t.term.quarter;

			expect(Object.isFrozen(q)).toBe(true);
			expect(Object.isFrozen(q.span.start)).toBe(true);
			expect(Object.isFrozen(q.span.end)).toBe(true);
		});

		it('should compute elapsed, remaining, and progress consistently from anchor when anchor differs from tempo', () => {
			const tQ1 = new Tempo('2024-02-01T00:00:00Z');
			const q2Start = new Tempo('2024-04-01T00:00:00Z');
			const q2End = new Tempo('2024-07-01T00:00:00Z');
			const anchorMid = new Tempo('2024-05-16T12:00:00Z');

			const spanFromTempoAnchor = defineSpan(
				cast(tQ1),
				cast(q2Start),
				cast(q2End),
				cast(anchorMid),
			);
			const spanFromZdtAnchor = defineSpan(
				cast(tQ1),
				cast(q2Start),
				cast(q2End),
				cast(anchorMid.toDateTime()),
			);

			// Elapsed should be positive from q2Start to anchorMid (~45.5 days), not negative from q2Start to tQ1
			expect(spanFromTempoAnchor.elapsed.toString()).toBe(q2Start.until(anchorMid).toString());
			expect(spanFromTempoAnchor.remaining.toString()).toBe(anchorMid.until(q2End).toString());
			expect(spanFromTempoAnchor.progress).toBe(0.5);

			expect(spanFromZdtAnchor.elapsed.toString()).toBe(spanFromTempoAnchor.elapsed.toString());
			expect(spanFromZdtAnchor.remaining.toString()).toBe(spanFromTempoAnchor.remaining.toString());
			expect(spanFromZdtAnchor.progress).toBe(0.5);

			const anchoredQuarter = QuarterTerm.define!.call(cast(tQ1), false, cast(anchorMid.toDateTime())) as any;
			expect(anchoredQuarter.key).toBe('Q2');
			expect(anchoredQuarter.span.elapsed.toString()).toBe(spanFromTempoAnchor.elapsed.toString());
			expect(anchoredQuarter.span.remaining.toString()).toBe(spanFromTempoAnchor.remaining.toString());
			expect(anchoredQuarter.span.progress).toBe(0.5);
		});
	});

	describe('Standardized Term Range Keys (.keys)', () => {
		it('QuarterTerm exposes frozen keys reference without redundant plural properties', () => {
			expect(QuarterTerm.keys).toBe(QUARTER_KEYS);
			expect((QuarterTerm as any).quarters).toBeUndefined();
			expect(Object.isFrozen(QUARTER_KEYS)).toBe(true);

			const t = new Tempo(testDate, { catch: true });
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

			const t = new Tempo(testDate, { catch: true });
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

			const t = new Tempo(testDate, { catch: true });
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

			const t = new Tempo(testDate, { catch: true });
			expect(t.term.shengxiao.keys).toBe(EASTERN_ANIMAL_KEYS);
			expect((t.term.shengxiao as any).animals).toBeUndefined();
			expect((t.term.shengxiao as any).signs).toBeUndefined();
		});

		it('QuarterTerm resolves ISO calendar quarters even when Tempo uses a non-ISO calendar', () => {
			Tempo.use(QuarterTerm);
			// 2026-02-15 is ISO Q1
			const tHebrew = new Tempo('2026-02-15T12:00:00Z', { calendar: 'hebrew' });
			expect(tHebrew.term.qtr).toBe('Q1');
			expect(tHebrew.term.quarter.span.start.format('{yyyy}-{mm}-{dd}')).toBe('2026-01-01');
			expect(tHebrew.term.quarter.span.end.format('{yyyy}-{mm}-{dd}')).toBe('2026-04-01');
		});
	});
});
