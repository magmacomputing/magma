import { Tempo } from '@magmacomputing/tempo';
import AstroPlugin, { getLunarPhase } from '../src/index.js';

describe('Astro Plugin (Solar & Lunar Terms)', () => {

	beforeEach(() => {
		// Bypass monorepo dual-package (src vs dist) type hazard for test plugins
		Tempo.init({ extends: [AstroPlugin] });
	});

	it('should register "astro", "astronomy", "moon", and "lunar" terms via AstroPlugin', () => {
		const tempo = new Tempo();
		expect(tempo.term.astro).toBeDefined();
		expect(tempo.term.astronomy).toBeDefined();
		expect(tempo.term.moon).toBeDefined();
		expect(tempo.term.lunar).toBeDefined();
	});

	it('should NOT pollute Tempo.prototype with a lunar getter', () => {
		const tempo = new Tempo();
		expect((tempo as any).lunar).toBeUndefined();
	});

	describe('Lunar Term Integration (t.term.moon & t.term.lunar)', () => {
		it('should identify New Moon around 2000-01-06T18:14:00Z with index 1', () => {
			const tempo = new Tempo('2000-01-06T18:14:00Z', { timeZone: 'UTC', sphere: 'north' });
			
			expect(tempo.term.moon).toBe('new-moon');
			
			const scope = tempo.term.lunar;
			expect(scope.key).toBe('new-moon');
			expect(scope.phase).toBe('New Moon');
			expect(scope.index).toBe(1);
			expect(scope.emoji).toBe('🌑');
			expect(scope.illumination).toBeLessThan(0.05);
			expect(scope.isWaxing).toBe(true);
			expect(scope.start).toBeDefined();
			expect(scope.end).toBeDefined();
		});

		it('should identify Full Moon roughly 14.76 days after New Moon with index 5', () => {
			const tempo = new Tempo('2000-01-21T04:40:00Z', { timeZone: 'UTC', sphere: 'north' });
			
			expect(tempo.term.moon).toBe('full-moon');

			const scope = tempo.term.lunar;
			expect(scope.key).toBe('full-moon');
			expect(scope.phase).toBe('Full Moon');
			expect(scope.index).toBe(5);
			expect(scope.emoji).toBe('🌕');
			expect(scope.illumination).toBeGreaterThan(0.95);
		});

		it('should adjust emoji orientation based on hemisphere sphere (North vs South) and return undefined when sphere is undefined', () => {
			const northTempo = new Tempo('2000-01-10T00:00:00Z', { timeZone: 'UTC', sphere: 'north' });
			const southTempo = new Tempo('2000-01-10T00:00:00Z', { timeZone: 'UTC', sphere: 'south' });
			const noSphereTempo = new Tempo('2000-01-10T00:00:00Z', { timeZone: 'UTC' });

			expect(northTempo.term.moon).toBe('waxing-crescent');
			expect(northTempo.term.lunar.index).toBe(2);
			expect(southTempo.term.moon).toBe('waxing-crescent');
			expect(southTempo.term.lunar.index).toBe(2);
			expect(noSphereTempo.term.moon).toBe('waxing-crescent');
			expect(noSphereTempo.term.lunar.index).toBe(2);

			// Northern Hemisphere sees light on the right (🌒)
			expect(northTempo.term.lunar.emoji).toBe('🌒');
			// Southern Hemisphere sees light on the left (🌘)
			expect(southTempo.term.lunar.emoji).toBe('🌘');
			// Unspecified sphere returns undefined emoji
			expect(noSphereTempo.term.lunar.emoji).toBeUndefined();
		});

		it('should export standalone getLunarPhase function', () => {
			const tempo = new Tempo('2024-01-25T17:54:00Z', { timeZone: 'UTC', sphere: 'north' });
			const lunar = getLunarPhase(tempo);

			expect(lunar).toBeDefined();
			expect(lunar.key).toBe('full-moon');
			expect(lunar.phase).toBe('Full Moon');
			expect(lunar.index).toBe(5);
			expect(typeof lunar.illumination).toBe('number');
			expect(typeof lunar.ageDays).toBe('number');
			expect(typeof lunar.isWaxing).toBe('boolean');
			expect(typeof lunar.emoji).toBe('string');
		});
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

	describe('Southern Hemisphere Support (Solar)', () => {

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
