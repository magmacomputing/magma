# Intervals & Scheduling Engines

The `@magmacomputing/tempo-plugin-ticker` plugin supports a unified scheduling interface capable of driving continuous loops via semantic durations, calendar terms, standard 5-field cron syntax, RFC 5545 recurrence rules, and virtual clock countdowns.

---

## 1. Semantic Duration Intervals

Instead of raw milliseconds or seconds, you can configure intervals using semantic `DurationLike` objects or shorthand units. This is critical for variable-length units like **months** and **years**, where fixed millisecond counts drift across leap years and differing month lengths:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import '@magmacomputing/tempo-plugin-ticker/install';

// Pulse exactly once every calendar month
await using monthly = Tempo.ticker({ months: 1 }, (t) => {
  console.log('Monthly pulse:', t.format('{yyyy}-{mm}-{dd}'));
});

// Multi-unit duration intervals
await using meetingInterval = Tempo.ticker({ hours: 1, minutes: 30 }, (t) => {
  console.log('Meeting interval pulse:', t.format('{hh}:{mi}'));
});

// Ultra-compact shorthand notation (consumed via async iteration)
await using concise = Tempo.ticker({ hh: 1, mi: 30 }); // every 1h 30m
for await (const t of concise) {
  console.log('Concise interval pulse:', t.format('{hh}:{mi}'));
  break;
}
```

### Supported Shorthand Units

| Shorthand | Full Duration Unit | Example |
| :--- | :--- | :--- |
| `ss` / `seconds` | Seconds | `{ ss: 5 }` (Every 5 seconds) |
| `mi` / `minutes` | Minutes | `{ mi: 15 }` (Every 15 minutes) |
| `hh` / `hours` | Hours | `{ hh: 2 }` (Every 2 hours) |
| `dd` / `days` | Days | `{ dd: 1 }` (Daily at current wall-clock offset) |
| `ww` / `weeks` | Weeks | `{ ww: 2 }` (Fortnightly) |
| `mm` / `months` | Calendar Months | `{ mm: 1 }` (1st of each month / monthly) |
| `yy` / `years` | Years | `{ yy: 1 }` (Annually) |

---

## 2. Calendar Term-Driven Intervals

Ticker can be driven directly by any registered **Term** in the Tempo ecosystem (e.g., `#timeOfDay`, `#quarter`, `#season`).

### Boundary Snapping (`>`) vs. Relative Shifting (`1`)

- **Boundary Snapping (`>` / `<`)**: Snaps each pulse directly to the exact boundary of the period (e.g. exactly at 06:00 for morning, 12:00 for afternoon).
- **Relative Shifting (`1`, `2`, ...)**: Preserves your current time offset into the next period (e.g. being 15 minutes into a quarter will pulse 15 minutes into the next quarter).

```typescript
// Snap and pulse exactly at the start of each daily cycle ('morning', 'afternoon', 'evening', 'night')
using shiftTicker = Tempo.ticker({ '#timeOfDay': '>' }, (t) => {
  console.log(`New period started: ${t.term.tod} at ${t.format('{hh}:{mi}')}`);
});

// Pulse as each fiscal or calendar quarter begins
using quarterlyTicker = Tempo.ticker({ '#quarter': '>' }, (t) => {
  console.log(`New quarter entered: Q${t.quarter}`);
});
```

---

## 3. Cron Expressions (Standard 5-Field Syntax)

Ticker natively accepts standard 5-part cron expressions (`minute hour day-of-month month day-of-week`) powered by `@magmacomputing/tempo-fns`.

### Passing Cron Strings

```typescript
// Pattern A: Positional 5-field cron string (9am Monday through Friday)
// Note: The callback runs immediately when the ticker is created, even outside the 9am window,
// before subsequent calls follow the scheduled cron interval.
await using weekdaySync = Tempo.ticker('0 9 * * 1-5', (t) => {
  console.log(`Workday morning pulse: ${t.format('{hh}:{mi}:{ss}')}`);
});

// Pattern B: Options object with cron schedule and boundary limits
await using healthCheck = Tempo.ticker({
  cron: '*/15 * * * *', // Every 15 minutes
  label: '15-Minute Healthcheck',
  limit: 10
}, (t) => {
  console.log(`Healthcheck pulse: ${t.format('{yyyy}-{mm}-{dd} {hh}:{mi}')}`);
});
```

---

## 4. RFC 5545 Recurrence Rules (RRULE)

Ticker natively supports RFC 5545 iCalendar recurrence rule strings:

```typescript
// Daily recurrence at current time
await using dailySync = Tempo.ticker('FREQ=DAILY;INTERVAL=1');

// Complex recurrence via options object
await using weeklyTeamSync = Tempo.ticker({
  rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR;INTERVAL=1',
  label: 'MWF Sync'
}, (t) => {
  console.log('Standup meeting tick:', t.format('{www}, {dd} {mon} {hh}:{mi}'));
});
```

---

## 5. Virtual Clocks & Seeding

By default, Tickers emit real-time wall-clock timestamps. Providing a **`seed`** transforms the Ticker into a **Virtual Clock** that steps forward deterministically through simulated time:

```typescript
// Starts at '2026-01-01T00:00:00Z', advancing 1 day per real-time pulse
await using simulation = Tempo.ticker({
  days: 1,
  seed: '2026-01-01T00:00:00Z',
  limit: 30
}, (t) => {
  console.log(`Simulated Day: ${t.format('{yyyy}-{mm}-{dd}')}`);
});
```

---

## 6. Backwards Tickers (Countdowns)

Supplying a **negative duration** creates a reverse Ticker that counts backwards in time:

```typescript
// Count down from 10 seconds, stepping back 1s per tick
using countdown = Tempo.ticker(
  { seconds: -1, seed: '00:00:10' },
  (t, stop) => {
    console.log(`T-Minus: ${t.format('{ss}')}s`);
    if (t.ss === 0) {
      console.log('🚀 Liftoff!');
      stop();
    }
  }
);
```

---

## 7. One-Shot Timers & Meeting Alerts

Specifying a `seed` without any recurring interval duration automatically configures a **one-shot alert** (`limit: 1`):

```typescript
// Pattern A: Quick string seed (e.g., target meeting alert)
Tempo.ticker('Friday 10am', (t) => {
  console.log(`Meeting alert triggered: ${t.format('{hh}:{mi}')}`);
});

// Pattern B: Explicit one-shot options
Tempo.ticker({
  seed: '2026-12-25T09:00:00Z'
}, (t) => {
  console.log('Christmas morning reminder!');
});
```

> [!NOTE]
> **Future Seeds**: If the seed time is in the future, the Ticker remains dormant until that scheduled time is reached, fires its single pulse, and terminates automatically. For delays exceeding 32-bit integer timeout limits (~24.8 days), timeout capping re-arms the timer until the target epoch is reached.
