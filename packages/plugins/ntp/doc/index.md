# @magmacomputing/tempo-plugin-ntp

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-ntp"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-ntp?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-ntp/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-ntp"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-ntp?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a>
</p>

A lightweight, zero-dependency Tempo plugin that provides **client-server network time synchronization** and **monotonic clock drift compensation** using Cristian's algorithm and HTTP `Server-Timing` / `Date` headers.

---

## Installation

```bash
npm install @magmacomputing/tempo-plugin-ntp
```

---

## Usage Examples

<PluginRepl plugin="ntp" />

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { NtpPlugin } from '@magmacomputing/tempo-plugin-ntp';

// 1. Install the plugin with optional target server
Tempo.use(NtpPlugin, {
  server: '/api/time',          // Default time sync endpoint
  syncInterval: '15m',          // Automatic periodic re-sync
  interceptFetch: true          // Passively calibrate on existing fetch API calls
});

// 2. Query true calibrated atomic time (100% synchronous!)
const now = Tempo.ntp.now();
console.log(`True UTC Time: ${now.format()}`);

// 3. Inspect telemetry and drift
console.log(`Clock Offset: ${Tempo.ntp.offset}ms`);
console.log(`Uncertainty: ±${Tempo.ntp.drift.uncertaintyMs}ms`);

// 4. Manually trigger an immediate synchronization
await Tempo.ntp.sync('/api/time');
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

## Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use. No license token is required.
