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

	// ── M5: Lifecycle & Cancellation Tests ──────────────────────────────────────

	it('returns a disposable Subscription from .on() with .unsubscribe() and [Symbol.dispose]()', () => {
		const stream = new Reactive<number>();
		const received: number[] = [];

		const sub = stream.on('data', (v) => received.push(v));
		expect(sub).toBeInstanceOf(Reactive.Subscription);
		expect(Object.prototype.toString.call(sub)).toBe('[object Reactive.Subscription]');
		expect(sub.closed).toBe(false);

		stream.push(10);
		expect(received).toEqual([10]);

		// Explicit dispose via Symbol.dispose
		sub[Symbol.dispose]();
		expect(sub.closed).toBe(true);

		stream.push(20);
		expect(received).toEqual([10]); // No new events

		// Second dispose is no-op
		sub.unsubscribe();
		expect(sub.closed).toBe(true);
	});

	it('safely handles ReactiveSubscription with null-object defaults when cleanup/signal are omitted', () => {
		const stream = new Reactive<number>();
		const sample = stream.on('data', () => {});
		const sub = new (sample.constructor as any)();
		expect(sub.closed).toBe(false);
		expect(() => sub.unsubscribe()).not.toThrow();
		expect(sub.closed).toBe(true);
	});

	it('detaches listener automatically when AbortSignal triggers in .on() options', () => {
		const stream = new Reactive<string>();
		const controller = new AbortController();
		const received: string[] = [];

		const sub = stream.on('data', (msg) => received.push(msg), { signal: controller.signal });
		expect(sub.closed).toBe(false);

		stream.push('hello');
		expect(received).toEqual(['hello']);

		controller.abort();
		expect(sub.closed).toBe(true);

		stream.push('world');
		expect(received).toEqual(['hello']);
	});

	it('handles already-aborted AbortSignal in .on() options immediately', () => {
		const stream = new Reactive<string>();
		const controller = new AbortController();
		controller.abort();

		const received: string[] = [];
		const sub = stream.on('data', (msg) => received.push(msg), { signal: controller.signal });

		expect(sub.closed).toBe(true);
		stream.push('ignored');
		expect(received).toEqual([]);
	});

	it('unregisters listener after first emission when { once: true } option is used', () => {
		const stream = new Reactive<number>();
		const received: number[] = [];

		const sub = stream.on('data', (v) => received.push(v), { once: true });
		expect(sub.closed).toBe(false);

		stream.push(1);
		expect(received).toEqual([1]);
		expect(sub.closed).toBe(true);

		stream.push(2);
		expect(received).toEqual([1]);
	});

	it('bounds stream lifecycle with .until(AbortSignal)', async () => {
		const stream = new Reactive<number>();
		const controller = new AbortController();
		const bounded = stream.until(controller.signal);

		const collected: number[] = [];
		const pullPromise = (async () => {
			for await (const val of bounded) {
				collected.push(val);
			}
		})();

		stream.push(1);
		stream.push(2);

		controller.abort();
		stream.push(3); // Should be ignored by bounded stream

		await pullPromise;
		expect(collected).toEqual([1, 2]);
		expect(bounded.state.completed).toBe(true);
	});

	it('bounds stream lifecycle with .until(Promise)', async () => {
		const stream = new Reactive<string>();
		let resolvePromise!: () => void;
		const stopPromise = new Promise<void>((resolve) => {
			resolvePromise = resolve;
		});

		const bounded = stream.until(stopPromise);
		const collected: string[] = [];

		const loop = (async () => {
			for await (const item of bounded) {
				collected.push(item);
			}
		})();

		stream.push('a');
		stream.push('b');

		resolvePromise();
		await new Promise((r) => setTimeout(r, 5));

		stream.push('c');
		await loop;

		expect(collected).toEqual(['a', 'b']);
		expect(bounded.state.completed).toBe(true);
	});

	it('bounds stream lifecycle with .until(Reactive)', async () => {
		const stream = new Reactive<number>();
		const trigger = new Reactive<void>();

		const bounded = stream.until(trigger);
		const collected: number[] = [];

		const loop = (async () => {
			for await (const item of bounded) {
				collected.push(item);
			}
		})();

		stream.push(10);
		stream.push(20);

		trigger.push(undefined); // Send trigger pulse
		await new Promise((r) => setTimeout(r, 5));

		stream.push(30);
		await loop;

		expect(collected).toEqual([10, 20]);
		expect(bounded.state.completed).toBe(true);
	});

	it('detaches upstream subscription when .until() downstream is disposed or completed', () => {
		const source = new Reactive<number>();
		expect(source.state.subscribers).toBe(0);

		const bounded = source.until(new AbortController().signal);
		expect(source.state.subscribers).toBe(3); // data, error, end

		bounded.complete();
		expect(source.state.subscribers).toBe(0); // All detached automatically!
	});

	it('supports cast (and broadcast alias) to resolve all concurrent pull waiters and listeners simultaneously', async () => {
		const stream = new Reactive<string>();
		const received: string[] = [];
		stream.on('data', (v) => received.push(v));

		const pull1 = stream.pull();
		const pull2 = stream.pull();
		expect(stream.state.queued).toBe(2);

		// Test primary method .cast()
		stream.cast('hello');

		const [val1, val2] = await Promise.all([pull1, pull2]);
		expect(val1).toBe('hello');
		expect(val2).toBe('hello');
		expect(received).toEqual(['hello']);
		expect(stream.state.emitted).toBe(1);

		// Test alias .broadcast()
		const pull3 = stream.pull();
		stream.broadcast('world');
		expect(await pull3).toBe('world');
		expect(received).toEqual(['hello', 'world']);
		expect(stream.state.emitted).toBe(2);
	});

	it('does not buffer pushed items when push listeners are active and no pull waiters exist', () => {
		const stream = new Reactive<number>();
		const received: number[] = [];
		stream.on('data', (v) => received.push(v));

		stream.push(1);
		stream.push(2);

		expect(received).toEqual([1, 2]);
		expect(stream.state.buffered).toBe(0);
	});
});

