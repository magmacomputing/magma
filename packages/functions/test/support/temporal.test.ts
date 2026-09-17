import { unwrapTemporal, getTemporal } from '../../src/support/temporal.js';
import { Tempo } from '@magmacomputing/tempo';

describe('unwrapTemporal', () => {
	it('should unwrap Tempo instance to its underlying Temporal.ZonedDateTime', () => {
		const t = new Tempo('2026-07-01T12:00:00Z');
		const unwrapped = unwrapTemporal(t);
		expect(unwrapped).toBe(t.zdt);
		expect(unwrapped.day).toBe(1);
		expect(unwrapped.month).toBe(7);
		expect(unwrapped.year).toBe(2026);
	});

	it('should pass through native Temporal objects without modification', () => {
		const TemporalAPI = getTemporal();
		const pd = TemporalAPI.PlainDate.from('2026-08-15');
		expect(unwrapTemporal(pd)).toBe(pd);

		const zdt = TemporalAPI.ZonedDateTime.from('2026-08-15T10:00:00+00:00[UTC]');
		expect(unwrapTemporal(zdt)).toBe(zdt);
	});

	it('should pass through duck-typed objects without a zdt property', () => {
		const duck = { day: 5, month: 10 };
		expect(unwrapTemporal(duck)).toBe(duck);
	});

	it('should unwrap custom objects with a zdt property', () => {
		const inner = { day: 25, year: 2026 };
		const wrapper = { zdt: inner };
		expect(unwrapTemporal(wrapper)).toBe(inner);
	});

	it('should return nullish or non-object primitives as-is', () => {
		expect(unwrapTemporal(null as any)).toBe(null);
		expect(unwrapTemporal(undefined as any)).toBe(undefined);
		expect(unwrapTemporal('2026-01-01' as any)).toBe('2026-01-01');
		expect(unwrapTemporal(123 as any)).toBe(123);
	});
});
