# Design Plan: Fluent Stream Operators & Lifecycle Controls for `Reactive<T>`

**Document ID**: `DP-REACTIVE-002`  
**Status**: Proposed / Under Review  
**Target Class**: [`Reactive<T>`](file:///home/michael/Project/magma/packages/library/src/common/runtime/reactive.class.ts) in `#library` (`packages/library/src/common/runtime/reactive.class.ts`)  
**Companion Documents**:
- [`reactive-class-implementation-plan.md`](file:///home/michael/Project/magma/packages/tempo/plan/reactive-class-implementation-plan.md) (Core Reactive & Ticker Unification)
- Inspiration: Jafar Husain's TC39 *Observable* & *Async Iterators* architecture (@Scale 2014)

---

## 1. Executive Summary & Goals

The initial implementation of [`Reactive<T>`](file:///home/michael/Project/magma/packages/library/src/common/runtime/reactive.class.ts) established the bidirectional bridge between **Push** (`.push()`, `.on('data')`) and **Pull** (`.pull()`, `for await (const x of stream)`), complete with TC39 Explicit Resource Management (`using` / `await using`) and GC safety (`Finalizer`).

This design plan expands [`Reactive<T>`](file:///home/michael/Project/magma/packages/library/src/common/runtime/reactive.class.ts) with **first-class stream transformation combinators** and **standardized lifecycle controls**, providing:

1. **Lightweight, Zero-Dependency Fluent Operators**:
   Chainable transformations (`.map()`, `.filter()`, `.take()`, `.drop()`, `.takeUntil()`, `.tap()`) that work seamlessly across both push and pull consumers without introducing the overhead of external libraries like RxJS.
2. **Deterministic Upstream/Downstream Teardown**:
   When a downstream derived stream is closed (or disposed via `using`), it automatically unregisters its upstream subscription, preventing memory leaks and orphaned processing.
3. **First-Class `AbortSignal` Support**:
   Direct integration with standard web `AbortSignal` for listener cancellation and stream completion.
4. **Disposable Subscription Handles**:
   `stream.on(...)` returns a `Subscription` object implementing `[Symbol.dispose]()` and `.unsubscribe()`, allowing `using sub = stream.on(...)`.

---

## 2. API Surface Specification

```typescript
export namespace Reactive {
  /** Disposable subscription returned by event listeners */
  export interface Subscription extends Disposable {
    readonly closed: boolean;
    unsubscribe(): void;
    [Symbol.dispose](): void;
  }

  /** Options for event subscriptions */
  export interface SubscriptionOptions {
    /** Optional AbortSignal to automatically detach the listener */
    signal?: AbortSignal | undefined;
    /** If true, unregisters after the first event emission */
    once?: boolean | undefined;
  }

  /** Transform callback for map */
  export type MapFn<T, R> = (value: T, index: number) => R | Promise<R>;

  /** Filter predicate */
  export type PredicateFn<T> = (value: T, index: number) => boolean | Promise<boolean>;

  /** Side-effect callback for tap */
  export type TapFn<T> = (value: T, index: number) => void | Promise<void>;
}
```

### Proposed Methods on [`Reactive<T>`](file:///home/michael/Project/magma/packages/library/src/common/runtime/reactive.class.ts)

```typescript
export class Reactive<T> implements AsyncIterable<T>, AsyncIterator<T, void, unknown>, Disposable, AsyncDisposable {
  // ... existing constructor, push, pull, state, etc. ...

  // ── Enhanced Subscriptions ────────────────────────────────────────────────
  /**
   * Subscribes to stream events with optional AbortSignal and returns a disposable Subscription.
   */
  on(event: 'data', listener: Reactive.Listener<T>, options?: Reactive.SubscriptionOptions): Reactive.Subscription;
  on(event: 'error', listener: Reactive.ErrorListener, options?: Reactive.SubscriptionOptions): Reactive.Subscription;
  on(event: 'end' | 'stop', listener: Reactive.EndListener, options?: Reactive.SubscriptionOptions): Reactive.Subscription;

  // ── Fluent Stream Operators ───────────────────────────────────────────────

  /**
   * Transforms each emitted value using an asynchronous or synchronous mapping function.
   *
   * @param project - Mapping function applied to each item
   * @returns A new Reactive stream emitting transformed values
   *
   * @example
   * ```ts
   * const doubled = stream.map(x => x * 2);
   * ```
   */
  map<R>(project: Reactive.MapFn<T, R>): Reactive<R>;

  /**
   * Filters values according to a synchronous or asynchronous predicate.
   *
   * @param predicate - Filter condition
   * @returns A new Reactive stream emitting only matching values
   *
   * @example
   * ```ts
   * const evens = stream.filter(x => x % 2 === 0);
   * ```
   */
  filter(predicate: Reactive.PredicateFn<T>): Reactive<T>;

  /**
   * Emits at most `count` values, then completes immediately.
   *
   * @param count - Maximum number of values to emit
   * @returns A new Reactive stream that completes after `count` items
   *
   * @example
   * ```ts
   * const firstThree = stream.take(3);
   * ```
   */
  take(count: number): Reactive<T>;

  /**
   * Skips the first `count` values emitted by the stream, then emits the rest.
   *
   * @param count - Number of leading items to drop
   * @returns A new Reactive stream omitting the first `count` items
   *
   * @example
   * ```ts
   * const remaining = stream.drop(5);
   * ```
   */
  drop(count: number): Reactive<T>;

  /**
   * Emits values until a notifier stream, Promise, or AbortSignal triggers.
   *
   * @param notifier - Another stream, Promise, or AbortSignal that terminates this stream
   * @returns A new Reactive stream bounded by the notifier
   *
   * @example
   * ```ts
   * const bounded = stream.takeUntil(stopSignal);
   * ```
   */
  takeUntil(notifier: Reactive<any> | Promise<any> | AbortSignal): Reactive<T>;

  /**
   * Executes a side-effect for each item without altering the emitted stream values.
   *
   * @param effect - Tap function for logging or debugging
   * @returns A new Reactive stream mirroring the source
   *
   * @example
   * ```ts
   * stream.tap(x => console.log('Saw:', x)).map(x => x + 1);
   * ```
   */
  tap(effect: Reactive.TapFn<T>): Reactive<T>;
}
```

---

## 3. Architecture & Lifecycle Propagation

### The Pipeline Relationship (Upstream ⇄ Downstream)

A key lesson from RxJS and TC39 *Async Iterators* is that derived streams must handle **two-way teardown**:

```
Upstream Reactive<T>
       │
       │ .push(val) ──► Downstream operator (e.g. map, filter)
       │                         │
       │                         ▼
       │               Downstream Reactive<R>
       │                         ▲
       │                         │ Downstream complete() / Symbol.dispose
       ▼                         │
Unregister listener from Upstream ◄─────────────────────────────────────┘
```

1. **Forward Propagation**:
   - When upstream emits data $\to$ operator transforms/gates value and pushes to downstream.
   - When upstream errors $\to$ error forwarded to downstream (`downstream.error(err)`).
   - When upstream completes $\to$ downstream completes (`downstream.complete()`).

2. **Reverse Teardown (Backpressure & Unsubscription)**:
   - When downstream is closed (e.g. `downstream.take(2)` reaches its count, or a user calls `downstream.complete()` or `downstream[Symbol.dispose]()`), downstream **must automatically detach its listener from upstream**.
   - If downstream was the only consumer of upstream, upstream can naturally be reclaimed by GC.

---

## 4. Operator Implementation Mechanics

### 1. `map<R>(project)`
```typescript
map<R>(project: Reactive.MapFn<T, R>): Reactive<R> {
  const output = new Reactive<R>({
    tag: this.#tag ? `${this.#tag}.map` : 'Reactive.map',
    bufferSize: this.#bufferSize,
    catch: this.#catch
  });

  let index = 0;
  const sub = this.on('data', async (val) => {
    try {
      const mapped = await project(val, index++);
      output.push(mapped);
    } catch (err) {
      output.error(err as Error);
    }
  });

  this.on('error', (err) => output.error(err));
  this.on('end', () => output.complete());

  // Reverse teardown: if output completes or disposes, detach upstream
  output.on('end', () => sub.unsubscribe());

  return output;
}
```

### 2. `filter(predicate)`
```typescript
filter(predicate: Reactive.PredicateFn<T>): Reactive<T> {
  const output = new Reactive<T>({
    tag: this.#tag ? `${this.#tag}.filter` : 'Reactive.filter',
    bufferSize: this.#bufferSize,
    catch: this.#catch
  });

  let index = 0;
  const sub = this.on('data', async (val) => {
    try {
      const match = await predicate(val, index++);
      if (match) output.push(val);
    } catch (err) {
      output.error(err as Error);
    }
  });

  this.on('error', (err) => output.error(err));
  this.on('end', () => output.complete());
  output.on('end', () => sub.unsubscribe());

  return output;
}
```

### 3. `take(count)`
```typescript
take(count: number): Reactive<T> {
  if (count <= 0) {
    const closed = new Reactive<T>();
    closed.complete();
    return closed;
  }

  const output = new Reactive<T>({
    tag: this.#tag ? `${this.#tag}.take(${count})` : `Reactive.take(${count})`,
    bufferSize: this.#bufferSize
  });

  let seen = 0;
  const sub = this.on('data', (val) => {
    if (seen < count) {
      seen++;
      output.push(val);
      if (seen >= count) {
        output.complete();
        sub.unsubscribe();
      }
    }
  });

  this.on('error', (err) => output.error(err));
  this.on('end', () => output.complete());
  output.on('end', () => sub.unsubscribe());

  return output;
}
```

### 4. `takeUntil(notifier)`
```typescript
takeUntil(notifier: Reactive<any> | Promise<any> | AbortSignal): Reactive<T> {
  const output = new Reactive<T>({
    tag: this.#tag ? `${this.#tag}.takeUntil` : 'Reactive.takeUntil'
  });

  const stop = () => {
    sub.unsubscribe();
    output.complete();
  };

  const sub = this.on('data', (val) => output.push(val));
  this.on('error', (err) => output.error(err));
  this.on('end', () => output.complete());
  output.on('end', () => sub.unsubscribe());

  // Handle AbortSignal
  if (notifier instanceof AbortSignal) {
    if (notifier.aborted) {
      stop();
    } else {
      notifier.addEventListener('abort', stop, { once: true });
    }
  } else if (isObject(notifier) && 'then' in notifier) {
    // Handle Promise
    (notifier as Promise<any>).then(stop, stop);
  } else if (isObject(notifier) && 'on' in notifier) {
    // Handle another Reactive stream
    (notifier as Reactive<any>).on('data', stop, { once: true });
    (notifier as Reactive<any>).on('end', stop, { once: true });
  }

  return output;
}
```

---

## 5. Modern `AbortSignal` & `using sub` DX Examples

### Example 1: Explicit Resource Management (`using sub`)
```typescript
{
  using sub = ticker.on('data', (tick) => {
    console.log('Got tick:', tick.iso);
  });

  await doSomeWork();
} // <- Out of scope: sub[Symbol.dispose]() called automatically, detaching listener!
```

### Example 2: Declarative Pipeline with `takeUntil` and `map`
```typescript
const controller = new AbortController();

const tickMinutes = ticker
  .takeUntil(controller.signal)
  .filter(tick => tick.second === 0)
  .map(tick => tick.toZonedDateTime('UTC'))
  .tap(tick => logger.info(`Minute tick: ${tick.iso}`));

for await (const min of tickMinutes) {
  await syncDatabase(min);
}
```

---

## 6. Implementation & Test Strategy

| Phase | Tasks | Target Files |
| :--- | :--- | :--- |
| **Step 1: Subscription Interface** | Enhance `.on()` to return `{ unsubscribe(), [Symbol.dispose](), closed }` and support `{ signal, once }`. | `packages/library/src/common/runtime/reactive.class.ts` |
| **Step 2: Stream Operators** | Implement `.map()`, `.filter()`, `.take()`, `.drop()`, `.takeUntil()`, `.tap()` on `Reactive<T>`. | `packages/library/src/common/runtime/reactive.class.ts` |
| **Step 3: Unit Tests** | Author test suite covering transformations, async predicates/mappers, reverse teardown on early complete, and `AbortSignal` integration. | `packages/library/test/common/runtime/reactive.class.test.ts` |
| **Step 4: Performance Validation** | Benchmark memory allocation and throughput against baseline `Reactive`. | `packages/tempo/bench/` |
