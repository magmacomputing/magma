import { unwrapTemporal, getTemporal, extractDateParts } from '../../src/support/temporal.js';
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

describe('extractDateParts', () => {
	it('should extract parts and detect Tempo source type', () => {
		const t = new Tempo('2024-02-15');
		const parts = extractDateParts(t);
		expect(parts.type).toBe('Tempo');
		expect(parts.year).toBe(2024);
		expect(parts.month).toBe(2);
		expect(parts.day).toBe(15);
		expect(parts.daysInMonth).toBe(29);
		expect(parts.dayOfWeek).toBe(4); // Thursday
		expect(parts.target).toBe(t.zdt);
	});

	it('should extract parts and detect native Temporal source type', () => {
		const TemporalAPI = getTemporal();
		const pd = TemporalAPI.PlainDate.from('2026-10-03');
		const parts = extractDateParts(pd);
		expect(parts.type).toBe('Temporal');
		expect(parts.year).toBe(2026);
		expect(parts.month).toBe(10);
		expect(parts.day).toBe(3);
		expect(parts.dayOfWeek).toBe(6); // Saturday
		expect(parts.target).toBe(pd);
	});

	it('should extract parts and detect Date source type', () => {
		const d = new Date(2026, 6, 1); // July 1, 2026
		const parts = extractDateParts(d);
		expect(parts.type).toBe('Date');
		expect(parts.year).toBe(2026);
		expect(parts.month).toBe(7);
		expect(parts.day).toBe(1);
		expect(parts.dayOfWeek).toBe(3); // Wednesday
		expect(parts.target).toBe(d);
	});

	it('should extract parts and detect string source type for ISO dates', () => {
		const parts = extractDateParts('2024-02-29');
		expect(parts.type).toBe('string');
		expect(parts.year).toBe(2024);
		expect(parts.month).toBe(2);
		expect(parts.day).toBe(29);
		expect(parts.dayOfWeek).toBe(4); // Thursday
	});

	it('should extract year-only ISO strings', () => {
		const parts = extractDateParts('2025');
		expect(parts.type).toBe('string');
		expect(parts.year).toBe(2025);
		expect(parts.month).toBeUndefined();
		expect(parts.day).toBeUndefined();
	});

	it('should extract parts and detect number source type for calendar years', () => {
		const parts = extractDateParts(2024);
		expect(parts.type).toBe('number');
		expect(parts.year).toBe(2024);
		expect(parts.month).toBeUndefined();
	});

	it('should extract parts and detect number source type for epoch timestamps', () => {
		const ts = new Date(2026, 9, 5).getTime(); // Oct 5, 2026 (Monday in local time)
		const parts = extractDateParts(ts);
		expect(parts.type).toBe('number');
		expect(parts.year).toBe(2026);
		expect(parts.month).toBe(10);
		expect(parts.day).toBe(5);
		expect(parts.dayOfWeek).toBe(1);
	});

	it('should extract parts and detect duck-typed object source type', () => {
		const duck = { year: 2026, month: 4, day: 15, dayOfWeek: 3 };
		const parts = extractDateParts(duck);
		expect(parts.type).toBe('object');
		expect(parts.year).toBe(2026);
		expect(parts.month).toBe(4);
		expect(parts.day).toBe(15);
		expect(parts.dayOfWeek).toBe(3);
	});

	it('should classify non-date inputs as unknown', () => {
		expect(extractDateParts(null).type).toBe('unknown');
		expect(extractDateParts(undefined).type).toBe('unknown');
		expect(extractDateParts(true).type).toBe('unknown');
	});
});
