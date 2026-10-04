import {
	normalizeLat,
	normalizeLng,
	normalizeCoords,
	extractRawCoords,
	resolveCoordinates,
	parseCoordNumber,
} from '../../src/support/index.js';

describe('Universal Coordinate Helpers (@magmacomputing/tempo-fns/support)', () => {
	describe('parseCoordNumber', () => {
		it('parses numbers and numeric strings', () => {
			expect(parseCoordNumber(42.5)).toBe(42.5);
			expect(parseCoordNumber('  -73.985  ')).toBe(-73.985);
		});

		it('returns NaN for invalid values, booleans, and empty strings', () => {
			expect(parseCoordNumber(true)).toBeNaN();
			expect(parseCoordNumber(false)).toBeNaN();
			expect(parseCoordNumber('')).toBeNaN();
			expect(parseCoordNumber('   ')).toBeNaN();
			expect(parseCoordNumber(null)).toBeNaN();
			expect(parseCoordNumber(undefined)).toBeNaN();
		});
	});

	describe('normalizeLat & normalizeLng', () => {
		it('validates latitude bounds [-90, 90]', () => {
			expect(normalizeLat(40.7128)).toBe(40.7128);
			expect(normalizeLat(-90)).toBe(-90);
			expect(normalizeLat(90)).toBe(90);
			expect(normalizeLat(91)).toBeUndefined();
			expect(normalizeLat(-91)).toBeUndefined();
		});

		it('validates longitude bounds [-180, 180]', () => {
			expect(normalizeLng(-74.006)).toBe(-74.006);
			expect(normalizeLng(-180)).toBe(-180);
			expect(normalizeLng(180)).toBe(180);
			expect(normalizeLng(181)).toBeUndefined();
			expect(normalizeLng(-181)).toBeUndefined();
		});
	});

	describe('extractRawCoords', () => {
		it('extracts from positional numbers (lat, lng)', () => {
			const res = extractRawCoords(40.7128, -74.006);
			expect(res?.lat).toBe(40.7128);
			expect(res?.lng).toBe(-74.006);
		});

		it('extracts from [lat, lng] and [lat, lng, elevation] tuples', () => {
			const res2 = extractRawCoords([40.7128, -74.006]);
			expect(res2?.lat).toBe(40.7128);
			expect(res2?.lng).toBe(-74.006);

			const res3 = extractRawCoords([40.7128, -74.006, 150]);
			expect(res3?.lat).toBe(40.7128);
			expect(res3?.lng).toBe(-74.006);
			expect(res3?.elevation).toBe(150);
		});

		it('extracts from "lat, lng" and "lat, lng, elevation" strings', () => {
			const res = extractRawCoords('40.7128, -74.006, 50');
			expect(res?.lat).toBe(40.7128);
			expect(res?.lng).toBe(-74.006);
			expect(res?.elevation).toBe(50);
		});

		it('extracts from object properties ({ lat, lng }, { latitude, longitude })', () => {
			const resShort = extractRawCoords({ lat: 51.5074, lng: -0.1278 });
			expect(resShort?.lat).toBe(51.5074);
			expect(resShort?.lng).toBe(-0.1278);

			const resFull = extractRawCoords({ latitude: 51.5074, longitude: -0.1278, elevation: 25 });
			expect(resFull?.lat).toBe(51.5074);
			expect(resFull?.lng).toBe(-0.1278);
			expect(resFull?.elevation).toBe(25);
		});

		it('extracts from nested geo and config.geo instances', () => {
			const instanceWithGeo = { geo: { latitude: 35.6762, longitude: 139.6503 } };
			const res = extractRawCoords(instanceWithGeo);
			expect(res?.lat).toBe(35.6762);
			expect(res?.lng).toBe(139.6503);
		});

		it('returns undefined for invalid or nullish inputs', () => {
			expect(extractRawCoords(null)).toBeUndefined();
			expect(extractRawCoords(undefined)).toBeUndefined();
			expect(extractRawCoords([999, 0])).toBeUndefined();
		});
	});

	describe('resolveCoordinates', () => {
		it('resolves coordinates with safe default fallbacks (0, 0, 0)', () => {
			expect(resolveCoordinates(null)).toEqual({ lat: 0, lng: 0, elevation: 0 });
			expect(resolveCoordinates(40.7128, -74.006)).toEqual({ lat: 40.7128, lng: -74.006, elevation: 0 });
			expect(resolveCoordinates({ lat: 40.7128, lng: -74.006, elevation: 100 })).toEqual({ lat: 40.7128, lng: -74.006, elevation: 100 });
		});
	});
});
