# Implementation Plan: Signal-Aware Reactivity for Ticker & NTP Plugins

**Target Packages**:
- `@magmacomputing/tempo-plugin-ticker` (`packages/plugins/ticker`)
- `@magmacomputing/tempo-plugin-ntp` (`packages/plugins/ntp`)
- `@magmacomputing/tempo` (`packages/tempo`)

**Status**: Proposal / Ready for Review  
**Date**: October 2026  
**Context**: Modernizing Tempo's time-varying plugins with first-class TC39 Signal reactivity powered by `#library/signify.library.js`.

---

## 1. Executive Summary & Motivation

Tempo's primary reactivity mechanism has historically been the asynchronous stream primitive [`Reactive<T>`](file:///home/michael/Project/magma/packages/library/src/common/runtime/reactive.class.ts), which powers push/pull iteration (`for await (const t of ticker)`), event hooks (`.on('pulse')`), and explicit resource cancellation (`using ticker = Tempo.ticker(...)`).

However, modern frontend UI architectures (React 19+, Solid, Vue 3.5+, Svelte 5 runes, Preact, Lit, Angular 17+) have converged on **fine-grained, synchronous reactive signals**. Prior to the introduction of `signify.library`, developers building live UI dashboards or synchronized clocks were instructed to install third-party dependencies (such as `@preact/signals-core`) and manually wire ticker callbacks to signal updates.

With the delivery of **`Signify`** in [`#library/signify.library.ts`](file:///home/michael/Project/magma/packages/library/src/common/runtime/signify.library.ts)—a zero-dependency, memory-safe (`WeakRef` + `Finalizer`), frozen implementation of the TC39 Signals proposal—Tempo now possesses native fine-grained reactivity.

This Implementation Plan (IP) details the architecture, API design, lifecycle semantics, and phased rollout for making **`@magmacomputing/tempo-plugin-ticker`** and **`@magmacomputing/tempo-plugin-ntp`** natively signal-aware.

---

## 2. Core Architectural Philosophy

### "Async Stream at the Core, Synchronous Signal at the Edge"

```mermaid
graph TD
    subgraph Engine Core [Asynchronous Scheduling Engine]
        Timer[Event Loop / rAF / Interval] --> ReactiveStream["Reactive&lt;Tempo&gt; (Stream Engine)"]
        NtpEngine[ClockDriftEngine] --> CalibratedEpoch[Calibrated Epoch Offset]
    end

    subgraph Reactive Boundary [Bridging Layer via Signify]
        ReactiveStream -->|.toSignal()| TickerSignal["ticker.signal (ReadonlySignal&lt;Tempo&gt;)"]
        CalibratedEpoch -->|State.set()| NtpSignals["Tempo.ntp.signals.offset / drift"]
    end

    subgraph Consumer Edge [Fine-Grained UI & Computed DAG]
        TickerSignal --> CompFmt["Signify.computed(() => clock.format('HH:mm:ss'))"]
        NtpSignals --> CompClock["Signify.computed(() => wallClock + offset)"]
        CompFmt --> DOMNode[Fine-Grained DOM Text Node]
        CompClock --> TradingDashboard[Trading / Real-Time Dashboard]
    end
```

1. **Preserve `Reactive<T>` Internals**: Stateful plugins will not abandon `Reactive<T>`. `Reactive<T>` remains the single source of truth for scheduling, interval drift calculation, pause/resume, error containment, and stream cancellation.
2. **Zero-Cost Lazy Evaluation**: Signal objects (`Signify.State` / `Signify.Computed`) are only created when the developer accesses `.signal` or calls `.toSignal()`. Unused signal functionality incurs zero memory or allocation overhead.
3. **Leak-Proof Automatic Lifecycle**: Signals are bound to underlying streams via `WeakRef` and registered with [`Finalizer`](file:///home/michael/Project/magma/packages/library/src/common/runtime/finalizer.class.ts). If a UI component unmounts and abandons its signal reference, the internal listener unregisters automatically.
4. **TC39 Forward Compatibility**: All exposed signals adhere to the standard `Signal.State` / `Signal.Computed` contract (`.get()`, `.value`, `.epoch`) and auto-delegate to `globalThis.Signal` when native runtime support arrives.

---

## 3. Specification: `@magmacomputing/tempo-plugin-ticker`

### 3.1 Instance Signal Accessors (`ticker.signal` & `ticker.toSignal()`)

Every [`TickerInstance`](file:///home/michael/Project/magma/packages/plugins/ticker/src/index.ts#L129) maintains an internal `Reactive<Tempo>` stream. We expose:

1. **`ticker.signal`**: A cached, lazy `ReadonlySignal<Tempo>` representing the current tick value:
   ```typescript
   export interface TickerInstanceDescriptor {
     /**
      * Readonly TC39 Signal emitting the latest Tempo instance on each tick.
      * Reading `.value` or `.get()` within an effect or computed graph registers a reactive dependency.
      */
     readonly signal: ReadonlySignal<Tempo>;

     /**
      * Explicit signal factory allowing an initial fallback value before the first tick.
      */
     toSignal<D = undefined>(initialValue?: D): ReadonlySignal<Tempo | D>;
   }
   ```

2. **Usage Example (Vanilla & Frameworks)**:
   ```typescript
   import { Tempo } from '@magmacomputing/tempo';
   import '@magmacomputing/tempo-plugin-ticker/install';

   // Create a 1-second ticking clock
   using ticker = Tempo.ticker({ seconds: 1 });

   // Access the native signal directly
   const clock = ticker.signal;

   // In fine-grained frameworks (e.g. Solid, Preact Signals, Vue 3.5, Angular Signals):
   console.log(clock.value.format('{h12}:{mi}:{ss} {mer:upper}'));
   ```

### 3.2 Static Convenience Helper: `Tempo.ticker.signal()`

Provides a one-line constructor for standalone reactive clocks without requiring explicit instance management:

```typescript
// Creates, starts, and returns a ReadonlySignal<Tempo> ticking at the specified interval
const currentSecond = Tempo.ticker.signal(1);
const currentMinute = Tempo.ticker.signal({ interval: '1m' });
const businessPulse = Tempo.ticker.signal({ cron: '*/5 9-17 * * 1-5' });
```

#### Lifecycle Semantics:
- **Auto-Disposal with `using`**:
  ```typescript
  {
    using clock = Tempo.ticker.signal(1);
    // Runs while in scope; automatically stops timer on block exit
  }
  ```
- **Terminal States**: When a ticker reaches its configured `limit` or `until` date, or when `.stop()` is called, the signal retains its terminal `Tempo` snapshot and halts updates; downstream computations are not dirtied again.

---

## 4. Specification: `@magmacomputing/tempo-plugin-ntp`

### 4.1 Reactive State Namespace: `Tempo.ntp.signals`

Currently, [`Tempo.ntp`](file:///home/michael/Project/magma/packages/plugins/ntp/src/index.ts#L176) exposes static getters: `offset`, `drift`, and `isCalibrated`. These reflect point-in-time values.

We add `Tempo.ntp.signals` as a frozen namespace of reactive signal properties:

```typescript
export interface NtpSignalsNamespace {
  /** Reactive signal containing the current clock drift offset in milliseconds */
  readonly offset: ReadonlySignal<number>;

  /** Reactive signal indicating whether clock synchronization has completed at least one valid calibration */
  readonly isCalibrated: ReadonlySignal<boolean>;

  /** Reactive signal emitting the complete ClockDriftState snapshot (RTT, jitter, confidence) */
  readonly drift: ReadonlySignal<ClockDriftState>;
}
```

#### Engine Integration Hook:
Inside [`ClockDriftEngine`](file:///home/michael/Project/magma/packages/plugins/ntp/src/engine.ts), when calibration updates state (either via active `sync()` or passive HTTP `fetch` header interception):
```typescript
// Inside ClockDriftEngine state update routine:
#offsetState.set(newOffset);
#isCalibratedState.set(true);
#driftState.set(this.drift);
```

### 4.2 Calibrated Live Clock Signal: `Tempo.ntp.signal()`

Exposes an auto-updating live clock that incorporates real-time network drift compensation:

```typescript
/**
 * Creates a ReadonlySignal<Tempo> that ticks on an interval and automatically
 * accounts for calibrated NTP drift.
 */
const ntpClock = Tempo.ntp.signal({ interval: 1 });

// Reading ntpClock.value returns an accurate Tempo instance:
// epochMs = Date.now() + Tempo.ntp.offset
```

If background recalibration occurs while the application is running, `ntpClock` automatically adjusts its next tick calculation, ensuring zero phase shift across long-running browser sessions.

---

## 5. Cross-Plugin Synergy: NTP-Calibrated Reactive Ticker

A primary benefit of native signal awareness is composability between `Ticker` and `NTP`:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import '@magmacomputing/tempo-plugin-ticker/install';
import '@magmacomputing/tempo-plugin-ntp/install';

// 1. Ticker automatically binds to NTP when { ntp: true } is supplied
const atomicTicker = Tempo.ticker({
  interval: 1,
  ntp: true // Computes ticks against Tempo.ntp calibrated time
});

// 2. Extract signal
const liveAtomicClock = atomicTicker.signal;

// 3. Derive global market clocks with zero drift
import { Signify } from '@magmacomputing/tempo/library';

const nyseTime = Signify.computed(() => 
  liveAtomicClock.value.set({ timeZone: 'America/New_York' }).format('{h12}:{mi}:{ss} {mer:upper}')
);

const tokyoTime = Signify.computed(() => 
  liveAtomicClock.value.set({ timeZone: 'Asia/Tokyo' }).format('{h12}:{mi}:{ss} {mer:upper}')
);
```

---

## 6. TypeScript Interface Augmentations

### Ticker Module (`packages/plugins/ticker/src/index.ts`)

```typescript
import type { ReadonlySignal } from '@magmacomputing/tempo/library';

declare module '@magmacomputing/tempo' {
  namespace Tempo {
    namespace ticker {
      /** Spawns an auto-ticking ReadonlySignal<Tempo> */
      function signal(interval?: number | string | Ticker.Options): ReadonlySignal<Tempo> & Disposable;
    }
  }

  namespace Ticker {
    interface Instance {
      /** Native TC39 ReadonlySignal emitting on every tick */
      readonly signal: ReadonlySignal<Tempo>;
      toSignal<D = undefined>(initialValue?: D): ReadonlySignal<Tempo | D>;
    }
  }
}
```

### NTP Module (`packages/plugins/ntp/src/index.ts`)

```typescript
import type { ReadonlySignal } from '@magmacomputing/tempo/library';
import type { ClockDriftState } from './types.js';

export interface NtpSignalsNamespace {
  readonly offset: ReadonlySignal<number>;
  readonly isCalibrated: ReadonlySignal<boolean>;
  readonly drift: ReadonlySignal<ClockDriftState>;
}

declare module '@magmacomputing/tempo' {
  namespace Tempo {
    namespace ntp {
      /** Reactive signals namespace for drift, offset, and calibration state */
      const signals: NtpSignalsNamespace;

      /** Spawns an NTP-calibrated ticking clock signal */
      function signal(options?: { interval?: number | string; timeZone?: string }): ReadonlySignal<Tempo> & Disposable;
    }
  }
}
```

---

## 7. Phased Implementation Roadmap

| Phase | Milestone | Scope / Deliverables | Risk / Complexity |
| :--- | :--- | :--- | :---: |
| **Phase 1** | **Ticker Signal Core** | 1. Expose `ticker.signal` on `TickerInstance` by leveraging existing `this.#reactive.signal`.<br>2. Implement `ticker.toSignal(fallback)`.<br>3. Implement static helper `Tempo.ticker.signal(...)`.<br>4. Add unit test suite in `packages/plugins/ticker/test/ticker.signal.test.ts`. | **Low** |
| **Phase 2** | **NTP Reactive Engine** | 1. Add `Signify.State` instances inside `ClockDriftEngine` for `offset`, `isCalibrated`, and `drift`.<br>2. Update states in `sync()` and `fetch` interception response handlers.<br>3. Expose `Tempo.ntp.signals` getter namespace.<br>4. Add unit tests in `packages/plugins/ntp/test/ntp.signals.test.ts`. | **Low-Medium** |
| **Phase 3** | **Calibrated NTP Signal & Ticker Interop** | 1. Implement `Tempo.ntp.signal({ interval })` composing NTP offset with timer ticks.<br>2. Verify dynamic phase realignment when recalibration occurs mid-stream.<br>3. Add integration tests verifying `Tempo.ticker({ ntp: true }).signal`. | **Medium** |
| **Phase 4** | **Docs & Modernization** | 1. Update [`packages/plugins/ticker/doc/reactive-clocks-and-events.md`](file:///home/michael/Project/magma/packages/plugins/ticker/doc/reactive-clocks-and-events.md) to replace `@preact/signals-core` with native `ticker.signal`.<br>2. Update [`bleeding-edge-technologies.md`](file:///home/michael/Project/magma/packages/tempo/plan/bleeding-edge-technologies.md#L99-L113) status from "Hold off" to "Integrated via Signify".<br>3. Add interactive REPL showcase example demonstrating zero-drift live dashboards. | **Low** |

---

## 8. Verification & Test Plan

1. **Reactivity & Epoch Verification**:
   - Verify that reading `.signal.value` within `Signify.effect()` or `Signify.computed()` registers dependencies and triggers effects on every timer pulse.
   - Verify that when the timer is stopped via `.stop()`, downstream effects cease firing.
2. **Memory Leak Protection**:
   - Run memory stress test with 10,000 transient ticker signals without explicit disposal to confirm `Finalizer` and `WeakRef` successfully release unreferenced consumer nodes.
   - Verify `using` operator cleanly invokes `[Symbol.dispose]()` and shuts down underlying timers.
3. **NTP Drift Reaction**:
   - Mock network fetch response with an adjusted `Server-Timing: clock=...` header.
   - Verify that `Tempo.ntp.signals.offset` updates its epoch and immediately re-evaluates all dependent computed clocks without a page refresh or polling loop.
