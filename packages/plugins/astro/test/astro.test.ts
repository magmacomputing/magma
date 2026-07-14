import { Tempo } from '@magmacomputing/tempo/core';
import { ParseModule } from '@magmacomputing/tempo/parse';
import { AstroTerm } from '../src/index.js';

describe('Astro Plugin (Term Implementation)', () => {

	beforeEach(() => {
		Tempo.init({ plugins: [ParseModule, AstroTerm] });
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
});
