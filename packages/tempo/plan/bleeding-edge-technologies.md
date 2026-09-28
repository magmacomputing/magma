# Bleeding-Edge Web & Server Technologies for Tempo

This document outlines next-generation Web Platform, Node.js/Deno, and TC39 standards for future exploration across **Tempo Core**, **`#library`**, and dedicated **Tempo Plugins**.

---

## 1. Existing Bleeding-Edge Capabilities in Tempo `#library`

Tempo already leverages several cutting-edge platform primitives:
- **`Intl.DurationFormat` (`getDF`)**: Memoized duration formatting via native `Intl.DurationFormat` in `packages/library/src/common/runtime/international.library.ts`.
- **`Intl.Locale` Week Info (`getLI`)**: Native retrieval of `firstDay` and `weekend` definitions via `getLI` in `packages/library/src/common/runtime/international.library.ts` without external calendar data tables (aligning with finalized ECMA-402 Intl.Locale info specifications).
- **Explicit Resource Management**: Full support for TC39 `using` and `await using` (`Symbol.dispose`, `Symbol.asyncDispose`) across `Ticker`.
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

### C. Zero-Leakage Safety with `WeakRef` & `FinalizationRegistry`
**Target**: *Core `#library` & Ticker Resource Lifecycle*

* **The Problem**: If a developer instantiates a ticker or event stream without calling `stop()` or using `using`, active timers can become orphaned zombie processes.
* **The Solution**:
  - Register active `Ticker` proxy handles in a `FinalizationRegistry`.
  - If the user drops all references to a ticker instance and it gets garbage-collected, the finalizer automatically invokes `this.stop()` and clears underlying `setTimeout` / `clearTimeout` handles.

---

### D. Client-Server Clock Drift Compensation (HTTP `Date` & `Server-Timing`)
**Target**: *Dedicated Plugin (`@magmacomputing/tempo-plugin-ntp` / `drift`)*

* **The Problem**: End-user device clocks are often desynchronized from true atomic time by seconds or minutes.
* **The Solution**:
  - A lightweight fetch interceptor or HEAD ping measures round-trip time ($RTT$) and calculates client clock drift:
    $$\Delta = T_{\text{server}} - \left(T_{\text{client}} + \frac{RTT}{2}\right)$$
  - Applies a monotonic drift offset to `Tempo.now()`, ensuring accurate bidding, financial timestamp validation, and auction countdowns without altering OS system clocks.

---

### E. TC39 Signals Integration (`Tempo.signal()`)
**Target**: *Dedicated Plugin (`@magmacomputing/tempo-plugin-signals`)*

* **The Problem**: Modern UI frameworks (Preact, Solid, Vue, Angular, Svelte) are converging on TC39 Signals for fine-grained reactivity.
* **The Solution**:
  - Provide native reactive time signals:
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

| Capability | Target Layer | Runtime Support | Complexity | Value |
| :--- | :--- | :--- | :--- | :--- |
| **Web Locks Leader Tab** | `@magmacomputing/tempo-plugin-tabsync` | Browser (Modern) | Medium | High (Multi-tab efficiency) |
| **`scheduler.postTask()`** | Core Ticker | Chrome/Edge/Deno (Polyfillable) | Low | High (Render-aligned pacing) |
| **`FinalizationRegistry`** | Core `#library` / Ticker | Universal (ES2021+) | Low | High (Zombie timer prevention) |
| **Network Clock Drift** | `@magmacomputing/tempo-plugin-ntp` | Universal | Low | High (Financial/auction precision) |
| **TC39 Signals** | `@magmacomputing/tempo-plugin-signals` | Universal | Medium | High (Fine-grained UI reactivity) |
| **Screen Wake Lock** | Ticker / Countdown Option | Browser (Mobile/Desktop) | Low | Medium (Presentation/Kiosk DX) |
