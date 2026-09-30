import { Reactive } from '#library/reactive.class.js';

describe('common/runtime/reactive.class', () => {
	it('identifies as a Reactive instance and has correct StringTag', () => {
		const stream = new Reactive<number>({ tag: 'TestStream' });
		expect(stream.isReactive).toBe(true);
		expect(Object.prototype.toString.call(stream)).toBe('[object Reactive]');
		expect(stream.state.active).toBe(true);
		expect(stream.state.completed).toBe(false);
		expect(stream.state.tag).toBe('TestStream');
	});

	it('supports directional .push(val) and await .pull() consumption', async () => {
		const stream = new Reactive<string>();

		// Producer pushes in background
		queueMicrotask(() => {
			stream.push('first');
			stream.push('second');
		});

		const res1 = await stream.pull();
		const res2 = await stream.pull();

		expect(res1).toBe('first');
		expect(res2).toBe('second');
		expect(stream.state.emitted).toBe(2);
	});

	it('supports consumer .push(fn) and .on(data) push listeners', () => {
		const stream = new Reactive<number>();
		const received: number[] = [];

		stream.push((val) => {
			received.push(val * 10);
		});

		stream.emit(1);
		stream.emit(2);
		stream.emit(3);

		expect(received).toEqual([10, 20, 30]);
	});

	it('allows early termination from push listener stop callback', () => {
		const stream = new Reactive<number>();
		const received: number[] = [];

		stream.on('data', (val, stop) => {
			received.push(val);
			if (val === 2) stop();
		});

		stream.emit(1);
		stream.emit(2);
		stream.emit(3);

		expect(received).toEqual([1, 2]);
		expect(stream.state.active).toBe(false);
		expect(stream.state.completed).toBe(true);
	});

	it('supports for await consumption with native async iterable protocol', async () => {
		const stream = new Reactive<number>();
		const collected: number[] = [];

		queueMicrotask(() => {
			stream.push(100);
			stream.push(200);
			stream.push(300);
			stream.complete();
		});

		for await (const val of stream) {
			collected.push(val);
		}

		expect(collected).toEqual([100, 200, 300]);
		expect(stream.state.completed).toBe(true);
	});

	it('buffers values when produced before pull consumers arrive', async () => {
		const stream = new Reactive<string>({ bufferSize: 5 });

		stream.push('buffered-1');
		stream.push('buffered-2');

		expect(stream.state.buffered).toBe(2);

		const first = await stream.pull();
		const second = await stream.pull();

		expect(first).toBe('buffered-1');
		expect(second).toBe('buffered-2');
		expect(stream.state.buffered).toBe(0);
	});

	it('flushes buffered items when a push listener registers later', () => {
		const stream = new Reactive<string>();
		stream.push('early-1');
		stream.push('early-2');

		const received: string[] = [];
		stream.on('data', (item) => {
			received.push(item);
		});

		expect(received).toEqual(['early-1', 'early-2']);
	});

	it('handles .once() and .off() listener lifecycle', () => {
		const stream = new Reactive<number>();
		const onceValues: number[] = [];
		const offValues: number[] = [];

		const offFn = (v: number) => offValues.push(v);

		stream.once('data', (v) => onceValues.push(v));
		stream.on('data', offFn);

		stream.emit(1);
		stream.off('data', offFn);
		stream.emit(2);

		expect(onceValues).toEqual([1]);
		expect(offValues).toEqual([1]);
	});

	it('handles complete with terminal value and notifies end listeners', async () => {
		const stream = new Reactive<string>();
		let endFired = false;

		stream.on('end', () => {
			endFired = true;
		});

		queueMicrotask(() => {
			stream.push('hello');
			stream.complete('goodbye');
		});

		const first = await stream.pull();
		const term = await stream.pull();
		const after = await stream.pull();

		expect(first).toBe('hello');
		expect(term).toBe('goodbye');
		expect(after).toBeUndefined();
		expect(endFired).toBe(true);
	});

	it('supports explicit resource management with Symbol.dispose and Symbol.asyncDispose', async () => {
		const stream = new Reactive<number>();
		expect(stream.state.active).toBe(true);

		stream[Symbol.dispose]();
		expect(stream.state.active).toBe(false);
		expect(stream.state.completed).toBe(true);

		const asyncStream = new Reactive<number>();
		await asyncStream[Symbol.asyncDispose]();
		expect(asyncStream.state.completed).toBe(true);
	});

	it('handles error propagation and error listeners', async () => {
		const stream = new Reactive<number>({ catch: true });
		let caughtError: Error | undefined;

		stream.on('error', (err) => {
			caughtError = err;
		});

		const testError = new Error('Test Reactive Failure');
		stream.error(testError);

		expect(caughtError).toBe(testError);
		const pullAfterError = await stream.pull();
		expect(pullAfterError).toBeUndefined();
	});

	it('routes error to pending pull consumers without logging unhandled error', async () => {
		const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		try {
			const stream = new Reactive<number>(); // catch is false
			const pullPromise = stream.pull(); // pending waiter

			const testError = new Error('Consumer pull error');
			stream.error(testError);

			await expect(pullPromise).rejects.toThrow('Consumer pull error');
			// Because the error was handled by rejecting the pending pull waiter, console.error should not be called
			expect(errSpy).not.toHaveBeenCalled();
		} finally {
			errSpy.mockRestore();
		}
	});

	it('logs unhandled error when neither error listeners nor pull waiters exist', async () => {
		const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		try {
			const stream = new Reactive<number>();
			const testError = new Error('Unhandled stream error');
			stream.error(testError);

			expect(errSpy).toHaveBeenCalledWith('Unhandled Reactive error:', testError);
		} finally {
			errSpy.mockRestore();
		}
	});

	it('supports Reactive.from with Array, Promise, and AsyncIterable', async () => {
		// Array
		const fromArray = Reactive.from(['a', 'b', 'c']);
		const arrayCollected: string[] = [];
		for await (const val of fromArray) {
			arrayCollected.push(val);
		}
		expect(arrayCollected).toEqual(['a', 'b', 'c']);

		// Promise
		const fromPromise = Reactive.from(Promise.resolve(999));
		const promiseVal = await fromPromise.pull();
		expect(promiseVal).toBe(999);

		// AsyncIterable
		async function* generateNumbers() {
			yield 1;
			yield 2;
			yield 3;
		}
		const fromGen = Reactive.from(generateNumbers());
		const genCollected: number[] = [];
		for await (const n of fromGen) {
			genCollected.push(n);
		}
		expect(genCollected).toEqual([1, 2, 3]);
	});
});
