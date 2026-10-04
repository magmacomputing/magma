<div class="plugin-eyebrow">
  <a href="./index.html">← @magmacomputing/tempo-plugin-ticker</a>
</div>

<br>

# Production Use Cases & Architectural Patterns

Standard JavaScript scheduling primitives (`setInterval` and `setTimeout`) are notorious for silent failures in long-running production systems:
1. **Cumulative Clock Drift**: Timers drift by dozens of milliseconds per cycle due to main-thread execution lag and event loop starvation.
2. **Zombie Timers & Memory Leaks**: Orphaned intervals remain running after UI components unmount or HTTP request handlers finish, slowly leaking memory.
3. **Desktop & Mobile Sleep Distortion**: When an operating system enters low-power sleep mode, standard intervals freeze, skipping scheduled database jobs or failing to drain background work queues.

The `@magmacomputing/tempo-plugin-ticker` plugin solves these challenges with calendar-aware scheduling, Explicit Resource Management (`using` / `await using`), async generators, and self-healing sleep recovery.

---

## 1. Zero-Drift Telemetry & Heartbeat Loops

In backend services and IoT edge gateways, healthcheck heartbeats and metric aggregations must pulse on exact intervals (e.g. precisely every 15 seconds) regardless of how long the async payload takes to send.

With `setInterval`, network latency or slow database queries delay subsequent ticks. With `Tempo.ticker`, each pulse is pinned to an absolute epoch target, completely eliminating cumulative drift:

```typescript
import '@magmacomputing/tempo-plugin-ticker/install';
import { Tempo } from '@magmacomputing/tempo';

export function startTelemetryEmitter(endpointUrl: string) {
  // Pulses every 15 seconds with automatic catch-up on system wake
  const heartbeat = Tempo.ticker({
    seconds: 15,
    catch: true,
    label: 'telemetry-emitter'
  });

  heartbeat.on('pulse', async (t: Tempo) => {
    const payload = {
      timestamp: t.format('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}'),
      epochMs: t.epoch.ms,
      tickCount: heartbeat.info.ticks
    };

    try {
      await fetch(endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error('Failed to dispatch heartbeat:', err);
    }
  });

  return heartbeat;
}
```

---

## 2. Preventing Zombie Leaks with Explicit Resource Management (`using`)

One of the most common memory leaks in modern TypeScript applications is forgotten timer handles in async operations, unit tests, or component lifecycles.

`Tempo.ticker` implements JavaScript's **Explicit Resource Management** (`Disposable` and `AsyncDisposable`). When defined with `using` or `await using`, the ticker automatically cleans up its internal timers, event listeners, and weak references the exact moment code leaves scope:

```typescript
import '@magmacomputing/tempo-plugin-ticker/install';
import { Tempo } from '@magmacomputing/tempo';

async function monitorJobQueue(jobId: string): Promise<void> {
  // Automatically disposed when monitorJobQueue exits (even if an error throws)
  using clock = Tempo.ticker({ seconds: 2 });

  while (!isJobComplete(jobId)) {
    // Pull the next scheduled tick promise
    await clock.pull();
    console.log(`Polling status for ${jobId} at ${new Tempo().format('{hh}:{mi}:{ss}')}`);
  }
} // <-- clock is automatically stopped and deregistered here!
```

---

## 3. Streaming Financial Market Feeds (`for await...of`)

Instead of managing imperative callbacks and event listener state, `Tempo.ticker` can be consumed directly as an **Async Generator**.

This pattern provides natural backpressure handling in data pipelines: if downstream processing slows down, the consumer controls the flow without dropped events:

```typescript
import '@magmacomputing/tempo-plugin-ticker/install';
import { Tempo } from '@magmacomputing/tempo';

interface MarketSummary {
  symbol: string;
  price: number;
  sampledAt: string;
}

export async function* streamMarketTicks(
  symbol: string,
  sampleRateSeconds: number
): AsyncGenerator<MarketSummary> {
  // Streams ticks at precise interval intervals
  for await (const tick of Tempo.ticker({ seconds: sampleRateSeconds })) {
    const latestPrice = await fetchLatestQuote(symbol);

    yield {
      symbol,
      price: latestPrice,
      sampledAt: tick.format('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}')
    };
  }
}
```

---

## 4. Multi-Timezone Market Opening & Closing Schedules

Scheduling financial batch jobs across global exchanges (e.g. NYSE at 9:30 AM EST, Tokyo Stock Exchange at 9:00 AM JST) is prone to bugs when countries change between Daylight Saving Time (DST) on different weeks.

`Tempo.ticker` supports standard 5-field Cron syntax with explicit `timeZone` anchoring:

```typescript
import '@magmacomputing/tempo-plugin-ticker/install';
import { Tempo } from '@magmacomputing/tempo';

// 9:30 AM Monday-Friday in New York time (respects US DST transitions automatically)
const nyseBell = Tempo.ticker({
  cron: '30 9 * * 1-5',
  timeZone: 'America/New_York',
  label: 'nyse-opening-bell'
});

nyseBell.on('pulse', (t: Tempo) => {
  console.log(`NYSE Open at: ${t.format('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}')}`);
  triggerDailyOpeningAuction();
});
```

---

## 5. Mobile & Laptop Sleep Recovery (`catch: true`)

When a mobile app or laptop enters sleep mode, background execution freezes. When the user opens their laptop 2 hours later, a standard `setInterval` only fires once for the latest tick, losing all context of the missed window.

With `{ catch: true }`, `Tempo.ticker` detects the elapsed time gap and fires the `catch` event with the missed pulse sequence, allowing applications to drain queues or synchronize state:

```typescript
import '@magmacomputing/tempo-plugin-ticker/install';
import { Tempo } from '@magmacomputing/tempo';

const syncLoop = Tempo.ticker({
  minutes: 5,
  catch: true,
  label: 'offline-cache-sync'
});

syncLoop.on('catch', (missedTick: Tempo) => {
  console.warn(`Recovering missed sync point from: ${missedTick.format('{hh}:{mi}:{ss}')}`);
  reconcileDatabaseChanges(missedTick);
});

syncLoop.on('pulse', (currentTick: Tempo) => {
  runScheduledSync(currentTick);
});
```
