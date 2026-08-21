import { evaluate, evaluateAsync, evaluateConfig, evaluateConfigAsync } from '#library/evaluation.library.js';
import { dynamicProxy } from '#library/proxy.library.js';
import { Pledge } from '#library/pledge.class.js';

describe('evaluation.library', () => {
	describe('evaluate()', () => {
		it('should return scalar values as-is', () => {
			expect(evaluate(42)).toBe(42);
			expect(evaluate('UTC')).toBe('UTC');
			expect(evaluate(true)).toBe(true);
			expect(evaluate(null)).toBe(null);
			expect(evaluate(undefined)).toBe(undefined);
			const obj = { a: 1 };
			expect(evaluate(obj)).toBe(obj);
		});

		it('should evaluate synchronous supplier functions', () => {
			expect(evaluate(() => 100)).toBe(100);
			expect(evaluate(() => 'America/New_York')).toBe('America/New_York');

			let count = 0;
			const counter = () => ++count;
			expect(evaluate(counter)).toBe(1);
			expect(evaluate(counter)).toBe(2);
			expect(evaluate(counter)).toBe(3);
		});

		it('should support fallback values and fallback suppliers', () => {
			expect(evaluate(undefined, 'default-tz')).toBe('default-tz');
			expect(evaluate(undefined, () => 'supplier-fallback')).toBe('supplier-fallback');
			expect(evaluate('explicit-value', 'fallback')).toBe('explicit-value');
			expect(evaluate(() => 'supplier-value', 'fallback')).toBe('supplier-value');
		});

		it('should coalesce multiple candidates in sequence and short-circuit', () => {
			let thirdCalled = false;
			const result = evaluate(
				undefined,
				() => undefined,
				() => 'first-defined',
				() => {
					thirdCalled = true;
					return 'should-not-reach';
				}
			);
			expect(result).toBe('first-defined');
			expect(thirdCalled).toBe(false);
		});

		it('should allow exceptions thrown in suppliers to bubble naturally', () => {
			const throwingSupplier = () => {
				throw new Error('Supplier failed');
			};
			expect(() => evaluate(throwingSupplier)).toThrow('Supplier failed');
		});
	});

	describe('evaluateAsync()', () => {
		it('should resolve scalar values', async () => {
			expect(await evaluateAsync(42)).toBe(42);
			expect(await evaluateAsync('secret-token')).toBe('secret-token');
			expect(await evaluateAsync(null)).toBe(null);
		});

		it('should resolve synchronous supplier functions', async () => {
			expect(await evaluateAsync(() => 'sync-value')).toBe('sync-value');
		});

		it('should resolve asynchronous supplier functions', async () => {
			const asyncSupplier = async () => {
				return 'vault-token-xyz';
			};
			expect(await evaluateAsync(asyncSupplier)).toBe('vault-token-xyz');

			const promiseSupplier = () => Promise.resolve(999);
			expect(await evaluateAsync(promiseSupplier)).toBe(999);
		});

		it('should resolve direct Promise values', async () => {
			const directPromise: Promise<string> = Promise.resolve('direct-resolved-value');
			const result: string = (await evaluateAsync<string>(directPromise))!;
			expect(result).toBe('direct-resolved-value');
		});

		it('should support async fallbacks and suppliers', async () => {
			expect(await evaluateAsync(undefined, 'default-key')).toBe('default-key');
			expect(await evaluateAsync(undefined, async () => 'async-default-key')).toBe('async-default-key');
			expect(await evaluateAsync('explicit-key', 'fallback-key')).toBe('explicit-key');
		});

		it('should coalesce multiple async candidates in sequence and short-circuit', async () => {
			let thirdCalled = false;
			const result = await evaluateAsync(
				undefined,
				async () => undefined,
				async () => 'async-first-defined',
				async () => {
					thirdCalled = true;
					return 'should-not-reach';
				}
			);
			expect(result).toBe('async-first-defined');
			expect(thirdCalled).toBe(false);
		});

		it('should allow asynchronous rejections to bubble naturally', async () => {
			const failingAsyncSupplier = async () => {
				throw new Error('Vault timeout');
			};
			await expect(evaluateAsync(failingAsyncSupplier)).rejects.toThrow('Vault timeout');
		});

		it('should attach rejection handlers to direct Promise candidates to prevent unhandled rejections upon short-circuiting', async () => {
			const resolvedPromise = Promise.resolve('early-success');
			const rejectedPromise = Promise.reject(new Error('Unobserved error'));

			const result = await evaluateAsync(resolvedPromise, rejectedPromise);
			expect(result).toBe('early-success');
		});

		it('should await and bubble rejection when an earlier candidate is undefined and a later Promise rejects', async () => {
			const rejectedPromise = Promise.reject(new Error('Observed rejection'));
			await expect(evaluateAsync(undefined, rejectedPromise)).rejects.toThrow('Observed rejection');
		});

		it('should keep supplier functions lazy and not invoke them if an earlier Promise candidate resolves', async () => {
			let supplierInvoked = false;
			const lazySupplier = () => {
				supplierInvoked = true;
				return 'lazy-value';
			};

			const result = await evaluateAsync(Promise.resolve('immediate'), lazySupplier);
			expect(result).toBe('immediate');
			expect(supplierInvoked).toBe(false);
		});

		it('should resolve Pledge candidates and handle Pledge rejection safely', async () => {
			const resolvedPledge = new Pledge<string>();
			resolvedPledge.resolve('pledge-value');
			expect(await evaluateAsync(resolvedPledge)).toBe('pledge-value');

			const earlyPromise = Promise.resolve('early-val');
			const rejectedPledge = new Pledge<string>();
			rejectedPledge.reject(new Error('pledge error'));

			const coalesced = await evaluateAsync(earlyPromise, rejectedPledge);
			expect(coalesced).toBe('early-val');
		});

		it('should safely return earlier scalar when followed by a throwing thenable', async () => {
			const throwingThenable = {
				then() {
					throw new Error('synchronous then error');
				}
			};

			const result = await evaluateAsync('early-scalar', throwingThenable as any);
			expect(result).toBe('early-scalar');
		});

		it('should safely return earlier scalar when followed by a candidate with a throwing then getter', async () => {
			const throwingThenGetter = {};
			Object.defineProperty(throwingThenGetter, 'then', {
				get() {
					throw new Error('throwing then getter');
				}
			});

			const result = await evaluateAsync('early-scalar', throwingThenGetter as any);
			expect(result).toBe('early-scalar');
		});

		it('should call direct thenable then method only once', async () => {
			let thenCalls = 0;
			const thenable = {
				then(onFulfilled: any) {
					thenCalls++;
					onFulfilled('thenable-value');
				}
			};

			const result = await evaluateAsync(thenable as any);
			expect(result).toBe('thenable-value');
			expect(thenCalls).toBe(1);
		});
	});

	describe('evaluateConfig()', () => {
		it('should resolve an object with mixed scalar and functional properties', () => {
			let dynamicTz = 'UTC';
			const config = {
				timeZone: () => dynamicTz,
				locale: 'en-US',
				retries: 3,
			};

			const snapshot1 = evaluateConfig(config);
			expect(snapshot1).toEqual({
				timeZone: 'UTC',
				locale: 'en-US',
				retries: 3,
			});

			dynamicTz = 'Europe/London';
			const snapshot2 = evaluateConfig(config);
			expect(snapshot2).toEqual({
				timeZone: 'Europe/London',
				locale: 'en-US',
				retries: 3,
			});
		});

		it('should handle nullish or primitive inputs gracefully', () => {
			expect(evaluateConfig(null as any)).toBe(null);
			expect(evaluateConfig(undefined as any)).toBe(undefined);
		});
	});

	describe('evaluateConfigAsync()', () => {
		it('should resolve an object with mixed async functions and scalars', async () => {
			const config = {
				key: async () => 'async-api-key',
				url: () => 'https://api.openai.com/v1',
				model: 'gpt-4o',
			};

			const resolved = await evaluateConfigAsync(config);
			expect(resolved).toEqual({
				key: 'async-api-key',
				url: 'https://api.openai.com/v1',
				model: 'gpt-4o',
			});
		});

		it('should reject if any async supplier in the object rejects', async () => {
			const config = {
				key: async () => {
					throw new Error('IAM auth failed');
				},
				url: 'https://api.openai.com/v1',
			};

			await expect(evaluateConfigAsync(config)).rejects.toThrow('IAM auth failed');
		});
	});

	describe('dynamicProxy()', () => {
		it('should dynamically evaluate functional properties on every read', () => {
			let currentTz = 'UTC';
			let activeUser = 'Alice';

			const rawConfig = {
				timeZone: () => currentTz,
				user: () => activeUser,
				staticFlag: true,
			};

			const proxy = dynamicProxy(rawConfig);

			expect(proxy.timeZone).toBe('UTC');
			expect(proxy.user).toBe('Alice');
			expect(proxy.staticFlag).toBe(true);

			currentTz = 'Asia/Tokyo';
			activeUser = 'Bob';

			expect(proxy.timeZone).toBe('Asia/Tokyo');
			expect(proxy.user).toBe('Bob');
		});

		it('should reflect keys and in operator', () => {
			const proxy = dynamicProxy({
				a: () => 1,
				b: 2,
			});

			expect('a' in proxy).toBe(true);
			expect('b' in proxy).toBe(true);
			expect('c' in proxy).toBe(false);
			expect(Object.keys(proxy)).toEqual(['a', 'b']);
		});

		it('should preserve Proxy invariants for non-configurable and symbol properties', () => {
			const symKey = Symbol('customSymbol');
			const target = {
				regular: () => 'computed',
				[symKey]: () => 'symbol-func',
				frozenProp: undefined as any,
			};

			Object.defineProperty(target, 'frozenProp', {
				value: () => 'frozen-supplier',
				writable: false,
				configurable: false,
			});

			const proxy = dynamicProxy(target);

			expect(proxy.regular).toBe('computed');
			expect(typeof proxy[symKey]).toBe('function');
			expect(typeof proxy.frozenProp).toBe('function');
			expect(proxy.frozenProp()).toBe('frozen-supplier');

			const desc = Object.getOwnPropertyDescriptor(proxy, 'frozenProp');
			expect(desc?.configurable).toBe(false);
			expect(desc?.writable).toBe(false);
		});
	});
});
