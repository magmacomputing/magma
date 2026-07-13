import { Tempo, Interval } from '#tempo';

describe('Interval', () => {
	it('should normalize start and end if provided out of order', () => {
		const t1 = new Tempo('2026-07-01');
		const t2 = new Tempo('2026-07-05');
		const interval = new Interval(t2, t1); // Out of order

		expect(interval.start!.epoch.ns).toBe(t1.epoch.ns);
		expect(interval.end!.epoch.ns).toBe(t2.epoch.ns);
	});

	it('should work via Tempo.Interval namespace attachment', () => {
		const t1 = new Tempo('2026-07-01');
		const t2 = new Tempo('2026-07-05');
		const interval = new Tempo.Interval(t1, t2);

		expect(interval.start!.epoch.ns).toBe(t1.epoch.ns);
		expect(interval.end!.epoch.ns).toBe(t2.epoch.ns);
		expect(interval instanceof Interval).toBe(true);
	});

	it('should parse natural language strings when using Tempo.Interval wrapper', () => {
		const interval = new Tempo.Interval('2026-07-01', '2026-07-05');
		expect(interval.start).toBeInstanceOf(Tempo);
		expect(interval.end).toBeInstanceOf(Tempo);
		expect(interval.start!.epoch.ns).toBe(new Tempo('2026-07-01').epoch.ns);
		expect(interval.end!.epoch.ns).toBe(new Tempo('2026-07-05').epoch.ns);
	});

	it('should accept native Temporal objects', () => {
		const t1 = Temporal.Instant.from('2026-07-01T00:00:00Z');
		const t2 = Temporal.Instant.from('2026-07-05T00:00:00Z');
		const interval = new Interval(t1, t2);

		expect(interval.start!.epochNanoseconds).toBe(t1.epochNanoseconds);
	});

	it('contains should return true for points inside the interval', () => {
		const interval = new Interval(new Tempo('2026-07-01'), new Tempo('2026-07-10'));
		expect(interval.contains(new Tempo('2026-07-05'))).toBe(true);
		expect(interval.contains(new Tempo('2026-07-01'))).toBe(true); // Inclusive start
		expect(interval.contains(new Tempo('2026-07-10'))).toBe(false); // Exclusive end
		expect(interval.contains(Temporal.Instant.from('2026-07-05T00:00:00Z'))).toBe(true);
	});

	it('overlaps should return true for overlapping intervals', () => {
		const i1 = new Interval(new Tempo('2026-07-01'), new Tempo('2026-07-10'));
		const i2 = new Interval(new Tempo('2026-07-05'), new Tempo('2026-07-15'));
		const i3 = new Interval(new Tempo('2026-07-10'), new Tempo('2026-07-20'));

		expect(i1.overlaps(i2)).toBe(true);
		expect(i1.overlaps(i3)).toBe(false); // abuts, but doesn't overlap
	});

	it('abuts should return true for touching intervals', () => {
		const i1 = new Interval(new Tempo('2026-07-01'), new Tempo('2026-07-10'));
		const i2 = new Interval(new Tempo('2026-07-10'), new Tempo('2026-07-20'));
		const i3 = new Interval(new Tempo('2026-07-05'), new Tempo('2026-07-15'));

		expect(i1.abuts(i2)).toBe(true);
		expect(i2.abuts(i1)).toBe(true);
		expect(i1.abuts(i3)).toBe(false);
	});

	it('intersection should return the overlapping region', () => {
		const i1 = new Interval(new Tempo('2026-07-01'), new Tempo('2026-07-10'));
		const i2 = new Interval(new Tempo('2026-07-05'), new Tempo('2026-07-15'));
		
		const intersection = i1.intersection(i2);
		expect(intersection).not.toBeNull();
		expect(intersection!.start!.epoch.ns).toBe(new Tempo('2026-07-05').epoch.ns);
		expect(intersection!.end!.epoch.ns).toBe(new Tempo('2026-07-10').epoch.ns);
	});

	it('union should return the combined region if overlapping', () => {
		const i1 = new Interval(new Tempo('2026-07-01'), new Tempo('2026-07-10'));
		const i2 = new Interval(new Tempo('2026-07-05'), new Tempo('2026-07-15'));
		
		const union = i1.union(i2);
		expect(union).not.toBeNull();
		expect(union!.start!.epoch.ns).toBe(new Tempo('2026-07-01').epoch.ns);
		expect(union!.end!.epoch.ns).toBe(new Tempo('2026-07-15').epoch.ns);
	});

	it('intersection should return null if not overlapping', () => {
		const i1 = new Interval(new Tempo('2026-07-01'), new Tempo('2026-07-10'));
		const i2 = new Interval(new Tempo('2026-07-15'), new Tempo('2026-07-20'));
		
		expect(i1.intersection(i2)).toBeNull();
	});

	it('union should return null if not overlapping and not abutting', () => {
		const i1 = new Interval(new Tempo('2026-07-01'), new Tempo('2026-07-10'));
		const i2 = new Interval(new Tempo('2026-07-15'), new Tempo('2026-07-20'));
		
		expect(i1.union(i2)).toBeNull();
	});

	it('should support open-ended null boundaries', () => {
		const openStart = new Interval(null, new Tempo('2026-07-10'));
		const openEnd = new Interval(new Tempo('2026-07-01'), null);
		const allTime = new Interval(null, null);

		expect(openStart.start).toBeNull();
		expect(openEnd.end).toBeNull();
		expect(allTime.start).toBeNull();
		expect(allTime.end).toBeNull();

		expect(openStart.contains(new Tempo('2000-01-01'))).toBe(true);
		expect(openStart.contains(new Tempo('2026-07-11'))).toBe(false);

		expect(openEnd.contains(new Tempo('2000-01-01'))).toBe(false);
		expect(openEnd.contains(new Tempo('9999-12-31'))).toBe(true);

		expect(allTime.contains(new Tempo('2026-07-05'))).toBe(true);
		
		expect(openStart.overlaps(openEnd)).toBe(true);
	});
});
