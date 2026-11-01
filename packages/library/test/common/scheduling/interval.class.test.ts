import { Interval, isInterval } from '#library/scheduling/interval.class.js';

describe('common/scheduling/interval.class', () => {
	it('identifies as an authentic Interval via @Branded', () => {
		const p1 = { epochNanoseconds: 1000n };
		const p2 = { epochNanoseconds: 2000n };
		const interval = new Interval(p1, p2);

		expect(interval.isInterval).toBe(true);
		expect(Interval.isInterval(interval)).toBe(true);
		expect(isInterval(interval)).toBe(true);
		expect(interval instanceof Interval).toBe(true);
		expect(Object.prototype.toString.call(interval)).toBe('[object Interval]');

		const spoofed = { [Symbol.toStringTag]: 'Interval' };
		expect(Interval.isInterval(spoofed)).toBe(false);
		expect(isInterval(spoofed)).toBe(false);
		expect(spoofed instanceof Interval).toBe(false);
	});

	it('supports basic interval methods and comparisons', () => {
		const i1 = new Interval({ epochNanoseconds: 1000n }, { epochNanoseconds: 2000n });
		const i2 = new Interval({ epochNanoseconds: 1500n }, { epochNanoseconds: 2500n });
		const i3 = new Interval({ epochNanoseconds: 2000n }, { epochNanoseconds: 3000n });

		expect(i1.overlaps(i2)).toBe(true);
		expect(i1.abuts(i3)).toBe(true);
		expect(i1.contains({ epochNanoseconds: 1500n })).toBe(true);
		expect(i1.contains({ epochNanoseconds: 2500n })).toBe(false);

		const inter = i1.intersection(i2);
		expect(inter).not.toBeNull();
		expect(inter!.startNs).toBe(1500n);
		expect(inter!.endNs).toBe(2000n);
	});
});
