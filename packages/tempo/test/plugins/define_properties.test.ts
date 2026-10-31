import { Tempo } from '#tempo';
import { defineProperties, defineProperty } from '#tempo/plugin/plugin.util.js';
import { TempoError } from '#tempo/support/support.error.js';

describe('defineProperties & defineProperty', () => {
	it('defines custom getters on Tempo instances via a sandbox', () => {
		const S = Tempo.create({});
		S.use(defineProperties({
			isWeekend: (t: any) => t.dow >= 6,
			quarter: (t: any) => Math.ceil(t.mm / 3),
		}, 'DateExtensions'));

		const saturday = new S('2026-10-31');
		const friday = new S('2026-10-30');

		expect((saturday as any).isWeekend).toBe(true);
		expect((saturday as any).quarter).toBe(4);
		expect((friday as any).isWeekend).toBe(false);
		expect((friday as any).quarter).toBe(4);
	});

	it('auto-memoizes getter computations per instance', () => {
		const S = Tempo.create({});
		let computations = 0;

		S.use(defineProperty('expensive', () => {
			computations++;
			return 'computed-value';
		}));

		const t1 = new S('2026-10-31');
		expect(computations).toBe(0);

		// First access computes
		expect((t1 as any).expensive).toBe('computed-value');
		expect(computations).toBe(1);

		// Subsequent accesses on the same instance reuse cached result
		expect((t1 as any).expensive).toBe('computed-value');
		expect(computations).toBe(1);

		// A different instance computes independently
		const t2 = new S('2026-10-31');
		expect((t2 as any).expensive).toBe('computed-value');
		expect(computations).toBe(2);
		expect((t2 as any).expensive).toBe('computed-value');
		expect(computations).toBe(2);
	});

	it('supports unmemoized getters via explicit descriptor', () => {
		const S = Tempo.create({});
		let counter = 0;

		S.use(defineProperties({
			volatile: {
				get: () => ++counter,
				memo: false,
			},
		}, 'VolatileProperty'));

		const t = new S();
		expect((t as any).volatile).toBe(1);
		expect((t as any).volatile).toBe(2);
		expect((t as any).volatile).toBe(3);
	});

	it('supports defining instance methods via methods shorthand and value descriptor', () => {
		const S = Tempo.create({});
		S.use(defineProperties({
			methods: {
				shiftDays(this: any, days: number) {
					return this.add(`${days} days`);
				},
			},
			doubleDays: {
				value(this: any, days: number) {
					return this.add(`${days * 2} days`);
				},
			},
		}, 'MethodPlugin'));

		const t = new S('2026-10-31');
		const shifted = (t as any).shiftDays(2);
		expect(shifted.format('{yyyy}-{mm}-{dd}')).toBe('2026-11-02');

		const doubled = (t as any).doubleDays(2);
		expect(doubled.format('{yyyy}-{mm}-{dd}')).toBe('2026-11-04');
	});

	it('integrates seamlessly with t.format({token}) even when non-enumerable', () => {
		const S = Tempo.create({});
		S.use(defineProperty('isWeekend', (t: any) => t.dow >= 6));

		const saturday = new S('2026-10-31');
		const friday = new S('2026-10-30');

		expect(saturday.format('{yyyy}-{mm}-{dd} is weekend: {isWeekend}' as any)).toBe('2026-10-31 is weekend: true');
		expect(friday.format('{yyyy}-{mm}-{dd} is weekend: {isWeekend}' as any)).toBe('2026-10-30 is weekend: false');
	});

	it('throws TempoError on attempt to overwrite core Tempo properties', () => {
		const S = Tempo.create({});

		expect(() => {
			S.use(defineProperty('yy', () => 9999));
		}).toThrow(TempoError);

		expect(() => {
			S.use(defineProperty('format', () => 'hijacked'));
		}).toThrow(TempoError);

		expect(() => {
			S.use(defineProperties({
				add: () => { },
			}));
		}).toThrow(/Cannot overwrite existing core property 'add'/);
	});

	it('supports both factory invocation and raw definition in S.use', () => {
		const S1 = Tempo.create({});
		const S2 = Tempo.create({});

		const propPlugin = defineProperty('customVal', () => 42);

		// Raw plugin object/factory passed directly
		S1.use(propPlugin);
		expect(((new S1()) as any).customVal).toBe(42);

		// Factory invocation passed
		S2.use(propPlugin());
		expect(((new S2()) as any).customVal).toBe(42);
	});

	it('throws TempoError on attempt to define setters', () => {
		const S = Tempo.create({});

		expect(() => {
			S.use(defineProperties({
				badProp: {
					get: () => 1,
					set: () => { },
				} as any,
			}));
		}).toThrow(/Setters are not permitted on immutable Tempo instances/);

		expect(() => {
			S.use(defineProperty('onlySetter', {
				set: () => { },
			} as any));
		}).toThrow(/Setters are not permitted on immutable Tempo instances/);
	});
});
