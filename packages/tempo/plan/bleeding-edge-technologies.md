# Bleeding-Edge Web & Server Technologies for Tempo

This document outlines next-generation Web Platform, Node.js/Deno, and TC39 standards for future exploration across **Tempo Core**, **`#library`**, and dedicated **Tempo Plugins**.

---

## 1. Tempo's Cross-Platform Ethos & Architectural Principles

Tempo is designed as a **universal, isomorphic time and date engine** across Node.js, Deno, Bun, Cloudflare Workers, Electron, and modern Web Browsers.

To maintain architectural integrity across heterogeneous runtimes, candidate technologies must satisfy one of three integration tiers:

1. **Universal Core Primitives**: Features that run natively across all target runtimes with zero external dependencies (e.g. `WeakCache`, `Finalizer`, `Pledge`, `Intl.DurationFormat`, `Symbol.dispose`).
2. **Isomorphic Adapters & Polyfills**: Where runtime parity diverges, Tempo builds cross-platform adapters to fill runtime gaps seamlessly (e.g., how `mapper.library` provides unified reverse-geocoding in Node.js environments where browser `navigator.geolocation` does not exist).
3. **Dedicated Optional Plugins with Progressive Enhancement**: Platform-specific optimizations (such as multi-tab browser synchronization or screen wake locks) must be isolated in optional plugins or must fail safely with silent no-ops when executed in headless/server runtimes.

---

## 2. Existing Bleeding-Edge Capabilities in Tempo `#library`

Tempo already leverages several cutting-edge platform primitives:
- **`WeakCache` (`WeakRef` & `Finalizer`)**: Universal weak-value object and regular expression memoization with automatic GC pruning in `packages/library/src/common/runtime/weakcache.class.ts`.
- **`Finalizer` (`finalizer.class`)**: Safe Garbage Collection finalization hook wrapper around `FinalizationRegistry` with self-guarding idempotent execution in `packages/library/src/common/runtime/finalizer.class.ts`.
- **Ticker & AtomicClock Auto-Finalization**: GC-backed zombie timer prevention and resource cleanup in `@magmacomputing/tempo-plugin-ticker` (v2.5.1) and `@magmacomputing/tempo-plugin-sync` (v1.1.1).
- **Atomic Cross-Thread Synchronization**: Lock-free nanosecond time synchronization across Web Workers and `worker_threads` via `SharedArrayBuffer` & `Atomics` in `@magmacomputing/tempo-plugin-sync` (v1.1.1).
- **Pledge GC Lifecycle Safety**: Zero-boilerplate finalization safety for unhandled/abandoned promises in `packages/library/src/common/runtime/pledge.class.ts`.
- **`Intl.DurationFormat` (`getDF`)**: Memoized duration formatting via native `Intl.DurationFormat` in `packages/library/src/common/runtime/international.library.ts`.
- **`Intl.Locale` Week Info (`getLI`)**: Native retrieval of `firstDay` and `weekend` definitions via `getLI` in `packages/library/src/common/runtime/international.library.ts` without external calendar data tables (aligning with finalized ECMA-402 Intl.Locale info specifications).
- **Explicit Resource Management**: Full support for TC39 `using` and `await using` (`Symbol.dispose`, `Symbol.asyncDispose`) across `Ticker`, `AtomicClock`, and `Pledge`.
- **Temporal Polyfill / TC39 Temporal Integration**: Foundation built on ISO 8601 calendar, exact nanosecond epochs, and timezone offsets.

---

## 3. High-Impact Candidate Technologies & Roadmap

### A. Web Locks API & Cross-Tab Synchronization (`navigator.locks` + `BroadcastChannel`)
**Target**: *Dedicated Plugin (`@magmacomputing/tempo-plugin-tabsync`) or Ticker Multi-Tab Engine*

* **The Problem**: When multiple browser tabs are open, each tab runs redundant 1-second timers, redundant network lookups, and independent clocks that can drift.
* **The Solution**:
  - Use `navigator.locks.request('tempo-master-clock', async (lock) => { ... })` to elect a single **Leader Tab**.
  - The Leader tab runs the master `Tempo.ticker` and broadcasts synchronized timestamps to all follower tabs via `BroadcastChannel('tempo-pulse')`.
  - If the leader tab closes, leadership transfers automatically and seamlessly to an existing follower tab in < 1ms.
* **Cross-Platform Caveats & Ethos Alignment**:
  - **Browser-Only Primitive**: `navigator.locks` and `BroadcastChannel` are browser/DOM-specific. In Node.js / clustered server environments, cross-process leadership relies on IPC or external stores.
  - **Architectural Fit**: Must **not** be baked into Tempo Core. Must live in an optional browser plugin (`@magmacomputing/tempo-plugin-tabsync`) with automatic detection and graceful no-op on non-browser environments.

---

### B. High-Precision Scheduling with `scheduler.postTask()` & `AbortSignal.timeout()`
**Target**: *Core Ticker / Scheduling Engine*

* **The Problem**: Standard `setTimeout` / `setInterval` can be throttled in background tabs, fight against UI animations during render cycles, and lack task priority levels.
* **The Solution**:
  - Integrate `scheduler.postTask(callback, { priority: 'user-visible' | 'background', signal })` for priority-aware task execution.
  - Standardize cancellation using `AbortSignal.timeout(ms)` and composite `AbortSignal.any([...])` for timeout and cancellation management.
* **Cross-Platform Caveats & Ethos Alignment**:
  - **Divergent Runtime Schedulers**: `scheduler.postTask` is Chrome/Edge/Deno-specific; Node.js relies on `setImmediate()` / `process.nextTick()`.
  - **Architectural Fit**: `AbortSignal.timeout` is universal across Node.js (18+) and modern browsers. Scheduling in Core requires an isomorphic abstraction layer that uses `scheduler.postTask` where present, falling back to microtasks / `setImmediate` in Node.js.

---

### C. Automatic Ticker, Sync & Stream Finalization (`Finalizer` / `FinalizationRegistry`)
**Target**: *`@magmacomputing/tempo-plugin-ticker` & `@magmacomputing/tempo-plugin-sync`*  
**Status**: **Delivered (Ticker v2.5.1, Sync v1.1.1, Library v4.4.3)**

* **The Problem**: If a developer instantiates an active ticker or event stream without calling `.stop()` or using `using`, active timer handles (`setInterval` / `setTimeout`) remain alive as orphaned zombie processes in the event loop.
* **The Solution**:
  - Registered active `Ticker` and `AtomicClock` handles with `Finalizer.register` (`finalizer.class.ts`).
  - When user code drops all references to the handle without explicitly stopping it, the Garbage Collector triggers the finalizer to automatically clear underlying timers.
  - Active registry `ACTIVE_TICKERS` holds `WeakRef<Ticker.Instance>`, ensuring `Tempo.tickers` queries live instances without pinning unreferenced tickers into memory.
* **Cross-Platform Caveats & Ethos Alignment**:
  - Fully universal across Node.js, Deno, Bun, and all modern browsers (ES2021+ `FinalizationRegistry` & `WeakRef`).

---

### D. Client-Server Clock Drift Compensation (HTTP `Date` & `Server-Timing`)
**Target**: *Dedicated Plugin (`@magmacomputing/tempo-plugin-ntp` / `drift`)*

* **The Problem**: End-user device clocks are often desynchronized from true atomic time by seconds or minutes.
* **The Solution**:
  - A lightweight fetch interceptor or HEAD ping measures round-trip time (RTT) and calculates client clock drift:
    `Δ = T_server - (T_client + RTT / 2)`
  - Applies a monotonic drift offset to `Tempo.now()`, ensuring accurate bidding, financial timestamp validation, and auction countdowns without altering OS system clocks.
* **Cross-Platform Caveats & Ethos Alignment**:
  - **Universal HTTP vs UDP NTP**: Native UDP NTP (RFC 5905, port 123) requires Node.js `dgram` sockets and is blocked in browser sandboxes.
  - **Architectural Fit**: The universal baseline should use HTTP `Date` / `Server-Timing` headers over standard `fetch`, ensuring 100% parity across Browser, Node.js, and Cloudflare Workers. An optional UDP NTP socket driver can be provided for server-only runtimes.

---

### E. TC39 Signals Integration (`Tempo.signal()`)
**Target**: *Dedicated Plugin (`@magmacomputing/tempo-plugin-signals`)*

* **The Problem**: Modern UI frameworks (Preact, Solid, Vue, Angular, Svelte) are converging on TC39 Signals for fine-grained reactivity.
* **The Solution**:
  - Provide reactive time signals backed by `WeakCache`:
    ```typescript
    const currentSecond = Tempo.signal({ interval: 1 });
    // Components reading currentSecond.value automatically re-render on pulse
    ```
* **Cross-Platform Caveats & Ethos Alignment**:
  - **Early TC39 Stage 1**: Specification is evolving with no native engine implementation in V8, SpiderMonkey, or JSC. Polyfills add non-trivial bundle weight.
  - **Framework Fragmentation**: Frameworks use incompatible reactive graph schedulers.
  - **Architectural Fit**: **Hold off**. Tempo already provides universal, zero-dependency async reactivity across all runtimes via `Symbol.asyncIterator` (`for await`), `Symbol.dispose`, and standard event subscriptions (`ticker.on('tick')`). Re-evaluate when TC39 Signals reaches Stage 3.

---

### F. Atomic Cross-Thread Synchronization (`SharedArrayBuffer` & `Atomics`)
**Target**: *`@magmacomputing/tempo-plugin-sync`*  
**Status**: **Delivered (v1.1.1)**

* **The Problem**: Multi-threaded applications (Web Workers, `worker_threads`) require zero-latency, non-blocking access to synchronized nanosecond clocks without inter-thread message-passing overhead.
* **The Solution**:
  - Implemented `AtomicClock` and `AtomicReader` in `@magmacomputing/tempo-plugin-sync`.
  - The master clock continuously updates a shared `BigInt64Array` backed by `SharedArrayBuffer`.
  - Worker threads execute lock-free $O(1)$ reads via `Atomics.load` with zero thread contention or throttling.
* **Cross-Platform Caveats & Ethos Alignment**:
  - 100% isomorphic: Works identically in Web Workers (browser) and `node:worker_threads` / Deno / Bun workers.

---

### G. Screen Wake Lock API (`navigator.wakeLock`)
**Target**: *Stopwatch / Countdown / Presentation Mode Option*

* **The Solution**:
  - Add `{ keepAwake: true }` option to tickers and countdowns to request `navigator.wakeLock.request('screen')`.
  - Automatically releases the wake lock when the ticker stops, reaches its limit, or is disposed.
* **Cross-Platform Caveats & Ethos Alignment**:
  - **Browser/Device-Specific**: Meaningless in headless Node.js/server environments.
  - **Architectural Fit**: Must be strictly implemented as progressive enhancement with silent no-op fallbacks when `navigator?.wakeLock` is undefined.

---

## 4. Technology Evaluation Matrix

| Capability | Target Layer | Runtime Support | Complexity | Ethos / Cross-Platform Fit | Status / Value |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`WeakCache` Memoization** | Core `#library` / Tempo Core | Universal (ES2021+) | Low | **Universal Isomorphic** | **Delivered (v4.4.3)** |
| **`Finalizer` GC Hooks** | Core `#library` (`finalizer.class.ts`) | Universal (ES2021+) | Low | **Universal Isomorphic** | **Delivered (v4.4.3)** |
| **Ticker & AtomicClock Finalization** | Ticker (v2.5.1) & Sync (v1.1.1) | Universal (ES2021+) | Low | **Universal Isomorphic** | **Delivered** |
| **Pledge GC Safety** | Core `#library` (`pledge.class.ts`) | Universal (ES2021+) | Low | **Universal Isomorphic** | **Delivered (v4.4.3)** |
| **Atomic Cross-Thread Sync** | `@magmacomputing/tempo-plugin-sync` | Browser / Node.js (Workers) | Medium | **Universal Isomorphic** (Workers & Threads) | **Delivered (v1.1.1)** |
| **Web Locks Leader Tab** | `@magmacomputing/tempo-plugin-tabsync` | Browser (Modern) | Medium | **Plugin-Only** (Browser Multi-Tab) | High (Multi-tab efficiency) |
| **`scheduler.postTask()`** | Core Ticker | Chrome/Edge/Deno (Polyfillable) | Low | **Cross-Platform Adapter Required** | High (Render-aligned pacing) |
| **Network Clock Drift** | `@magmacomputing/tempo-plugin-ntp` | Universal (via HTTP `Date`) | Low | **Universal Baseline** (HTTP HEAD / Date) | High (Financial/auction precision) |
| **TC39 Signals** | `@magmacomputing/tempo-plugin-signals` | Early TC39 Stage 1 | High | **Hold Off** (Rely on AsyncIterable/Events) | Low ROI until Stage 3 |
| **Screen Wake Lock** | Ticker / Countdown Option | Browser (Mobile/Desktop) | Low | **Progressive Enhancement** (Silent No-Op) | Medium (Presentation/Kiosk DX) |
