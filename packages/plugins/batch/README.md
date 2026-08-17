![Tempo Plugin](https://raw.githubusercontent.com/magmacomputing/magma/main/packages/tempo/public/plugin-logo.svg)

# @magmacomputing/tempo-plugin-batch

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-batch"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-batch?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-batch/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-batch"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-batch?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a> <a href="https://magmacomputing.github.io/magma/doc/9-plugins/batch.index.html"><img src="https://img.shields.io/badge/Docs-VitePress-brightgreen?logo=vitepress&style=flat-square" alt="Documentation" style="display: inline-block; margin: 0 4px;"></a>
</p>

This is a Community plugin for the [Tempo](https://github.com/magmacomputing/magma) library that parallelizes massive epoch mutation tasks across worker threads utilizing lock-free `SharedArrayBuffer` architecture for extreme throughput.

👉 **[View the full documentation on our GitHub Pages](https://magmacomputing.github.io/magma/doc/9-plugins/batch.index.html)**

> **Perfect for:** Heavy data ETL pipelines, massive IoT telemetry ingestion, financial ledger chronometrics, and any parallel bulk date-processing workloads.

## Installation

```bash
npm install @magmacomputing/tempo-plugin-batch
```

## Usage

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { BatchPlugin } from '@magmacomputing/tempo-plugin-batch';

Tempo.init({ 
  extends: [BatchPlugin] 
});

// Assume `epochs` is a massive array of integers representing timestamps
const epochs = [1700000000000, 1700000001000, /* ... millions more ... */];

// Mutate millions of dates concurrently using the worker pool
// The engine automatically splits the payload and offloads to workers!
const batchResult = await Tempo.batch(epochs, { weeks: 1 });

console.log(batchResult); // Returns an array of mutated timestamp integers
```

### Rehydration

By default, `Tempo.batch` returns an array of primitive `number` timestamps to maximize throughput over the thread boundary. If you need fully-fledged `Tempo` objects back, pass `{ rehydrate: true }`:

```typescript
// Returns an array of Tempo instances instead of integers
const tempoInstances = await Tempo.batch(epochs, { weeks: 1 }, { rehydrate: true });
```

### Graceful Degradation

If the host environment does not support `SharedArrayBuffer` (or if it is blocked by CORS/COOP headers in the browser), the orchestrator intelligently and transparently falls back to using traditional `postMessage` structural cloning chunks to ensure execution never halts.

## Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use. No license token is required.

For commercial licensing options, please contact Magma Computing.
