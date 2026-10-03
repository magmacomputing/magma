![Tempo Plugin](/plugin-logo.svg)

# @magmacomputing/tempo-plugin-sync

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-sync"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-sync?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-sync/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-sync"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-sync?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a>
</p>

This is a Community plugin for the [Tempo](https://github.com/magmacomputing/magma) library that provides lock-free, nanosecond-accurate cross-thread time synchronization using `SharedArrayBuffer` and `Atomics`.

It eliminates inter-process message passing (IPC) latency, allowing worker threads and Web Workers to read current timestamps synchronously in constant $O(1)$ time.

::: tip Perfect For
High-frequency trading platforms, real-time multiplayer authoritative game servers, distributed microservice tracing, and extreme-precision scientific telemetry.
:::

---

## 🚀 Installation & Quickstart

```bash
npm install @magmacomputing/tempo-plugin-sync
```

::: info Live Interactive Sandbox Note
This plugin leverages `SharedArrayBuffer` and `Atomics` for hardware-level cross-thread synchronization. Modern browsers require **Cross-Origin Isolation** (`Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`) to enable `SharedArrayBuffer`. Because GitHub Pages static hosting cannot emit custom HTTP response headers, the live browser sandbox widget is disabled on this documentation page. To test the Sync plugin, run it in **Node.js** (supported natively) or in a local development environment with custom server headers configured.
:::

### Master Process: Initializing the Atomic Clock

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { SyncPlugin } from '@magmacomputing/tempo-plugin-sync';

Tempo.use(SyncPlugin);

// Start master clock loop (interval in ms, default is 10)
const clock = Tempo.sync.startClock({ interval: 5 });
const buffer = clock.getBuffer(); // Pass this SharedArrayBuffer to your workers
```

#### Zero-Boilerplate Auto-Installation (Side-Effect Import)

```typescript
import { Tempo } from '@magmacomputing/tempo';
import '@magmacomputing/tempo-plugin-sync/install';

const clock = Tempo.sync.startClock({ interval: 10 });
```

### Worker Process: Lock-Free Reading

```typescript
// worker.ts
import { workerData } from 'node:worker_threads';
import { AtomicReader } from '@magmacomputing/tempo-plugin-sync';

// Hydrate reader directly from shared memory
const reader = new AtomicReader(workerData.buffer);

// 1. Get raw epoch milliseconds (O(1) Atomic Read)
const ms = reader.now(); 

// 2. Get high-precision BigInt nanoseconds
const ns = reader.nowNano();

// 3. Hydrate a brand new Tempo instance with exact precision
const t = reader.getTempo();
console.log(t.iso);
```

---

## 📚 API Surface Catalog

The Sync plugin exposes two primary abstractions: `AtomicClock` for the master thread, and `AtomicReader` for worker threads:

| Class / Method | Context | Parameters | Returns | Description |
| :--- | :--- | :--- | :--- | :--- |
| **`Tempo.sync.startClock(opts?)`** | Master | `ClockOptions?: { interval?: number }` | `AtomicClock` | Initializes and starts the master clock loop, continuously writing time to shared memory. |
| **`Tempo.sync.stopClock()`** | Master | None | `void` | Halts the master clock synchronization loop. |
| **`Tempo.sync.getBuffer()`** | Master | None | `SharedArrayBuffer` | Returns the underlying 8-byte shared buffer for worker transfer. |
| **`new AtomicReader(buffer)`** | Worker | `buffer: SharedArrayBuffer` | `AtomicReader` | Instantiates a high-speed reader bound to the shared clock buffer. |
| **`reader.now()`** | Worker | None | `number` | Returns synchronized epoch timestamp in milliseconds in $O(1)$ time. |
| **`reader.nowNano()`** | Worker | None | `bigint` | Returns synchronized epoch timestamp in BigInt nanoseconds. |
| **`reader.getTempo()`** | Worker | None | `Tempo` | Hydrates a new immutable `Tempo` instance representing current synchronized time. |

---

## 📖 Architecture & Specialized Guides

- **[Lock-Free Atomics & Memory Architecture](./atomic-architecture.md)**: Hardware-level memory layout (`SharedArrayBuffer(8)`), Atomics sequential consistency, browser COOP/COEP isolation rules, and dual-layer timer lifecycle management (`unref()`, `using`).
- **[Production Use Cases & Architectural Patterns](./use-cases-and-patterns.md)**: High-frequency trading worker clusters, authoritative multiplayer game physics loops, and real-time audio DSP thread synchronization.

---

## 📄 Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use under the MIT license. No license token is required.
