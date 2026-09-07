import { Tempo } from '#tempo/core';
import { MutateModule } from '#tempo/mutate';
import '#tempo/parse';

Tempo.use(MutateModule);

describe('Mutate Module Aliases (plus & minus)', () => {
	it('should support .plus() as an alias for .add()', () => {
		const t1 = new Tempo('2026-08-25T10:00:00Z');
		const t2 = t1.plus({ days: 2 });
		expect(t2.iso).toBe('2026-08-27T10:00:00Z');
	});

	it('should support .minus() as an alias for .subtract()', () => {
		const t1 = new Tempo('2026-08-25T10:00:00Z');
		const t2 = t1.minus({ hours: 5 });
		expect(t2.iso).toBe('2026-08-25T05:00:00Z');
	});

	it('should support .sub() and .subtract() identically to negative-add', () => {
		const t = new Tempo('2026-08-25T10:00:00Z');
		const tSub = t.subtract({ days: 3 });
		const tSubAlias = t.sub({ days: 3 });
		const tAddNeg = t.add({ days: -3 });

		expect(tSub.iso).toBe('2026-08-22T10:00:00Z');
		expect(tSubAlias.iso).toBe(tSub.iso);
		expect(tAddNeg.iso).toBe(tSub.iso);
	});

	it('should support element abbreviations with subtract', () => {
		const t = new Tempo('2026-08-25T10:00:00Z');
		const tSub = t.subtract({ dd: 5, hh: 2 });
		expect(tSub.iso).toBe('2026-08-20T08:00:00Z');
	});

	it('should handle double negatives correctly (subtract negative offset)', () => {
		const t = new Tempo('2026-08-25T10:00:00Z');
		const tDoubleNeg = t.subtract({ days: -2 });
		expect(tDoubleNeg.iso).toBe('2026-08-27T10:00:00Z');
	});

	it('should support numeric string durations with subtract and minus', () => {
		const t = new Tempo('2026-08-25T10:00:00Z');
		const tSubStr = t.subtract({ days: '3' as any });
		const tMinusStr = t.minus({ dd: '3' as any });
		expect(tSubStr.iso).toBe('2026-08-22T10:00:00Z');
		expect(tMinusStr.iso).toBe('2026-08-22T10:00:00Z');
	});
});
