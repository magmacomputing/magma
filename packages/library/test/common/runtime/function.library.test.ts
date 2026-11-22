import { curry, flow, pipe, pipeAsync } from '#library/function.library.js';

describe('Function Composition (pipe, flow, pipeAsync)', () => {
	it('pipe() evaluates left-to-right with strong type inference', () => {
		expect(pipe(42)).toBe(42);

		const result = pipe(
			'  2026-11-23  ',
			s => s.trim(),
			s => s.split('-'),
			parts => Number(parts[0]),
			year => year + 1,
			n => `Year:${n}`,
		);
		expect(result).toBe('Year:2027');
		expectTypeOf(result).toEqualTypeOf<string>();
	});

	it('pipe() interoperates cleanly with curry()', () => {
		const add = curry((a: number, b: number) => a + b);
		const multiply = curry((a: number, b: number) => a * b);

		const total = pipe(5, add(3), multiply(4));
		expect(total).toBe(32);
		expectTypeOf(total).toEqualTypeOf<number>();
	});

	it('pipe() throws TypeError when any stage is not callable', () => {
		expect(() => pipe(1, (() => 2) as any, null as any)).toThrow(TypeError);
	});

	it('flow() composes multi-arg initial function with unary stages', () => {
		const formatSum = flow(
			(a: number, b: number) => a + b,
			n => n * 2,
			n => `total=${n}`,
		);
		expect(formatSum(3, 4)).toBe('total=14');
		expectTypeOf(formatSum).parameters.toEqualTypeOf<[number, number]>();
		expectTypeOf(formatSum).returns.toEqualTypeOf<string>();
	});

	it('flow() preserves receiver `this` on initial function and throws on non-function stages', () => {
		const boundFlow = flow(function (this: { factor: number }, x: number) {
			return x * this.factor;
		}, n => n + 1);
		const ctx = { factor: 10, compute: boundFlow };
		expect(ctx.compute(3)).toBe(31);
		expect(boundFlow.call({ factor: 5 }, 4)).toBe(21);
		// @ts-expect-error receiver `this` is required when calling `boundFlow` unbound
		expect(() => boundFlow(3)).toThrow();

		expect(() => flow(null as any)).toThrow(TypeError);
		expect(() => flow((x: number) => x, 'bad' as any)).toThrow(TypeError);
	});

	it('rejects incompatible stage types at compile time', () => {
		if (false) {
			// @ts-expect-error number cannot be passed to a string-only stage
			pipe(1, (s: string) => s.toUpperCase());
			// @ts-expect-error number output cannot feed a string-only second stage in flow
			flow((n: number) => n, (s: string) => s.toUpperCase());
			// @ts-expect-error number cannot be passed to a string-only async stage
			void pipeAsync(1, async (s: string) => s.toUpperCase());
		}
	});

	it('pipeAsync() awaits initial value and mixed sync/async stages sequentially', async () => {
		const res = await pipeAsync(
			Promise.resolve(10),
			async n => n + 5,
			n => n * 2,
			async n => `v=${n}`,
		);
		expect(res).toBe('v=30');
		expectTypeOf(res).toEqualTypeOf<string>();

		await expect(pipeAsync(Promise.resolve('ok'))).resolves.toBe('ok');
		await expect(pipeAsync(1, 123 as any)).rejects.toThrow(TypeError);
	});
});
