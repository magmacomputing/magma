![Tempo Library](/library-logo.svg)

# Tempo Library Functionality

While Tempo is primarily a Date-Time engine, it relies on several custom utilities under the hood to handle data structures, deep cloning, and serialization safely. 

These utilities are robust enough that they are exported as public API methods for use within your own application logic.

This document serves as an index summarizing these core library features.

<br>

## 1. Enumerators (`Enum.from`, `Enum.*`)

Tempo uses `Enum.from` (and legacy alias `enumify`) to create heavily-protected, iterable enum-like objects instead of relying on native TypeScript enums.

This allows for structural typing, easy type-safe iteration via static reflection helpers (`Enum.keys()`, `Enum.values()`), and runtime safety without the overhead or compilation quirks of standard TS Enums.

It is heavily used internally for concepts like `Weekdays`, `Months`, `Compass cardinal points` and `Meteorological Seasons`.

👉 **[Read the full Enumerators Guide](./tempo.enumerators.md)** for details on definition, methods, and a comparison with native enums.

<br>

## 2. Serialization (`stringify`, `objectify`, `cloneify`)

Native JSON methods (`JSON.stringify` and `JSON.parse`) often fail or destructively mutate rich JavaScript data types like `BigInt`, `Map`, `Set`, `Symbol`, and `Date`.

To ensure safe data persistence across `localStorage`, `IndexedDB`, or network boundaries, Tempo implements its own serialization suite:

*   **`stringify()`:** Safely serializes rich objects, protecting circular references and complex types.
*   **`objectify()`:** Safely reconstructs objects previously serialized by `stringify()`.
*   **`cloneify()`:** Performs a deep-copy of an object, preserving all rich data types.

👉 **[Read the full Serializers Guide](./tempo.serializers.md)** for detailed usage, benefits, and trade-offs compared to native `JSON` methods or `structuredClone`.

<br>

## 3. High-Performance Push/Pull Streams (`Reactive`)

Tempo includes `Reactive<T>`, a bidirectional asynchronous stream primitive that unifies push-based event listeners and pull-based async iterators (`for await`) with $O(1)$ dispatch, backpressure buffering, and explicit resource management (`using`).

*   **Push/Pull Duality:** Seamlessly switch between event subscribers (`stream.on('data', cb)`) and async pull iteration (`await stream.pull()`, `for await`).
*   **Disposable Subscriptions:** `stream.on()` returns a `Reactive.Subscription` implementing TC39 `Disposable` (`using sub = stream.on(...)`).
*   **Stream Truncation:** Easily gate or bound streams via `stream.until(signal | promise | otherStream)`.
*   **Leak-Proof Finalization:** Backed by `Finalizer` to ensure unclosed abandoned streams are safely reclaimed by the garbage collector.

👉 **[Read the full Reactive Streams Guide](./tempo.reactive.md)** for detailed usage, patterns, and state inspection.

<br>

## 4. Deferred Promises (`Pledge`)

Tempo provides a specialized wrapper around `Promise.withResolvers()` called `Pledge`. It is designed to simplify modern asynchronous patterns where you need to manage a promise's lifecycle externally.

### Key Features
*   **State Tracking:** Transparent access to `isPending`, `isResolved`, and `isRejected` flags.
*   **Custom Lifecycle Hooks:** Support for `onResolve`, `onReject`, and `onSettle` callbacks.
*   **Immutable Shell:** Once created, the Pledge instance is frozen, ensuring the promise reference cannot be swapped.
*   **Resource Management:** Implements `Symbol.dispose` to automatically reject pending promises when they go out of scope, preventing deadlocks or memory leaks.

👉 **[Read the full Pledge Guide](./tempo.pledge.md)** for advanced usage with callbacks, debugging tags, and lifecycle management.

<br>

## 5. GC Safety & Memory Management (`WeakCache`, `Finalizer`)

For performance-critical and memory-sensitive architectures, Tempo exports two key garbage-collection primitives:

*   **`WeakCache<K, V>`:** High-performance, GC-cooperative memoization cache that allows unreferenced keys or values to be collected without memory retention.
*   **`Finalizer`:** Safe abstraction over `FinalizationRegistry` to register automatic teardown callbacks for timers, streams, or proxies without pinning object references.

<br>

## 6. Functional Evaluation (`evaluate`, `dynamicProxy`)

Tempo exports functional evaluation utilities for resolving static values, lazy suppliers, and dynamic object proxies:

*   **`evaluate(...values)`:** Synchronously resolves candidate values or zero-argument supplier functions (`() => T`) in order, returning the first defined result (lazy coalesce with short-circuiting).
*   **`evaluateAsync(...values)`:** Asynchronously resolves static values, sync/async suppliers, or Promises (`() => Promise<T> | T`) in order with short-circuiting.
*   **`evaluateConfig(config)` / `evaluateConfigAsync(config)`:** Resolves `Evaluable` property suppliers on the top-level properties of a configuration dictionary.
*   **`dynamicProxy(target)`:** Wraps a target object with dynamic property traps that evaluate function-valued properties lazily on-access.
*   **`Evaluable<T>` / `AsyncEvaluable<T>`:** TypeScript utility types representing values that can be provided directly or supplied lazily via functions.

```typescript
import { evaluate, evaluateAsync, dynamicProxy } from 'tempo-kit/library';

// Synchronous supplier evaluation with lazy cascading fallback (short-circuited)
const tz = evaluate(options.timeZone, () => process.env.TZ, 'UTC');

// Asynchronous supplier evaluation (e.g. secret vault / remote config)
const apiKey = await evaluateAsync(provider.key, async () => await vault.getKey('openai'));

// Dynamic proxy with lazy on-access getters
const dynamicSettings = dynamicProxy({
  timeout: 5000,
  token: () => getActiveToken()
});
```

<br>

## 7. Class Decorators (`@Immutable`, `@Serializable`, `@Static`)

Tempo uses lightweight TypeScript class decorators internally to enforce immutability (`@Immutable`), register custom serialization handlers (`@Serializable`), and prevent instantiation of static-only classes (`@Static`).

<br>

## 8. System Intl Watchers (`watchIntl`) {#watch-intl}

`watchIntl(onChange, options?)` observes the host runtime's resolved `Intl.DateTimeFormat().resolvedOptions()` (`locale` and `timeZone`) and invokes `onChange(next, prev)` only when either value changes:

- **Zero-polling in browsers**: Automatically listens to `window` (`languagechange`, `focus`), `document` (`visibilitychange` when visible), and `navigator.connection` (`change`) with no background timers.
- **Isomorphic host hooks**: Non-browser or hybrid runtimes (such as Electron, Tauri, or Node daemons) can pass a custom `subscribe(trigger)` hook, call `watcher.check()` manually, or opt into `pollIntervalMs`.
- **Deterministic cleanup**: Returns a frozen `IntlWatcher` implementing `dispose()` and `Symbol.dispose` (`using`).

```typescript
import { watchIntl } from 'tempo-kit/library';

using watcher = watchIntl((next, prev) => {
  console.log(`Intl changed: ${prev.timeZone} → ${next.timeZone} (${next.locale})`);
});

// Optional manual check on demand
watcher.check();
```

<br>

## 9. TC39 Signals (`Signify`) {#signify}

`Signify` is a zero-dependency, frozen TC39 Signals implementation (`Signify.State`, `Signify.computed`, `Signify.effect`, `Signify.subtle.Watcher`) with `WeakRef`-backed consumer tracking—powering `Reactive.toSignal()`, `Ticker`, `NTP`, and `@tempo-kit/plugin-signals`:

```typescript
import { Signify } from 'tempo-kit/library';

const count = new Signify.State(1);
const doubled = Signify.computed(() => count.get() * 2);

count.set(3);
console.log(doubled.get()); // 6

// Or observe changes asynchronously on microtask flush
using _stop = Signify.effect(() => {
  console.log('doubled:', doubled.get());
});
```

<br>

## 10. Disposable Cancellation (`Aborter`) {#aborter}

`Aborter` extends `AbortController` with `Symbol.dispose` (`using`), paired with `anySignal`, `timeoutSignal`, and `onAbort` for leak-free cancellation across `Reactive` streams and async plugins:

```typescript
import { Aborter, timeoutSignal, anySignal } from 'tempo-kit/library';

using aborter = new Aborter();
const signal = anySignal(aborter.signal, timeoutSignal(5_000));
// Exiting the `using` scope automatically aborts `aborter.signal`
```

<br>

## 11. Bounded LRU/TTL Caching (`BoundedCache`) {#bounded-cache}

`BoundedCache<K, V>` extends `Map` with configurable max-size LRU eviction and per-entry TTL expiration, protecting Tempo's parser, formatter, and `Intl` hot paths from unbounded memory growth:

```typescript
import { BoundedCache } from 'tempo-kit/library';

const cache = new BoundedCache<string, number>(500, 60_000); // max 500 entries, 60s TTL
cache.set('key', 42);
```

<br>

## 12. Exhaustive API Reference

> [!NOTE]
> These are isolated, standalone utility functions and classes developed internally to support our various applications. They are entirely free to use and are documented here as a convenience reference for our users.

While some of these utilities may be used internally by the Tempo library, many are completely independent (such as the browser and server-specific functions). They do not declare external dependencies, keeping them lightweight and portable.

The library is split into domain-specific modules:
- **Browser**: Functions and classes that rely on browser APIs (e.g., `window`, `localStorage`, `Geolocation`).
- **Server**: Node.js specific utilities (e.g., file system access, server-side JWT decoding).
- **Common**: Runtime-agnostic utilities shared across all environments (`evaluation`, `assertion`, `coercion`, `cipher`, `json`, `calendar`, `recurrence`, `proxy`).

You can browse the full API reference in the sidebar below this section.
