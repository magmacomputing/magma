<div class="plugin-eyebrow">
  <a href="./index.html">← @magmacomputing/tempo-plugin-batch</a>
</div>

<br>

# Parallel Worker Pool & SharedArrayBuffer Architecture

The `@magmacomputing/tempo-plugin-batch` plugin accelerates bulk date mutations across multi-core systems by partitioning massive epoch arrays and executing calculations concurrently across a pool of background worker threads.

---

## Dual-Mode Execution Engine

The orchestrator dynamically inspects the host runtime and automatically selects between zero-copy shared memory or structural cloning:

```
                  Tempo.batch(epochs, operation, options)
                                    │
                         Is SharedArrayBuffer Available?
                                ├─── YES ───► Mode A: SharedArrayBuffer (Zero-Copy)
                                └─── NO  ───► Mode B: postMessage Structural Cloning
```

### Mode A: Lock-Free `SharedArrayBuffer` (High Throughput)

When running in Node.js or in browsers with Cross-Origin Isolation enabled:
1. The master process allocates two shared memory buffers sized to the exact input length:
   ```typescript
   const inputBuffer = new SharedArrayBuffer(epochs.length * 8);
   const outputBuffer = new SharedArrayBuffer(epochs.length * 8);
   ```
2. A typed `Float64Array` view is mounted over the buffer. Each 64-bit IEEE 754 double stores one millisecond timestamp.
3. The workload is partitioned into balanced slices (`chunkSize = Math.ceil(epochs.length / threadCount)`).
4. Each worker thread receives references to the shared memory buffers along with its assigned slice indices (`startIdx`, `endIdx`).
5. Workers access the shared buffers directly, mutating timestamps in place within their assigned slices, and post a lightweight `{ status: 'done' }` signal upon completion. Shared buffer access avoids serialization and array cloning across the thread boundary.

### Mode B: `postMessage` Structural Cloning (Graceful Degradation)

When running in browser environments where `SharedArrayBuffer` is restricted by security policies:
1. The orchestrator slices the input array into standard JavaScript array chunks.
2. Slices are transferred to workers via standard `postMessage({ chunk })`.
3. Workers compute results and post back the mutated array.
4. The main thread reassembles the chunked arrays into a single contiguous result.

---

## Worker Process Isolation & CLI Flag Sanitization

In Node.js, spawning worker threads via `new Worker()` automatically attempts to pass `process.execArgv` to child isolates. However, passing unverified process flags (such as `--max-old-space-size`, `--eval`, or custom CLI arguments) can crash worker isolates or cause memory segmentation faults.

To guarantee worker stability, `BatchOrchestrator` implements strict **ExecArgv Allowlist Sanitization**:

```typescript
const ALLOWED_FLAGS_WITH_VALUE = new Set([
  '--import',
  '--loader',
  '--experimental-loader',
  '-r',
  '--require',
]);

const ALLOWED_STANDALONE_FLAGS = new Set([
  '--experimental-vm-modules',
  '--experimental-temporal',
  '--experimental-specifier-resolution',
  '--inspect',
  '--inspect-brk',
  '--trace-warnings',
  '--no-warnings',
]);
```

Any process-level flags, heap limit overrides, or execution scripts outside this allowlist are safely stripped before worker initialization.

---

## Performance Trade-Off: Raw Epochs vs Hydration

To maximize processing speed across large payloads (e.g., 100,000 to 5,000,000 timestamps):

| Configuration | Output Type | Processing Characteristics | Ideal For |
| :--- | :--- | :--- | :--- |
| **`{ rehydrate: false }`** *(Default)* | `number[]` | **Ultra-Fast**. Returns raw numeric timestamps. Zero object allocation overhead on the main thread. | Telemetry ETL pipelines, database bulk inserts, streaming Kafka messages. |
| **`{ rehydrate: true }`** | `Tempo[]` | **Rich Object Surface**. Main thread maps output numbers into full `Tempo` instances. | UI display grids, domain models requiring immediate formatting or method access. |

### Benchmark Guidance
For arrays exceeding `50,000` items, keeping `{ rehydrate: false }` until final consumption reduces garbage collection pauses by up to **85%**.
