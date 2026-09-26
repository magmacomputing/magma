import { Tempo } from '@magmacomputing/tempo';
import { CelestialPlugin } from '../src/index.js';

describe('Location-Aware Solar & Tidal Term Enhancements', () => {
	beforeEach(() => {
		Tempo.init();
		Tempo.use(CelestialPlugin);
	});

	describe('SolarTerm: Real-Time Solar Coordinates & Photometric Lighting', () => {
		it('resolves real-time altitude, azimuth, and zenith for an observer', () => {
			// Sydney on Summer Solstice near solar noon
			const sydneyMidday = new Tempo('2026-12-21T02:00:00Z', {
				geo: { lat: -33.8688, lng: 151.2093 },
			});

			expect(sydneyMidday.term.solar.altitude).toBeGreaterThan(70);
			expect(sydneyMidday.term.solar.zenith).toBeLessThan(20);
			expect(sydneyMidday.term.solar.azimuth).toBeGreaterThanOrEqual(0);
			expect(sydneyMidday.term.solar.azimuth).toBeLessThanOrEqual(360);
			expect(sydneyMidday.term.solar.shadowRatio).toBeDefined();
			expect(sydneyMidday.term.solar.shadowRatio).toBeGreaterThan(0);
			expect(sydneyMidday.term.solar.shadowRatio).toBeLessThan(1);
			expect(sydneyMidday.term.solar.isGoldenHour).toBe(false);
			expect(sydneyMidday.term.solar.isBlueHour).toBe(false);
		});

		it('resolves shadowRatio to null and tracks negative altitude at night', () => {
			const sydneyMidnight = new Tempo('2026-12-21T14:00:00Z', {
				geo: { lat: -33.8688, lng: 151.2093 },
			});

			expect(sydneyMidnight.term.solar.altitude).toBeLessThan(-30);
			expect(sydneyMidnight.term.solar.shadowRatio).toBeNull();
			expect(sydneyMidnight.term.solar.isDaylight).toBe(false);
		});

		it('detects golden hour lighting when sun is near horizon', () => {
			const t = new Tempo('2026-12-21T02:00:00Z', {
				geo: { lat: -33.8688, lng: 151.2093 },
			});

			const sunsetTempo = t.term.solar.sunset;
			expect(sunsetTempo).toBeInstanceOf(Tempo);

			const atSunset = new Tempo(sunsetTempo!.epoch.ms, {
				geo: { lat: -33.8688, lng: 151.2093 },
			});

			expect(atSunset.term.solar.isGoldenHour).toBe(true);
		});
	});

	describe('SolarTerm: Polar Regions Handling', () => {
		it('handles Midnight Sun in high latitudes during summer', () => {
			// Tromsø, Norway (69.6492° N) on June 21 (Summer Solstice)
			const tromsoSummer = new Tempo('2026-06-21T12:00:00Z', {
				geo: { lat: 69.6492, lng: 18.9553 },
			});

			expect(tromsoSummer.term.solar.isMidnightSun).toBe(true);
			expect(tromsoSummer.term.solar.isPolarNight).toBe(false);
			expect(tromsoSummer.term.solar.isDaylight).toBe(true);
			expect(tromsoSummer.term.solar.key).toBe('daylight');
			expect(tromsoSummer.term.solar.sunrise).toBeNull();
			expect(tromsoSummer.term.solar.sunset).toBeNull();
			expect(tromsoSummer.term.solar.daylightDurationMs).toBe(86400000);
			expect(tromsoSummer.term.solar.start).toBeInstanceOf(Tempo);
			expect(tromsoSummer.term.solar.end).toBeInstanceOf(Tempo);
		});

		it('handles Polar Night in high latitudes during winter', () => {
			// Tromsø, Norway on December 21 (Winter Solstice: Polar Night)
			const tromsoMidday = new Tempo('2026-12-21T12:00:00Z', {
				geo: { lat: 69.6492, lng: 18.9553 },
			});

			expect(tromsoMidday.term.solar.isMidnightSun).toBe(false);
			expect(tromsoMidday.term.solar.isPolarNight).toBe(true);
			expect(tromsoMidday.term.solar.isDaylight).toBe(false);
			// At midday during polar night in Tromsø, sun reaches civil twilight angle (-3°)
			expect(tromsoMidday.term.solar.key).toBe('civil-twilight');
			expect(tromsoMidday.term.solar.sunrise).toBeNull();
			expect(tromsoMidday.term.solar.sunset).toBeNull();
			expect(tromsoMidday.term.solar.daylightDurationMs).toBe(0);

			// At midnight during polar night, total darkness
			const tromsoMidnight = new Tempo('2026-12-21T00:00:00Z', {
				geo: { lat: 69.6492, lng: 18.9553 },
			});
			expect(tromsoMidnight.term.solar.isPolarNight).toBe(true);
			expect(tromsoMidnight.term.solar.key).toBe('night');
		});

	});

	describe('TidalTerm: Local Coastal Tide Predictions & Port Calibration', () => {
		it('resolves nextHighTide and nextLowTide as Tempo instances for coastal observers', () => {
			const sydneyTide = new Tempo('2026-03-03T12:00:00Z', {
				geo: { lat: -33.8688, lng: 151.2093 },
			});

			expect(sydneyTide.term.tides.nextHighTide).toBeInstanceOf(Tempo);
			expect(sydneyTide.term.tides.nextLowTide).toBeInstanceOf(Tempo);
			expect(sydneyTide.term.tides.nextHighTide!.epoch.ms).toBeGreaterThanOrEqual(sydneyTide.epoch.ms);
			expect(sydneyTide.term.tides.nextLowTide!.epoch.ms).toBeGreaterThanOrEqual(sydneyTide.epoch.ms);
			expect(sydneyTide.term.tides.regime).toBe('semi-diurnal');
			expect(sydneyTide.term.tides.lunitidalIntervalMin).toBe(0);
		});

		it('applies lunitidalIntervalMin offset from geo configuration', () => {
			const baseline = new Tempo('2026-03-03T12:00:00Z', {
				geo: { lat: -33.8688, lng: 151.2093 },
			});

			const calibrated = new Tempo('2026-03-03T12:00:00Z', {
				geo: { lat: -33.8688, lng: 151.2093, lunitidalIntervalMin: 120 },
			});

			expect(calibrated.term.tides.lunitidalIntervalMin).toBe(120);
			expect(calibrated.term.tides.nextHighTide!.epoch.ms).toBeGreaterThan(baseline.term.tides.nextHighTide!.epoch.ms);
		});

		it('evaluates location-dependent tidal properties to null when geo is not provided', () => {
			const globalTide = new Tempo('2026-03-03T12:00:00Z');

			expect(globalTide.term.tides.nextHighTide).toBeNull();
			expect(globalTide.term.tides.nextLowTide).toBeNull();
			expect(globalTide.term.tides.lunitidalIntervalMin).toBeNull();
			expect(globalTide.term.tides.regime).toBeNull();
			// Astronomical syzygy and perigee properties remain available
			expect(globalTide.term.tides.state).toBeDefined();
			expect(globalTide.term.tides.isSpringTide).toBeDefined();
		});
	});
});
