<div class="plugin-eyebrow">
  <a href="./index.html">← @magmacomputing/tempo-plugin-ntp</a>
</div>

<br>

# Ticker Integration & Atomic Clocks

When combined with [`@magmacomputing/tempo-plugin-ticker`](../../ticker/doc/index.md), `@magmacomputing/tempo-plugin-ntp` enables continuous execution loops and scheduled intervals compensated for client-server network clock drift.

---

## 1. NTP-Compensated Cadence (`ntp: true`)

The Ticker plugin supports the `ntp: true` option. 

When `ntp: true` is configured, Ticker seeds unanchored start times from `Tempo.ntp.now()` and dynamically adjusts internal countdown delays to compensate for measured remote clock drift (`Tempo.ntp.offset`):

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { NtpPlugin } from '@magmacomputing/tempo-plugin-ntp';
import { TickerPlugin } from '@magmacomputing/tempo-plugin-ticker';

// 1. Install both plugins
Tempo.use(NtpPlugin, { server: '/api/time' });
Tempo.use(TickerPlugin);

// 2. Initial sync
await Tempo.ntp.sync();

// 3. Create an NTP-compensated 1-second continuous ticker
const ticker = Tempo.ticker({
  ntp: true,
  seconds: 1,
  timeZone: 'America/New_York'
}, (atomicTempo) => {
  console.log(`Atomic Wall Clock: ${atomicTempo.format('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}')}`);
  console.log(`Calibrated Drift: ${Tempo.ntp.offset}ms`);
});
```

---

## 2. Distributed Wall-Clock Aligned Schedules

In collaborative web applications, multiplayer games, and distributed IoT fleets, multiple independent nodes often need to trigger a synchronized action on true atomic minute or hour boundaries.

By passing `ntp: true` alongside cron schedules or duration steps, all participating nodes align to true atomic epoch boundaries:

```typescript
import { Tempo } from '@magmacomputing/tempo';

// Trigger on every 5-minute atomic boundary
const synchronizedJob = Tempo.ticker({
  ntp: true,
  cron: '*/5 * * * *'
}, (atomicTempo) => {
  console.log(`[SYNCHRONIZED PULSE] Distributed task at ${atomicTempo.format('{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}')}`);
});
```

---

## 3. Explicit Resource Management & Lifecycle

NTP-enabled tickers implement ECMAScript explicit resource management (`[Symbol.dispose]` / `[Symbol.asyncDispose]`):

```typescript
{
  await using activeTicker = Tempo.ticker({
    ntp: true,
    seconds: 5,
    limit: 10
  }, (now, stop) => {
    updateDashboard(now);
  });
  
  // Do work...
} // 🧹 Automatically stopped and unmounted upon exiting scope!
```

---

## 4. Fallback Behavior

If `Tempo.ticker({ ntp: true, ... })` is invoked before an NTP sync has occurred, or if `NtpPlugin` has not yet been registered, the Ticker plugin gracefully falls back to local system time and calculates delays from `instant().epochMilliseconds` without throwing runtime errors.


