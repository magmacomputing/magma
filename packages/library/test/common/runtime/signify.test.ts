import { Signify, Signal, StateFlag, signify, effect, computed } from '#library/signify.library.js';
import { Enum } from '#library/enumerate.library.js';
import { getType } from '#library/type.library.js';
import { Reactive, Pledge, getStorage } from '#library';
import { toSignal } from '#library/storage.library.js';

describe('Signify (TC39 Signals Core Engine - Phase 1)', () => {
	describe('Type system integration', () => {
		it('should be recognized by getType()', () => {
			const s = new Signify.State(1);
			const c = new Signify.Computed(() => 2);
			const w = new Signify.subtle.Watcher(() => {});
			expect(getType(s)).toBe('Signify.State');
			expect(getType(c)).toBe('Signify.Computed');
			expect(getType(w)).toBe('Signify.subtle.Watcher');
			c.dispose();
			w.dispose();
		});
	});

	describe('StateFlag enumify integration', () => {
		it('should implement CLEAN, CHECK_DIRTY, and DIRTY via enumify', () => {
			expect(StateFlag.CLEAN).toBe(0);
			expect(StateFlag.CHECK_DIRTY).toBe(1);
			expect(StateFlag.DIRTY).toBe(2);
			expect(Enum.has(StateFlag, 'CLEAN')).toBe(true);
			expect(Enum.has(StateFlag, 'CHECK_DIRTY')).toBe(true);
			expect(Enum.has(StateFlag, 'DIRTY')).toBe(true);
			expect(Signify.StateFlag).toBe(StateFlag);
		});
	});

	describe('Signify.State', () => {
		it('should store initial value and read it via .get()', () => {
			const s = new Signify.State(42);
			expect(s.get()).toBe(42);
			expect(Object.prototype.toString.call(s)).toBe('[object Signify.State]');
		});

		it('should update value and increment epoch via .set()', () => {
			const s = new Signify.State(10);
			expect(s.epoch).toBe(0);

			s.set(20);
			expect(s.get()).toBe(20);
			expect(s.epoch).toBe(1);
		});

		it('should not update epoch if value is equal (Object.is)', () => {
			const s = new Signify.State('hello');
			s.set('hello');
			expect(s.epoch).toBe(0);
		});

		it('should respect custom equals comparator', () => {
			interface Item {
				id: number;
				name: string;
			}
			const s = new Signify.State<Item>(
				{ id: 1, name: 'First' },
				{ equals: (a, b) => a.id === b.id },
			);

			s.set({ id: 1, name: 'Renamed' });
			expect(s.epoch).toBe(0); // considered equal by id

			s.set({ id: 2, name: 'Second' });
			expect(s.epoch).toBe(1);
			expect(s.get().name).toBe('Second');
		});
	});

	describe('Signify.Computed', () => {
		it('should evaluate lazily and memoize the result', () => {
			let computeCount = 0;
			const a = new Signify.State(2);
			const b = new Signify.Computed(() => {
				computeCount++;
				return a.get() * 10;
			});

			expect(computeCount).toBe(0); // Lazy: not computed yet!
			expect(Object.prototype.toString.call(b)).toBe('[object Signify.Computed]');

			expect(b.get()).toBe(20);
			expect(computeCount).toBe(1);

			// Second read without state changes returns memoized value
			expect(b.get()).toBe(20);
			expect(computeCount).toBe(1);

			// Updating state causes recomputation on next get()
			a.set(3);
			expect(computeCount).toBe(1); // Still lazy!
			expect(b.get()).toBe(30);
			expect(computeCount).toBe(2);
		});

		it('should maintain glitch-free execution across a diamond dependency graph', () => {
			// Diamond graph:
			//      A
			//     / \
			//    B   C
			//     \ /
			//      D
			const a = new Signify.State(1);
			let bCount = 0;
			let cCount = 0;
			let dCount = 0;

			const b = new Signify.Computed(() => {
				bCount++;
				return a.get() * 2;
			});

			const c = new Signify.Computed(() => {
				cCount++;
				return a.get() * 3;
			});

			const d = new Signify.Computed(() => {
				dCount++;
				return b.get() + c.get();
			});

			// Initial evaluation: A=1, B=2, C=3, D=5
			expect(d.get()).toBe(5);
			expect(bCount).toBe(1);
			expect(cCount).toBe(1);
			expect(dCount).toBe(1);

			// Update source A to 2
			a.set(2);

			// D must re-evaluate only ONCE and produce exactly 4 + 6 = 10
			expect(d.get()).toBe(10);
			expect(bCount).toBe(2);
			expect(cCount).toBe(2);
			expect(dCount).toBe(2);
		});

		it('should dynamically prune subscriptions when conditional branches change', () => {
			const cond = new Signify.State(true);
			const optionTrue = new Signify.State('TRUE');
			const optionFalse = new Signify.State('FALSE');

			let branchEvaluations = 0;
			const derived = new Signify.Computed(() => {
				branchEvaluations++;
				return cond.get() ? optionTrue.get() : optionFalse.get();
			});

			expect(derived.get()).toBe('TRUE');
			expect(branchEvaluations).toBe(1);

			// Modifying optionFalse should NOT dirty or re-evaluate derived because it was not accessed
			optionFalse.set('FALSE_UPDATED');
			expect(derived.get()).toBe('TRUE');
			expect(branchEvaluations).toBe(1);

			// Switch branch to false
			cond.set(false);
			expect(derived.get()).toBe('FALSE_UPDATED');
			expect(branchEvaluations).toBe(2);

			// Now modifying optionTrue should NOT trigger re-evaluation (it was dynamically pruned)
			optionTrue.set('TRUE_UPDATED');
			expect(derived.get()).toBe('FALSE_UPDATED');
			expect(branchEvaluations).toBe(2);
		});

		it('should detect circular dependencies and throw RangeError', () => {
			let selfRef: any;
			selfRef = new Signify.Computed(() => {
				return selfRef.get() + 1;
			});

			expect(() => selfRef.get()).toThrow(RangeError);
		});

		it('should cache and propagate errors thrown during computation', () => {
			const trigger = new Signify.State(false);
			const failing = new Signify.Computed(() => {
				if (trigger.get()) {
					throw new Error('Failure triggered');
				}
				return 'OK';
			});

			expect(failing.get()).toBe('OK');

			trigger.set(true);
			expect(() => failing.get()).toThrow('Failure triggered');

			// Reading again rethrows the cached error without breaking tracking context
			expect(() => failing.get()).toThrow('Failure triggered');

			// Recover
			trigger.set(false);
			expect(failing.get()).toBe('OK');
		});

		it('should support explicit disposal via [Symbol.dispose]()', () => {
			const a = new Signify.State(100);
			const c = new Signify.Computed(() => a.get() * 2);
			expect(c.get()).toBe(200);

			c.dispose();
			expect(() => c.get()).toThrow('Cannot read from a disposed Signify.Computed');
		});
	});

	describe('Signify.subtle.Watcher', () => {
		it('should notify watcher when watched state transitions to dirty', () => {
			let notifyCalls = 0;
			const watcher = new Signify.subtle.Watcher(() => {
				notifyCalls++;
			});

			const s1 = new Signify.State(1);
			const s2 = new Signify.State(2);
			watcher.watch(s1, s2);

			expect(notifyCalls).toBe(0);
			expect(Object.prototype.toString.call(watcher)).toBe('[object Signify.subtle.Watcher]');

			s1.set(10);
			expect(notifyCalls).toBe(1);

			// Watcher callback is only called once until pending items are retrieved
			s2.set(20);
			expect(notifyCalls).toBe(1);

			const pending = watcher.getPending();
			expect(pending.length).toBe(2);
			expect(pending).toContain(s1);
			expect(pending).toContain(s2);

			// After getPending(), subsequent changes notify again
			s1.set(100);
			expect(notifyCalls).toBe(2);

			watcher.dispose();
		});

		it('should watch Computed signals and notify when upstream changes', () => {
			let notifyCalls = 0;
			const watcher = new Signify.subtle.Watcher(() => {
				notifyCalls++;
			});

			const base = new Signify.State(5);
			const comp = new Signify.Computed(() => base.get() * 2);
			expect(comp.get()).toBe(10);

			watcher.watch(comp);
			expect(notifyCalls).toBe(0);

			base.set(6);
			expect(notifyCalls).toBe(1);

			const pending = watcher.getPending();
			expect(pending).toContain(comp);

			// Comp evaluates cleanly with new value
			expect(comp.get()).toBe(12);

			watcher.dispose();
		});

		it('should stop watching when unwatch is called', () => {
			let notifyCalls = 0;
			const watcher = new Signify.subtle.Watcher(() => {
				notifyCalls++;
			});

			const s = new Signify.State(1);
			watcher.watch(s);
			watcher.unwatch(s);

			s.set(2);
			expect(notifyCalls).toBe(0);
			expect(watcher.getPending().length).toBe(0);

			watcher.dispose();
		});
	});

	describe('Signify.subtle utilities', () => {
		it('should bypass dependency tracking with untrack()', () => {
			const a = new Signify.State(10);
			const b = new Signify.State(20);

			let computeCount = 0;
			const c = new Signify.Computed(() => {
				computeCount++;
				const aVal = a.get();
				const bVal = Signify.subtle.untrack(() => b.get());
				return aVal + bVal;
			});

			expect(c.get()).toBe(30);
			expect(computeCount).toBe(1);

			// Updating b (which was read inside untrack) must NOT trigger c
			b.set(99);
			expect(c.get()).toBe(30);
			expect(computeCount).toBe(1);

			// Updating a MUST trigger c
			a.set(11);
			expect(c.get()).toBe(110); // 11 + 99 (reads new b now)
			expect(computeCount).toBe(2);
		});

		it('should record dependencies when a computed is evaluated inside untrack()', () => {
			const s = new Signify.State(1);
			const c = new Signify.Computed(() => s.get() * 2);

			const initial = Signify.subtle.untrack(() => c.get());
			expect(initial).toBe(2);

			s.set(5);
			expect(c.get()).toBe(10);
		});

		it('should identify current active computed with currentComputed()', () => {
			expect(Signify.subtle.currentComputed()).toBeUndefined();

			let insideRef: any;
			const comp = new Signify.Computed(() => {
				insideRef = Signify.subtle.currentComputed();
				return 42;
			});

			comp.get();
			expect(insideRef).toBe(comp);
			expect(Signify.subtle.currentComputed()).toBeUndefined();
		});
	});

	describe('Signal forward-compatibility mirror', () => {
		it('should provide Signal as an alias to Signify', () => {
			expect(Signal.State).toBe(Signify.State);
			expect(Signal.Computed).toBe(Signify.Computed);
			expect(Signal.subtle.Watcher).toBe(Signify.subtle.Watcher);
			expect(Signal.subtle.untrack).toBe(Signify.subtle.untrack);
			expect(Signal.subtle.currentComputed).toBe(Signify.subtle.currentComputed);

			const state = new Signal.State('hello');
			expect(state.get()).toBe('hello');
			state.set('world');
			expect(state.get()).toBe('world');

			const comp = new Signal.Computed(() => state.get().toUpperCase());
			expect(comp.get()).toBe('WORLD');
		});
	});
});

describe('Signify Ergonomics & Bridges (Phase 2)', () => {
	describe('signify() callable factory', () => {
		it('should read and write as a callable function', () => {
			const count = signify(0);
			expect(count()).toBe(0);

			expect(count(10)).toBe(10);
			expect(count()).toBe(10);
			expect(count.epoch).toBe(1);

			// Property access (.value)
			count.value = 25;
			expect(count.value).toBe(25);
			expect(count()).toBe(25);

			// Method access (.get / .set)
			count.set(50);
			expect(count.get()).toBe(50);

			expect(Object.prototype.toString.call(count)).toBe('[object Signify]');
			expect(getType(count)).toBe('Signify');
		});

		it('should track dependencies seamlessly in Computed', () => {
			const a = signify(2);
			const b = signify(3);
			const product = new Signify.Computed(() => a() * b());

			expect(product.get()).toBe(6);

			a(5);
			expect(product.get()).toBe(15);
		});

		it('should expose static namespace members on the signify function', () => {
			expect(signify.State).toBe(Signify.State);
			expect(signify.Computed).toBe(Signify.Computed);
			expect(signify.computed).toBe(Signify.computed);
			expect(signify.effect).toBe(Signify.effect);
			expect(signify.from).toBe(Signify.from);
			expect(signify.StateFlag).toBe(Signify.StateFlag);
		});
	});

	describe('Signify.computed() callable computation', () => {
		it('should evaluate lazily and memoize as a callable function', () => {
			const count = signify(1);
			let computeCount = 0;
			const quadrupled = Signify.computed(() => {
				computeCount++;
				return count() * 4;
			});

			expect(computeCount).toBe(0); // Lazy
			expect(quadrupled()).toBe(4);
			expect(computeCount).toBe(1);

			// Second call memoized
			expect(quadrupled()).toBe(4);
			expect(computeCount).toBe(1);

			// Mutating dependency
			count(2);
			expect(quadrupled()).toBe(8);
			expect(computeCount).toBe(2);

			expect(quadrupled.value).toBe(8);
			expect(quadrupled.get()).toBe(8);
			expect(Object.prototype.toString.call(quadrupled)).toBe('[object Signify.Computed]');

			quadrupled.dispose();
		});
	});

	describe('Signify.effect() reactive scheduler', () => {
		it('should execute immediately and re-run on microtask when dependencies change', async () => {
			const name = signify('World');
			const greetings: string[] = [];

			const sub = Signify.effect(() => {
				greetings.push(`Hello, ${name()}!`);
			});

			// Initial immediate run
			expect(greetings).toEqual(['Hello, World!']);

			// Mutate state
			name('Tempo');
			// Not re-run synchronously
			expect(greetings).toEqual(['Hello, World!']);

			// Await microtask
			await Promise.resolve();
			expect(greetings).toEqual(['Hello, World!', 'Hello, Tempo!']);

			sub.dispose();
			expect(sub.closed).toBe(true);

			// Mutating after dispose does not trigger re-run
			name('Nobody');
			await Promise.resolve();
			expect(greetings).toEqual(['Hello, World!', 'Hello, Tempo!']);
		});

		it('should batch multiple synchronous mutations into a single microtask execution', async () => {
			const count = signify(0);
			const values: number[] = [];

			const sub = Signify.effect(() => {
				values.push(count());
			});

			expect(values).toEqual([0]);

			// Synchronously change 5 times
			count(1);
			count(2);
			count(3);
			count(4);
			count(5);

			await Promise.resolve();
			// Only initial (0) and final batched (5)
			expect(values).toEqual([0, 5]);

			sub.dispose();
		});

		it('should execute cleanup callback before re-evaluation and on disposal', async () => {
			const flag = signify(true);
			const events: string[] = [];

			const sub = Signify.effect(() => {
				const current = flag();
				events.push(`run(${current})`);
				return () => {
					events.push(`cleanup(${current})`);
				};
			});

			expect(events).toEqual(['run(true)']);

			flag(false);
			await Promise.resolve();

			expect(events).toEqual(['run(true)', 'cleanup(true)', 'run(false)']);

			sub.dispose();
			expect(events).toEqual(['run(true)', 'cleanup(true)', 'run(false)', 'cleanup(false)']);
		});

		it('should run cleanup exactly once after a mutation when awaiting two microtasks', async () => {
			const s = new Signify.State(1);
			let cleanupCalls = 0;
			let effectCalls = 0;

			const sub = Signify.effect(() => {
				effectCalls++;
				s.get();
				return () => {
					cleanupCalls++;
				};
			});

			expect(effectCalls).toBe(1);
			expect(cleanupCalls).toBe(0);

			s.set(2);

			// Await two microtasks
			await Promise.resolve();
			await Promise.resolve();

			expect(effectCalls).toBe(2);
			expect(cleanupCalls).toBe(1);

			sub.dispose();
			expect(cleanupCalls).toBe(2);
		});
	});

	describe('Signify.from() Reactive stream bridge', () => {
		it('should bridge a Reactive stream into a synchronous signal', async () => {
			const stream = new Reactive<number>();
			const sig = Signify.from(stream, 0);

			expect(sig()).toBe(0);

			stream.push(42);
			expect(sig()).toBe(42);

			stream.push(100);
			expect(sig()).toBe(100);

			sig.dispose();

			// Emitting after dispose does not update
			stream.push(999);
			expect(sig()).toBe(100);
		});

		it('should provide .toSignal() and .signal getter directly on Reactive instances', () => {
			const stream = new Reactive<string>();
			const sig = stream.toSignal('initial');
			expect(sig()).toBe('initial');

			stream.push('updated');
			expect(sig()).toBe('updated');

			// .signal getter
			const stream2 = new Reactive<number>();
			expect(stream2.signal()).toBeUndefined();
			stream2.push(777);
			expect(stream2.signal()).toBe(777);
		});

		it('should bridge Pledge instances via pledge.toSignal() and Signify.from(pledge, fallback)', () => {
			const p = new Pledge<string>();
			const sig = p.toSignal('loading...');
			expect(sig()).toBe('loading...');

			p.resolve('ready');
			expect(sig()).toBe('ready');

			// via Signify.from generic duck-typing
			const p2 = new Pledge<number>();
			const sig2 = Signify.from(p2, -1);
			expect(sig2()).toBe(-1);
			p2.resolve(42);
			expect(sig2()).toBe(42);
		});
	});

	describe('Reactive.from() and Reactive.fromSignal() signal to stream bridge', () => {
		it('should bridge a signal into a Reactive async stream', async () => {
			const count = signify(10);
			const stream = Reactive.from(count);
			const emitted: number[] = [];

			stream.on('data', (val) => {
				emitted.push(val);
			});

			// Initial value emitted immediately on creation
			expect(emitted).toEqual([10]);

			count(20);
			await Promise.resolve();
			expect(emitted).toEqual([10, 20]);

			count(30);
			await Promise.resolve();
			expect(emitted).toEqual([10, 20, 30]);

			stream.complete();
			count(40);
			await Promise.resolve();
			// No further emissions after stream completes
			expect(emitted).toEqual([10, 20, 30]);
		});

		it('should support explicit Reactive.fromSignal(signal)', async () => {
			const text = signify('a');
			const stream = Reactive.fromSignal(text);
			const values: string[] = [];
			stream.on('data', (v) => values.push(v));

			expect(values).toEqual(['a']);
			text('b');
			await Promise.resolve();
			expect(values).toEqual(['a', 'b']);
			stream.complete();
		});
	});

	describe('Storage.toSignal() persistent reactive state bridge', () => {
		it('should bind a signal to storage and synchronize updates bidirectionally', () => {
			const userTheme = toSignal('test_theme', 'light');
			expect(userTheme()).toBe('light');
			expect(getStorage('test_theme')).toBe('light');

			userTheme('dark');
			expect(userTheme()).toBe('dark');
			expect(getStorage('test_theme')).toBe('dark');

			userTheme.value = 'system';
			expect(userTheme()).toBe('system');
			expect(getStorage('test_theme')).toBe('system');
		});
	});

	describe('Immutability & tamper resistance', () => {
		it('should freeze class instances (State, Computed, Watcher)', () => {
			const state = new Signify.State(10);
			const comp = new Signify.Computed(() => state.get() * 2);
			const watcher = new Signify.subtle.Watcher(() => {});

			expect(Object.isFrozen(state)).toBe(true);
			expect(Object.isFrozen(comp)).toBe(true);
			expect(Object.isFrozen(watcher)).toBe(true);

			expect(() => {
				(state as any).injected = 'bad';
			}).toThrow();

			expect(() => {
				(comp as any).injected = 'bad';
			}).toThrow();

			expect(() => {
				(watcher as any).injected = 'bad';
			}).toThrow();

			// Prototypes hardened by @Immutable
			expect(Object.getOwnPropertyDescriptor(Signify.State.prototype, 'get')?.writable).toBe(false);
			expect(Object.getOwnPropertyDescriptor(Signify.Computed.prototype, 'get')?.writable).toBe(false);
			expect(Object.getOwnPropertyDescriptor(Signify.subtle.Watcher.prototype, 'watch')?.writable).toBe(false);
		});

		it('should freeze returned accessors from signify, computed, and from', () => {
			const count = signify(10);
			const doubled = Signify.computed(() => count() * 2);
			const stream = new Reactive<number>();
			const streamed = Signify.from(stream, 0);

			expect(Object.isFrozen(count)).toBe(true);
			expect(Object.isFrozen(doubled)).toBe(true);
			expect(Object.isFrozen(streamed)).toBe(true);

			expect(() => {
				(count as any).customProp = 'evil';
			}).toThrow();

			expect(() => {
				(doubled as any).customProp = 'evil';
			}).toThrow();

			expect(() => {
				(streamed as any).customProp = 'evil';
			}).toThrow();

			// Confirm reactivity continues to operate normally
			count(25);
			expect(count()).toBe(25);
			expect(doubled()).toBe(50);

			count.value = 30;
			expect(count.value).toBe(30);
			expect(doubled.value).toBe(60);

			stream.push(99);
			expect(streamed()).toBe(99);
		});

		it('should freeze returned effect subscriptions', () => {
			const count = signify(0);
			const sub = Signify.effect(() => {
				count();
			});

			expect(Object.isFrozen(sub)).toBe(true);
			expect(() => {
				(sub as any).tampered = true;
			}).toThrow();

			expect(sub.closed).toBe(false);
			sub.dispose();
			expect(sub.closed).toBe(true);
		});

		it('should freeze static namespaces (Signify, signify, Signal)', () => {
			expect(Object.isFrozen(Signify)).toBe(true);
			expect(Object.isFrozen(Signify.subtle)).toBe(true);
			expect(Object.isFrozen(signify)).toBe(true);
			expect(Object.isFrozen(signify.subtle)).toBe(true);
			expect(Object.isFrozen(Signal)).toBe(true);
			expect(Object.isFrozen(Signal.subtle)).toBe(true);

			expect(() => {
				(Signify as any).State = null;
			}).toThrow();

			expect(() => {
				(Signal as any).State = null;
			}).toThrow();
		});

		it('should properly track whether a computed has evaluated and not bump epoch when recomputing undefined', () => {
			const trigger = new Signify.State(1);
			const comp = new Signify.Computed(() => {
				trigger.get();
				return undefined;
			});

			expect(comp.get()).toBeUndefined();
			const firstEpoch = comp.epoch;

			// Trigger recompute with identical undefined result
			trigger.set(2);
			expect(comp.get()).toBeUndefined();
			expect(comp.epoch).toBe(firstEpoch); // Epoch must not increment because undefined === undefined
		});
	});
});

