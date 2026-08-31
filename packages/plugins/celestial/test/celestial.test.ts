import { Tempo } from '@magmacomputing/tempo';
import { CelestialPlugin } from '../src/index.js';

describe('CelestialPlugin (Solar & Lunar Terms)', () => {
	beforeEach(() => {
		Tempo.init();
		Tempo.extend(CelestialPlugin);
	});

	it('resolves lunar terms (moon and lunar)', () => {
		const t = new Tempo('2026-03-03T12:00:00Z', { sphere: 'north' });
		expect(typeof t.term.moon).toBe('string');
		expect(t.term.lunar).toBeDefined();
		expect(t.term.lunar.phase).toBeDefined();
		expect(typeof t.term.lunar.illumination).toBe('number');
		expect(t.term.lunar.start).toBeInstanceOf(Tempo);
		expect(t.term.lunar.end).toBeInstanceOf(Tempo);
	});

	it('resolves solar terms (sun and solar)', () => {
		const t = new Tempo('2026-06-21T12:00:00Z', { latitude: 40.7128, longitude: -74.006 });
		expect(typeof t.term.sun).toBe('string');
		expect(t.term.solar).toBeDefined();
		expect(t.term.solar.sunrise).toBeInstanceOf(Tempo);
		expect(t.term.solar.sunset).toBeInstanceOf(Tempo);
		expect(t.term.solar.isDaylight).toBe(true);
	});
});
