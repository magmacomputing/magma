# 🏗️ Core Architecture

Tempo v2.0.1 introduces several industry-leading architectural patterns designed for maximum resilience in complex Monorepo and Proxy-wrapped environments.

## 🌐 Shared Global Registry

### TempoRuntime — single hardened bridge (v2.2+)

Prior to v2.2, Tempo spread its inter-module state across many `globalThis[Symbol.for(…)]` slots (`$terms`, `$extends`, `$modules`, `$installed`, `$reset`, `$Plugins`, `$Register`).  Each slot was a potential tamper target and the scattered writes made the global namespace harder to audit.

As of v2.2, all of that bookkeeping is consolidated inside a single **`TempoRuntime`** object (`#tempo/support`).  The runtime is stored on `globalThis` under one hardened property:

```typescript
Symbol.for('magmacomputing/tempo/runtime')
```

The property descriptor is `enumerable: false, configurable: false, writable: false`.  External code can neither replace nor delete the runtime.

**Benefits:**
- **Reduced global footprint** — one slot instead of seven.
- **Centralised hardening** — input validation (`addTerm`, `addPlugin`) and hook management (`setRegisterHook`, `fireRegisterHook`) live in one place.
- **Scoped runtimes (Experimental)** — `TempoRuntime.createScoped()` returns a fresh, isolated runtime for clean test isolation without `globalThis` manipulation. This remains an experimental internal feature and is not yet fully threaded through all core utilities. Unlike the primary runtime, a scoped runtime is not pinned to `globalThis`, does not receive the hardened `defineProperty` protections, and relies on the returned lexical reference instead of the shared `getRuntime()` / `globalThis[BRIDGE]` path. Implementation examples of this test-scoping pattern can be found in [plugin_registration.test.ts](../test/plugin_registration.test.ts) and [duration.core.test.ts](../test/duration.core.test.ts).
- **Multi-bundle / HMR safety** — `getRuntime()` checks `globalThis[BRIDGE]` before constructing, so two bundle copies of Tempo always share the same runtime object, preserving the original split-brain guarantee.

**User-facing "Global Discovery" slots remain on `globalThis`.**  The `sym.$Tempo` slot (and custom discovery symbols passed to `Tempo.init`) are intentionally user-readable, so they stay as ordinary writable properties.  Only internal bookkeeping moved into the runtime.

To solve the "Split-Brain" issue inherent in monorepo development (where multiple instances of the same library might be loaded), Tempo utilizes a **Shared Global Registry**. By leveraging `Symbol.for('magmacomputing/library/registry')` on `globalThis`, all versions of the Tempo and Library packages share a unified type-identification engine. This ensures that classes are correctly identified as constructors even when loaded across different module boundaries.

## 🕵️ Decoupled Logging (Logify)
Tempo uses **Logify**, a diagnostic engine that leverages private Symbols to avoid polluting the public console or object state.
- **Context-Aware**: Logs track their discovery path (e.g., "Applied via Global Discovery").
- **Zero-Footprint**: When `debug: false`, the logging overhead is mathematically eliminated.
- **Symbol-Gated**: Diagnostic metadata is attached via `Symbol.for($Logify)`, making it invisible to standard iteration (`Object.keys`) and serialization (`JSON.stringify`).

## 🛡️ Hardened Functional Resolution
The engine implements a "Fail-Safe" execution pattern for functional inputs, automatically recovering from misidentified types—such as ES6 classes wrapped in defensive Proxies or circular dependency deadlocks.
- **Defensive Execution**: All plugin invocations are wrapped in recursive `try/catch` blocks.
- **Silent Failover**: When combined with `catch: true`, resolution failures return a **Void Instance**, preventing application crashes while providing clear diagnostic symbols for debugging.

## 🏗️ Tempo Architecture: Internal Protection & Performance

Tempo employs two distinct methodologies for protecting its internal state. These strategies are complementary, each tailored to a specific scope (Instance vs. Global) and performance requirement.

---

## 🧭 Methodology Comparison

| Feature | **Lazy Evaluation (Shadowing)** | **Soft Freeze (Proxy)** |
| :--- | :--- | :--- |
| **Primary Target** | `Tempo.#term`, `Tempo.#fmt` (Instance State) | `NUMBER`, `FORMAT` (Global Registries) |
| **Scope** | **Instance-Specific**: Unique to every separate `new Tempo()` call. | **Global-Shared**: One single source of truth used by all instances. |
| **Primary Goal** | **Performance**: Avoid computing expensive terms (e.g., `qtr` or `szn`) until they are needed, | **Extensibility**: Allow plugins to safely append new data to registries at runtime. |
| **Mechanism** | `Object.create(proto)` + Prototype Shadowing. | `new Proxy(target)` + Symbol-bypass. |
| **Why this one?** | **Memory Efficiency**: Thousands of instances share the same base prototype. | **Reference Stability**: Shared registries must stay at the same object reference. |

---

## ⚡ The "Zero-Cost Constructor" Objective
Tempo is built with a **"Performance First"** mindset, specifically targeting the overhead of the class constructor. In high-frequency applications (like Tickers or real-time Dashboards), creating thousands of objects must be nearly as cheap as a primitive assignment.

This objective is achieved through two primary architectural pillars:
1.  **Lazy Evaluation ([Section 1](#1-lazy-evaluation-shadowing))**: Deferring the expensive work of string parsing and term computation until the first property access.
2.  **Master Guard ([Section 3](#3-master-guard-fast-fail-sync-point))**: Implementing a high-speed "fast-fail" gatekeeper to instantly reject invalid inputs when parsing *is* eventually triggered.

Together, these ensure that `new Tempo()` maintains an $O(1)$ constructor execution time by deferring $O(N)$ full-parse work until the first property access, regardless of how many plugins or custom terms are registered in the global system.

---

## 🔁 Iteration & Enumerability (The Shadowing Chain)

When using prototype shadowing, the JavaScript behavior for property inspection changes significantly. This is a trade-off for the performance gains.

### ⚠️ The `Object.keys()` Warning
`Object.keys(instance.fmt)` only returns the **enumerable own properties** of the current link in the shadowing chain.
- **Initially**: Returns `[]` (all evaluated getters are non-enumerable on the base).
- **After 1st Access** (e.g., `.date`): Returns `['date']`.
- **After 2nd Access** (e.g., `.time`): Returns `['time']`. The `.date` property is now located on the **immediate prototype** of the current object.

### 🛡️ The Flattening Iterator
Tempo implements a **Flattening Iterator** via `[Symbol.iterator]` which enables iterable consumers like `for...of`, array spread (`[...instance]`), and `Object.fromEntries(instance)` to traverse the shadowing chain (using `Object.getPrototypeOf`) and collect evaluated property entries.

- **`[Symbol.iterator]`**: Traverses the shadowing chain to provide a flattened view of all computed state.
- **⚠️ Important**: `for...in` and object spread (`{...instance}`) **do not** use the iterator; instead, they rely on enumerable own/inherited properties and are not supported by the flattening logic.
- **`Tempo.formats` & `Tempo.terms`**: These static getters continue to provide a registry-wide view of **available** keys across the entire system, regardless of their evaluation state.

---

## 1. Lazy Evaluation (Shadowing)
Used for: `Tempo.#term`, `Tempo.#fmt`

The **Instance Shadowing** pattern is designed for massive scale. When a library is used heavily, creating thousands of `new Proxy()` objects adds significant memory overhead. Instead, Tempo leverages the native JavaScript prototype chain.

### How it works:
- **Stage 0**: All instances initially point to the same base `#term` object containing un-evaluated getters.
- **Stage 1**: When a term (e.g., `.qtr`) is accessed, the value is computed once.
- **Stage 2**: Tempo uses a **Generic Lazy Delegator** Proxy (via `getLazyDelegator`) which catches property access and evaluates it on-demand.
- **Result**: The JS engine executes lookups via an optimized Proxy handler, making lookups nearly as fast as raw property access while keeping the state strictly immutable.

::: tip
For more implementation details, see [Lazy Evaluation Pattern](./lazy-evaluation-pattern.md).
:::

---

## 2. Soft Freeze Strategy (Proxy)
Used for: `Tempo.NUMBER`, `Tempo.FORMAT`, `Tempo.TIMEZONE`, `Tempo.config`

Global registries must be **live** but **secure**. As of **v2.0.1**, these are protected by a "Soft Freeze" layer to prevent accidental state corruption by third-party code.

### How it works:
- **The User**: Sees a read-only Proxy that behaves like a frozen object. Direct assignments are blocked to prevent "poisoning" the global state.
- **The Library**: Uses a private symbol bypass to perform "Transactional Updates" via `registryUpdate()`.
- **Result**: The object reference remains constant while allowing controlled extensibility. This ensures that internal caches (like the Master Guard) can be re-synchronized whenever a registry changes.

::: tip
For more implementation details, see [Soft Freeze Strategy](./soft_freeze_strategy.md).
:::

---

<a id="3-master-guard-fast-fail-sync-point"></a>
## ⚡ 3. Master Guard (Guarded-Lazy Strategy)
Used for: `new Tempo(string | number)`

The **Guarded-Lazy** strategy ensures that even with hundreds of custom plugins, the entry point remains nearly instantaneous. In **v2.0.1**, this was refined for 100% matching reliability.

### How it works:
1.  **Longest-Token Matching**: To prevent partial matching (e.g., matching `qtr` inside `quarter`), the guard uses a "Scan-and-Consume" loop that prioritizes the longest available token.
2.  **Unified Wordlist**: The guard automatically ingests all registered Terms, Timezones, Month names, and Custom Events into a single high-speed lookup Set.
3.  **High-Speed Gatekeeper**: By avoiding complex backtracking regexes, the gatekeeper provides predictable $O(1)$ performance even as the plugin list grows.
4.  **Auto-Lazy**: Valid inputs that pass the guard automatically switch the instance to `mode: 'defer'`, deferring the full $O(N)$ parse work until a property is actually read.

### 📈 Validation & Performance
The efficiency of the Master Guard and the success of the Zero-Cost objective have been validated via local benchmarking:

- **Instantiation Overhead**: ~523µs on average (passing the Master Guard). *(Node.js v24.14.1, 12th Gen Intel i7-1255U, Linux x86_64; steady-state measured after 1k warm-up runs, n=10k. Validates the Zero-Cost objective on this hardware.)*
- **Fast-Fail Rejection**: ~359µs on average (failing the Master Guard). *(Node.js v24.14.1, 12th Gen Intel i7-1255U, Linux x86_64; steady-state measured after 1k warm-up runs, n=10k. Demonstrates the Master Guard's low-latency rejection performance.)*

::: tip
For detailed timing results and methodology, see [Performance Benchmarks](./tempo.benchmarks.md).
:::

---

## 🔄 Internal Lifecycle & Reactive Sync
Tempo maintains system-wide synchronization through a private, Symbol-based hook system.

### Reactive Registration
When a plugin is imported via a side-effect (`import '@magmacomputing/tempo/ticker'`), it triggers a **`sym.$Register`** hook. 
- **Auto-Sync**: The `Tempo` class listens for these hooks and automatically updates its internal registries.
- **Guard Rebuild**: Every time a new term or layout is registered, the **Master Guard** is automatically rebuilt to include the new tokens, ensuring the "Zero-Cost Constructor" always stays up to date.

### Disposable Engine (`Symbol.dispose`)
The `Tempo` class implements the explicit resource management pattern. 
- **Clean Slate**: Calling `Tempo[Symbol.dispose]()` (or using the `using` keyword in a test suite) resets all global registries and configuration to their factory defaults.
- **Isolation**: This is critical for testing environments to prevent state-leaks between test cases.

---

## ⚖️ Summary
The Tempo architecture follows the principle of **"Right Tool for the Job"**:
- **Shadowing** provides the extreme performance and memory efficiency required for **per-instance computed state**.
- **Proxies** provide the reference stability and controlled extensibility required for **global system registries**.
- **Master Guard** ensures that even with massive extensibility, the entry point remains a "Zero-Cost Constructor".
