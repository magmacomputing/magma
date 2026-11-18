<div class="plugin-eyebrow">
  <a href="./index.html">← @magmacomputing/tempo-plugin-signals</a>
</div>

<br>

# Production Use Cases & Architectural Patterns

`@magmacomputing/tempo-plugin-signals` brings event-driven TC39 Signals (`Signify`) to UI components, dashboards, and scheduling workflows without adding background polling overhead to Core `@magmacomputing/tempo`.

---

## 1. Battery-Friendly Activity Feeds (`toRelativeSignal`) {#activity-feeds}

Chat messages, deployment logs, and audit trails often render hundreds of relative timestamps (`"just now"`, `"5 minutes ago"`, `"2 hours ago"`). Polling every row once per second wastes CPU and battery on stale entries.

`toRelativeSignal` schedules a single one-shot `setTimeout` at the exact next unit-bucket boundary (`second` → `minute` → `hour` → `day` → `month` → `year`), so a 3-hour-old item sleeps for up to an hour between updates:

```typescript
import { toRelativeSignal } from '@magmacomputing/tempo-plugin-signals';

function mountTimestampBadge(createdAtIso: string) {
  const label = toRelativeSignal(createdAtIso, { style: 'narrow' });

  // Read current value synchronously in your UI render / effect
  console.log(label.get());

  // Call label.dispose() when the row/component unmounts
  return () => label.dispose();
}
```

---

## 2. Live Meeting & Booking Progress Bars (`intervalSignal`) {#interval-progress}

Calendar cards, maintenance windows, and SLA timers need to transition cleanly through **upcoming** (`isFuture`), **active** (`isCurrent`), and **completed** (`isPast`) states while tracking normalized completion `progress` ($\in [0, 1]$).

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { intervalSignal } from '@magmacomputing/tempo-plugin-signals';

const start = new Tempo().add({ minutes: 10 });
const end = start.add({ minutes: 50 });
const meetingWindow = Tempo.Interval.from(start, end);

using state = intervalSignal(meetingWindow, { progressInterval: 1_000 });

console.log({
  isFuture: state.isFuture.get(),
  isCurrent: state.isCurrent.get(),
  isPast: state.isPast.get(),
  progress: state.progress.get(),
});
```

- While `isFuture` is `true`, **no progress ticker runs**—only a single boundary timer waits until `start`.
- Once `start` is reached, `isCurrent` flips to `true` and optional `progressInterval` updates begin.
- Once `end` is reached, `isPast` becomes `true`, `progress` locks at `1`, and all timers stop automatically.

---

## 3. App-Wide Locale & Time Zone Switching (`localeSignal` / `timeZoneSignal`) {#global-config-reactivity}

When a user switches language or time zone in application settings via `Tempo.init()`, `localeSignal` and `timeZoneSignal` propagate the change to reactive views automatically via `@magmacomputing/tempo/plugin/sdk`'s `onConfigChange` hook:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { localeSignal, timeZoneSignal, disposeConfigSignals } from '@magmacomputing/tempo-plugin-signals';

const locale = localeSignal();
const timeZone = timeZoneSignal();

console.log(locale.get(), timeZone.get());

// Updating global Tempo configuration notifies active config signals
Tempo.init({ locale: 'fr-FR', timeZone: 'Europe/Paris' });
console.log(locale.get(), timeZone.get()); // "fr-FR", "Europe/Paris"

// Detach global config observer on app teardown
disposeConfigSignals();
```
