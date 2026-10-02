![Tempo Plugin](/plugin-logo.svg)

# Ticker Integration & Atomic Clocks

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-ntp"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-ntp?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-ntp/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-ntp"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-ntp?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a>
</p>

When combined with [`@magmacomputing/tempo-plugin-ticker`](../../ticker/doc/index.md), `@magmacomputing/tempo-plugin-ntp` unlocks reactive clocks and temporal schedules anchored directly to atomic server time.

---

## 1. True-Time Reactive Clocks (`source: 'ntp'`)

The Ticker plugin's `Tempo.ticker.now()` reactive clock generator supports the `source: 'ntp'` option. 

When configured with `source: 'ntp'`, each pulse emitted by the reactive clock automatically queries the calibrated NTP drift engine. If the network time drift is updated in the background, the UI clock smoothly reflects true atomic time without restarting the loop:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { NtpPlugin } from '@magmacomputing/tempo-plugin-ntp';
import { TickerPlugin } from '@magmacomputing/tempo-plugin-ticker';

// 1. Install both plugins
Tempo.use(NtpPlugin, { server: '/api/time' });
Tempo.use(TickerPlugin);

// 2. Initial sync
await Tempo.ntp.sync();

// 3. Create a high-precision 1-second reactive clock
const clock = Tempo.ticker.now({
  source: 'ntp',
  timeZone: 'America/New_York',
  updateInterval: 1000
});

// 4. Subscribe to atomic pulses
clock.on('pulse', (atomicTempo) => {
  console.log(`Atomic Wall Clock: ${atomicTempo.format('YYYY-MM-DD HH:mm:ss')}`);
  console.log(`Calibrated Drift: ${Tempo.ntp.offset}ms`);
});
```

---

## 2. Distributed Wall-Clock Aligned Schedules

In collaborative web applications, multiplayer games, and distributed IoT fleets, multiple independent nodes often need to trigger a synchronized action at the exact same global second or minute boundary.

If nodes rely on local OS clocks, actions will fire at staggered times due to individual device drift. By driving Ticker with NTP time, all nodes align to true atomic epoch boundaries:

```typescript
import { Tempo } from '@magmacomputing/tempo';

// Trigger exactly on the top of every minute in atomic UTC
const synchronizedJob = Tempo.ticker({
  pattern: '0 * * * * *', // Every minute at :00s
  source: 'ntp'
}, (atomicTempo) => {
  console.log(`[SYNCHRONIZED PULSE] Executing distributed batch at ${atomicTempo.toISOString()}`);
});
```

---

## 3. Explicit Resource Management & Lifecycle

NTP-backed tickers implement ECMAScript explicit resource management (`[Symbol.dispose]` / `[Symbol.asyncDispose]`):

```typescript
{
  using atomicClock = Tempo.ticker.now({ source: 'ntp' });
  
  atomicClock.on('pulse', (now) => {
    updateHeaderClock(now);
  });
  
  // Do work...
} // 🧹 Automatically stopped and garbage collected upon exiting scope!
```

---

## 4. Fallback Behavior

If `Tempo.ticker.now({ source: 'ntp' })` is invoked before an NTP sync has occurred, or if `NtpPlugin` has not yet been registered, the Ticker plugin gracefully falls back to monotonic local system time (`source: 'local'`) without throwing runtime errors.
