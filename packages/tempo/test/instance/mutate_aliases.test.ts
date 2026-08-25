import { Tempo } from '#tempo/core';
import { MutateModule } from '#tempo/mutate';
import '#tempo/parse';

Tempo.extend(MutateModule);

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
});
