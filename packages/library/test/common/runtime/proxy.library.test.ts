import { inspect } from 'node:util';
import { sym } from '#library/symbol.library.js';
import { Enum } from '#library/enumerate.library.js';
import { defineLazy } from '#library/primitive.library.js';
import { delegate, delegator, proxify, revocable, secure, type Proxified } from '#library/proxy.library.js';

describe('proxy immutability modes', () => {
	it('mutable mode preserves native failures for locked properties and non-extensible targets', () => {
		const target = Object.preventExtensions(Object.defineProperty({}, 'locked', { value: 1 }));
		const proxy = proxify(target, 'mutable');
		expect(Reflect.set(proxy, 'locked', 2)).toBe(false);
		expect(Reflect.deleteProperty(proxy, 'locked')).toBe(false);
		expect(Reflect.defineProperty(proxy, 'newKey', { value: 3 })).toBe(false);
		expect(Reflect.get(proxy, 'locked')).toBe(1);
		expect(Object.hasOwn(target, 'newKey')).toBe(false);
	});
	it.each(['frozen', 'readonly'] as const)('blocks mutation through a %s proxy', mode => {
		const target = { value: 1 };
		const proxy = proxify(target, mode);
		expect(() => Reflect.set(proxy, 'value', 2)).toThrow(TypeError);
		expect(() => Reflect.deleteProperty(proxy, 'value')).toThrow(TypeError);
		expect(() => Object.defineProperty(proxy, 'added', { value: 3 })).toThrow(TypeError);
		expect(target.value).toBe(1);
		expect(Object.hasOwn(target, 'added')).toBe(false);
	});

	it('defaults to freezing the target and its nested objects', () => {
		const target = { nested: { value: 1 } };
		proxify(target);
		expect(Object.isFrozen(target)).toBe(true);
		expect(Object.isFrozen(target.nested)).toBe(true);
	});

	it('readonly mode observes direct target changes without freezing nested values', () => {
		const target = { value: 1, nested: { value: 2 } };
		const proxy = proxify(target, 'readonly');
		target.value = 3;
		target.nested.value = 4;
		expect(proxy.value).toBe(3);
		expect(proxy.nested.value).toBe(4);
		expect(Object.isFrozen(target)).toBe(false);
		expect(Object.isFrozen(target.nested)).toBe(false);
	});

	it('mutable mode forwards assignment, definition and deletion to the target', () => {
		const target = { value: 1 };
		const proxy = proxify(target, 'mutable');
		proxy.value = 2;
		expect(target.value).toBe(2);
		Object.defineProperty(proxy, 'added', { value: 3, configurable: true });
		expect(Reflect.get(target, 'added')).toBe(3);
		expect(Reflect.deleteProperty(proxy, 'added')).toBe(true);
		expect(Object.hasOwn(target, 'added')).toBe(false);
	});

	it('honors the skip set in frozen mode while freezing other descendants', () => {
		const skipped = { value: 1 };
		const target = { skipped, nested: { value: 2 } };
		proxify(target, 'frozen', new WeakSet([skipped]));
		expect(Object.isFrozen(target)).toBe(true);
		expect(Object.isFrozen(target.nested)).toBe(true);
		expect(Object.isFrozen(skipped)).toBe(false);
		skipped.value = 3;
		expect(target.skipped.value).toBe(3);
	});

	it.each(['readonly', 'frozen', 'mutable'] as const)('delegates missing keys in %s mode', mode => {
		const target = { present: 1, nested: { value: 2 } };
		const resolve = vi.fn(() => 42);
		const proxy = delegate(target, resolve, mode);
		expect(proxy.present).toBe(1);
		expect(resolve).not.toHaveBeenCalled();
		expect(Reflect.get(proxy, 'missing')).toBe(42);
		expect(resolve).toHaveBeenCalledWith('missing', target);
		expect(Object.isFrozen(target)).toBe(mode === 'frozen');
		expect(Object.isFrozen(target.nested)).toBe(mode === 'frozen');
		if (mode === 'mutable') {
			expect(Reflect.set(proxy, 'present', 9)).toBe(true);
			expect(target.present).toBe(9);
		} else
			expect(() => Reflect.set(proxy, 'present', 9)).toThrow(TypeError);
	});

	it('defaults delegate to readonly without freezing its target', () => {
		const target = { value: 1 };
		const proxy = delegate(target, () => undefined);
		expect(() => Reflect.set(proxy, 'value', 2)).toThrow(TypeError);
		target.value = 3;
		expect(proxy.value).toBe(3);
	});
});

describe('proxy method binding', () => {
	test('returns a stable bound wrapper for repeated method access', () => {
		const target = {
			value: 7,
			getValue() { return this.value; }
		};

		const proxy = proxify(target, 'readonly');
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

		const proxy = proxify(target, 'readonly') as typeof target & { fixed: typeof fixed };

		expect(proxy.fixed).toBe(fixed);
		expect(proxy.fixed()).toBe(11);
	});

	test('does not share bound wrappers across different proxied targets', () => {
		const shared = function(this: { value: number }) { return this.value; };
		const a = { value: 3, getValue: shared };
		const b = { value: 9, getValue: shared };

		const proxyA = proxify(a, 'readonly');
		const proxyB = proxify(b, 'readonly');

		expect(proxyA.getValue).not.toBe(proxyB.getValue);
		expect(proxyA.getValue()).toBe(3);
		expect(proxyB.getValue()).toBe(9);
	});

	test('preserves original constructor identity without binding', () => {
		class CustomTarget {
			value = 42;
			getValue() { return this.value; }
		}

		const instance = new CustomTarget();
		const proxy = proxify(instance, 'mutable');

		expect(proxy.constructor).toBe(CustomTarget);
		expect(proxy.constructor === CustomTarget).toBe(true);

		const plain = { a: 1 };
		const plainProxy = proxify(plain, 'mutable');
		expect(plainProxy.constructor).toBe(Object);
		expect(plainProxy.constructor === Object).toBe(true);
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

describe('secure serialization', () => {
	test('de-proxies an array into an array via toJSON', () => {
		const arr = ['alpha', 'beta', 'gamma'];
		const secured = secure(arr) as Proxified<string[]>;

		expect(secured.toJSON()).toEqual(['alpha', 'beta', 'gamma']);
		expect(secured.toJSON()).not.toBe(secured);
		expect(Array.isArray(secured.toJSON())).toBe(true);
		expect(JSON.stringify(secured)).toBe('["alpha","beta","gamma"]');
	});

	test('de-proxies an object into an object via toJSON', () => {
		const obj = { a: 1, b: 2 };
		const secured = secure(obj) as Proxified<typeof obj>;

		expect(secured.toJSON()).toEqual({ a: 1, b: 2 });
		expect(secured.toJSON()).not.toBe(secured);
		expect(JSON.stringify(secured)).toBe('{"a":1,"b":2}');
	});

	test('formats proxify and enumify objects cleanly via util.inspect without Proxy wrapper', () => {
		const obj = proxify({ a: 1 }, 'frozen');
		const objOut = inspect(obj);
		expect(objOut).not.toContain('Proxy');
		expect(objOut).toContain('a: 1');

		const list = proxify(['alpha', 'beta'], 'frozen');
		const listOut = inspect(list);
		expect(listOut).not.toContain('Proxy');
		expect(listOut).toContain('alpha');

		const e = Enum.from({ A: 1, B: 2 });
		const enumOut = inspect(e);
		expect(enumOut).not.toBe('{}');
		expect(enumOut).toContain('A: 1');
		expect(enumOut).toContain('B: 2');

		const virt = delegator(['a'], () => 1);
		expect(inspect(virt)).toBe('{ a: 1 }');
	});

	test('retains native diagnostic inspection for Error and Map instances', () => {
		const errOut = inspect(proxify(new Error('failed'), 'frozen'));
		expect(errOut).toContain('Error: failed');

		const mapOut = inspect(proxify(new Map([['k', 'v']]), 'frozen'));
		expect(mapOut).toContain('Map(1)');
		expect(mapOut).toContain("'k' => 'v'");
	});

	test('isolates virtual sym.$Inspect across multiple proxies sharing one target', () => {
		const shared: Record<string, string> = {};
		proxify(shared, 'readonly');
		const first = revocable(shared, { frozen: true, keys: ['a'], onGet: (k) => `${String(k)}-1` });
		const second = revocable(shared, { frozen: true, keys: ['b'], onGet: (k) => `${String(k)}-2` });

		Object.freeze(shared);

		expect((first.proxy as any)[sym.$Inspect]()).toEqual({ a: 'a-1' });
		expect((second.proxy as any)[sym.$Inspect]()).toEqual({ b: 'b-2' });
		expect(inspect(first.proxy)).toContain("a: 'a-1'");
		expect(inspect(second.proxy)).toContain("b: 'b-2'");

		const combinedParent = proxify({ x: first.proxy, y: second.proxy }, 'readonly');
		const combinedInspect = inspect(combinedParent);
		expect(combinedInspect).toContain("a: 'a-1'");
		expect(combinedInspect).toContain("b: 'b-2'");

		first.revoke();
		expect((second.proxy as any)[sym.$Inspect]()).toEqual({ b: 'b-2' });
		expect(inspect(second.proxy)).toContain("b: 'b-2'");
		second.revoke();

		class PlainModel {
			hidden = 99;
		}
		const modelRev = revocable(new PlainModel(), { frozen: true, keys: ['a'], onGet: () => 1 });
		expect(inspect(modelRev.proxy)).toBe('{ a: 1 }');
		modelRev.revoke();
	});

	test('does not invoke getters during default inspection while preserving toJSON evaluation', () => {
		const obj = proxify({
			a: 1,
			get boom() {
				throw new Error('unavailable');
			}
		}, 'readonly');

		const out = inspect(obj);
		expect(out).toContain('a: 1');
		expect(out).toContain('boom: [Getter]');
		expect(() => (obj as any).toJSON()).toThrow('unavailable');

		const arr: unknown[] = [1];
		Object.defineProperty(arr, 1, {
			get() {
				throw new Error('array unavailable');
			},
			enumerable: true,
			configurable: true,
		});
		const pArr = proxify(arr, 'readonly');
		expect(inspect(pArr)).toContain('[Getter]');

		const ctorObj = {
			get constructor(): any {
				throw new Error('unexpected constructor read');
			}
		};
		expect(() => inspect(proxify(ctorObj, 'readonly'))).not.toThrow();

		const circObj: Record<string, any> = { a: 1 };
		circObj.self = circObj;
		const circObjOut = inspect(proxify(circObj, 'readonly'), { depth: null });
		expect(circObjOut).toContain('[Circular');

		const circArr: unknown[] = [1];
		circArr.push(circArr);
		const circArrOut = inspect(proxify(circArr, 'readonly'), { depth: null });
		expect(circArrOut).toContain('[Circular');

		const child = delegator(['answer'], () => 42);
		expect(inspect(proxify({ child }, 'readonly'))).toContain('answer: 42');

		const redacted = {
			token: 'secret-xyz',
			[sym.$Inspect]() {
				return '[redacted]';
			}
		};
		const redactedOut = inspect(proxify({ nested: redacted }, 'readonly'));
		expect(redactedOut).toContain('[redacted]');
		expect(redactedOut).not.toContain('secret-xyz');

		let deep: Record<string, any> = { leaf: true };
		for (let i = 0; i < 20_000; i++) {
			deep = { next: deep };
		}
		expect(() => inspect(proxify(deep, 'readonly'), { depth: 0 })).not.toThrow();

		const nestedArrOut = inspect(proxify({ child: proxify([1], 'readonly') }, 'readonly'));
		expect(nestedArrOut).toContain('[ 1 ]');

		const keyedSecret = revocable({
			token: 'secret-xyz',
			[sym.$Inspect]() {
				return '[redacted]';
			}
		}, { frozen: true, keys: ['token'] });
		const nestedKeyedSecretOut = inspect(proxify({ nested: keyedSecret.proxy }, 'readonly'));
		expect(nestedKeyedSecretOut).toContain('[redacted]');
		expect(nestedKeyedSecretOut).not.toContain('secret-xyz');
		keyedSecret.revoke();

		const selfTarget: Record<string, any> = {};
		const selfProxy = proxify(selfTarget, 'readonly');
		selfTarget.self = selfProxy;
		expect(inspect(selfProxy, { depth: null })).toContain('[Circular');
		expect(() => (selfProxy as any)[sym.$Inspect](null)).not.toThrow();

		const nestedRev = revocable({ a: 1 }, { frozen: true });
		const parentOfRevoked = proxify({ child: nestedRev.proxy }, 'readonly');
		nestedRev.revoke();
		expect(() => inspect(parentOfRevoked)).not.toThrow();

		// Depth budget applies across chains of keyed proxies
		let leafInspectCalls = 0;
		const keyedLeaf = revocable({}, {
			frozen: true,
			keys: ['leaf'],
			onGet: (k) => {
				if (k === 'leaf') leafInspectCalls++;
				return 'end';
			},
		});
		const keyedMid = revocable({}, {
			frozen: true,
			keys: ['next'],
			onGet: (k) => (k === 'next' ? keyedLeaf.proxy : undefined),
		});
		const keyedParent = proxify({ child: keyedMid.proxy }, 'readonly');
		const shallowSnap = (keyedParent as any)[sym.$Inspect](1);
		expect(shallowSnap.child.next).toBe(keyedLeaf.proxy);
		expect(leafInspectCalls).toBe(0);
		keyedLeaf.revoke();
		keyedMid.revoke();

		// Non-enumerable own properties suppress inherited enumerable snapshot properties
		const baseProxy = proxify({ status: 'old', keep: 1 }, 'readonly');
		const shadowedChild = Object.create(baseProxy);
		Object.defineProperty(shadowedChild, 'status', {
			value: 'new',
			enumerable: false,
			configurable: true,
		});
		const proxiedChild = proxify(shadowedChild, 'readonly');
		const childSnap = (proxiedChild as any)[sym.$Inspect]();
		expect(childSnap).toEqual({ keep: 1 });
		expect('status' in childSnap).toBe(false);

		// Live prototype mutation adding a custom [sym.$Inspect] hook is honored
		const unlockedTarget = { token: 'secret-xyz' };
		const unlockedProxy = proxify(unlockedTarget, 'readonly');
		Object.setPrototypeOf(unlockedTarget, {
			[sym.$Inspect]() {
				return '[redacted-live]';
			},
		});
		expect(inspect(unlockedProxy)).toContain('[redacted-live]');
		expect(inspect(unlockedProxy)).not.toContain('secret-xyz');

		// Root circular delegator resolves [Circular] without stack overflow
		let selfDelegator: any;
		selfDelegator = delegator(['self'], () => selfDelegator);
		const delegatorInspect = inspect(selfDelegator, { depth: null });
		expect(delegatorInspect).toContain('[Circular');

		// Keyed inspection preserves '__proto__' as an own property without mutating prototype
		const protoDelegator = revocable(Object.create(null), {
			frozen: true,
			keys: ['__proto__'],
			onGet: () => ({ injected: true }),
		});
		const protoSnap = (protoDelegator.proxy as any)[sym.$Inspect]();
		expect(Object.hasOwn(protoSnap, '__proto__')).toBe(true);
		expect(Object.getPrototypeOf(protoSnap)).toBe(Object.prototype);
		expect(protoSnap['__proto__']).toEqual({ injected: true });
		protoDelegator.revoke();

		// Nested objects with a prototype getter must not have getters invoked during inspection
		let protoGetterCalls = 0;
		const childWithProtoGetter = {
			get prototype() {
				protoGetterCalls++;
				return {};
			},
		};
		inspect(proxify({ child: childWithProtoGetter }, 'readonly'));
		expect(protoGetterCalls).toBe(0);

		// Proxying a child of a proxified base still honors the base's inherited custom hook
		const baseWithHook = Object.create({
			[sym.$Inspect]() {
				return '[redacted-base]';
			},
		});
		const proxifiedBase = proxify(baseWithHook, 'readonly');
		const derivedChild = Object.create(proxifiedBase);
		derivedChild.token = 'secret-child';
		const proxifiedDerived = proxify(derivedChild, 'readonly');
		expect(inspect(proxifiedDerived)).toContain('[redacted-base]');
		expect(inspect(proxifiedDerived)).not.toContain('secret-child');
	});

	test('preserves inherited class prototype custom inspection hooks', () => {
		class CustomModel {
			#secret = 42;
			[sym.$Inspect]() {
				return `CustomModel<${this.#secret}>`;
			}
		}

		const modelProxy = proxify(new CustomModel(), 'frozen');
		expect(inspect(modelProxy)).toBe('CustomModel<42>');
		expect((modelProxy as any)[sym.$Inspect]()).toBe('CustomModel<42>');

		class CustomList extends Array<number> {
			[sym.$Inspect]() {
				return 'L';
			}
		}
		const listTarget = new CustomList(1, 2);
		const firstListProxy = proxify(listTarget, 'frozen');
		const secondListProxy = proxify(listTarget, 'frozen');
		expect(inspect(firstListProxy)).toBe('L');
		expect(inspect(secondListProxy)).toBe('L');
		expect((secondListProxy as any)[sym.$Inspect]()).toBe('L');

		const throwingTag = {
			ok: true,
			get [Symbol.toStringTag](): string {
				throw new Error('toStringTag boom');
			}
		};
		expect(() => proxify(throwingTag, 'mutable')).not.toThrow();
	});

	test('allows defineLazy reads through a readonly proxy and locks nested objects in delegate frozen mode', () => {
		const lazyTarget: { answer?: number } = {};
		defineLazy(lazyTarget, 'answer', () => 42);
		const roProxy = proxify(lazyTarget, 'readonly');
		expect(roProxy.answer).toBe(42);
		expect(lazyTarget.answer).toBe(42);

		const nestedDelegate = delegate({ nested: { value: 1 } }, () => undefined, 'frozen');
		expect(() => { (nestedDelegate.nested as any).value = 2; }).toThrow(TypeError);
	});

	test('throws TypeError for unsupported runtime proxy modes in proxify and delegate', () => {
		expect(() => proxify({}, false as any)).toThrow(TypeError);
		expect(() => proxify({}, 'invalid' as any)).toThrow(TypeError);
		expect(() => delegate({}, () => undefined, true as any)).toThrow(TypeError);
		expect(() => delegate({}, () => undefined, 'invalid' as any)).toThrow(TypeError);
	});

	test('preserves sym.$Inspect hooks on function-valued immediate prototypes', () => {
		const fnProto = Object.assign(function () {}, {
			[sym.$Inspect]: () => '[redacted-fn-proto]',
		});
		const target = Object.assign(Object.create(fnProto), { secret: '123' });
		const proxied = proxify(target, 'readonly');
		expect(inspect(proxied)).toBe('[redacted-fn-proto]');
	});
});
