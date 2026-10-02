# @magmacomputing/tempo-plugin-ntp

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-ntp"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-ntp?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-ntp/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-ntp"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-ntp?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a> <a href="https://magmacomputing.github.io/magma/doc/9-plugins/ntp.index.html"><img src="https://img.shields.io/badge/Docs-VitePress-brightgreen?logo=vitepress&style=flat-square" alt="Documentation" style="display: inline-block; margin: 0 4px;"></a>
</p>

A lightweight, zero-dependency Tempo plugin that provides **client-server network time synchronization** and **monotonic clock drift compensation** using Cristian's algorithm and HTTP `Server-Timing` / `Date` headers.

---

## ⚡ Why Use the NTP Plugin?

Client device clocks are notoriously inaccurate—frequently skewed by seconds or minutes due to dead CMOS batteries, manual time changes, or battery-saver throttles.

- **Auctions, Ticketing & Flash Sales**: Countdown timers evaluate against true server time so bids close accurately.
- **Fintech & 2FA / TOTP**: Prevents authentication and trade-slippage failures caused by skewed device clocks.
- **Offline-First & CRDTs**: Eliminates Last-Write-Wins (LWW) document overwrite bugs.
- **Anti-Tampering**: Detects local clock tampering on timed forms and quizzes.

---

## 📦 Installation

```bash
npm install @magmacomputing/tempo-plugin-ntp
```

---

## 🚀 Quick Start

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
console.log(`True UTC Time: ${now.format('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}.{ms}')}`);

// 3. Inspect telemetry and drift
console.log(`Clock Offset: ${Tempo.ntp.offset}ms`);
console.log(`Uncertainty: ±${Tempo.ntp.drift.uncertaintyMs}ms`);

// 4. Manually trigger an immediate synchronization
await Tempo.ntp.sync('/api/time');
```

> ⚡ **[Try this live in the interactive Tempo Sandbox ↗](https://magmacomputing.github.io/magma/repl/index.html?plugin=ntp)**

---

## 📖 Features

### 1. `Tempo.ntp.now(timeZone?)`
Returns a `Tempo` instance anchored to the calibrated server time. This method is **100% synchronous and non-blocking**—it instantly applies the cached offset without initiating network calls during render.

### 2. `Tempo.ntp.sync(endpoint?)`
Asynchronously triggers an active HTTP `HEAD` ping to calculate Round-Trip Time (RTT) and update the Exponential Moving Average (EMA) drift offset using Cristian's algorithm.

### 3. `Tempo.ntp.drift` & `Tempo.ntp.offset`
- `Tempo.ntp.offset`: Fast integer getter returning the current clock drift offset in milliseconds (`serverTime = localTime + offset`).
- `Tempo.ntp.drift`: Telemetry snapshot returning `{ offsetMs, uncertaintyMs, lastSyncedAt, sampleCount }`.

### 4. `Tempo.ntp.reset()`
Resets the calibration state back to zero.

### 5. `tempo.toNtpTime()`
Converts any existing `Tempo` instance to its calibrated NTP-adjusted equivalent.

---

## 📄 Licensing

This is a **Community** plugin. It is completely free and open-source for personal and commercial use. No license token is required.

📖 **[Read the Official NTP Plugin Documentation](https://magmacomputing.github.io/magma/doc/9-plugins/ntp.index.html)**
