![Tempo Plugin](https://raw.githubusercontent.com/magmacomputing/magma/main/packages/tempo/public/plugin-logo.svg)

# @magmacomputing/tempo-plugin-sync

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-sync"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-sync?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-sync/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-sync"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-sync?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a> <a href="https://magmacomputing.github.io/magma/doc/9-plugins/sync.index.html"><img src="https://img.shields.io/badge/Docs-VitePress-brightgreen?logo=vitepress&style=flat-square" alt="Documentation" style="display: inline-block; margin: 0 4px;"></a>
</p>

This is a Community plugin for the [Tempo](https://github.com/magmacomputing/magma) library that provides lock-free, nanosecond-accurate cross-thread time synchronization using `SharedArrayBuffer` and `Atomics`.

👉 **[View the full documentation on our GitHub Pages](https://magmacomputing.github.io/magma/doc/9-plugins/sync.index.html)**

> **Perfect for:** High-frequency trading platforms, real-time multiplayer game servers, distributed microservice tracing, and extreme-precision scientific telemetry.

## Installation

```bash
npm install @magmacomputing/tempo-plugin-sync
```

## Usage

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { SyncPlugin } from '@magmacomputing/tempo-plugin-sync';

Tempo.init({ 
  extends: [SyncPlugin] 
});

// Master Thread: Start the clock
const clock = Tempo.sync.startClock({ updateIntervalMs: 1 });
const buffer = clock.buffer; // Pass this SharedArrayBuffer to your workers
```

### Reading from Worker Threads

To read the synchronized time from inside a worker thread, pass the `SharedArrayBuffer` via `workerData` and instantiate an `AtomicReader`.

```typescript
// worker.ts
import { workerData } from 'node:worker_threads';
import { AtomicReader } from '@magmacomputing/tempo-plugin-sync';

// Hydrate the reader using the master buffer
const reader = new AtomicReader(workerData.buffer);

// 1. Get raw milliseconds (O(1) Atomic Read)
const ms = reader.now(); 

// 2. Get high-precision BigInt nanoseconds
const ns = reader.nowNano();

// 3. Hydrate a brand new Tempo instance with exact precision
const t = reader.getTempo();
```

## Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use under the MIT license.
