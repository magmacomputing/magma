import { delegator, proxify } from '#library/proxy.library.js';

describe('proxy method binding', () => {
	test('returns a stable bound wrapper for repeated method access', () => {
		const target = {
			value: 7,
			getValue() { return this.value; }
		};

		const proxy = proxify(target, true, false);
		const first = proxy.getValue;
		const second = proxy.getValue;

		expect(first).toBe(second);
		expect(first).not.toBe(target.getValue);
		expect(first()).toBe(7);
	});

	test('preserves original function identity for non-configurable non-writable descriptors', () => {
		const fixed = function(this: { value: number }) { return this.value; };
		const target = { value: 11 } as { value: number; fixed?: typeof fixed };

		Object.defineProperty(target, 'fixed', {
			value: fixed,
			configurable: false,
			writable: false,
			enumerable: true,
		});

		const proxy = proxify(target, true, false) as typeof target & { fixed: typeof fixed };

		expect(proxy.fixed).toBe(fixed);
		expect(proxy.fixed()).toBe(11);
	});

	test('does not share bound wrappers across different proxied targets', () => {
		const shared = function(this: { value: number }) { return this.value; };
		const a = { value: 3, getValue: shared };
		const b = { value: 9, getValue: shared };

		const proxyA = proxify(a, true, false);
		const proxyB = proxify(b, true, false);

		expect(proxyA.getValue).not.toBe(proxyB.getValue);
		expect(proxyA.getValue()).toBe(3);
		expect(proxyB.getValue()).toBe(9);
	});
});

describe('delegator', () => {
	test('does not allow writes to overwrite delegated values', () => {
		const proxy = delegator(['alpha'] as const, key => `${key}-value`) as Record<'alpha', string>;

		expect(proxy.alpha).toBe('alpha-value');
		expect(() => {
			proxy.alpha = 'mutated';
		}).toThrow(/Cannot set property 'alpha' on a frozen object\./);
		expect(proxy.alpha).toBe('alpha-value');
	});
});