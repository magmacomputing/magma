![Tempo Plugin](/plugin-logo.svg)

# @magmacomputing/tempo-plugin-ticker

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-ticker"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-ticker?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-ticker/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-ticker"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-ticker?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a>
</p>

A high-performance Community plugin for the [Tempo](https://github.com/magmacomputing/magma) ecosystem providing temporal continuous execution loops, best-effort scheduling with millisecond resolution, explicit resource management disposers (`using` / `await using`), async generator streams, and multi-clock synchronization.

Unlike raw `setInterval`, Tempo Ticker handles calendar arithmetic, month-length adjustments, daylight saving shifts, recurrence rules, and cron schedules with zero timer drift.

---

## Installation

```bash
npm install @magmacomputing/tempo-plugin-ticker
```

---

## Architecture & Registration

### Plugin Installation

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { TickerPlugin } from '@magmacomputing/tempo-plugin-ticker';

Tempo.use(TickerPlugin);
```

### Auto-Installation (Side-Effect Import)

```typescript
import { Tempo } from '@magmacomputing/tempo';
import '@magmacomputing/tempo-plugin-ticker/install';

const ticker = Tempo.ticker({ seconds: 1 });
```

---

## Documentation Guide

Explore detailed guides on specific capabilities:

- **[Intervals & Scheduling Engines](./intervals-and-scheduling.md)**: Semantic durations (`{ months: 1 }`), calendar terms (`#timeOfDay`), 5-field Cron expressions (`0 9 * * 1-5`), RFC 5545 RRULE, countdowns, and one-shot meeting alerts.
- **[Resource Management & Lifecycle](./resource-management.md)**: Explicit resource management (`using` / `await using`), async generators (`for await`), programmatic controls (`stop`, `info`, `pulse`), limits, and zombie process prevention.
- **[Event Streams & Reactive Clocks](./reactive-clocks-and-events.md)**: Event listeners (`.on('pulse')`, `.on('stop')`, `.on('catch')`), registry diagnostics (`Ticker.active`), and zero-drift multi-timezone dashboards with UI signals.
- **[Production Use Cases & Architectural Patterns](./use-cases-and-patterns.md)**: Zero-drift telemetry heartbeats, leak prevention via `using`, streaming market tick generators, multi-timezone cron schedules, and laptop sleep recovery.

---

## Comprehensive `Ticker` API Surface

### Creation: `Tempo.ticker(intervalOrOptions?, callback?)`

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `intervalOrOptions` | `Ticker.Interval \| Ticker.Options` | Number of seconds, cron expression, RRULE string, calendar term, or comprehensive options object. |
| `callback` | `(t: Tempo, stop: () => void) => void` | Optional pulse callback. |

### `Ticker.Options` Configuration

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `seconds` / `ss` | `number` | `1` | Seconds interval step. Negative values count backwards. |
| `minutes` / `mi` | `number` | — | Minutes interval step. |
| `hours` / `hh` | `number` | — | Hours interval step. |
| `days` / `dd` | `number` | — | Days interval step. |
| `months` / `mm` | `number` | — | Calendar months interval step. |
| `years` / `yy` | `number` | — | Years interval step. |
| `cron` | `string` | — | Standard 5-field cron expression (e.g. `'*/15 * * * *'`). |
| `rrule` | `string` | — | Standard RFC 5545 iCalendar recurrence rule string. |
| `seed` | `string \| Date \| Tempo` | Current time | Initial timestamp or starting point for virtual clocks and countdowns. |
| `until` | `string \| Date \| Tempo` | — | Inclusive termination boundary. |
| `limit` | `number` | — | Maximum pulse count before automatic shutdown (`limit: 0` stops immediately). |
| `label` | `string` | — | Descriptive label visible in `Ticker.active` telemetry. |

### `TickerInstance` Object

| Method / Property | Return Type | Description |
| :--- | :--- | :--- |
| `ticker.stop()` | `void` | Stops the ticker, clears active timers, and finalizes pending async iterators. |
| `ticker.pulse()` | `Tempo` | Manually triggers a pulse, advances state, and notifies listeners. |
| `ticker.info` | `object` | Telemetry snapshot: `{ next, ticks, limit, interval, stopped }`. |
| `ticker.on(event, cb)` | `this` | Registers listeners for `'pulse'`, `'stop'`, or `'catch'`. |
| `[Symbol.dispose]` | `void` | Synchronous disposer hook for `using` blocks. |
| `[Symbol.asyncDispose]` | `Promise<void>` | Asynchronous disposer hook for `await using` blocks. |
| `[Symbol.asyncIterator]` | `AsyncGenerator<Tempo>` | Streaming generator support for `for await (const t of ticker)` loops. |

### Static `Ticker` Namespace

| Property | Return Type | Description |
| :--- | :--- | :--- |
| `Ticker.active` | `Snapshot[]` | Returns an array of snapshots for all currently running (non-stopped) Tickers. |

---

## Quickstart Examples

<PluginRepl plugin="ticker" />

### 1. Disposer Pattern (Zero Leakage)

```typescript
import { Tempo } from '@magmacomputing/tempo';
import '@magmacomputing/tempo-plugin-ticker/install';

{
  await using ticker = Tempo.ticker({ seconds: 1 }, (t) => {
    console.log('Tick:', t.format('{hh}:{mi}:{ss}'));
  });

  // Keep scope alive to observe repeated ticks
  await new Promise((resolve) => setTimeout(resolve, 2500));
} // ⚡ Cleaned up automatically upon leaving scope
```

### 2. Async Generator Stream

```typescript
async function streamClock() {
  await using ticker = Tempo.ticker({ seconds: 1 });
  let count = 0;

  for await (const t of ticker) {
    console.log('Stream tick:', t.iso);
    if (++count >= 5) break;
  }
}
```

---

## License

This is a **Community** plugin. It is completely free and open-source for personal and commercial use under the MIT license. No license token is required.
