import {
	getLunarPosition,
	getLunarTransit,
	getLunarDistance,
	getCrescentTilt,
} from '../src/index.js';

describe('Lunar Ephemeris Pure Functions (tempo-fns)', () => {
	describe('getLunarPosition', () => {
		it('calculates topocentric altitude, azimuth, and visibility for Sydney', () => {
			const res = getLunarPosition('2026-09-02T12:00:00Z', -33.8688, 151.2093);

			expect(res.latitude).toBe(-33.8688);
			expect(res.longitude).toBe(151.2093);
			expect(typeof res.altitude).toBe('number');
			expect(res.altitude).toBeGreaterThanOrEqual(-90);
			expect(res.altitude).toBeLessThanOrEqual(90);

			expect(typeof res.azimuth).toBe('number');
			expect(res.azimuth).toBeGreaterThanOrEqual(0);
			expect(res.azimuth).toBeLessThan(360);

			expect(typeof res.isAboveHorizon).toBe('boolean');
			expect(typeof res.distanceKm).toBe('number');
			expect(res.distanceKm).toBeGreaterThan(350000);
			expect(res.distanceKm).toBeLessThan(410000);

			expect(typeof res.angularDiameterArcmin).toBe('number');
			expect(res.angularDiameterArcmin).toBeGreaterThan(28);
			expect(res.angularDiameterArcmin).toBeLessThan(35);
		});

		it('calculates position correctly when given coordinate options object', () => {
			const res = getLunarPosition('2026-06-21T00:00:00Z', { latitude: 51.5074, longitude: -0.1278 });
			expect(res.latitude).toBe(51.5074);
			expect(res.longitude).toBe(-0.1278);
			expect(typeof res.rightAscensionDeg).toBe('number');
			expect(typeof res.declinationDeg).toBe('number');
		});
	});

	describe('getLunarTransit', () => {
		it('computes meridian transit timestamp within the local calendar day', () => {
			const dateStr = '2026-09-02T12:00:00Z';
			const lat = 40.7128;
			const lng = -74.006;
			const transitMs = getLunarTransit(dateStr, lat, lng);

			if (transitMs !== undefined) {
				const epochMs = new Date(dateStr).getTime();
				const localMs = epochMs + (lng * 240000);
				const localDate = new Date(localMs);
				const startOfDayMs = Date.UTC(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate());
				const dayStartMs = startOfDayMs - (lng * 240000);
				const dayEndMs = dayStartMs + 86400000;

				expect(transitMs).toBeGreaterThanOrEqual(dayStartMs);
				expect(transitMs).toBeLessThanOrEqual(dayEndMs);
			}
		});
	});

	describe('getLunarDistance', () => {
		it('detects Supermoon and Micromoon conditions correctly', () => {
			// Supermoon on Oct 17, 2024 (Hunter's Supermoon)
			const superRes = getLunarDistance('2024-10-17T11:26:00Z');
			expect(superRes.distanceKm).toBeLessThanOrEqual(365000);
			expect(superRes.isSupermoon).toBe(true);
			expect(superRes.isMicromoon).toBe(false);

			// Regular distance check
			const res = getLunarDistance('2026-01-01T00:00:00Z');
			expect(res.distanceKm).toBeGreaterThan(350000);
			expect(res.distanceKm).toBeLessThan(410000);
			expect(res.perigeeFactor).toBeGreaterThanOrEqual(0);
			expect(res.perigeeFactor).toBeLessThanOrEqual(1);
		});
	});

	describe('getCrescentTilt', () => {
		it('calculates crescent tilt, bright limb, and parallactic angles', () => {
			// Singapore equatorial coordinates
			const res = getCrescentTilt('2026-09-15T12:00:00Z', 1.3521, 103.8198);

			expect(typeof res.crescentTiltDeg).toBe('number');
			expect(res.crescentTiltDeg).toBeGreaterThanOrEqual(0);
			expect(res.crescentTiltDeg).toBeLessThan(360);

			expect(typeof res.brightLimbAngleDeg).toBe('number');
			expect(res.brightLimbAngleDeg).toBeGreaterThanOrEqual(0);
			expect(res.brightLimbAngleDeg).toBeLessThan(360);

			expect(typeof res.parallacticAngleDeg).toBe('number');
			expect(res.parallacticAngleDeg).toBeGreaterThanOrEqual(0);
			expect(res.parallacticAngleDeg).toBeLessThan(360);
		});
	});
});
