import { Tempo } from '#tempo';
import { defineProperties, defineProperty } from '#tempo/plugin/plugin.util.js';
import { TempoError } from '#tempo/support/support.error.js';
import { $Internal } from '#tempo/support';

describe('defineProperties & defineProperty', () => {
	it('defines custom getters on Tempo instances via a sandbox', () => {
		const S = Tempo.derive({});
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
		const S = Tempo.derive({});
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

	it('does not cache values on prototype when getters are evaluated on proto directly', () => {
		const S = Tempo.derive({});
		let fnCalls = 0;
		let descCalls = 0;

		S.use(defineProperties({
			fnGetter: () => ++fnCalls,
			descGetter: {
				get: () => ++descCalls,
				memo: true,
			},
		}));

		// Access on prototype directly
		const proto = S.prototype as any;
		expect(proto.fnGetter).toBe(1);
		expect(proto.fnGetter).toBe(1);
		expect(proto.descGetter).toBe(1);
		expect(proto.descGetter).toBe(1);

		// Proto should keep its getter and not have an own value property
		const fnDesc = Object.getOwnPropertyDescriptor(proto, 'fnGetter');
		expect(typeof fnDesc?.get).toBe('function');
		expect(fnDesc?.value).toBeUndefined();

		const descDesc = Object.getOwnPropertyDescriptor(proto, 'descGetter');
		expect(typeof descDesc?.get).toBe('function');
		expect(descDesc?.value).toBeUndefined();

		// Real instances compute independently and memoize
		const t = new S();
		expect((t as any).fnGetter).toBe(2);
		expect((t as any).fnGetter).toBe(2);
		expect((t as any).descGetter).toBe(2);
		expect((t as any).descGetter).toBe(2);

		// Extensible instances receive own property
		const plain = Object.create(proto);
		expect(plain.fnGetter).toBe(3);
		expect(Object.getOwnPropertyDescriptor(plain, 'fnGetter')?.value).toBe(3);
		expect(plain.descGetter).toBe(3);
		expect(Object.getOwnPropertyDescriptor(plain, 'descGetter')?.value).toBe(3);
	});

	it('supports unmemoized getters via explicit descriptor', () => {
		const S = Tempo.derive({});
		let counter = 0;
		let receivedInstance: any;
		let receivedThis: any;

		S.use(defineProperties({
			volatile: {
				get(this: any, instance: any) {
					receivedThis = this;
					receivedInstance = instance;
					return ++counter;
				},
				memo: false,
			},
		}, 'VolatileProperty'));

		const t = new S();
		expect((t as any).volatile).toBe(1);
		expect(receivedThis).toBe(t);
		expect(receivedInstance).toBe(t);
		expect((t as any).volatile).toBe(2);
		expect((t as any).volatile).toBe(3);
	});

	it('supports defining instance methods via methods shorthand and value descriptor', () => {
		const S = Tempo.derive({});
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
		const S = Tempo.derive({});
		S.use(defineProperty('isWeekend', (t: any) => t.dow >= 6));

		const saturday = new S('2026-10-31');
		const friday = new S('2026-10-30');

		expect(saturday.format('{yyyy}-{mm}-{dd} is weekend: {isWeekend}' as any)).toBe('2026-10-31 is weekend: true');
		expect(friday.format('{yyyy}-{mm}-{dd} is weekend: {isWeekend}' as any)).toBe('2026-10-30 is weekend: false');
	});

	it('throws TempoError on attempt to overwrite core Tempo properties', () => {
		const S = Tempo.derive({});

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
		const S1 = Tempo.derive({});
		const S2 = Tempo.derive({});

		const propPlugin = defineProperty('customVal', () => 42);

		// Raw plugin object/factory passed directly
		S1.use(propPlugin);
		expect(((new S1()) as any).customVal).toBe(42);

		// Factory invocation passed
		S2.use(propPlugin());
		expect(((new S2()) as any).customVal).toBe(42);
	});

	it('throws TempoError on attempt to define setters', () => {
		const S = Tempo.derive({});

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

	it('throws TempoError when defineProperty is called without a definition', () => {
		expect(() => {
			(defineProperty as any)('propWithoutDef');
		}).toThrow(/Property definition is required when calling defineProperty/);
	});

	it('allows multiple unnamed defineProperties bundles without name collision', () => {
		const S = Tempo.derive({});
		S.use(defineProperties({
			foo: () => 'valFoo',
		}));
		S.use(defineProperties({
			bar: () => 'valBar',
		}));

		const t = new S('2026-10-31');
		expect((t as any).foo).toBe('valFoo');
		expect((t as any).bar).toBe('valBar');
	});

	it('skips reinstall for named properties plugins to avoid core property redefinition errors', () => {
		const S = Tempo.derive({});
		const namedPlugin = defineProperties({
			baz: () => 'valBaz',
		}, 'BazExtension');

		S.use(namedPlugin);
		// Reinstalling the exact same plugin or invoking with options should not throw
		expect(() => {
			S.use(namedPlugin, { someOpt: true });
		}).not.toThrow();

		const t = new S('2026-10-31');
		expect((t as any).baz).toBe('valBaz');
	});

	it('allows reinstalling property bundles on subclasses or same class when keys are owned by the plugin', () => {
		const S = Tempo.derive({});
		const bundle = defineProperties({
			ownedProp: () => 'ownedVal',
			methods: {
				ownedMethod() { return 'methodVal'; },
			},
		});

		S.use(bundle);
		// Re-invoking install of the same bundle instance does not throw
		expect(() => {
			(bundle as any).install(S);
		}).not.toThrow();

		// Subclass inheriting prototype
		const Sub = Tempo.derive({});
		Object.setPrototypeOf(Sub.prototype, S.prototype);
		expect(() => {
			(bundle as any).install(Sub);
		}).not.toThrow();
		expect(Object.prototype.hasOwnProperty.call(Sub.prototype, 'ownedProp')).toBe(true);
		expect(Object.prototype.hasOwnProperty.call(Sub.prototype, 'ownedMethod')).toBe(true);

		// Sibling sandbox defining its own property with the same name throws
		const Sibling = Tempo.derive({});
		Object.defineProperty(Sibling.prototype, 'ownedProp', { value: 'siblingVal', configurable: true });
		expect(() => {
			(bundle as any).install(Sibling);
		}).toThrow(/Cannot overwrite existing core property/);
	});

	it('rejects null getter during first-pass validation', () => {
		const S = Tempo.derive({});
		expect(() => {
			S.use(defineProperties({ badProp: { get: null as any } }));
		}).toThrow(/Invalid property definition/);
	});

	it('rejects descriptor with get and writable or value', () => {
		const S = Tempo.derive({});
		expect(() => {
			S.use(defineProperties({ badProp: { get: () => 1, writable: false } as any }));
		}).toThrow(/cannot define 'get' with 'value' or 'writable'/);
	});

	it('assigns unique distinct names to unnamed properties plugins', () => {
		const p1 = defineProperties({ a: () => 1 });
		const p2 = defineProperties({ b: () => 2 });

		expect((p1 as any).name).toMatch(/^PropertiesPlugin#\d+$/);
		expect((p2 as any).name).toMatch(/^PropertiesPlugin#\d+$/);
		expect((p1 as any).name).not.toBe((p2 as any).name);
	});

	it('rejects per-property method dictionaries passed outside of methods block', () => {
		const S = Tempo.derive({});
		expect(() => {
			S.use(defineProperties({
				badMethodBundle: {
					double() { },
				} as any,
			}));
		}).toThrow(/Invalid property definition for 'badMethodBundle'/);
	});

	it('validates all entries atomically in a first pass so failed bundles leave prototype clean', () => {
		const S = Tempo.derive({});
		expect(() => {
			S.use(defineProperties({
				validFirst: () => 'should-not-exist',
				invalidSecond: { invalidDesc: true } as any,
			}));
		}).toThrow(/Invalid property definition for 'invalidSecond'/);

		const t = new S();
		expect((t as any).validFirst).toBeUndefined();
	});

	it('releases installed mark when a named properties bundle throws, allowing a corrected retry to install', () => {
		const S = Tempo.derive({});
		const faultyBundle = defineProperties({
			goodProp: () => 'first',
			badProp: { notAProp: true } as any,
		}, 'RetryBundle');

		expect(() => {
			S.use(faultyBundle);
		}).toThrow(/Invalid property definition for 'badProp'/);

		// Corrected retry with the same bundle name should install successfully
		const correctedBundle = defineProperties({
			goodProp: () => 'repaired',
		}, 'RetryBundle');

		expect(() => {
			S.use(correctedBundle);
		}).not.toThrow();

		const t = new S();
		expect((t as any).goodProp).toBe('repaired');
	});

	it('rejects non-callable method definitions under methods key', () => {
		const S = Tempo.derive({});
		expect(() => {
			S.use(defineProperties({
				methods: {
					invalidMethod: 123 as any,
				},
			}));
		}).toThrow(/Invalid method definition for 'invalidMethod'\. Expected a function\./);
	});

	it('validates get is callable in first pass so invalid descriptor leaves prototype clean', () => {
		const S = Tempo.derive({});
		expect(() => {
			S.use(defineProperties({
				validFirst: () => 'val',
				badGetDesc: { get: 42 } as any,
			}));
		}).toThrow(/Invalid property definition for 'badGetDesc'/);

		const t = new S();
		expect((t as any).validFirst).toBeUndefined();
	});

	it('rejects duplicate property keys across methods and top-level definitions', () => {
		const S = Tempo.derive({});
		expect(() => {
			S.use(defineProperties({
				collision: () => 'getter',
				methods: {
					collision: () => 'method',
				},
			}));
		}).toThrow(/Duplicate property definition 'collision' in defineProperties bundle\./);

		expect(() => {
			S.use(defineProperties({
				methods: {
					duplicateMethod: () => 1,
				},
				duplicateMethod: () => 2,
			}));
		}).toThrow(/Duplicate property definition 'duplicateMethod' in defineProperties bundle\./);
	});

	it('cleans up plugin registry when properties bundle installation throws so hasModule is false', () => {
		const S = Tempo.derive({});
		expect(S.hasModule('FaultyModule')).toBe(false);

		expect(() => {
			S.use(defineProperties({
				badDesc: { get: 'not-a-fn' } as any,
			}, 'FaultyModule'));
		}).toThrow();

		expect(S.hasModule('FaultyModule')).toBe(false);
	});

	it('rejects descriptors defining both get and value during pass 1', () => {
		const S = Tempo.derive({});
		expect(() => {
			S.use(defineProperties({
				validFirst: () => 'valid',
				bothGetAndVal: {
					get: () => 1,
					value: 2,
				} as any,
			}));
		}).toThrow(/Descriptor for 'bothGetAndVal' cannot define 'get' with 'value' or 'writable'\./);

		const t = new S();
		expect((t as any).validFirst).toBeUndefined();
	});

	it('rejects descriptors defining both get and writable during pass 1', () => {
		const S = Tempo.derive({});
		expect(() => {
			S.use(defineProperties({
				validFirst: () => 'valid',
				getAndWritable: {
					get: () => 1,
					writable: true,
				} as any,
			}));
		}).toThrow(/Descriptor for 'getAndWritable' cannot define 'get' with 'value' or 'writable'\./);

		const t = new S();
		expect((t as any).validFirst).toBeUndefined();
	});

	it('restores state.config.pluginOptions if properties bundle install throws', () => {
		const S = Tempo.derive({
			pluginOptions: {
				TestPlugin: { existing: 'original' },
			},
		});

		expect(() => {
			S.use(defineProperties({
				badDesc: { get: 123 } as any,
			}, 'TestPlugin'), { existing: 'overwritten' });
		}).toThrow();

		const state = (S as any)[$Internal]();
		expect(state.config.pluginOptions.TestPlugin).toEqual({ existing: 'original' });
	});
});

