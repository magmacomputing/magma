import { Tempo } from '@magmacomputing/tempo';
import { CelestialPlugin, SolarTerm, LunarTerm } from '../src/index.js';

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
		expect(Array.isArray(t.term.lunar.phases)).toBe(true);
		expect(t.term.lunar.phases.length).toBe(8);
		expect(t.term.lunar.phases).toBe(LunarTerm.phases);
		expect(Object.isFrozen(t.term.lunar.phases)).toBe(true);
		expect(typeof t.term.lunar.illumination).toBe('number');
		expect(t.term.lunar.start).toBeInstanceOf(Tempo);
		expect(t.term.lunar.end).toBeInstanceOf(Tempo);
	});

	it('resolves solar terms (sun and solar)', () => {
		const t = new Tempo('2026-06-21T12:00:00Z', { geo: { lat: 40.7128, lng: -74.006 } });
		expect(typeof t.term.sun).toBe('string');
		expect(t.term.solar).toBeDefined();
		expect(t.term.solar.key).toBe('daylight');
		expect(t.term.solar.phase).toBe('Daylight');
		expect(Array.isArray(t.term.solar.phases)).toBe(true);
		expect(t.term.solar.phases.length).toBe(5);
		expect(t.term.solar.phases).toBe(SolarTerm.phases);
		expect(Object.isFrozen(t.term.solar.phases)).toBe(true);
		expect(t.term.solar.sunrise).toBeInstanceOf(Tempo);
		expect(t.term.solar.noon).toBeInstanceOf(Tempo);
		expect(t.term.solar.sunset).toBeInstanceOf(Tempo);
		expect(t.term.solar.isDaylight).toBe(true);
		expect(t.term.solar.geo).toBe(t.geo);
		expect(t.term.lunar.geo).toBe(t.geo);
	});

	it('honors numeric anchor 0 in LunarTerm and SolarTerm resolvers', () => {
		const t = new Tempo('2026-06-21T12:00:00Z', { geo: { lat: 40.7128, lng: -74.006 } });
		
		const solarRes = SolarTerm.resolve.call(t, 0)[0];
		const lunarRes = LunarTerm.resolve.call(t, 0)[0];

		expect(solarRes.year).toBe(1970);
		expect(lunarRes.year).toBe(1969);
	});

	it('resolves tidal terms (tide and alias tides)', () => {
		const t = new Tempo('2026-03-03T12:00:00Z', { geo: { lat: -33.8688, lng: 151.2093 } });
		expect(typeof t.term.tide).toBe('string');
		expect(t.term.tides).toBeDefined();
		expect(t.term.tides.state).toBe(t.term.tide);
		expect(typeof t.term.tides.alignmentDeg).toBe('number');
		expect(typeof t.term.tides.isSpringTide).toBe('boolean');
		expect(typeof t.term.tides.isNeapTide).toBe('boolean');
		expect(typeof t.term.tides.isKingTide).toBe('boolean');
		expect(typeof t.term.tides.perigeeFactor).toBe('number');
		expect(typeof t.term.tides.lunarTideMinute).toBe('number');
		expect(t.term.tides.start).toBeInstanceOf(Tempo);
		expect(t.term.tides.end).toBeInstanceOf(Tempo);
	});
});
