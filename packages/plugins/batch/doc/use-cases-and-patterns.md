<div class="plugin-eyebrow">
  <a href="./index.html">← @magmacomputing/tempo-plugin-batch</a>
</div>

<br>

# Production Use Cases & Architectural Patterns

This guide explores real-world systems patterns where `@magmacomputing/tempo-plugin-batch` accelerates high-volume temporal processing across multi-core server environments.

---

## 1. High-Throughput IoT Telemetry Skew Normalization

### Problem Statement
An industrial IoT gateway collects sensor packets from thousands of field devices. Due to firmware clock drift, timestamps must be shifted forward by a calibrated skew correction (e.g. `+12 seconds` or `+2 hours`) before being inserted into a time-series database. Processing 500,000 timestamps on the main Node.js event loop blocks incoming network sockets and causes packet loss.

### Architectural Solution
Use `Tempo.batch()` to offload the transformation to worker threads. The raw epoch numbers are transformed directly in shared memory (`SharedArrayBuffer`), keeping the main thread free to handle HTTP/MQTT connections.

```
Incoming Telemetry Batch (500k Epochs)
                 │
                 ▼
       Tempo.batch(epochs, '+12s')
                 │
     ┌───────────┼───────────┐
     ▼           ▼           ▼
 Worker #1   Worker #2   Worker #3
 (SharedArrayBuffer Float64Array Slices)
                 │
                 ▼
  Zero-Copy Mutated Epoch Array -> PostgreSQL TimescaleDB
```

### Production Implementation

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { BatchPlugin } from '@magmacomputing/tempo-plugin-batch';

Tempo.use(BatchPlugin);

export interface IngestedTelemetryBatch {
  deviceId: string;
  skewOffset: string; // e.g. "+12s" or "-30m"
  rawEpochs: number[];
}

/**
 * Normalizes device telemetry timestamps in background workers.
 */
export async function normalizeDeviceBatch(batch: IngestedTelemetryBatch): Promise<number[]> {
  // Parallelize the mutation across available CPU cores
  const normalizedEpochs = await Tempo.batch(batch.rawEpochs, batch.skewOffset, {
    rehydrate: false // keep as primitive numbers for maximum database bulk-copy throughput
  });

  return normalizedEpochs;
}

// Example Execution
const sampleEpochs = [1700000000000, 1700000001000, 1700000002000];
const normalized = await normalizeDeviceBatch({
  deviceId: 'turbine-north-4',
  skewOffset: '+1h',
  rawEpochs: sampleEpochs
});

console.log('Original first epoch:  ', sampleEpochs[0]);
console.log('Normalized first epoch:', normalized[0]); // 3600000 ms later
```

---

## 2. Financial Tick Data Backtesting & Interval Rolling

### Problem Statement
Quantitative trading algorithms simulate portfolio strategies over millions of historical trade ticks. Backtesting requires rolling timestamps forward across multiple simulation runs (e.g. testing strategy execution across shifted trading windows: `+1 week`, `+2 weeks`, `+1 month`). Processing 10,000,000 ticks sequentially in JavaScript takes tens of seconds.

### Architectural Solution
By specifying a dedicated thread pool size (`{ threads: 8 }`), `Tempo.batch` divides the 10M record array evenly across 8 workers, utilizing SIMD-like concurrent chunking to complete the transformation in a fraction of the time.

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { BatchPlugin } from '@magmacomputing/tempo-plugin-batch';

Tempo.use(BatchPlugin);

export class BacktestEngine {
  /**
   * Shifts historical trade tick epochs into a prospective simulation window.
   */
  static async shiftSimulationWindow(historicalEpochs: number[], windowShift = '+1w'): Promise<number[]> {
    console.time('Parallel Batch Shift');

    const shiftedEpochs = await Tempo.batch(historicalEpochs, windowShift, {
      threads: 8,
      rehydrate: false
    });

    console.timeEnd('Parallel Batch Shift');
    return shiftedEpochs;
  }
}
```

---

## 3. Large-Scale CSV Payroll Date Processing

### Problem Statement
A payroll processing SaaS application receives monthly employee attendance CSV files containing hundreds of thousands of punch-clock records. The system needs to validate overtime boundaries by rolling dates forward to the nearest pay-period closing cycle and rehydrating them as full `Tempo` objects for business logic inspection.

### Architectural Solution
Use `{ rehydrate: true }` to receive fully initialized, immutable `Tempo` instances directly from the worker pool once parallel arithmetic finishes:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { BatchPlugin } from '@magmacomputing/tempo-plugin-batch';

Tempo.use(BatchPlugin);

export async function processPayrollEpochs(attendancePunchEpochs: number[]): Promise<Tempo[]> {
  // Shift punch times to the closing cycle and rehydrate into Tempo instances
  const payrollInstances: Tempo[] = await Tempo.batch(attendancePunchEpochs, '+14d', {
    rehydrate: true // returns Tempo[] instances
  });

  return payrollInstances;
}

// Result: Array of fully featured Tempo objects ready for business rules
const instances = await processPayrollEpochs([1700000000000, 1700000005000]);
console.log(instances[0].format('{yyyy}-{mm}-{dd}'));
```
