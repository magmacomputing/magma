![Tempo Plugin](/plugin-logo.svg)

# @magmacomputing/tempo-plugin-batch

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-batch"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-batch?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-batch/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-batch"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-batch?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a>
</p>

This is a Community plugin for the [Tempo](https://github.com/magmacomputing/magma) library that parallelizes massive epoch mutation tasks across worker threads utilizing lock-free `SharedArrayBuffer` shared memory architecture for extreme throughput.

::: tip Perfect For
Heavy data ETL pipelines, massive IoT telemetry ingestion, financial ledger backtesting, and parallel bulk date-processing workloads.
:::

---

## 🚀 Installation & Quickstart

```bash
npm install @magmacomputing/tempo-plugin-batch
```

<PluginRepl plugin="batch" />

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { BatchPlugin } from '@magmacomputing/tempo-plugin-batch';

Tempo.use(BatchPlugin);

// Assume `epochs` is a massive array of integers representing timestamps
const epochs = [1700000000000, 1700000001000, /* ... millions more ... */];

// Mutate millions of dates concurrently using the background worker pool!
// The engine automatically splits the payload and offloads to workers
const batchResult = await Tempo.batch(epochs, '+1w', { threads: 4 });

console.log(batchResult); // Returns an array of mutated timestamp integers
```

### Zero-Boilerplate Auto-Installation (Side-Effect Import)

```typescript
import { Tempo } from '@magmacomputing/tempo';
import '@magmacomputing/tempo-plugin-batch/install';

const epochs = [1700000000000, 1700000001000];
const batchResult = await Tempo.batch(epochs, '+1w');
```

---

## 📚 API Surface Catalog

The Batch plugin mounts the static `Tempo.batch()` method and exports the underlying `BatchOrchestrator`:

| Export / Method | Signature | Returns | Description |
| :--- | :--- | :--- | :--- |
| **`Tempo.batch()`** | `(epochs: number[], operation: string, options?: BatchOptions)` | `Promise<number[] \| Tempo[]>` | Splits the input array across worker threads and applies duration mutation. |
| **`BatchOrchestrator`** | Static class | `BatchOrchestrator` | Low-level orchestration engine with `transform()` and `sanitizeExecArgv()` tools. |

### Configuration Options (`BatchOptions`)

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| **`threads`** | `number` | `os.cpus().length` | Number of worker threads to allocate for the pool. |
| **`rehydrate`** | `boolean` | `false` | When `false`, returns raw numeric timestamps (`number[]`) for peak throughput. When `true`, rehydrates output numbers into `Tempo[]` instances. |

### Supported Mutation Operations

The `operation` parameter accepts either standard duration strings or shorthand intervals:
* Days: `'+1d'`, `'+2 days'`, `'-5d'`
* Weeks: `'+1w'`, `'+4 weeks'`
* Hours: `'+1h'`, `'+8 hours'`
* Minutes: `'+30m'`, `'-15 mins'`
* Months / Years: `'+1mo'`, `'+1y'`

---

## 📖 Architecture & Specialized Guides

- **[Parallel Worker Pool & SharedArrayBuffer Architecture](./worker-architecture.md)**: Zero-copy `SharedArrayBuffer` vs `postMessage` structural cloning fallback, browser Cross-Origin Isolation (`COOP`/`COEP`), and worker isolate CLI flag allowlisting.
- **[Production Use Cases & Architectural Patterns](./use-cases-and-patterns.md)**: Industrial IoT telemetry clock skew correction, financial tick backtesting pipelines, and large-scale CSV payroll processing.

---

## 📄 Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use under the MIT license. No license token is required.
