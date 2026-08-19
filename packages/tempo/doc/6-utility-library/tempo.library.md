![Tempo Library](/library-logo.svg)

# Tempo Library Functionality

While Tempo is primarily a Date-Time engine, it relies on several custom utilities under the hood to handle data structures, deep cloning, and serialization safely. 

These utilities are robust enough that they are exported as public API methods for use within your own application logic.

This document serves as an index summarizing these core library features.

<br>

## 1. Enumerators (`enumify`)

Tempo uses a custom utility called `enumify` to create heavily-protected, iterable enum-like objects instead of relying on native TypeScript enums.

This allows for structural typing, easy iteration (`.keys()`, `.values()`), and runtime safety without the overhead or compilation quirks of standard TS Enums.

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

## 3. Decorators (`@Immutable`, `@Serializable`, `@Static`)

Tempo utilizes several custom TypeScript class decorators internally to enforce class behaviors such as strict immutability and preventing instantiation.

Because Tempo's build target is currently ES2022, this decorator functionality is transpiled away into standard JavaScript functions by the compiler rather than using native ECMAScript decorators. Our aim is to transition these to first-class native features once JavaScript engines natively support the ECMAScript decorator proposal.

👉 **[Read the full Decorators Guide](./tempo.decorators.md)** for details on the specific decorators used within the codebase.

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

## 5. Functional Evaluation (`evaluate`, `dynamicProxy`)

Tempo exports zero-overhead functional evaluation utilities for resolving static values, lazy suppliers, and dynamic object proxies:

*   **`evaluate(value, fallback?)`:** Synchronously resolves a static value or zero-argument supplier function (`() => T`). If the result is `undefined`, evaluates and returns the optional fallback.
*   **`evaluateAsync(value, fallback?)`:** Asynchronously resolves static values, sync/async suppliers, or Promises (`() => Promise<T> | T`).
*   **`evaluateConfig(config)` / `evaluateConfigAsync(config)`:** Deeply resolves all `Evaluable` property suppliers across a configuration dictionary.
*   **`dynamicProxy(target, overrides)`:** Wraps a target object with dynamic property traps that evaluate functional overrides lazily on-access.
*   **`Evaluable<T>` / `AsyncEvaluable<T>`:** TypeScript utility types representing values that can be provided directly or supplied lazily via functions.

```typescript
import { evaluate, evaluateAsync, dynamicProxy } from '@magmacomputing/tempo/library';

// Synchronous supplier evaluation with fallback
const tz = evaluate(() => process.env.TZ, 'UTC'); // Returns env TZ or 'UTC'

// Asynchronous supplier evaluation (e.g. secret vault / remote config)
const apiKey = await evaluateAsync(async () => await vault.getKey('openai'));

// Dynamic proxy with lazy on-access getters
const dynamicSettings = dynamicProxy(
  { timeout: 5000 },
  { token: () => getActiveToken() }
);
```

<br>

## 6. Exhaustive API Reference

> [!NOTE]
> These are isolated, standalone utility functions and classes developed internally to support our various applications. They are entirely free to use and are documented here as a convenience reference for our users.

While some of these utilities may be used internally by the Tempo library, many are completely independent (such as the browser and server-specific functions). They do not declare external dependencies, keeping them lightweight and portable.

The library is split into domain-specific modules:
- **Browser**: Functions and classes that rely on browser APIs (e.g., `window`, `localStorage`, `Geolocation`).
- **Server**: Node.js specific utilities (e.g., file system access, server-side JWT decoding).
- **Common**: Runtime-agnostic utilities shared across all environments (`evaluation`, `assertion`, `coercion`, `cipher`, `json`, `calendar`, `recurrence`, `proxy`).

You can browse the full API reference in the sidebar below this section.
