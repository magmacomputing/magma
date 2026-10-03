<div class="plugin-eyebrow">
  <a href="./index.html">← @magmacomputing/tempo-plugin-sync</a>
</div>

<br>

# Production Use Cases & Architectural Patterns

This guide explores architectural patterns where `@magmacomputing/tempo-plugin-sync` provides lock-free, zero-latency time synchronization across multi-threaded systems.

---

## 1. High-Frequency Trading (HFT) Worker Thread Risk Cluster

### Problem Statement
In automated algorithmic trading and risk evaluation engines, 16–32 worker threads concurrently evaluate order books, order cancellations, and margin limits. In asynchronous microsecond trading environments, inter-thread message passing (`worker.postMessage`) introduces 500µs to 2ms of jitter. Workers evaluating risk thresholds with staggered clock skews make inconsistent margin calls or execute out-of-order market orders.

### Architectural Solution
The main thread runs a master `AtomicClock` updating every 1ms. The shared buffer is passed to worker threads at startup. Worker risk evaluators read the exact current timestamp in $O(1)$ lock-free time via `reader.nowNano()`, guaranteeing absolute ordering and eliminating IPC delays.

```
       Master Process (WebSocket Ingestion)
                     │
         [AtomicClock: 1ms loop]
                     │
           SharedArrayBuffer(8)
      ┌──────────────┼──────────────┐
      ▼              ▼              ▼
 Worker #1       Worker #2      Worker #3
(Risk Engine)   (Order Book)   (Compliance)
      │              │              │
 reader.now()   reader.now()   reader.now()
 (Sub-microsecond Lock-Free Atomic Read)
```

### Production Implementation

```typescript
// master.ts (Main Process)
import { Worker } from 'node:worker_threads';
import { Tempo } from '@magmacomputing/tempo';
import { SyncPlugin } from '@magmacomputing/tempo-plugin-sync';

Tempo.use(SyncPlugin);

export class TradingEngineCluster {
  private clock = Tempo.sync.startClock({ interval: 1 }); // 1ms tick
  private workers: Worker[] = [];

  spawnWorkers(workerScriptPath: string, count = 4) {
    const buffer = this.clock.getBuffer();

    for (let i = 0; i < count; i++) {
      const worker = new Worker(workerScriptPath, {
        workerData: { buffer, workerId: i + 1 }
      });
      this.workers.push(worker);
    }
  }

  shutdown() {
    this.clock.stop();
    for (const w of this.workers) w.terminate();
  }
}
```

```typescript
// worker.ts (Executed inside worker thread)
import { workerData } from 'node:worker_threads';
import { AtomicReader } from '@magmacomputing/tempo-plugin-sync';

// Hydrate atomic reader directly from shared memory
const reader = new AtomicReader(workerData.buffer);

export function evaluateTradeRisk(orderId: string, limitPrice: number) {
  // Ultra-fast lock-free read (approx 15ns)
  const currentNano = reader.nowNano();
  const currentMs = reader.now();

  // Hydrate full Tempo instance for audit logging when violations occur
  if (limitPrice > 10_000) {
    const auditTime = reader.getTempo();
    console.warn(`[Risk Violation] Order ${orderId} at ${auditTime.iso}`);
  }

  return { orderId, evaluatedAtNano: currentNano, evaluatedAtMs: currentMs };
}
```

---

## 2. Authoritative Multiplayer Game Simulation Ticks

### Problem Statement
In real-time multiplayer dedicated game servers (spatial combat, FPS, sports), physics simulations (Havok, Rapier, PhysX) run across multiple dedicated background workers. If physics workers derive their simulation `deltaTime` from independent `Date.now()` or `performance.now()` calls, thread scheduling jitter creates simulation desyncs, "rubber-banding", and inconsistent projectile trajectories.

### Architectural Solution
The master server loop drives simulation time using `AtomicClock`. Physics worker threads query `reader.now()` at the beginning of each simulation step, ensuring every worker executes calculations using the exact same master game timestamp.

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { SyncPlugin, AtomicReader } from '@magmacomputing/tempo-plugin-sync';

Tempo.use(SyncPlugin);

export class PhysicsSimulationWorker {
  private reader: AtomicReader;
  private lastTickMs: number;

  constructor(sharedBuffer: SharedArrayBuffer) {
    this.reader = new AtomicReader(sharedBuffer);
    this.lastTickMs = this.reader.now();
  }

  /**
   * Evaluates a single physics tick synchronized with the master server clock.
   */
  stepSimulation() {
    const currentMs = this.reader.now();
    const deltaTime = (currentMs - this.lastTickMs) / 1000; // in seconds
    this.lastTickMs = currentMs;

    // Run physics integration with zero inter-worker time drift
    return { currentMs, deltaTime };
  }
}
```

---

## 3. Real-Time Audio DSP Buffer Synchronization

### Problem Statement
In WebAudio and professional audio workstations, digital signal processing (DSP) threads process audio frames in strict 128-sample buffers (approx `2.9ms` at 44.1kHz). If the UI thread or network synchronization thread communicates with the audio thread via asynchronous messages, audio buffer under-runs (clicks and pops) occur whenever the main thread is busy rendering or parsing JSON.

### Architectural Solution
By sharing an `AtomicClock` buffer between the main thread and audio workers, the audio processor can stamp incoming MIDI notes and parameter automations synchronously without touching the event loop:

```typescript
import { AtomicReader } from '@magmacomputing/tempo-plugin-sync';

export class AudioWorkletTimeSync {
  private reader: AtomicReader;

  constructor(sharedBuffer: SharedArrayBuffer) {
    this.reader = new AtomicReader(sharedBuffer);
  }

  /**
   * Called within audio rendering callback (zero allocations permitted).
   */
  processAudioFrame(frameNumber: number) {
    // Lock-free read executes in O(1) time without garbage collection
    const sampleTimestampNs = reader.nowNano();

    return { frameNumber, timestampNs: sampleTimestampNs };
  }
}
```
