# Implementation Plan: `reactive.class.ts` & Ticker Unification

**Document ID**: `IP-REACTIVE-001`  
**Status**: Ready for Evaluation / Future Execution  
**Target Workspaces**: `#library` (`packages/library`), `tempo` (`packages/tempo`), and `@magmacomputing/tempo-plugin-ticker` (`packages/plugins/ticker`)

---

## 1. Executive Summary & Architectural Motivation

### The Problem
Currently, `@magmacomputing/tempo-plugin-ticker` manually orchestrates:
1. An async pull-queue (`#waiters: Pledge<Tempo>[]`) for `for await (const t of ticker)` consumption.
2. Push-based event subscriber sets (`#listeners`, `#catchListeners`, `#stopListeners`).
3. Explicit resource management (`[Symbol.dispose]`, `[Symbol.asyncDispose]`).
4. Garbage collector finalization hooks via `Finalizer.register`.

As Tempo expands to multi-threaded synchronization (`sync`), multi-tab coordination (`tabsync`), network drift correction (`ntp`), and AI streaming (`ai`), **each plugin would otherwise be forced to duplicate this complex async queue and listener plumbing.**

### The Solution
Extract and standardize this reactive stream engine into **`reactive.class.ts`** in `#library` (exported via `@magmacomputing/tempo/plugin/sdk`):

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Core #library / Plugin SDK                      │
│                                                                        │
│   Pledge<T>       WeakCache<K,V>      Finalizer       Reactive<T>      │
│  (1-shot defer)     (GC Memo)       (GC Safety)    (Push/Pull Stream)  │
└────────────────────────────────────────────────────────────┬───────────┘
                                                             │
         ┌───────────────────────────────────────────────────┼─────────────────────────────────┐
         ▼                                                   ▼                                 ▼
┌─────────────────────────────────┐         ┌─────────────────────────────────┐   ┌─────────────────────────┐
│     tempo-plugin-ticker         │         │       tempo-plugin-sync         │   │   tempo-plugin-tabsync  │
│  • Cron / RRule / Durations     │         │  • SharedArrayBuffer / Atomics  │   │  • Web Locks Leader Tab │
│  • Emits Tempo instances        │         │  • Emits nanosecond ticks       │   │  • Broadcast pulses     │
└─────────────────────────────────┘         └─────────────────────────────────┘   └─────────────────────────┘
```

---

## 2. Key DX / UX Tenets

1. **Directional Symmetry (`.push()` & `.pull()`)**:
   * **Producer Push (`stream.push(value)`)**: Pushes new values into the stream with $O(1)$ dispatch.
   * **Consumer Pull (`await stream.pull()`)**: Pulls the next available value directly as `Promise<T | undefined>`, eliminating `{ value, done }` unwrapping boilerplate.
   * **Consumer Push (`stream.push(fn)` / `stream.on('data', fn)`)**: Registers push listeners for event-driven workflows.
   * **Consumer Iteration (`for await (const val of stream)`)**: Native ES2018 iteration with backpressure and zero lost events.
2. **Standard TC39 Resource Management**: Full native support for `using stream = new Reactive()` and `await using stream = new Reactive()` with automatic cleanup.
3. **Leak-Proof by Default**: Backed by `Finalizer` so unreferenced, unclosed streams are automatically pruned by the V8/SpiderMonkey/JSC garbage collector without leaving dangling `Pledge` rejections or orphaned callbacks.
4. **100% Backward Compatibility for Ticker**: `Tempo.ticker()` retains identical syntax, method signatures, properties (`.info`, `.pulse()`, `.stop()`), and behavior, while gaining `.pull()`.

---

## 3. Phase 1: `reactive.class.ts` in `#library`

### File Location
* Implementation: [`packages/library/src/common/runtime/reactive.class.ts`](file:///home/michael/Project/magma/packages/library/src/common/runtime/reactive.class.ts)
* Module Re-exports: [`packages/library/src/common/runtime/index.ts`](file:///home/michael/Project/magma/packages/library/src/common/runtime/index.ts)
* Plugin SDK Re-exports: [`packages/tempo/src/plugin/plugin.sdk.ts`](file:///home/michael/Project/magma/packages/tempo/src/plugin/plugin.sdk.ts)
* Unit Tests: `packages/library/test/common/runtime/reactive.class.test.ts`

### API Specification

#### Sanctioned API Surface (Published User Documentation)
The published user-facing documentation exclusively documents the canonical, sanctioned methods:

```typescript
export namespace Reactive {
  export type EventType = 'data' | 'error' | 'end';
  export type Listener<T> = (value: T, stop: () => void) => void;
  export type ErrorListener = (error: Error, stop: () => void) => void;
  export type EndListener = () => void;

  export interface Options<T> {
    tag?: string;
    bufferSize?: number; // Maximum queued pull events (default: Infinity)
    catch?: boolean;     // Suppress and route unhandled errors to 'error' listeners
    finalizer?: boolean; // Auto-cleanup on GC collection (default: true)
  }

  export interface State {
    readonly tag?: string;
    readonly active: boolean;
    readonly completed: boolean;
    readonly emitted: number;
    readonly subscribers: number;
    readonly queued: number;
    readonly buffered: number;
  }
}

export class Reactive<T> implements AsyncIterable<T>, Disposable, AsyncDisposable {
  constructor(options?: Reactive.Options<T> | string);

  // ── Sanctioned Producer API ──────────────────────────────────────────────
  push(value: T): boolean;
  error(err: Error): void;
  complete(terminalValue?: T): void;

  // ── Sanctioned Consumer API (Pull & Async Iteration) ─────────────────────
  pull(): Promise<T | undefined>;
  [Symbol.asyncIterator](): AsyncIterator<T, void, unknown>;

  // ── Sanctioned Consumer API (Push Subscriptions) ─────────────────────────
  on(event: 'data', listener: Reactive.Listener<T>): this;
  on(event: 'error', listener: Reactive.ErrorListener): this;
  on(event: 'end', listener: Reactive.EndListener): this;
  once(event: 'data', listener: Reactive.Listener<T>): this;
  off(event: Reactive.EventType, listener: Function): this;

  // ── Resource Management ──────────────────────────────────────────────────
  [Symbol.dispose](): void;
  [Symbol.asyncDispose](): Promise<void>;

  // ── Inspection & Factories ───────────────────────────────────────────────
  readonly state: Reactive.State;
  static from<V>(source: Iterable<V> | AsyncIterable<V> | Promise<V>, options?: Reactive.Options<V>): Reactive<V>;
}
```

#### Supported Aliases & Protocol Methods (Runtime Only — Omitted from User Docs)
To maintain runtime flexibility and full ECMAScript iterator protocol compliance, the class also provides:
* **`stream.emit(value)`**: Alias for `stream.push(value)` (familiar to EventEmitter users).
* **`stream.stop(terminalValue?)`**: Alias for `stream.complete(terminalValue)` (Ticker backward-compatibility).
* **`stream.push(listener)`**: Convenient alias for `stream.on('data', listener)`.
* **`stream.on('stop', listener)`**: Alias for `stream.on('end', listener)`.
* **`stream.next()`, `stream.return()`, `stream.throw()`**: Standard `AsyncIterator` protocol hooks executed by the JS engine during `for await` loops (direct consumer code should use `stream.pull()`).

---

### Usage Paradigms (Sanctioned Documentation Patterns)

```typescript
// 1. Direct Pull Consumption (Sanctioned Consumer Pull)
const stream = new Reactive<Tempo>();
// ... producer pushes in background ...
const nextTick = await stream.pull(); // Returns next Tempo directly

// 2. Direct Producer Push (Sanctioned Producer Push)
stream.push(new Tempo()); // Dispatches to pending pull waiters or listeners

// 3. Push Listener Subscription (Sanctioned Consumer Push)
stream.on('data', (tick, stop) => {
  console.log('Tick:', tick.iso);
  if (tick.second === 0) stop();
});

// 4. Async Iterable Consumption (Sanctioned Loop)
for await (const tick of stream) {
  console.log('Streamed tick:', tick.iso);
}

// 5. Explicit Resource Management (Sanctioned Disposal)
using managed = new Reactive<Tempo>();
// Automatically completes upon block exit
```

### Internal Mechanics
1. **Pull Queue Management**:
   * If a consumer awaits `pull()` or `next()` and no buffered data exists, a new `Pledge<IteratorResult<T>>` is allocated and appended to `#waiters`.
   * When `push(value)` / `emit(value)` is called, if `#waiters.length > 0`, the oldest waiter is resolved immediately ($O(1)$ dispatch).
   * `pull()` wraps `next()` and directly unwraps `.value`, returning `undefined` when the stream is completed/done.
   * If no waiters are pending and pull mode is active, values are stored in `#buffer` up to `bufferSize`.
2. **Push Multi-cast**:
   * Synchronously invokes registered `#dataListeners` with `(value, stopCallback)`.
3. **Automatic Finalization**:
   * Registers `Finalizer.register(this, () => this.complete())` so unclosed reactive streams dropped by user code never orphan promises or hold unmanaged memory.

---

## 4. Phase 2: Refactoring `@magmacomputing/tempo-plugin-ticker`

### Architecture Migration

```
BEFORE (Bespoke internal queue in Ticker):
TickerInstance
├── #waiters: Pledge<Tempo>[]        (Manual pull queue)
├── #listeners: Set<Callback>         (Manual push dispatch)
├── #catchListeners: Set<Callback>    (Manual error dispatch)
├── #stopListeners: Set<Callback>     (Manual stop dispatch)
├── [Symbol.asyncIterator]            (Manual generator loop)
└── Finalizer.register                (Manual proxy cleanup)

AFTER (Domain-focused Ticker on top of Reactive<Tempo>):
TickerInstance (Composes / Delegates to Reactive<Tempo>)
├── #reactive: Reactive<Tempo>       (Handles all queue, iteration, listeners, disposal, GC)
├── #rrule / #cron / #payload        (Handles calendar calculation)
└── pulse(): Tempo                   (Calculates next epoch and invokes #reactive.push(t))
```

### Refactoring Steps
1. In [`packages/plugins/ticker/src/index.ts`](file:///home/michael/Project/magma/packages/plugins/ticker/src/index.ts):
   * Import `Reactive` from `@magmacomputing/tempo/plugin/sdk`.
   * Replace internal `#waiters` / `#listeners` / `#catchListeners` / `#stopListeners` sets with `this.#reactive = new Reactive<Tempo>({ tag: this.#label ?? 'Ticker' })`.
   * In `pulse()`, call `this.#reactive.push(t)`.
   * In `stop()`, call `this.#reactive.complete(terminalValue)`.
   * Expose `pull()` directly on `Ticker.Instance` (`const t = await ticker.pull()`).
   * Delegate `next()`, `return()`, `throw()`, `[Symbol.asyncIterator]`, `[Symbol.dispose]`, and `[Symbol.asyncDispose]` directly to `#reactive`.
   * Map `ticker.on('pulse', cb)` -> `#reactive.on('data', cb)`, `ticker.on('catch', cb)` -> `#reactive.on('error', cb)`, and `ticker.on('stop', cb)` -> `#reactive.on('stop', cb)`.
2. Delete ~150 lines of redundant async queuing boilerplate from `ticker/src/index.ts`.
3. Run existing ticker test suites (`packages/plugins/ticker/test/**/*.test.ts`) to ensure 100% pass rate.

---

## 5. Verification & Testing Strategy

### 1. Unit Tests for `Reactive<T>` (`packages/library/test/common/runtime/reactive.class.test.ts`)
* **Directional Pull (`.pull()`)**: Resolves next value `T` directly without requiring `{ value, done }` unwrapping; returns `undefined` when closed.
* **Directional Push (`.push()`)**: Overloaded to push data values or register listener callbacks.
* **Push Mode**: Multiple `.on('data')` listeners, `.once()`, `.off()`, and early stop callback `stop()`.
* **Pull Mode**: `for await (const item of reactive)` consumption, sequential `next()`, terminal `return()`, and error `throw()`.
* **Hybrid Mode**: Simultaneous push listeners and pull iterators consuming from the same stream.
* **Disposal**: Verify `using` and `await using` immediately terminate active iteration and clear waiters.
* **GC Finalization**: Verify unhandled reactive streams are safely finalized without unhandled promise rejections.

### 2. Integration Tests for Ticker & Plugins
* Run full Ticker test suite (`npm test --workspace=@magmacomputing/tempo-plugin-ticker`).
* Test new `await ticker.pull()` method on active tickers.
* Run full monorepo suite (`npm test`).
* Verify benchmarks (`bench/bench.v4.4.3.ts`) to ensure zero performance regression.

---

## 6. Milestones & Task Breakdown

| Milestone | Deliverable | Target Files |
| :--- | :--- | :--- |
| **M1: Core Reactive Class** | Implement `Reactive<T>` class with `.push()`, `.pull()`, `.on()`, `for await`, `using`, and `Finalizer` capabilities. | `packages/library/src/common/runtime/reactive.class.ts` |
| **M2: Library Export & Tests** | Export from `#library` index and superbarrel SDK; author comprehensive test suite. | `packages/library/src/common/runtime/index.ts`<br>`packages/tempo/src/plugin/plugin.sdk.ts`<br>`packages/library/test/common/runtime/reactive.class.test.ts` |
| **M3: Ticker Refactor** | Update `TickerInstance` to delegate async reactivity to `Reactive<Tempo>` and expose `.pull()`. | `packages/plugins/ticker/src/index.ts` |
| **M4: Validation & Benchmarking** | Execute test suites across monorepo and run benchmarks. | Full monorepo |
