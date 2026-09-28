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

ticker.on('catch', (err) => {
  console.error('Handled callback error:', err);
});
```

### Event Reference

| Event | Callback Signature | Triggered When |
| :--- | :--- | :--- |
| `'pulse'` | `(t: Tempo, stop: () => void) => void` | Emitted on every recurring tick. |
| `'stop'` | `(t: Tempo) => void` | Emitted when the ticker stops (limit reached or `stop()` called). |
| `'catch'` | `(err: Error) => void` | Emitted when an exception occurs inside a pulse callback. |

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

### Snapshot Structure

```typescript
export interface Snapshot {
  readonly ticker: TickerInstance; // Reference to the active Ticker instance
  readonly next: Tempo;            // The next scheduled Tempo value
  readonly ticks: number;          // Total number of pulses emitted so far
  readonly limit?: number;         // Configured limit (if any)
  readonly interval: object;       // The duration-based interval configuration
  readonly stopped: boolean;       // Current stopped status
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

// 2. Drive the master clock from a single ticker
using _ = Tempo.ticker(1, (t) => {
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
