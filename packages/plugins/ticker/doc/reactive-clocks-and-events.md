<div class="plugin-eyebrow">
  <a href="./index.html">← @magmacomputing/tempo-plugin-ticker</a>
</div>

<br>

# Event Streams & Reactive Clocks

This guide covers event-driven integrations with the `@magmacomputing/tempo-plugin-ticker` plugin, including event listeners, active timer diagnostics, and zero-drift multi-timezone dashboards using reactive signals.

---

## 1. Event Listeners (`.on`)

Every Ticker instance acts as an event emitter supporting `'pulse'`, `'stop'`, and `'catch'` events.

```typescript
import { Tempo } from '@magmacomputing/tempo';
import '@magmacomputing/tempo-plugin-ticker/install';

const ticker = Tempo.ticker({ seconds: 1 });

// Register multiple listeners
ticker.on('pulse', (t) => {
  console.log('Pulse A:', t.format('{hh}:{mi}:{ss}'));
});

ticker.on('pulse', (t) => {
  console.log('Pulse B (ISO):', t.iso);
});

ticker.on('stop', (t) => {
  console.log('Ticker stopped at:', t.format('{hh}:{mi}:{ss}'));
});

ticker.on('catch', (t, stop) => {
  console.warn('Recovered schedule tick at:', t.iso);
});
```

### Event Reference

| Event | Callback Signature | Triggered When |
| :--- | :--- | :--- |
| `'pulse'` | `(t: Tempo, stop: () => void) => void` | Emitted on every recurring tick. |
| `'stop'` | `(t: Tempo) => void` | Emitted when the ticker stops (limit reached or `stop()` called). |
| `'catch'` | `(t: Tempo, stop: () => void) => void` | Emitted when schedule resolution fails or boundary conditions require recovery. |

---

## 2. Active Ticker Registry & Telemetry (`Ticker.active`)

The `Ticker` class maintains a global static registry of all currently running (non-stopped) Tickers. This is invaluable for monitoring, observability, and verifying clean test teardown:

```typescript
import { Ticker } from '@magmacomputing/tempo-plugin-ticker';

// Retrieve live snapshots of all active tickers
const running = Ticker.active;

console.log(`Active running timers: ${running.length}`);

for (const { ticker, next, ticks, limit, interval } of running) {
  console.log(`Ticker pulse #${ticks}, Next: ${next.iso}, Interval:`, interval);
}
```

### Snapshot Structure (`Ticker.Snapshot`)

```typescript
export interface Snapshot {
  readonly ticker: Ticker.Instance;       // Reference to the active Ticker instance
  readonly label?: string;                // Configured telemetry label
  readonly next: Tempo;                   // The next scheduled Tempo value
  readonly ticks: number;                 // Total number of pulses emitted so far
  readonly limit?: number;                // Configured limit (if any)
  readonly interval: Record<string, any>; // The duration-based interval configuration
  readonly rrule?: string;                // Configured RFC 5545 recurrence rule
  readonly cron?: string;                 // Configured 5-field cron expression
  readonly stopped: boolean;              // Current stopped status
}
```

---

## 3. Master Clock Synchronization (Zero-Drift Architecture)

When building multi-timezone clocks or financial dashboards, **never instantiate multiple independent 1-second timers**. Independent timers will drift out of sync due to event loop scheduling differences.

Instead, use a single **Master Ticker** to drive all derivative clocks.

### A. Reactive UI Signals (Preact, Solid, Vue)

```typescript
import { signal, computed } from '@preact/signals-core';
import { Tempo } from '@magmacomputing/tempo';
import '@magmacomputing/tempo-plugin-ticker/install';

// 1. Single Master Source of Truth
const masterTime = signal(new Tempo());

// 2. Drive the master clock from a master ticker instance (persisted in app scope)
const masterTicker = Tempo.ticker(1, (t) => {
  masterTime.value = t;
});

// 3. Derived multi-timezone views update simultaneously with zero drift
const sydneyTime = computed(() => masterTime.value.set({ timeZone: 'Australia/Sydney' }));
const londonTime = computed(() => masterTime.value.set({ timeZone: 'Europe/London' }));
const nyTime     = computed(() => masterTime.value.set({ timeZone: 'America/New_York' }));
const tokyoTime  = computed(() => masterTime.value.set({ timeZone: 'Asia/Tokyo' }));

// Sydney, London, New York, and Tokyo will tick on the exact same millisecond
```

### B. Async Generator Multi-Clock Stream (Framework-Agnostic)

```typescript
import { Tempo } from '@magmacomputing/tempo';
import '@magmacomputing/tempo-plugin-ticker/install';

async function runTradingDashboard() {
  await using master = Tempo.ticker({ seconds: 1 });

  for await (const t of master) {
    const marketClocks = {
      asx: t.set({ timeZone: 'Australia/Sydney' }),
      lse: t.set({ timeZone: 'Europe/London' }),
      nyse: t.set({ timeZone: 'America/New_York' }),
      tse: t.set({ timeZone: 'Asia/Tokyo' }),
    };

    renderDashboard(marketClocks);
  }
}
```
