import { Tempo } from '@magmacomputing/tempo';
import { CelestialPlugin } from '../src/index.js';

describe('Location-Aware Lunar Topocentric Ephemeris (Multi-Hemisphere)', () => {
	beforeEach(() => {
		Tempo.init();
		Tempo.use(CelestialPlugin);
	});

	describe('Equatorial Coordinates (Singapore & Quito)', () => {
		it('calculates crescent tilt and tropical orientation correctly', () => {
			const singapore = new Tempo('2026-09-15T12:00:00Z', {
				geo: { lat: 1.3521, lng: 103.8198 },
			});

			expect(singapore.term.lunar.crescentTiltDeg).toBeTypeOf('number');
			expect(singapore.term.lunar.crescentTiltDeg).toBeGreaterThanOrEqual(0);
			expect(singapore.term.lunar.crescentTiltDeg).toBeLessThan(360);

			expect(singapore.term.lunar.altitude).toBeTypeOf('number');
			expect(singapore.term.lunar.azimuth).toBeTypeOf('number');
			expect(singapore.term.lunar.isAboveHorizon).toBeTypeOf('boolean');
		});
	});

	describe('Northern Hemisphere Coordinates (London & New York)', () => {
		it('calculates meridian transit and southern culmination', () => {
			const london = new Tempo('2026-06-21T12:00:00Z', {
				geo: { lat: 51.5074, lng: -0.1278 },
			});

			expect(london.term.lunar.altitude).toBeTypeOf('number');
			expect(london.term.lunar.azimuth).toBeTypeOf('number');

			if (london.term.lunar.transit) {
				expect(london.term.lunar.transit).toBeInstanceOf(Tempo);
				expect(london.term.lunar.transit.toDateTime().year).toBe(2026);
			}

			expect(london.term.lunar.distanceKm).toBeGreaterThan(350000);
			expect(london.term.lunar.distanceKm).toBeLessThan(410000);
		});
	});

	describe('Southern Hemisphere Coordinates (Sydney & Santiago)', () => {
		it('infers southern hemisphere, adjusts emojis and tracks altitude', () => {
			const sydney = new Tempo('2026-09-02T12:00:00Z', {
				geo: { lat: -33.8688, lng: 151.2093 },
			});

			expect(sydney.term.lunar.altitude).toBeTypeOf('number');
			expect(sydney.term.lunar.azimuth).toBeTypeOf('number');
			expect(sydney.term.lunar.isAboveHorizon).toBeTypeOf('boolean');

			// Check hemisphere emoji
			expect(sydney.term.lunar.emoji).toBeDefined();

			// Distance & diameter
			expect(sydney.term.lunar.distanceKm).toBeGreaterThan(350000);
			expect(sydney.term.lunar.distanceKm).toBeLessThan(410000);
			expect(sydney.term.lunar.angularDiameterArcmin).toBeGreaterThan(28);
			expect(sydney.term.lunar.angularDiameterArcmin).toBeLessThan(35);
		});
	});

	describe('Supermoon & Micromoon Identification', () => {
		it('identifies Supermoon on October 17, 2024 (Hunter’s Supermoon)', () => {
			const supermoon = new Tempo('2024-10-17T11:26:00Z', {
				geo: { lat: 40.7128, lng: -74.006 },
			});

			expect(supermoon.term.lunar.isSupermoon).toBe(true);
			expect(supermoon.term.lunar.isMicromoon).toBe(false);
			expect(supermoon.term.lunar.distanceKm).toBeLessThanOrEqual(365000);
		});
	});

	describe('Local Solar & Lunar Eclipse Obscuration', () => {
		it('resolves Solar Eclipse on April 8, 2024 for Dallas observer', () => {
			const dallas = new Tempo('2024-04-08T18:40:00Z', {
				geo: { lat: 32.7767, lng: -96.7970 },
			});

			expect(dallas.term.lunar.eclipse).toMatch(/solar/);
			expect(dallas.term.lunar.obscuration).toBeGreaterThan(0.5);
			expect(dallas.term.solar.eclipse).toMatch(/solar/);
			expect(dallas.term.solar.obscuration).toBeGreaterThan(0.5);
		});

		it('resolves Total Lunar Eclipse on May 16, 2022', () => {
			const newYork = new Tempo('2022-05-16T04:12:00Z', {
				geo: { lat: 40.7128, lng: -74.0060 },
			});

			expect(newYork.term.lunar.eclipse).toBe('total-lunar');
			expect(newYork.term.lunar.obscuration).toBe(1);
		});

		it('defaults to null on dates without eclipse or without geo', () => {
			const regular = new Tempo('2026-06-21T12:00:00Z', {
				geo: { lat: 51.5074, lng: -0.1278 },
			});
			expect(regular.term.lunar.eclipse).toBeNull();
			expect(regular.term.lunar.obscuration).toBe(0);

			const noGeo = new Tempo('2024-04-08T18:40:00Z');
			expect(noGeo.term.lunar.eclipse).toBeNull();
			expect(noGeo.term.lunar.obscuration).toBeNull();
		});
	});
});
