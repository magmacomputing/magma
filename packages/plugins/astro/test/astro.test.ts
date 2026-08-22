import { Tempo } from '@magmacomputing/tempo';
import { ParseModule } from '@magmacomputing/tempo/parse';
import { AstroTerm } from '../src/index.js';

describe('Astro Plugin (Term Implementation)', () => {

	beforeEach(() => {
		// Bypass monorepo dual-package (src vs dist) type hazard for test plugins
		Tempo.init({ extends: [ParseModule, AstroTerm] });
	});

	it('should register "astro" and "astronomy" terms', () => {
		const tempo = new Tempo();
		// Discovery check: terms should be in the registry
		expect(tempo.term.astro).toBeDefined();
		expect(tempo.term.astronomy).toBeDefined();
	});

	describe('Parser Confidence (Numeric Epochs)', () => {

		it('should trust a 10-digit ms epoch when timeStamp is explicit (Confidence-Aware)', () => {
			const tempo = new Tempo(6828940683, { timeZone: 'UTC', timeStamp: 'ms', sphere: 'north' });

			expect(tempo.yy).toBe(1970);
			expect(tempo.mm).toBe(3);
			expect(tempo.day).toBe(21);
			expect(tempo.term.astro).toBe('Vernal');
		});

		it('should correctly handle J2000 epoch (12 digits)', () => {
			// March 20, 2000 ~07:35 UTC
			const tempo = new Tempo(953537170176, { timeZone: 'UTC', timeStamp: 'ms', sphere: 'north' });
			expect(tempo.yy).toBe(2000);
			expect(tempo.term.astro).toBe('Vernal');
		});
	});

	describe('Seasonal Ranges (Scope)', () => {

		it('should return a range object for "astronomy" scope', () => {
			const tempo = new Tempo('2024-06-21', { timeZone: 'UTC', sphere: 'north' });
			const range = tempo.term.astronomy;

			expect(range.key).toBe('Summer');
			expect(range.start).toBeDefined();
			expect(range.end).toBeDefined();
			// Summer 2024 starts on June 20, 20:51 UTC
			expect(range.start.toDateTime().month).toBe(6);
			expect(range.start.toDateTime().day).toBe(20);
		});
	});

	describe('Southern Hemisphere Support', () => {

		it('should flip seasons when sphere is set to South', () => {
			// June 21st is Winter in Sydney
			const tempo = new Tempo('2024-06-21', {
				timeZone: 'Australia/Sydney',
				sphere: 'south'
			});

			expect(tempo.term.astro).toBe('Winter');
		});
	});

	describe('Meeus Range Enforcement', () => {

		it('should succeed for boundary year -999 (which evaluates -1000)', () => {
			const tempo = new Tempo(undefined, { timeZone: 'UTC', sphere: 'north' }).set({ yy: -999, mm: 1, dd: 1 });
			expect(() => tempo.term.astro).not.toThrow();
		});

		it('should succeed for boundary year 2999 (which evaluates 3000)', () => {
			const tempo = new Tempo(undefined, { timeZone: 'UTC', sphere: 'north' }).set({ yy: 2999, mm: 1, dd: 1 });
			expect(() => tempo.term.astro).not.toThrow();
		});

		it('should throw RangeError for year outside the lower bounds (-1000 evaluates -1001)', () => {
			const tempo = new Tempo(undefined, { timeZone: 'UTC', sphere: 'north' }).set({ yy: -1000, mm: 1, dd: 1 });
			expect(() => tempo.term.astro).toThrow(/supported Meeus calculation range/);
		});

		it('should throw RangeError for year outside the upper bounds (3000 evaluates 3001)', () => {
			const tempo = new Tempo(undefined, { timeZone: 'UTC', sphere: 'north' }).set({ yy: 3000, mm: 1, dd: 1 });
			expect(() => tempo.term.astro).toThrow(/supported Meeus calculation range/);
		});
	});
});
