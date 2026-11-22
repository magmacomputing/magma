![Tempo Plugin](/plugin-logo.svg)

# @magmacomputing/tempo-plugin-signals

<p align="center">
  <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-signals"><img src="https://img.shields.io/npm/v/@magmacomputing/tempo-plugin-signals?style=flat-square" alt="npm version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo"><img src="https://img.shields.io/npm/dependency-version/@magmacomputing/tempo-plugin-signals/peer/@magmacomputing/tempo?style=flat-square" alt="npm peer dependency version" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.npmjs.com/package/@magmacomputing/tempo-plugin-signals"><img src="https://img.shields.io/npm/l/@magmacomputing/tempo-plugin-signals?style=flat-square" alt="License" style="display: inline-block; margin: 0 4px;"></a> <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&style=flat-square" alt="TypeScript Ready" style="display: inline-block; margin: 0 4px;"></a>
</p>

Tempo community plugin for reactive TC39 Signals (`Signify`), adaptive relative-time formatting, boundary-scheduled interval state observation, and global configuration reactivity.

Core `@magmacomputing/tempo` is a static, immutable, zero-timer snapshot engine. `@magmacomputing/tempo-plugin-signals` layers fine-grained, event-driven reactivity on top of Tempo without adding background timers or reactivity overhead to core bundles.

## Key Features

- **Tree-Shakeable Functions & Explicit Installation**: Standalone functions (`toRelativeSignal`, `intervalSignal`, `localeSignal`, `timeZoneSignal`) and `SignalsPlugin` are exported from the root entry with zero side effects; registration occurs only via `Tempo.use(SignalsPlugin)` or the `/install` entry (which mounts `Tempo.signals`, `tempo.toRelativeSignal()`, and `interval.toSignal()`).
- **Two Integration Patterns**: Use standalone tree-shakeable functions directly, or mount `Tempo.signals`, `tempo.toRelativeSignal()`, and `interval.toSignal()` via `Tempo.use(SignalsPlugin)` or `/install`.
- **Adaptive Relative-Time Signals**: `toRelativeSignal` schedules one-shot `setTimeout` updates at exact unit-bucket boundaries (`second` → `minute` → `hour` → `day` → `month` → `year`) instead of polling every second, and automatically tracks global `Tempo.init({ locale })` updates.
- **Boundary-Scheduled Interval Observation**: `intervalSignal` tracks `isCurrent`, `isPast`, `isFuture`, and normalized `progress` ($\in [0, 1]$) with zero polling while future or past.
- **Reactive Global Configuration**: `localeSignal` and `timeZoneSignal` synchronize with `Tempo.init()` via `@magmacomputing/tempo/plugin/sdk`'s `onConfigChange` hook.
- **Deterministic Cleanup**: Returned signals implement both `dispose()` and `Symbol.dispose` (for TypeScript `using` declarations), backed by a `Finalizer` safety net.

---

## Installation {#installation}

```bash
npm install @magmacomputing/tempo-plugin-signals
```

---

## Quickstart {#quickstart}

<PluginRepl plugin="signals" />

### Plugin Registration (`Tempo.use` or `/install`) {#plugin-registration}

Installing `SignalsPlugin` mounts the frozen `Tempo.signals` namespace, `Tempo.prototype.toRelativeSignal()`, and `Tempo.Interval.prototype.toSignal()`:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { SignalsPlugin } from '@magmacomputing/tempo-plugin-signals';

Tempo.use(SignalsPlugin);

const meeting = new Tempo().add({ minutes: 5 });
using relative = meeting.toRelativeSignal();

console.log(relative.get()); // e.g. "in 4m" (default 'narrow' style, truncating toward zero once the clock advances by a few ms)
```

Or use the side-effect `/install` entrypoint to auto-register `SignalsPlugin` on import:

```typescript
import '@magmacomputing/tempo-plugin-signals/install';
import { Tempo } from '@magmacomputing/tempo';

const deadline = new Tempo().add({ hours: 2 });
using relative = deadline.toRelativeSignal({ style: 'long' });

console.log(relative.value); // e.g. "in 1 hour"
```

### Tree-Shakeable Standalone Functions {#tree-shakeable-functions}

For bundle-sensitive applications, import only the functions you need from the root entrypoint without mutating `Tempo`:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { toRelativeSignal } from '@magmacomputing/tempo-plugin-signals';

const target = new Tempo().add({ minutes: 10 });
using relative = toRelativeSignal(target, { style: 'short' });

console.log(relative.get()); // e.g. "in 9 min."
```

| Approach | Import Syntax | Side Effects | Ideal For |
| :--- | :--- | :--- | :--- |
| **Tree-Shakeable Functions** | `import { toRelativeSignal, intervalSignal } from '@magmacomputing/tempo-plugin-signals'` | None | Minimal client bundles and isolated components |
| **Explicit Plugin** | `import { SignalsPlugin } from '@magmacomputing/tempo-plugin-signals'` + `Tempo.use(SignalsPlugin)` | Explicit | Controlled initialization with `SignalsPluginOptions` |
| **Auto-Install Import** | `import '@magmacomputing/tempo-plugin-signals/install'` | Registers `SignalsPlugin` | Apps, REPLs, and convenience setup |

---

## Global Configuration Signals {#global-config-signals}

`localeSignal`, `timeZoneSignal`, and `createConfigSignals` expose `ReadonlySignal<string>` instances that stay synchronized with global `Tempo.init()` calls.

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { Signify } from '@magmacomputing/tempo/library';
import {
  createConfigSignals,
  disposeConfigSignals,
} from '@magmacomputing/tempo-plugin-signals';

Tempo.init({ locale: 'en-US', timeZone: 'UTC' });

const { locale, timeZone } = createConfigSignals({
  locale: 'en-US',
  timeZone: 'UTC',
});

const summary = Signify.computed(() => `${locale.get()} @ ${timeZone.get()}`);
console.log(summary.get()); // "en-US @ UTC"

Tempo.init({ locale: 'fr-FR', timeZone: 'Europe/Paris' });
console.log(summary.get()); // "fr-FR @ Europe/Paris"

// Detach the global onConfigChange listener when tearing down
disposeConfigSignals();
```

When `SignalsPlugin` is installed, the same signals are exposed on `Tempo.signals.locale` and `Tempo.signals.timeZone` (and detached via `Tempo.signals.dispose()` or `using _ = Tempo.signals`).

### Options (`SignalsPluginOptions`) {#signals-plugin-options}

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `locale` | `string` | Runtime `Intl` locale (or `'en'`) | Fallback BCP 47 locale before `Tempo.init()` specifies one |
| `timeZone` | `string` | Runtime `Intl` time zone (or `'UTC'`) | Fallback IANA time zone before `Tempo.init()` specifies one |

### System Locale & Time-Zone Watchers (`watchSystemConfig`) {#watch-system-config}

To synchronize `Tempo.init()` automatically when the host OS or browser changes its locale or time zone (e.g., laptop travel across time zones or `languagechange` events) with **zero background polling**:

```typescript
import { watchSystemConfig } from '@magmacomputing/tempo-plugin-signals';

// Sync both locale and timeZone on browser focus/visibility/languagechange events
using watcher = watchSystemConfig();

// Or keep a pinned locale and sync only timeZone
using tzOnly = watchSystemConfig({ locale: false });
```

When `SignalsPlugin` is installed, the same helper is available at `Tempo.signals.watchSystem(options?)`. Non-browser runtimes can pass a custom `subscribe(trigger)` hook (e.g., Electron `powerMonitor`), call `watcher.check()`, or opt into `pollIntervalMs`.

---

## Adaptive Relative-Time Signals (`toRelativeSignal`) {#adaptive-relative-time}

`toRelativeSignal(target, options?)` (and `tempo.toRelativeSignal(options?)` / `Tempo.signals.relative(target, options?)`) returns a `DisposableSignal<string>` formatted via `Intl.RelativeTimeFormat`.

Instead of running a fixed 1-second timer, it computes the exact delay until the next unit-bucket transition and schedules a single one-shot `setTimeout` for that boundary—keeping background wakeups $O(1)$ per bucket change. If `options.locale` is omitted, the signal also reacts automatically to global `Tempo.init({ locale })` changes.

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { Signify } from '@magmacomputing/tempo/library';
import { toRelativeSignal } from '@magmacomputing/tempo-plugin-signals';

const target = new Tempo().add({ minutes: 5 });
using relative = toRelativeSignal(target, {
  style: 'long',
  numeric: 'auto',
});

const label = Signify.computed(() => `Starts ${relative.get()}`);
console.log(label.get()); // "Starts in 4 minutes"

// Automatically updates when Tempo.init({ locale }) changes
Tempo.init({ locale: 'es-ES' });
console.log(label.get()); // "Starts dentro de 4 minutos"
```

### Accepted Targets (`RelativeSignalTarget`) {#relative-signal-target}

`toRelativeSignal` accepts any of the following target forms:

- `Tempo` instance
- `Temporal.ZonedDateTime` or `Temporal.Instant`
- Object with `{ epoch?: { ms?: number; ns?: bigint } }` or `{ epochMilliseconds?: number; epochNanoseconds?: bigint }`
- `string` (parsed via `new Tempo(target)`)
- `number` (epoch milliseconds) or `bigint` (epoch nanoseconds)

Invalid targets throw a `TypeError`.

### Options (`RelativeSignalOptions`) {#relative-signal-options}

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `locale` | `string` | Reactive `localeSignal()` | Explicit BCP 47 locale override (disables reactive global locale tracking) |
| `style` | `'long' \| 'short' \| 'narrow'` | `'narrow'` | `Intl.RelativeTimeFormat` formatting style |
| `numeric` | `'always' \| 'auto'` | `'auto'` | `Intl.RelativeTimeFormat` numeric mode (e.g. `'yesterday'` vs `'1 day ago'`) |
| `now` | `() => number` | `Date.now` | Custom clock returning epoch milliseconds (useful for deterministic tests) |

### `DisposableSignal<T>` Surface {#disposable-signal}

`DisposableSignal<T>` extends `ReadonlySignal<T>` and is callable (`sig()`), readable via `.get()` or `.value`, and explicitly disposable:

- `disposed`: `boolean` — `true` after `dispose()` or `[Symbol.dispose]()` has been called.
- `dispose()`: stops pending boundary timers and releases resources.
- `[Symbol.dispose]()`: alias for `dispose()` enabling `using` blocks.

---

## Interval State Signals (`intervalSignal`) {#interval-state-signals}

`intervalSignal(interval, options?)` (and `interval.toSignal(options?)` / `Tempo.signals.interval(interval, options?)`) projects a Tempo `Interval` into four reactive `ReadonlySignal` properties:

- `isFuture`: `ReadonlySignal<boolean>` — `true` while `now < start`.
- `isCurrent`: `ReadonlySignal<boolean>` — `true` while `now` is within `[start, end)`.
- `isPast`: `ReadonlySignal<boolean>` — `true` once `now >= end`.
- `progress`: `ReadonlySignal<number>` — normalized elapsed ratio in $[0, 1]$ (`0` before start, `1` at or after end).

Boundary transitions (`start` and `end`) use exact one-shot `setTimeout` scheduling—zero polling occurs while the interval is in the future or past. The `progress` ticker runs only while `isCurrent` is `true` (unless disabled).

```typescript
import { Tempo, Interval } from '@magmacomputing/tempo';
import { intervalSignal } from '@magmacomputing/tempo-plugin-signals';

const start = new Tempo().add({ seconds: 10 });
const end = start.add({ minutes: 5 });
const window = new Interval(start, end);

using state = intervalSignal(window, { progressInterval: 500 });

console.log(state.isFuture.get());  // true
console.log(state.isCurrent.get()); // false
console.log(state.isPast.get());    // false
console.log(state.progress.get());  // 0
```

With `SignalsPlugin` installed, you can call `.toSignal()` directly on any `Interval`:

```typescript
import '@magmacomputing/tempo-plugin-signals/install';
import { Tempo, Interval } from '@magmacomputing/tempo';

const now = new Tempo();
const meeting = new Interval(now, now.add({ minutes: 30 }));

using state = meeting.toSignal({ progressInterval: false });
console.log(state.isCurrent.get()); // true
```

### Options (`IntervalSignalOptions`) {#interval-signal-options}

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `progressInterval` | `number \| false` | `1000` | Update interval in milliseconds for `progress` while `isCurrent` is `true`. Set to `false` or `0` to disable periodic progress ticks. |
| `now` | `() => number` | `Date.now` | Custom clock returning epoch milliseconds. |

---

## API Summary {#api-summary}

| Export | Kind | Description |
| :--- | :--- | :--- |
| `SignalsPlugin`, `signalsPlugin`, `default` | `TempoPlugin<SignalsPluginOptions>` | Plugin mounting `Tempo.signals`, `Tempo.prototype.toRelativeSignal`, and `Tempo.Interval.prototype.toSignal` |
| `localeSignal(options?)` | Function | Shared `ReadonlySignal<string>` synchronized with global `locale` |
| `timeZoneSignal(options?)` | Function | Shared `ReadonlySignal<string>` synchronized with global `timeZone` |
| `createConfigSignals(options?)` | Function | Frozen `{ locale, timeZone }` config signals object |
| `disposeConfigSignals()` | Function | Detaches the global `onConfigChange` listener |
| `toRelativeSignal(target, options?)` | Function | Adaptive, boundary-scheduled `DisposableSignal<string>` |
| `intervalSignal(interval, options?)` | Function | Boundary-scheduled `IntervalSignalState` (`isCurrent`, `isPast`, `isFuture`, `progress`) |

---

## Relationship with `@magmacomputing/tempo-plugin-ticker` {#relationship-with-ticker}

- Use **`@magmacomputing/tempo-plugin-ticker`** when you need continuous fixed-cadence clock streams (`Tempo.ticker.signal({ seconds: 1 })`).
- Use **`@magmacomputing/tempo-plugin-signals`** when you need event-driven relative-time labels, interval lifecycle state, or reactive `Tempo.init()` configuration signals.

---

## Topic Guides {#topic-guides}

- [Production Use Cases & Architectural Patterns](./use-cases-and-patterns.md) - Battery-friendly activity feeds, live interval progress bars, and app-wide locale/time zone reactivity.

---

## License {#license}

This is a **Community** plugin. It is completely free and open-source for personal and commercial use under the MIT license.
