import {
	haversineDistance,
	calculateBearing,
	calculateMidpoint,
	calculateVelocity,
	isImpossibleTravel,
	isWithin,
	inBoundingBox,
	solarOffset,
	resolveCulturalLocale,
} from '../../src/index.js';

describe('Spatial & Navigation Algorithms (@magmacomputing/tempo-fns)', () => {
	const NYC = { lat: 40.7128, lng: -74.006 };
	const LONDON = { lat: 51.5074, lng: -0.1278 };
	const SF = { lat: 37.7749, lng: -122.4194 };
	const LA = { lat: 34.0522, lng: -118.2437 };
	const SYDNEY = { lat: -33.8688, lng: 151.2093 };

	describe('haversineDistance', () => {
		it('calculates accurate Great-Circle distance between NYC and London in km', () => {
			const dist = haversineDistance(NYC, LONDON, 'km');
			expect(dist).toBeGreaterThan(5560);
			expect(dist).toBeLessThan(5590);
		});

		it('calculates distance in miles and meters', () => {
			const miles = haversineDistance(NYC, LONDON, 'miles');
			expect(miles).toBeGreaterThan(3450);
			expect(miles).toBeLessThan(3480);

			const meters = haversineDistance(NYC, LONDON, 'm');
			expect(meters).toBeGreaterThan(5560000);
			expect(meters).toBeLessThan(5590000);
		});

		it('returns 0 for identical coordinates', () => {
			expect(haversineDistance(NYC, NYC)).toBe(0);
		});

		it('handles [lat, lng] tuples and comma-separated string inputs', () => {
			const distTuple = haversineDistance([40.7128, -74.006], [51.5074, -0.1278]);
			const distStr = haversineDistance('40.7128, -74.006', '51.5074, -0.1278');
			expect(distTuple).toBe(haversineDistance(NYC, LONDON));
			expect(distStr).toBe(haversineDistance(NYC, LONDON));
		});

		it('returns NaN for invalid or missing coordinates', () => {
			expect(haversineDistance(null, NYC)).toBeNaN();
			expect(haversineDistance(NYC, { lat: 999, lng: 0 })).toBeNaN();
		});
	});

	describe('calculateBearing', () => {
		it('calculates compass azimuth bearing between SF and LA', () => {
			const bearing = calculateBearing(SF, LA);
			expect(bearing).toBeCloseTo(136.5, 1);
		});

		it('calculates cardinal bearings correctly', () => {
			const north = calculateBearing({ lat: 0, lng: 0 }, { lat: 10, lng: 0 });
			const south = calculateBearing({ lat: 10, lng: 0 }, { lat: 0, lng: 0 });
			const east = calculateBearing({ lat: 0, lng: 0 }, { lat: 0, lng: 10 });
			const west = calculateBearing({ lat: 0, lng: 10 }, { lat: 0, lng: 0 });

			expect(north).toBe(0);
			expect(south).toBe(180);
			expect(east).toBe(90);
			expect(west).toBe(270);
		});

		it('respects custom precision option', () => {
			const bearing = calculateBearing(SF, LA, { precision: 3 });
			expect(bearing.toString().split('.')[1]?.length).toBeLessThanOrEqual(3);
		});

		it('returns NaN for invalid inputs', () => {
			expect(calculateBearing(null, SF)).toBeNaN();
		});
	});

	describe('calculateMidpoint', () => {
		it('calculates geographic midpoint along equatorial path', () => {
			const mid = calculateMidpoint({ lat: 0, lng: 0 }, { lat: 0, lng: 100 });
			expect(mid).toBeDefined();
			expect(mid?.latitude).toBe(0);
			expect(mid?.longitude).toBe(50);
			expect(mid?.sphere).toBe('equator');
		});

		it('assigns correct hemisphere sphere to northern and southern midpoints', () => {
			const northMid = calculateMidpoint(NYC, LONDON);
			expect(northMid?.sphere).toBe('north');
			expect(northMid?.latitude).toBeGreaterThan(0);

			const southMid = calculateMidpoint(SYDNEY, { lat: -37.8136, lng: 144.9631 }); // Melbourne
			expect(southMid?.sphere).toBe('south');
			expect(southMid?.latitude).toBeLessThan(0);
		});

		it('returns undefined for invalid inputs', () => {
			expect(calculateMidpoint(null, NYC)).toBeUndefined();
		});
	});

	describe('calculateVelocity', () => {
		it('calculates speed in km/h from distance and time delta', () => {
			const t1 = 1700000000000;
			const t2 = t1 + 2 * 3600 * 1000; // 2 hours later
			const p1 = { ...NYC, timestamp: t1 };
			const p2 = { lat: 42.3601, lng: -71.0589, timestamp: t2 }; // Boston (~306 km away)

			const speed = calculateVelocity(p1, p2, { unit: 'km', timeUnit: 'hh' });
			expect(speed).toBeGreaterThan(150);
			expect(speed).toBeLessThan(156);
		});

		it('handles alternative time units (minutes and seconds)', () => {
			const t1 = 1700000000000;
			const t2 = t1 + 3600 * 1000; // 1 hour later
			const p1 = { ...NYC, timestamp: t1 };
			const p2 = { ...LONDON, timestamp: t2 };

			const speedPerMin = calculateVelocity(p1, p2, { unit: 'km', timeUnit: 'mi' });
			const speedPerSec = calculateVelocity(p1, p2, { unit: 'm', timeUnit: 'ss' });

			expect(speedPerMin).toBeCloseTo(haversineDistance(NYC, LONDON) / 60, 1);
			expect(speedPerSec).toBeGreaterThan(1000);
		});

		it('handles zero time delta (Infinity if distance > 0, 0 if distance === 0)', () => {
			const t = 1700000000000;
			expect(calculateVelocity({ ...NYC, timestamp: t }, { ...LONDON, timestamp: t })).toBe(Infinity);
			expect(calculateVelocity({ ...NYC, timestamp: t }, { ...NYC, timestamp: t })).toBe(0);
		});

		it('returns NaN when timestamps are missing or invalid', () => {
			expect(calculateVelocity(NYC, LONDON)).toBeNaN();
		});
	});

	describe('isImpossibleTravel', () => {
		it('detects impossible travel for cross-Atlantic travel in 1 hour (>5500 km/h)', () => {
			const t1 = 1700000000000;
			const t2 = t1 + 3600 * 1000; // 1 hour
			const loginNYC = { ...NYC, timestamp: t1 };
			const loginLondon = { ...LONDON, timestamp: t2 };

			expect(isImpossibleTravel(loginNYC, loginLondon)).toBe(true);
		});

		it('allows feasible commercial travel speeds (e.g. driving NYC to Boston in 4 hours)', () => {
			const t1 = 1700000000000;
			const t2 = t1 + 4 * 3600 * 1000; // 4 hours
			const p1 = { ...NYC, timestamp: t1 };
			const p2 = { lat: 42.3601, lng: -71.0589, timestamp: t2 }; // Boston

			expect(isImpossibleTravel(p1, p2)).toBe(false);
		});

		it('supports custom max speed threshold', () => {
			const t1 = 1700000000000;
			const t2 = t1 + 3600 * 1000; // 1 hour (speed ≈ 306 km/h)
			const p1 = { ...NYC, timestamp: t1 };
			const p2 = { lat: 42.3601, lng: -71.0589, timestamp: t2 }; // Boston

			expect(isImpossibleTravel(p1, p2, { maxSpeed: 200 })).toBe(true);
			expect(isImpossibleTravel(p1, p2, { maxSpeed: 400 })).toBe(false);
		});
	});

	describe('isWithin', () => {
		it('evaluates whether coordinates fall within a radius', () => {
			const eiffel = { lat: 48.8584, lng: 2.2945 };
			const louvre = { lat: 48.8606, lng: 2.3376 }; // ~3.3 km

			expect(isWithin(eiffel, louvre, 5, 'km')).toBe(true);
			expect(isWithin(eiffel, louvre, 2, 'km')).toBe(false);
		});

		it('returns false for negative radius or invalid coordinates', () => {
			expect(isWithin(NYC, LONDON, -10)).toBe(false);
			expect(isWithin(null, NYC, 100)).toBe(false);
		});
	});

	describe('inBoundingBox', () => {
		it('checks inclusion in standard rectangular bounding box', () => {
			const bbox = { minLat: 37.0, maxLat: 38.0, minLng: -123.0, maxLng: -122.0 };
			expect(inBoundingBox(SF, bbox)).toBe(true);
			expect(inBoundingBox(LA, bbox)).toBe(false);
		});

		it('supports array tuple format [minLat, minLng, maxLat, maxLng]', () => {
			const bbox: [number, number, number, number] = [37.0, -123.0, 38.0, -122.0];
			expect(inBoundingBox(SF, bbox)).toBe(true);
			expect(inBoundingBox(LA, bbox)).toBe(false);
		});

		it('handles antimeridian (180° longitude) crossing bounding boxes', () => {
			// Bounding box crossing antimeridian: spans 170° E to -170° W (190° E)
			const antimeridianBox = { minLat: -20, maxLat: 20, minLng: 170, maxLng: -170 };

			const fiji = { lat: -17.7134, lng: 178.065 }; // 178° E
			const samoa = { lat: -13.759, lng: -172.1046 }; // -172° W
			const tokyo = { lat: 35.6762, lng: 139.6503 }; // Outside longitude window

			expect(inBoundingBox(fiji, antimeridianBox)).toBe(true);
			expect(inBoundingBox(samoa, antimeridianBox)).toBe(true);
			expect(inBoundingBox(tokyo, antimeridianBox)).toBe(false);
		});
	});

	describe('solarOffset', () => {
		it('returns 0 for coordinate on meridian aligned with timezone', () => {
			const greenwich = { lat: 51.4826, lng: 0.0, timezone: 'UTC' };
			const offset = solarOffset(greenwich, { unit: 'minutes' });
			expect(offset).toBe(0);
		});

		it('calculates negative solar offset when city is west of its civil timezone meridian', () => {
			// Paris (2.35° E) uses CET (UTC+1, 15° E meridian). Delta = 2.35 - 15 = -12.65° * 4 min/deg ≈ -50.6 min
			const paris = { lat: 48.8584, lng: 2.2945, timezone: 'Europe/Paris' };
			const offset = solarOffset(paris, { unit: 'minutes', date: 1704067200000 }); // Jan 1 (standard time)
			expect(offset).toBeLessThan(-45);
			expect(offset).toBeGreaterThan(-55);
		});

		it('supports apparent solar time calculation incorporating Equation of Time', () => {
			const coords = { lat: 40.7128, lng: -74.006, timezone: 'America/New_York' };
			const meanOffset = solarOffset(coords, { apparent: false, date: new Date('2026-06-21') });
			const apparentOffset = solarOffset(coords, { apparent: true, date: new Date('2026-06-21') });

			expect(typeof meanOffset).toBe('number');
			expect(typeof apparentOffset).toBe('number');
			expect(meanOffset).not.toBe(apparentOffset);
		});

		it('supports unit conversions (seconds, hours, minutes)', () => {
			const coords = { lat: 0, lng: 15, timezone: 'UTC' }; // 15° East of UTC meridian = +60 minutes
			const min = solarOffset(coords, { unit: 'minutes' });
			const sec = solarOffset(coords, { unit: 'seconds' });
			const hours = solarOffset(coords, { unit: 'hours' });

			expect(min).toBe(60);
			expect(sec).toBe(3600);
			expect(hours).toBe(1);
		});
	});

	describe('resolveCulturalLocale', () => {
		it('adapts regional locale while preserving language in regional mode (default)', () => {
			expect(resolveCulturalLocale('en-US', 'AU')).toBe('en-AU');
			expect(resolveCulturalLocale('en-US', 'GB')).toBe('en-GB');
			expect(resolveCulturalLocale('fr-FR', 'CA')).toBe('fr-CA');
		});

		it('resolves primary native language for country in native mode', () => {
			expect(resolveCulturalLocale('en-US', 'EG', 'native')).toBe('ar-EG');
			expect(resolveCulturalLocale('en-US', 'SA', 'native')).toBe('ar-SA');
			expect(resolveCulturalLocale('en-US', 'JP', 'native')).toBe('ja-JP');
			expect(resolveCulturalLocale('en-US', 'FR', 'native')).toBe('fr-FR');
		});

		it('resolves full country names to ISO codes', () => {
			expect(resolveCulturalLocale('en-US', 'Australia')).toBe('en-AU');
			expect(resolveCulturalLocale('en-US', 'Saudi Arabia', 'native')).toBe('ar-SA');
		});

		it('returns direct custom locale when passed as mode string', () => {
			expect(resolveCulturalLocale('en-US', 'AU', 'fr-CH')).toBe('fr-CH');
		});

		it('returns undefined when mode is disabled (false / none)', () => {
			expect(resolveCulturalLocale('en-US', 'AU', false)).toBeUndefined();
			expect(resolveCulturalLocale('en-US', 'AU', 'none')).toBeUndefined();
		});
	});
});
