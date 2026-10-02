![Tempo Plugin](/plugin-logo.svg)

# Production Use Cases & Architectural Patterns

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-ntp"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-ntp?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-ntp/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-ntp"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-ntp?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a>
</p>

Client devices in modern web and mobile environments suffer from unpredictable clock skew. Users frequently travel across time zones, adjust system clocks manually, run outdated CMOS batteries, or experience clock throttling during laptop sleep cycles.

The `@magmacomputing/tempo-plugin-ntp` plugin provides industrial-grade time consistency by locking Tempo instances to true atomic server time.

---

## 1. Anti-Cheat Live Countdowns & Flash Sales

In live auctions, ticket drops, e-commerce flash sales, and sports betting, user interfaces rely on countdown timers. If a client manipulates their system clock backwards or forwards, standard `new Date()` or `Date.now()` timers will display false deadlines or prematurely disable bidding buttons.

### The Problem with Uncalibrated Timers

```typescript
// ⚠️ VULNERABLE: If user sets their OS clock forward 10 minutes,
// the countdown immediately hits 00:00:00 and locks them out.
const timeLeftMs = saleEnd.getTime() - Date.now();
```

### The Calibrated Solution

`Tempo.ntp.now()` evaluates the true atomic timeline with zero asynchronous overhead:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { NtpPlugin } from '@magmacomputing/tempo-plugin-ntp';

Tempo.use(NtpPlugin, { server: '/api/v1/time' });

function getAuctionRemainingTime(auctionEnd: Tempo) {
  // Synchronous, true server time calculation
  const trueNow = Tempo.ntp.now();
  
  if (trueNow.epoch.ms >= auctionEnd.epoch.ms) {
    return { isExpired: true, remainingMs: 0 };
  }
  
  return {
    isExpired: false,
    remainingMs: auctionEnd.epoch.ms - trueNow.epoch.ms
  };
}
```

---

## 2. Zero-Overhead Passive Calibration (`interceptFetch`)

Running dedicated background ping loops to sync time can waste mobile battery and add server load. `tempo-plugin-ntp` solves this via **Passive Fetch Interception**.

When `interceptFetch: true` is enabled, the plugin wraps the global `fetch` API. Whenever your application performs any ordinary REST or GraphQL request, the plugin inspects the response's `Server-Timing` or standard `Date` headers and recalculates drift without issuing a single additional HTTP call:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { NtpPlugin } from '@magmacomputing/tempo-plugin-ntp';

// Initialize with passive sniffing
Tempo.use(NtpPlugin, {
  interceptFetch: true,
  // Smoothing coefficient for Exponential Moving Average
  alpha: 0.2
});

// Any normal application request automatically calibrates the clock!
const response = await fetch('/api/user/profile');
const profile = await response.json();

// System clock is now freshly calibrated
console.log(`Calibrated drift: ${Tempo.ntp.offset}ms (Sample #${Tempo.ntp.drift.sampleCount})`);
```

---

## 3. Distributed Telemetry & Client Log Correlation

When debugging production issues across thousands of distributed clients, correlating frontend crash events with backend API logs is notoriously difficult because client timestamps are untrustworthy.

Using NTP-anchored logging guarantees that client log records share the backend's exact UTC epoch timeline:

```typescript
import { Tempo } from '@magmacomputing/tempo';

export function sendTelemetryLog(eventType: string, payload: Record<string, unknown>) {
  const payloadWithTrueTimestamp = {
    event: eventType,
    data: payload,
    // True UTC timestamp matching server logs
    serverTimeUtc: Tempo.ntp.now().format('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}.{ms}'),
    localTimeUtc: new Tempo().format('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}.{ms}'),
    measuredDriftMs: Tempo.ntp.offset,
    uncertaintyMs: Tempo.ntp.drift.uncertaintyMs
  };

  navigator.sendBeacon('/api/telemetry', JSON.stringify(payloadWithTrueTimestamp));
}
```

---

## 4. Time-Based One-Time Passwords (TOTP / 2FA)

TOTP algorithms (RFC 6238) compute authentication codes using 30-second epoch time slices ($T_0 = \lfloor \text{epochMs} / 30000 \rfloor$). If a client device's clock drifts by more than 30–60 seconds, generated 2FA tokens will be rejected by the server as invalid.

```typescript
import { Tempo } from '@magmacomputing/tempo';

function getTotpTimeStep(): number {
  // Always derive 30s bucket from calibrated atomic time
  const calibratedEpoch = Tempo.ntp.now().epoch.ms;
  return Math.floor(calibratedEpoch / 30000);
}
```

---

## 5. Drift Convergence & High-Frequency Queries

Once calibrated, `Tempo.ntp.now()` synchronously calculates `Date.now() + offset`. 

Because drift is continuously smoothed via Exponential Moving Average (EMA) and maintained in-memory, high-frequency renders, animation frames, and interval loops can query true server time millions of times per second with zero network or asynchronous overhead.
