import { Tempo } from '@magmacomputing/tempo/core';
import { MutateModule } from '@magmacomputing/tempo/mutate';
import { FormatModule } from '@magmacomputing/tempo/format';
import { SnapPlugin } from '../src/index.js';

describe('Snap Plugin', () => {
	beforeAll(() => {
		Tempo.extend(MutateModule, FormatModule, SnapPlugin);
	});

	it('should snap to the nearest 15 minutes', () => {
		// Create a time at 14:08
		const t = new Tempo('2026-06-01T14:08:00');

		// Snap to nearest 15 minutes (should go to 14:15)
		// For stub purposes, just verify it returns a Tempo instance
		const result = t.snap({ mi: 15 });

		expect(result).toBeInstanceOf(Tempo);
		expect(result.format('{hh}:{mi}')).toBe('14:15');
	});

	it('should support long-form aliases (e.g. minutes)', () => {
		const t = new Tempo('2026-06-01T14:08:00');
		const result = t.snap({ minutes: 15 });
		expect(result.format('{hh}:{mi}')).toBe('14:15');
	});

	it('should support directional snapping (up and down)', () => {
		const t = new Tempo('2026-06-01T14:08:00');
		
		const up = t.snap({ mi: 15, direction: 'up' });
		expect(up.format('{hh}:{mi}')).toBe('14:15');

		const down = t.snap({ mi: 15, direction: 'down' });
		expect(down.format('{hh}:{mi}')).toBe('14:00');
	});

	it('should support sub-second snapping (milliseconds)', () => {
		const t = new Tempo('2026-06-01T14:08:00.123');
		const result = t.snap({ ms: 50 }); // 123 rounds down to 100
		expect(result.ms).toBe(100);
		expect(result.us).toBe(0);
		expect(result.ns).toBe(0);
	});

	it('should throw an error if multiple time components are provided', () => {
		const t = new Tempo('2026-06-01T14:08:00');
		// @ts-expect-error - testing invalid runtime input
		expect(() => t.snap({ hh: 1, mi: 15 })).toThrow('Snap options can only contain a single time component');
	});

	it('should throw an error if date components or invalid keys are provided', () => {
		const t = new Tempo('2026-06-01T14:08:00');
		// @ts-expect-error - testing invalid runtime input
		expect(() => t.snap({ days: 1 })).toThrow('Only time components');
	});
});
