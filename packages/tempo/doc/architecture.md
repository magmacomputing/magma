# 🏗️ Core Architecture

Tempo v3.7.x introduces several industry-leading architectural patterns designed for maximum resilience in complex Monorepo and Proxy-wrapped environments.

## 🌐 Shared Global Registry

### TempoRuntime — single hardened bridge (v3.0+)

Prior to the v3.x series, Tempo spread its inter-module state across many `globalThis[Symbol.for(…)]` slots (`$terms`, `$extends`, `$modules`, `$installed`, `$reset`, `$Plugins`, `$Register`). Each slot was a potential tamper target, making the global namespace difficult to audit securely.

As of modern builds, all bookkeeping is consolidated inside a single **`TempoRuntime`** object (`#tempo/support`). The runtime is stored on `globalThis` under one hardened, highly protected property:

```typescript
Symbol.for('magmacomputing/tempo/runtime')
```

The property descriptor is `enumerable: false, configurable: false, writable: false`. External code can neither replace nor delete the runtime.

**Benefits:**
- **Reduced Global Footprint** — Consolidation from seven scatter-slots down to a single root.
- **Centralized Hardening** — Strict input validation (`Tempo.extend`) and hook management (`setRegisterHook`, `fireRegisterHook`) operate securely from one nexus.
- **Scoped Runtimes (Experimental)** — `TempoRuntime.createScoped()` returns a fresh, isolated runtime for clean test isolation without `globalThis` manipulation. *Note: This remains an experimental internal feature and is not yet fully threaded through all core utilities. Unlike the primary runtime, a scoped runtime is not pinned to `globalThis`, does not receive the hardened `defineProperty` protections, and relies strictly on lexical scoping.*
- **Multi-Bundle / HMR Safety** — `getRuntime()` checks `globalThis[BRIDGE]` before constructing, guaranteeing that two bundle copies of Tempo always share the identical runtime object, thereby resolving complex split-brain states in monorepos.

**User-facing "Global Discovery" slots remain on `globalThis`.** The `sym.$Tempo` slot (and custom discovery symbols passed to `Tempo.init`) are intentionally exposed for user-readability, remaining ordinary writable properties. Only sensitive internal bookkeeping was moved into the hardened runtime.

To solve the "Split-Brain" issue inherent in monorepo development, Tempo utilizes a **Shared Global Registry**. By leveraging `Symbol.for('magmacomputing/library/registry')` on `globalThis`, all versions of the Tempo and Library packages share a unified type-identification engine. This ensures classes are accurately identified as constructors even when loaded across disparate module boundaries.

## 🕵️ Decoupled Logging
Tempo utilizes a centralized, functional diagnostic engine (via `logError` / `logWarn` utilities) relying on private context to avoid polluting the public console or altering object state. This ensures parsing telemetry never clashes with standard application logic.
- **Context-Aware**: Logs rigorously track their discovery path (e.g., "Applied via Global Discovery").
- **Zero-Footprint**: When `debug: 0`, the logging overhead is mathematically eliminated.
- **Symbol-Gated**: Diagnostic metadata is attached via private symbol variable directly (e.g., `config[sym.$LogConfig]`), making it invisible to standard iteration (`Object.keys`) and serialization (`JSON.stringify`).

## 🛡️ Hardened Functional Resolution
The engine implements a "Fail-Safe" execution pattern for functional inputs, automatically recovering from misidentified types—such as ES6 classes wrapped in defensive Proxies or circular dependency deadlocks.
- **Defensive Execution**: All plugin invocations are wrapped in recursive `try/catch` execution blocks.
- **Silent Failover**: When combined with `catch: true`, resolution failures safely return a **Void Instance**, preventing application crashes while surfacing clear diagnostic symbols for debugging.

## 🏗️ Tempo Architecture: Internal Protection & Performance

Tempo employs two distinct methodologies for protecting its internal state. These strategies are highly complementary, each meticulously tailored to a specific scope (Instance vs. Global) and performance requirement.

---

## 🧭 Methodology Comparison

| Feature | **Lazy Evaluation (Shadowing)** | **Soft Freeze (Proxy)** |
| :--- | :--- | :--- |
| **Primary Target** | `Tempo.#term`, `Tempo.#fmt` (Instance State) | `NUMBER`, `FORMAT` (Global Registries) |
| **Scope** | **Instance-Specific**: Unique to every separate `new Tempo()` call. | **Global-Shared**: One single source of truth used by all instances. |
| **Primary Goal** | **Performance**: Avoid computing expensive Terms (e.g., `qtr` or `szn`) until explicitly requested. | **Extensibility**: Allow plugins to safely append new data to registries at runtime. |
| **Mechanism** | `Object.create(proto)` + Prototype Shadowing. | `new Proxy(target)` + Symbol-bypass. |
| **Why this one?** | **Memory Efficiency**: Thousands of instances share the same base prototype. | **Reference Stability**: Shared registries must persist at the same object reference. |

---

## ⚡ The "Zero-Cost Constructor" Objective
Tempo is built with a militant **"Performance First"** mindset, specifically targeting the computational overhead of the class constructor. In high-frequency applications (like Tickers or real-time Dashboards), creating thousands of objects must be nearly as computationally cheap as primitive assignments.

**Status: Achieved.** We successfully meet the Zero-Cost objective. Benchmarks demonstrate an `O(1)` instantiation overhead of ~523µs, and a fast-fail rejection speed of ~359µs. 

This objective is achieved through two primary architectural pillars:
1. **Lazy Evaluation ([Section 1](#1-lazy-evaluation-shadowing))**: Deferring the computationally expensive work of string parsing and Term calculation until the first strict property access.
2. **Master Guard ([Section 3](#3-master-guard-fast-fail-sync-point))**: Implementing a high-speed "fast-fail" gatekeeper to instantly reject invalid inputs before parsing logic is engaged.

Together, these pillars guarantee that `new Tempo()` maintains an `O(1)` constructor execution time by completely deferring `O(N)` parsing workloads, regardless of the density of registered plugins or custom terms.

---

## 🔁 Iteration & Enumerability (Delegator Proxies)

A delegator Proxy is a wrapper whose traps forward operations to an internal target/handler pair. Unlike a standard Proxy, delegation is explicit and tightly routed through an intermediate forwarding layer. In Tempo, the "Generic Lazy Delegator Proxy" handles the public delegation mechanism, while lazy shadowing initializes the private state. These mechanisms coexist: the `instance.term` / `instance.fmt` public API employs the delegator Proxy path, and `Tempo.#term` / `Tempo.#fmt` private fields are initialized exactly once via lazy shadowing.

### ✅ `Object.keys()` Behavior
`Object.keys(instance.fmt)` and `Object.keys(instance.term)` return the enumerable own keys strictly registered on each delegator target.

- **Proxy Discovery (Definition)**: This is the proxy-handler phase that enumerates available target keys and installs enumerable lazy getter properties on the proxy target *without* computing their values.
- **Triggered by Enumeration APIs**: Discovery executes when enumeration APIs execute, including `Object.keys(instance.fmt)`, `for...in`, and `Reflect.ownKeys(...)`.
- **Timing**: Discovery happens at enumeration time (before any property `get`), establishing key visibility prior to value resolution.
- **Relation to [Section 1](#1-lazy-evaluation-shadowing)**: Discovery only registers getters; actual value computation and memoization trigger purely on-demand.
- **After Access**: Getter access memoizes values directly onto the target object; keys remain highly stable and do not "move" across prototype links.

### 🛡️ Iteration Notes
- **`Object.keys` / `for...in` / Object Spread**: Operate reliably on enumerable keys exposed by the delegator target after discovery.
- **`[Symbol.iterator]`**: Maintains explicit iterator semantics where fully implemented.
- **`Tempo.registry.formats` & `Tempo.registry.terms`**: These static getters provide a registry-wide macroscopic view of available keys, entirely independent of per-instance memoization state.

---

## 1. Lazy Evaluation (Shadowing)
Used for: `Tempo.#term`, `Tempo.#fmt`

The **Instance Shadowing** pattern is engineered for massive scale. When a library handles dense operations, creating thousands of `new Proxy()` objects injects unacceptable memory overhead. Instead, Tempo exploits the native JavaScript prototype chain.

### How it works:
- **Stage 0**: All instances initially point to the identical base `#term` object containing un-evaluated getters.
- **Stage 1**: When a Term (e.g., `.qtr`) is accessed, the value is computationally evaluated exactly once.
- **Stage 2**: Tempo utilizes a **Generic Lazy Delegator** Proxy (via `getLazyDelegator`) which catches property access and evaluates it strictly on-demand.
- **Result**: The V8 engine executes lookups via an aggressively optimized Proxy handler, making lookups mathematically comparable to raw property access while keeping the state strictly immutable.

::: tip
For deeper implementation schematics, see the **[Lazy Evaluation Pattern](./lazy-evaluation-pattern.md)**.
:::

---

## 2. Soft Freeze Strategy (Proxy)
Used for: `Tempo.NUMBER`, `Tempo.FORMAT`, `Tempo.TIMEZONE`, `Tempo.config`

Global registries must remain **live** yet highly **secure**. As of the modern v3.x series, these are protected by a "Soft Freeze" layer to prevent state corruption or prototype poisoning by third-party code.

### How it works:
- **The User**: Interacts with a read-only Proxy that strictly behaves like a frozen object. Direct assignments are hard-blocked to prevent poisoning the global state.
- **The Library**: Utilizes a private symbol bypass to execute "Transactional Updates" natively via `registryUpdate()`.
- **Result**: The object reference remains constant while facilitating deeply controlled extensibility. This ensures that internal high-speed caches (like the Master Guard) can be synchronously rebuilt whenever a registry mutates.

::: tip
For deeper implementation schematics, see the **[Soft Freeze Strategy](./soft_freeze_strategy.md)**.
:::

---

<a id="3-master-guard-fast-fail-sync-point"></a>
## ⚡ 3. Master Guard (Guarded-Lazy Strategy)
Used for: `new Tempo(string | number)`

The **Guarded-Lazy** strategy ensures that even under the weight of hundreds of custom plugins, the constructor entry point remains near-instantaneous. This logic is decoupled into a high-performance `engine.guard.ts` module.

### How it works:
1. **Longest-Token Matching**: To prevent fractional matching (e.g., matching `qtr` inside `quarter`), the guard executes a greedy "Scan-and-Consume" loop that strongly prioritizes the longest available token match.
2. **Unified Wordlist**: The guard systematically ingests all registered Terms, Timezones, Month names, and Custom Events into a single `O(1)` Set lookup.
3. **High-Speed Gatekeeper**: By eliminating complex backtracking regular expressions, the gatekeeper provides deterministic `O(1)` performance regardless of the depth of registered plugins.
4. **Versioned Registry**: To avoid catastrophic redundant wordlist rebuilding, the Guard strictly monitors a version counter on the alias registry. The wordlist is dynamically rebuilt *only* when a valid mutation occurs.
5. **Auto-Lazy**: Valid inputs that successfully clear the guard automatically shift the instance to `mode: 'defer'`, completely deferring the heavy `O(N)` parsing work until a property is strictly read.

---

## 🧩 Centralized Alias Management
Tempo consolidates all Event and Period alias logic into a deeply optimized **`AliasEngine`**. 

### How it works:
- **Hierarchical Registry**: Aliases operate in a strict prototype-aware chain. A local `Tempo` instance can deploy its own private aliases that safely shadow global implementations, all while sharing the underlying resolution engines.
- **Rich Metadata**: Every resolution returns a strict `AliasResult`, providing the Parser with immediate categorical knowledge of the alias's origin (global vs local), structural type, and clock-snapping requirements.
- **Clock Snapping**: Time-based aliases (e.g. `8:00`) are mathematically "snapped" to absolute precision, clearing sub-second drift (ms, us, ns) directly during the resolution phase.
- **Decoupled Registration**: By deprecating legacy raw objects, the modern registry is highly protected against accidental mutation and supports high-efficiency, version-aware monitoring.

### 📈 Validation & Performance
The algorithmic efficiency of the Master Guard and the success of the Zero-Cost objective remain strictly validated via core benchmarking:

- **Instantiation Overhead**: ~523µs on average (passing the Master Guard). *(Node.js v24.14.1, 12th Gen Intel i7-1255U, Linux x86_64; steady-state measured after 1k warm-up runs, n=10k. Validates the Zero-Cost O(1) objective on this hardware.)*
- **Fast-Fail Rejection**: ~359µs on average (failing the Master Guard). *(Node.js v24.14.1, 12th Gen Intel i7-1255U, Linux x86_64; steady-state measured after 1k warm-up runs, n=10k. Demonstrates the Master Guard's low-latency rejection performance.)*

::: tip
For detailed execution timings and methodology, see the **[Performance Benchmarks](./tempo.benchmarks.md)**.
:::

---

## 🔄 Internal Lifecycle & Reactive Sync
Tempo commands system-wide synchronization through a deeply integrated, Symbol-based hook ecosystem.

### Reactive Registration
When a plugin is imported via a side-effect (`import '@magmacomputing/tempo/duration'`), it triggers a strict **`sym.$Register`** hook. 
- **Auto-Sync**: The `Tempo` core listens for these hooks and synchronously updates its internal registries.
- **Guard Rebuild**: Upon any new Term or layout registration, the **Master Guard** is automatically rebuilt to dynamically ingest the new tokens, ensuring the "Zero-Cost Constructor" remains entirely synchronized with the ecosystem.

### Disposable Engine (`Symbol.dispose`)
The `Tempo` class rigorously implements the explicit resource management pattern. 
- **Clean Slate**: Calling `Tempo[Symbol.dispose]()` (or utilizing the `using` keyword in a test suite) comprehensively resets all global registries and configuration parameters back to factory defaults.
- **Isolation**: This is mathematically critical for automated testing environments to prevent memory or state-leaks between discrete test cases.

---

## ⚖️ Summary
The Tempo architecture strictly follows the structural principle of **"Right Tool for the Job"**:
- **Shadowing** provides the extreme performance and mathematical memory efficiency required for **per-instance computed state**.
- **Proxies** enforce the strict reference stability and highly controlled extensibility required for **global system registries**.
- **Master Guard** algorithmically ensures that even under massive extensibility, the entry point maintains a true **"Zero-Cost Constructor"**.
