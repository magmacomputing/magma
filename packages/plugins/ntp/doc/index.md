![Tempo Plugin](/plugin-logo.svg)

# @magmacomputing/tempo-plugin-ntp

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-ntp"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-ntp?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-ntp/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-ntp"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-ntp?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a>
</p>

A lightweight, high-precision Community plugin for the [Tempo](https://github.com/magmacomputing/magma) ecosystem that provides **client-server network time synchronization** and **monotonic clock drift compensation** using Cristian's algorithm, HTTP `Server-Timing` headers, jitter rejection, and Exponential Moving Average (EMA) smoothing.

---

## Key Features

- **Cristian's Algorithm**: Computes client clock offset from round-trip time (`Δ = T_server - (T_client + RTT / 2)`) without altering the OS clock.
- **Sub-Millisecond Headers**: Reads `Server-Timing: clock=...` with automatic fallback to the standard HTTP `Date` header.
- **Jitter Rejection & EMA Smoothing**: Discards high-latency samples and smooths drift with an Exponential Moving Average.
- **Passive Calibration**: Optionally intercepts `fetch` responses from trusted origins to calibrate with zero extra requests.
- **Synchronous Calibrated Time**: `Tempo.ntp.now()` returns true server-aligned time with no `await`.
- **Universal HTTP Baseline**: Runs identically in browsers, Node.js, Bun, Deno, and Cloudflare Workers.

---

## Installation

```bash
npm install @magmacomputing/tempo-plugin-ntp
```

---

## Quickstart

<PluginRepl plugin="ntp" />

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { NtpPlugin } from '@magmacomputing/tempo-plugin-ntp';

// 1. Install the plugin with target server endpoint
Tempo.use(NtpPlugin, {
  server: '/api/time',                                 // Default time synchronization endpoint
  syncInterval: '15m',                                 // Automatic periodic re-sync
  interceptFetch: ['https://api.mycorp.com', '/api/']  // Passively calibrate only on trusted endpoints
});

// 2. Perform an initial sync
await Tempo.ntp.sync();

// 3. Query true calibrated atomic time (100% synchronous!)
const atomicNow = Tempo.ntp.now();
console.log(`True UTC Time: ${atomicNow.format('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}.{ms}')}`);
console.log(`Measured Drift Offset: ${Tempo.ntp.offset}ms`);
console.log(`Uncertainty Window: ±${Tempo.ntp.drift.uncertaintyMs}ms`);
```

### Configuration Options (`NtpSyncOptions`)

| Option | Type | Default | Description |
|---|---|---|---|
| `server` | `string` | `undefined` | Dedicated HTTP time endpoint returning `Date` or `Server-Timing: clock=<epochMs>`. |
| `syncInterval` | `string \| number` | `undefined` | Periodic re-sync interval (e.g. `'15m'`, `'1h'`, or ms). |
| `interceptFetch` | `boolean \| string \| string[] \| RegExp \| Function` | `false` | Passively sniff headers from application `fetch` calls. Can be `true` (sniff all), a path prefix, origin array, regex, or predicate. |
| `trustedOrigins` | `string \| string[] \| RegExp \| Function` | `undefined` | Whitelist of allowed origins or URL prefixes to sample when `interceptFetch: true` is enabled. |
| `maxAcceptableRttMs` | `number` | `1000` | Maximum round-trip time threshold in milliseconds. Jittery or delayed requests are discarded. |
| `alpha` | `number` | `0.3` | Exponential Moving Average (EMA) smoothing factor between `0.0` and `1.0`. |

### Auto-Installation (Side-Effect Import)

```typescript
import { Tempo } from '@magmacomputing/tempo';
import '@magmacomputing/tempo-plugin-ntp/install';

// Synchronize and query true calibrated server time
await Tempo.ntp.sync();
const now = Tempo.ntp.now();
```

---

## API Reference

### `Tempo.ntp.now(timeZone?: string): Tempo`
Synchronously returns a new `Tempo` instance anchored to the calibrated atomic server timestamp.

### `Tempo.ntp.sync(endpoint?: string): Promise<ClockDriftState>`
Asynchronously sends a lightweight HTTP request to measure Round-Trip Time (RTT) and updates the Exponential Moving Average (EMA) drift offset.

### `Tempo.ntp.offset: number`
Getter returning the current clock drift offset in milliseconds (`serverTime = localTime + offset`).

### `Tempo.ntp.drift: ClockDriftState`
Getter returning the full telemetry state snapshot:
```typescript
interface ClockDriftState {
  readonly offsetMs: number;
  readonly uncertaintyMs: number;
  readonly lastSyncedAt: number;
  readonly sampleCount: number;
}
```

### `Tempo.ntp.isCalibrated: boolean`
Getter indicating whether at least one valid synchronization sample has been successfully processed.

### `Tempo.ntp.reset(): void`
Resets the calibration state and sample count back to zero.

### `tempo.toNtpTime(): Tempo`
Instance method that returns a new `Tempo` instance offset by the current NTP clock drift.

---

## Topic Guides

- [Cristian Algorithm & Precision Specs](./algorithms-and-precision.md) - RTT offset mathematics, `Server-Timing` precision, jitter filtering, and EMA smoothing.
- [Ticker Integration & Atomic Clocks](./ticker-integration.md) - Drift-compensated continuous execution loops with `@magmacomputing/tempo-plugin-ticker` (`ntp: true`).
- [Production Use Cases & Architectural Patterns](./use-cases-and-patterns.md) - Financial countdowns, live auctions, passive calibration, distributed logging, and TOTP authentication.

---

## License

This is a **Community** plugin. It is completely free and open-source for personal and commercial use under the MIT license.
