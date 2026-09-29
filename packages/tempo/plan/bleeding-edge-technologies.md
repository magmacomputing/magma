# Bleeding-Edge Web & Server Technologies for Tempo

This document outlines next-generation Web Platform, Node.js/Deno, and TC39 standards for future exploration across **Tempo Core**, **`#library`**, and dedicated **Tempo Plugins**.

---

## 1. Existing Bleeding-Edge Capabilities in Tempo `#library`

Tempo already leverages several cutting-edge platform primitives:
- **`WeakCache` (`WeakRef` & `Finalizer`)**: Universal weak-value object and regular expression memoization with automatic GC pruning in `packages/library/src/common/runtime/weakcache.class.ts`.
- **`Finalizer` (`finalizer.class`)**: Safe Garbage Collection finalization hook wrapper around `FinalizationRegistry` with self-guarding idempotent execution in `packages/library/src/common/runtime/finalizer.class.ts`.
- **Ticker & AtomicClock Auto-Finalization**: GC-backed zombie timer prevention and resource cleanup in `@magmacomputing/tempo-plugin-ticker` (v2.5.1) and `@magmacomputing/tempo-plugin-sync` (v2.5.1).
- **Pledge GC Lifecycle Safety**: Zero-boilerplate finalization safety for unhandled/abandoned promises in `packages/library/src/common/runtime/pledge.class.ts`.
- **`Intl.DurationFormat` (`getDF`)**: Memoized duration formatting via native `Intl.DurationFormat` in `packages/library/src/common/runtime/international.library.ts`.
- **`Intl.Locale` Week Info (`getLI`)**: Native retrieval of `firstDay` and `weekend` definitions via `getLI` in `packages/library/src/common/runtime/international.library.ts` without external calendar data tables (aligning with finalized ECMA-402 Intl.Locale info specifications).
- **Explicit Resource Management**: Full support for TC39 `using` and `await using` (`Symbol.dispose`, `Symbol.asyncDispose`) across `Ticker`, `AtomicClock`, and `Pledge`.
- **Temporal Polyfill / TC39 Temporal Integration**: Foundation built on ISO 8601 calendar, exact nanosecond epochs, and timezone offsets.

---

## 2. High-Impact Candidate Technologies & Roadmap

### A. Web Locks API & Cross-Tab Synchronization (`navigator.locks` + `BroadcastChannel`)
**Target**: *Dedicated Plugin (`@magmacomputing/tempo-plugin-tabsync`) or Ticker Multi-Tab Engine*

* **The Problem**: When multiple browser tabs are open, each tab runs redundant 1-second timers, redundant network lookups, and independent clocks that can drift.
* **The Solution**:
  - Use `navigator.locks.request('tempo-master-clock', async (lock) => { ... })` to elect a single **Leader Tab**.
  - The Leader tab runs the master `Tempo.ticker` and broadcasts synchronized timestamps to all follower tabs via `BroadcastChannel('tempo-pulse')`.
  - If the leader tab closes, leadership transfers automatically and seamlessly to an existing follower tab in < 1ms.

---

### B. High-Precision Scheduling with `scheduler.postTask()` & `AbortSignal.timeout()`
**Target**: *Core Ticker / Scheduling Engine*

* **The Problem**: Standard `setTimeout` / `setInterval` can be throttled in background tabs, fight against UI animations during render cycles, and lack task priority levels.
* **The Solution**:
  - Integrate `scheduler.postTask(callback, { priority: 'user-visible' | 'background', signal })` for priority-aware task execution.
  - Standardize cancellation using `AbortSignal.timeout(ms)` and composite `AbortSignal.any([...])` for timeout and cancellation management.

---

### C. Automatic Ticker & Stream Finalization (`Finalizer` / `FinalizationRegistry`)
**Target**: *`@magmacomputing/tempo-plugin-ticker` / Stream Engine*
**Status**: **Delivered (v2.5.1)**

* **The Problem**: If a developer instantiates an active ticker or event stream without calling `.stop()` or using `using`, active timer handles (`setInterval` / `setTimeout`) remain alive as orphaned zombie processes in the event loop.
* **The Solution**:
  - Registered active `Ticker` proxy handles with `Finalizer.register` (`finalizer.class.ts`).
  - When user code drops all references to the ticker without explicitly stopping it, the Garbage Collector triggers the finalizer to automatically invoke `.stop()` and clear underlying timers.
  - Active registry `ACTIVE_TICKERS` holds `WeakRef<Ticker.Instance>`, ensuring `Tempo.tickers` queries live instances without pinning unreferenced tickers into memory.

---

### D. Client-Server Clock Drift Compensation (HTTP `Date` & `Server-Timing`)
**Target**: *Dedicated Plugin (`@magmacomputing/tempo-plugin-ntp` / `drift`)*

* **The Problem**: End-user device clocks are often desynchronized from true atomic time by seconds or minutes.
* **The Solution**:
  - A lightweight fetch interceptor or HEAD ping measures round-trip time (RTT) and calculates client clock drift:
    `Δ = T_server - (T_client + RTT / 2)`
  - Applies a monotonic drift offset to `Tempo.now()`, ensuring accurate bidding, financial timestamp validation, and auction countdowns without altering OS system clocks.

---

### E. TC39 Signals Integration (`Tempo.signal()`)
**Target**: *Dedicated Plugin (`@magmacomputing/tempo-plugin-signals`)*

* **The Problem**: Modern UI frameworks (Preact, Solid, Vue, Angular, Svelte) are converging on TC39 Signals for fine-grained reactivity.
* **The Solution**:
  - Provide native reactive time signals backed by `WeakCache`:
    ```typescript
    const currentSecond = Tempo.signal({ interval: 1 });
    // Components reading currentSecond.value automatically re-render on pulse
    ```

---

### F. Non-Throttled Background Workers (`SharedArrayBuffer` & `Atomics.waitAsync`)
**Target**: *Dedicated Plugin (`@magmacomputing/tempo-plugin-worker-clock`)*

* **The Problem**: Mobile browsers and background tabs aggressively throttle main-thread timers down to 1Hz or freeze them completely.
* **The Solution**:
  - Offload timing loops to a dedicated `WebWorker` or `SharedWorker` using `SharedArrayBuffer` and `Atomics.waitAsync()` for sub-millisecond, jitter-free scheduling.

---

### G. Screen Wake Lock API (`navigator.wakeLock`)
**Target**: *Stopwatch / Countdown / Presentation Mode*

* **The Solution**:
  - Add `{ keepAwake: true }` option to tickers and countdowns to request `navigator.wakeLock.request('screen')`.
  - Automatically releases the wake lock when the ticker stops, reaches its limit, or is disposed.

---

## 3. Technology Evaluation Matrix

| Capability | Target Layer | Runtime Support | Complexity | Status / Value |
| :--- | :--- | :--- | :--- | :--- |
| **`WeakCache` Memoization** | Core `#library` / Tempo Core | Universal (ES2021+) | Delivered (v4.4.3) | **Production Active** |
| **`Finalizer` GC Hooks** | Core `#library` (`finalizer.class.ts`) | Universal (ES2021+) | Delivered (v4.4.3) | **Production Active** |
| **Ticker Auto-Finalization** | `@magmacomputing/tempo-plugin-ticker` | Universal (ES2021+) | Delivered (v2.5.1) | **Production Active** |
| **Web Locks Leader Tab** | `@magmacomputing/tempo-plugin-tabsync` | Browser (Modern) | Medium | High (Multi-tab efficiency) |
| **`scheduler.postTask()`** | Core Ticker | Chrome/Edge/Deno (Polyfillable) | Low | High (Render-aligned pacing) |
| **Network Clock Drift** | `@magmacomputing/tempo-plugin-ntp` | Universal | Low | High (Financial/auction precision) |
| **TC39 Signals** | `@magmacomputing/tempo-plugin-signals` | Universal | Medium | High (Fine-grained UI reactivity) |
| **Screen Wake Lock** | Ticker / Countdown Option | Browser (Mobile/Desktop) | Low | Medium (Presentation/Kiosk DX) |
