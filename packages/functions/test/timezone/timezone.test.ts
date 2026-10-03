import {
	isValidTimeZone,
	getDSTTransitions,
	isDST,
	getOffsets,
	getHemisphere,
	normalizeUtcOffset,
} from '../../src/index.js';

describe('Timezone & DST Functions (@magmacomputing/tempo-fns)', () => {
	describe('isValidTimeZone', () => {
		it('returns true for canonical IANA timezone names and offsets', () => {
			expect(isValidTimeZone('America/New_York')).toBe(true);
			expect(isValidTimeZone('Europe/London')).toBe(true);
			expect(isValidTimeZone('Asia/Tokyo')).toBe(true);
			expect(isValidTimeZone('Australia/Sydney')).toBe(true);
			expect(isValidTimeZone('UTC')).toBe(true);
			expect(isValidTimeZone('Etc/GMT+5')).toBe(true);
			expect(isValidTimeZone('Africa/Cairo')).toBe(true);
		});

		it('handles whitespace around valid timezone names', () => {
			expect(isValidTimeZone('  America/New_York  ')).toBe(true);
		});

		it('returns false for invalid timezone identifiers', () => {
			expect(isValidTimeZone('Mars/Phobos')).toBe(false);
			expect(isValidTimeZone('Invalid/Zone')).toBe(false);
			expect(isValidTimeZone('random_string')).toBe(false);
			expect(isValidTimeZone('')).toBe(false);
			expect(isValidTimeZone('   ')).toBe(false);
		});

		it('returns false for non-string types safely without throwing', () => {
			expect(isValidTimeZone(null)).toBe(false);
			expect(isValidTimeZone(undefined)).toBe(false);
			expect(isValidTimeZone(12345)).toBe(false);
			expect(isValidTimeZone({})).toBe(false);
		});
	});

	describe('getDSTTransitions', () => {
		it('resolves exact 2026 DST transitions for America/New_York', () => {
			const res = getDSTTransitions('America/New_York', 2026);
			expect(res.hasDST).toBe(true);
			expect(res.dstShiftMinutes).toBe(60);

			// Spring forward: 2026-03-08 07:00:00 UTC (02:00 -> 03:00 EST/EDT)
			expect(res.springForwardMs).toBe(1772953200000);
			expect(new Date(res.springForwardMs!).toISOString()).toBe('2026-03-08T07:00:00.000Z');

			// Fall back: 2026-11-01 06:00:00 UTC (02:00 -> 01:00 EDT/EST)
			expect(res.fallBackMs).toBe(1793512800000);
			expect(new Date(res.fallBackMs!).toISOString()).toBe('2026-11-01T06:00:00.000Z');
		});

		it('resolves Southern Hemisphere DST transitions for Australia/Sydney', () => {
			const res = getDSTTransitions('Australia/Sydney', 2026);
			expect(res.hasDST).toBe(true);
			expect(res.dstShiftMinutes).toBe(60);

			// Fall back in Southern Autumn (April)
			expect(res.fallBackMs).toBeDefined();
			const fallBackDate = new Date(res.fallBackMs!);
			expect(fallBackDate.getUTCMonth()).toBe(3); // April

			// Spring forward in Southern Spring (October)
			expect(res.springForwardMs).toBeDefined();
			const springDate = new Date(res.springForwardMs!);
			expect(springDate.getUTCMonth()).toBe(9); // October
		});

		it('resolves European DST transitions for Europe/London', () => {
			const res = getDSTTransitions('Europe/London', 2026);
			expect(res.hasDST).toBe(true);
			expect(res.dstShiftMinutes).toBe(60);

			const springDate = new Date(res.springForwardMs!);
			expect(springDate.getUTCMonth()).toBe(2); // March
			const fallBackDate = new Date(res.fallBackMs!);
			expect(fallBackDate.getUTCMonth()).toBe(9); // October
		});

		it('correctly identifies non-DST observing timezones and non-DST standard offset changes', () => {
			expect(getDSTTransitions('Asia/Tokyo', 2026)).toEqual({ hasDST: false });
			expect(getDSTTransitions('America/Phoenix', 2026)).toEqual({ hasDST: false });
			expect(getDSTTransitions('UTC', 2026)).toEqual({ hasDST: false });
			expect(getDSTTransitions('Asia/Kathmandu', 1985)).toEqual({ hasDST: false });
		});

		it('returns { hasDST: false } for invalid timezone or year parameters', () => {
			expect(getDSTTransitions('Invalid/Tz', 2026)).toEqual({ hasDST: false });
			expect(getDSTTransitions(null as any, 2026)).toEqual({ hasDST: false });
			expect(getDSTTransitions('America/New_York', NaN)).toEqual({ hasDST: false });
		});
	});

	describe('Existing Timezone Primitives', () => {
		it('evaluates isDST correctly', () => {
			expect(isDST('2026-07-01', 'America/New_York')).toBe(true);
			expect(isDST('2026-01-01', 'America/New_York')).toBe(false);
		});

		it('retrieves January and July offsets via getOffsets', () => {
			const offsets = getOffsets('America/New_York', 2026);
			expect(offsets.jan).toBeDefined();
			expect(offsets.jul).toBeDefined();
			expect(offsets.jan).not.toBe(offsets.jul);
		});

		it('determines hemisphere correctly', () => {
			expect(getHemisphere('America/New_York')).toBe('N');
			expect(getHemisphere('Australia/Sydney')).toBe('S');
		});

		it('normalizes UTC offsets', () => {
			expect(normalizeUtcOffset('UTC+8')).toBe('+08:00');
			expect(normalizeUtcOffset('UTC-05:30')).toBe('-05:30');
			expect(normalizeUtcOffset('America/New_York')).toBe('America/New_York');
		});
	});
});
