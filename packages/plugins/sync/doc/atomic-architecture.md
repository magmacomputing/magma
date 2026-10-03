<div class="plugin-eyebrow">
  <a href="./index.html">← @magmacomputing/tempo-plugin-sync</a>
</div>

<br>

# Lock-Free Atomics & Memory Architecture

The `@magmacomputing/tempo-plugin-sync` plugin provides hardware-level, nanosecond-accurate cross-thread time synchronization using standard JavaScript `SharedArrayBuffer` and `Atomics`.

It is specifically engineered for multi-threaded architectures—such as high-frequency trading (HFT) risk checkers, real-time physics engines, and audio digital signal processing (DSP)—where inter-process communication (IPC) latency or event-loop microtasks cannot be tolerated.

---

## The Shared Memory Layout

Traditional multi-worker architectures broadcast timestamp updates via `postMessage()`. In Node.js or high-throughput browser Web Workers, `postMessage()` suffers from structural cloning serialization costs, thread-context switching, and event loop queue delays ranging from `0.5ms` to `15ms`.

The Sync plugin bypasses the event loop entirely by allocating a dedicated 8-byte shared buffer in virtual memory:

```
┌────────────────────────────────────────────────────────┐
│ Virtual Memory: SharedArrayBuffer (8 Bytes)           │
├────────────────────────────────────────────────────────┤
│ [ 0x00 | 0x01 | 0x02 | 0x03 | 0x04 | 0x05 | 0x06 | 0x07 ] │
│ ◄──────────────── 64-Bit Integer (BigInt64Array) ────► │
│ Represents: Epoch Time in Nanoseconds (nowNano)        │
└────────────────────────────────────────────────────────┘
          ▲                                    │
          │                                    │
     Atomics.store                        Atomics.load
   (Master Thread)                     (Worker Threads)
```

### 1. Master Clock Writer (`AtomicClock`)
* The master process instantiates `AtomicClock`, allocating `new SharedArrayBuffer(8)` with a `BigInt64Array` typed view.
* An internal monotonic ticker writes the current timestamp in nanoseconds into index `0` using `Atomics.store(this.#view, 0, nowNano)`.
* Because `Atomics.store` is an atomic store instruction, it guarantees sequential consistency across all CPU cores and hardware memory caches without requiring thread locking or mutex semaphores.

### 2. Lock-Free Worker Reader (`AtomicReader`)
* Worker threads receive the `SharedArrayBuffer` reference upon initialization (e.g. via `workerData` in Node.js or `postMessage` transfer in the browser).
* The worker binds an `AtomicReader` directly to the buffer.
* Invoking `reader.nowNano()` or `reader.now()` executes a single CPU instruction: `Atomics.load(this.#view, 0)`.
* This read executes synchronously in **$O(1)$ constant time** ($\approx 10\text{–}25\text{ nanoseconds}$ on modern x86/ARM hardware), with zero IPC overhead and zero garbage collection pressure.

---

## Dual-Layer Lifecycle Management

Long-running timer loops in Node.js can inadvertently keep processes alive or cause memory leaks during hot-reloads and test teardowns. The Sync plugin implements Tempo's **Dual-Layer Lifecycle Model**:

### 1. Native Timer Unreferencing (`unref()`)
When the master clock starts its periodic synchronization loop, it automatically calls `.unref()` on the underlying timer:
```typescript
if (typeof timer.unref === 'function') {
  timer.unref();
}
```
This ensures that the presence of the background sync clock will not prevent Node.js from exiting gracefully when all primary application tasks complete.

### 2. Explicit Deterministic Resource Management (`using`)
`AtomicClock` implements `[Symbol.dispose]()` for deterministic cleanup via TypeScript 5.2+ explicit resource management:

```typescript
{
  using clock = Tempo.sync.startClock({ interval: 5 });
  // Buffer is actively shared with worker threads...
} // <-- Automatically invokes clock.stop() upon leaving block scope
```

### 3. GC Finalization Registry Safety Net
As an asynchronous fallback, the clock registers with Tempo's `Finalizer` registry. If a developer forgets to call `clock.stop()` or dispose the instance, the timer is safely halted when the clock instance is reclaimed by the garbage collector.

---

## Browser Security Constraints: Cross-Origin Isolation

Due to Spectre and Meltdown side-channel mitigation policies, web browsers disable `SharedArrayBuffer` by default unless the host website serves strict **Cross-Origin Isolation** HTTP headers:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

### Environment Compatibility Matrix

| Runtime Environment | `SharedArrayBuffer` Support | Configuration Requirements |
| :--- | :--- | :--- |
| **Node.js (v18+)** | ✅ Native (Unrestricted) | None. Enabled by default across all worker threads. |
| **Browser (Isolated)** | ✅ Native (High Precision) | Web server must emit `COOP: same-origin` and `COEP: require-corp`. |
| **Browser (Non-Isolated)** | ❌ Blocked by Browser | Static hosts (e.g. GitHub Pages) cannot enable SAB without proxy headers. |
| **Electron / Tauri** | ✅ Native (Configurable) | Set `webPreferences: { nodeIntegration: true }` or configure isolation headers. |

> [!NOTE]
> If `SharedArrayBuffer` is not supported in the host environment, `AtomicClock` immediately throws a descriptive initialization error directing developers to verify their server headers or run in Node.js.
