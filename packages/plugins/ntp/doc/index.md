![Tempo Plugin](/plugin-logo.svg)

# @magmacomputing/tempo-plugin-ntp

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-ntp"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-ntp?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-ntp/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-ntp"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-ntp?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a>
</p>

A lightweight, high-precision Community plugin for the [Tempo](https://github.com/magmacomputing/magma) ecosystem that provides **client-server network time synchronization** and **monotonic clock drift compensation** using Cristian's algorithm, HTTP `Server-Timing` headers, jitter rejection, and Exponential Moving Average (EMA) smoothing.

---

## Installation

```bash
npm install @magmacomputing/tempo-plugin-ntp
```

---

## Architecture & Registration

### Plugin Installation

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { NtpPlugin } from '@magmacomputing/tempo-plugin-ntp';

Tempo.use(NtpPlugin, {
  server: '/api/time',          // Default time synchronization endpoint
  syncInterval: '15m',          // Automatic periodic re-sync
  interceptFetch: true          // Passively calibrate on existing fetch API calls
});
```

### Auto-Installation (Side-Effect Import)

```typescript
import { Tempo } from '@magmacomputing/tempo';
import '@magmacomputing/tempo-plugin-ntp/install';

// Synchronously query true calibrated server time
const now = Tempo.ntp.now();
```

---

## Documentation Guide

Explore detailed guides on architecture, production use-cases, and algorithms:

- **[Use Cases & Production Patterns](./use-cases-and-patterns.md)**: Real-world architectures for financial countdowns, live auctions, zero-overhead passive calibration (`interceptFetch`), distributed logging synchronization, and TOTP authentication.
- **[Ticker Integration & Atomic Clocks](./ticker-integration.md)**: Integrating with `@magmacomputing/tempo-plugin-ticker` to build true-time, drift-compensated continuous execution loops and scheduled intervals (`ntp: true`).
- **[Cristian Algorithm & Precision Specs](./algorithms-and-precision.md)**: Mathematical models for round-trip time (RTT) offset calculations, sub-millisecond `Server-Timing` headers, statistical jitter filtering, and EMA smoothing.

---

## Interactive REPL

<PluginRepl plugin="ntp" />

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { NtpPlugin } from '@magmacomputing/tempo-plugin-ntp';

// 1. Install the plugin (points to same-origin or CORS-enabled time endpoint)
Tempo.use(NtpPlugin, { server: '/api/time' });

// 2. Perform an initial sync
await Tempo.ntp.sync();

// 3. Query true calibrated atomic time (100% synchronous!)
const atomicNow = Tempo.ntp.now();
console.log(`True UTC Time: ${atomicNow.format('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}.{ms}')}`);
console.log(`Measured Drift Offset: ${Tempo.ntp.offset}ms`);
console.log(`Uncertainty Window: ±${Tempo.ntp.drift.uncertaintyMs}ms`);
```

---

## Comprehensive API Reference

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

## Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use. No license token is required.
