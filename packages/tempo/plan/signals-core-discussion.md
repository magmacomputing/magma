# Architectural Discussion: TC39 Signals in Core Tempo

**Target Package**: `@magmacomputing/tempo` (`packages/tempo`)  
**Status**: Proposal / Under Review  
**Date**: October 2026  
**Context**: Evaluation of integrating fine-grained reactivity via `#library/signify.library.js` into Core Tempo.

---

## 1. Executive Summary & Context

Tempo is designed as a **universal, isomorphic time and date engine** delivering high-performance parsing, formatting, duration manipulation, and date arithmetic across all modern JavaScript runtimes.

Historically, Tempo's reactivity strategy focused primarily on **asynchronous push/pull streams** via [`Reactive<T>`](file:///home/michael/Project/magma/packages/library/src/common/runtime/reactive.class.ts) in [`#library`](file:///home/michael/Project/magma/packages/tempo/src/library.index.ts), powering asynchronous iteration (`for await`), event subscriptions (`.on('pulse')`), explicit resource disposal (`using`), and plugins like `@magmacomputing/tempo-plugin-ticker` and `@magmacomputing/tempo-plugin-sync`.

With the arrival of the TC39 Signals specification and our zero-dependency, frozen, memory-efficient implementation of [`Signify`](file:///home/michael/Project/magma/packages/library/src/common/runtime/signify.library.ts) in `@magmacomputing/library` (re-exported via [`#tempo/library`](file:///home/michael/Project/magma/packages/tempo/src/library.index.ts#L38)), Tempo has direct access to synchronous, fine-grained reactive state and computed dependency tracking graphs.

### The Temporal Dual: Snapshots vs. Continuous Time

There is a fundamental conceptual duality in temporal computing:
1. **The Static Snapshot Plane**: A point in time (`new Tempo()`, backed by `Temporal.ZonedDateTime`) or a fixed span ([`Interval`](file:///home/michael/Project/magma/packages/tempo/src/interval.index.ts)) is inherently immutable, deterministic, and serializable.
2. **The Continuous Reactive Plane**: Real-world applications live in the flow of time. UI frameworks (React, Solid, Vue, Svelte 5 runes, Preact, Lit, Angular) require fine-grained reactivity to render clocks, countdowns, relative timestamps ("3 minutes ago"), and active scheduling windows.

```mermaid
graph TD
    subgraph Static Temporal Plane [Immutable Snapshot Engine]
        ZDT[Temporal.ZonedDateTime] --> TempoInst[Tempo Instance]
        TempoInst --> Format[tempo.format]
        TempoInst --> Math[tempo.add / diff]
        TempoInst --> IntervalInst[Interval Instance]
    end

    subgraph Dynamic Reactive Plane [Signify Reactive Graph]
        ClockSignal["Tempo.live() Signal"] --> CompFmt["Computed Formatting"]
        CompRel["Adaptive Relative Signal"] --> UIDOM["Fine-Grained DOM Text Node"]
        IntervalSignal["interval.toSignal()"] --> RangeState["isCurrent / isPast / progress"]
        LocaleSignal["Tempo.locale Signal"] --> CompFmt
    end

    Static Temporal Plane -.->|.toSignal() Bridge / Inputs.-> Dynamic Reactive Plane
```

This discussion document evaluates **six discrete architectural proposals** where Signals provide tangible value to Core Tempo. Each proposal is presented independently for separate evaluation and prioritization.

---

## Proposal 1: Live Continuous Clocks (`Tempo.live()`)

### 1.1 Motivation & Problem Statement
Currently, [`Tempo.now()`](file:///home/michael/Project/magma/packages/tempo/src/tempo.class.ts#L1366) produces a static integer or `BigInt` timestamp. To display a ticking clock, countdown, or auto-updating header in modern web applications, developers are forced to write bespoke framework hooks (`useEffect` with `setInterval` in React, `onMounted` with timers in Vue). 

These boilerplate timers frequently trigger coarse-grained component re-renders that re-execute entire virtual DOM render functions just to change a single time string.

### 1.2 Proposed API
Introduce an opt-in static helper `Tempo.live()` (or `Tempo.clock()`):

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { Signify } from '@magmacomputing/tempo/library';

// Returns a ReadonlySignal<Tempo> ticking at specified frequency
const currentSecond = Tempo.live({ interval: 1000 }); // ticks every second
const currentMinute = Tempo.live({ interval: '1m' });  // ticks on minute boundaries

// Modern signal-aware UI renders only the leaf DOM node:
const displayTime = Signify.computed(() => currentSecond.get().format('HH:mm:ss'));
```

### 1.3 Implementation Mechanics
- Implemented as a lazy, reference-counted `Signify.State<Tempo>`.
- The internal timer is activated only when the signal has active subscribers (via `Signal.subtle.Watcher`) and stops immediately when all subscribers disconnect.
- Implements `[Symbol.dispose]()` for explicit cleanup (`using clock = Tempo.live()`).
- Co-exists with [`Finalizer`](file:///home/michael/Project/magma/packages/library/src/common/runtime/finalizer.class.ts) to eliminate lingering background timers if consumer scope drops without explicit disposal.

### 1.4 Trade-offs & Assessment
- **Pros**: Zero boilerplate for application developers; sub-tree DOM isolation in modern UI frameworks; automatic timer sleep when disconnected.
- **Cons**: Adds a small timer scheduling utility to core (unless placed in an extension barrel or duration/schedule submodule).
- **Complexity**: Low.
- **Priority**: **High** (immediate user-facing benefit).

---

## Proposal 2: Adaptive Relative Time Formatting (`tempo.toRelativeSignal()`)

### 1.1 Motivation & Problem Statement
Formatting dates relative to the present moment (`tempo.since()`, `"just now"`, `"5 minutes ago"`, `"in 2 hours"`) is one of the most common requirements in modern web development.

However, relative time has **dynamic precision requirements**:
- An event $< 60$ seconds ago needs updates every second.
- An event 10 minutes ago only changes its displayed string once every 60 seconds.
- An event 5 hours ago only changes once every hour.
- An event 3 days ago only changes once every 24 hours.

Naive implementations poll eagerly every 1,000ms regardless of distance, wasting CPU cycles and mobile battery life.

### 1.2 Proposed API
Add `.toRelativeSignal()` on [`Tempo.prototype`](file:///home/michael/Project/magma/packages/tempo/src/tempo.class.ts) or within the Duration module:

```typescript
const postDate = new Tempo('2026-10-25T14:00:00Z');

// Returns a ReadonlySignal<string> that dynamically re-evaluates
const timeAgo = postDate.toRelativeSignal({
  style: 'narrow',     // Intl.RelativeTimeFormat style
  numeric: 'auto'     // "yesterday" vs "1 day ago"
});

console.log(timeAgo.get()); // "5 minutes ago"
```

### 1.3 Implementation Mechanics (Adaptive Scheduling)
Instead of a fixed interval timer, the signal inspects the duration between `tempo` and the current moment to calculate the exact millisecond delay until the output string transitions to the next bucket:
```
Δt < 60s  ──► schedule tick at next second boundary
Δt < 1hr  ──► schedule tick at next minute boundary
Δt < 24hr ──► schedule tick at next hour boundary
Δt >= 24hr ─► schedule tick at next midnight boundary
```
When the scheduled timeout fires, the internal state updates, notifying computed subscribers, and the next boundary is dynamically calculated.

### 1.4 Trade-offs & Assessment
- **Pros**: Maximum possible energy and CPU efficiency for live feeds, comments, and dashboards; perfect accuracy with zero polling drift.
- **Cons**: Requires coupling relative duration formatting with a dynamic timeout scheduler.
- **Complexity**: Medium.
- **Priority**: **High** (differentiator for Tempo in UI ecosystems).

---

## Proposal 3: Dynamic Interval & Range State Observation (`Interval.prototype.toSignal()`)

### 1.1 Motivation & Problem Statement
[`Interval`](file:///home/michael/Project/magma/packages/tempo/src/interval.index.ts#L5) in [`packages/library/src/common/scheduling/interval.class.ts`](file:///home/michael/Project/magma/packages/library/src/common/scheduling/interval.class.ts) provides set operations (`contains`, `overlaps`, `abuts`, `intersection`, `union`) over static temporal boundaries `[start, end]`.

In real-world applications (booking systems, live broadcast streams, meeting indicators, shift tracking), developers need to know:
- "Is this meeting happening right now?"
- "Has this discount period ended?"
- "What percentage of this webinar has elapsed?"

Currently, developers must write bespoke polling loops to repeatedly call `interval.contains(Tempo.now())`.

### 1.2 Proposed API
Expose `.toSignal()` on [`Interval`](file:///home/michael/Project/magma/packages/library/src/common/scheduling/interval.class.ts#L23):

```typescript
const meeting = new Tempo.Interval(meetingStart, meetingEnd);
const status = meeting.toSignal();

// Individual reactive signals:
status.isCurrent; // ReadonlySignal<boolean> (true while meeting is ongoing)
status.isPast;    // ReadonlySignal<boolean> (switches to true at meetingEnd)
status.isFuture;  // ReadonlySignal<boolean> (switches to false at meetingStart)
status.progress;  // ReadonlySignal<number>  (0.0 -> 1.0 continuously while active)
```

### 1.3 Implementation Mechanics
- `isCurrent`, `isPast`, and `isFuture` do **not** poll continuously.
- The signal schedules exact, one-shot timeouts for `meetingStart` and `meetingEnd`.
- When `meetingStart` arrives, `isFuture` flips to `false` and `isCurrent` flips to `true` with zero intermediate timer overhead.
- `progress` can bind to a configurable animation frame or second ticker only while `isCurrent` is `true`.

### 1.4 Trade-offs & Assessment
- **Pros**: Event-driven boundary transitions without polling; natural fit for scheduling and calendaring.
- **Cons**: Requires active timer handles when signals are observed.
- **Complexity**: Low-Medium.
- **Priority**: **Medium** (high utility for enterprise, booking, and calendar applications).

---

## Proposal 4: Reactive Global Configuration (`Tempo.locale`, `Tempo.timeZone`)

### 1.1 Motivation & Problem Statement
In multi-lingual or global applications, user preferences (active locale or active timeZone) change at runtime (e.g. user toggles a language switcher or travels across time zones).

Currently, Tempo's global configuration (`_global` in [`tempo.class.ts`](file:///home/michael/Project/magma/packages/tempo/src/tempo.class.ts#L81)) is updated imperatively. Any existing UI component displaying a formatted date must be explicitly re-rendered or refreshed through application-level state wrappers.

### 1.2 Proposed API
Expose `Tempo.locale` and `Tempo.timeZone` as reactive `Signify.State<string>` signals:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { Storage, Signify } from '@magmacomputing/tempo/library';

// Direct two-way binding with persistent storage!
Tempo.locale = Storage.toSignal('app_locale', 'en-US');

// Any computed format automatically invalidates and re-derives
const eventLabel = Signify.computed(() => eventDate.format('medium'));

// Changing locale immediately updates eventLabel across the entire application:
Tempo.locale.set('fr-FR');
console.log(eventLabel.get()); // Automatically rendered in French!
```

### 1.3 Implementation Mechanics
- Formatting methods ([`module.format.ts`](file:///home/michael/Project/magma/packages/tempo/src/module/module.format.ts)) and internationalization helpers ([`international.library.ts`](file:///home/michael/Project/magma/packages/library/src/common/runtime/international.library.ts)) check `Tempo.locale.get()` when resolving formatters if no instance-level override is passed.
- Standard TC39 dependency tracking automatically registers the active format call as a subscriber to the locale signal.

### 1.4 Trade-offs & Assessment
- **Pros**: Effortless, global internationalization reactivity; zero glue code for multi-language apps; direct synergy with `Storage.toSignal()`.
- **Cons**: Reads to global locale in format loops register dependency tracking if invoked within an active `Signify.computed()`.
- **Complexity**: Low.
- **Priority**: **Medium-High**.

---

## Proposal 5: Lazy Cache Invalidation for Pattern & Layout Compilers

### 1.1 Motivation & Problem Statement
Tempo contains internal regex compilation and token layout optimization pipelines in [`PatternCompiler`](file:///home/michael/Project/magma/packages/tempo/src/engine/engine.pattern.ts#L25) and [`engine.layout.ts`](file:///home/michael/Project/magma/packages/tempo/src/engine/engine.layout.ts).

Currently, cache invalidation when new terms, plugins, or aliases are registered is handled via imperative event buses ([`registryReset()`](file:///home/michael/Project/magma/packages/tempo/src/tempo.index.ts#L40), [`onRegistryReset()`](file:///home/michael/Project/magma/packages/tempo/src/tempo.index.ts#L31)), which aggressively flush cache maps.

### 1.2 Proposed Architecture
Model internal compiler invalidation using a reactive dependency graph:
- An internal `#registryEpoch = new Signify.State(0)`.
- Parsers, layout order resolvers, and regex compilers are wrapped in `Signify.computed()`, reading `#registryEpoch.get()`.
- Dynamic registration (`Tempo.use()`, `registerTerm()`) increments `#registryEpoch.set(epoch + 1)`.

### 1.3 Evaluation & Finding
- **Finding**: While elegant in theory, internal micro-benchmarks indicate that `WeakCache` and standard `Map` caches in `PatternCompiler` already execute in nanoseconds ($< 5\text{ns}$). Introducing Signal graph nodes inside high-frequency compiler lookups adds unnecessary bookkeeping overhead without measurable throughput gains.
- **Recommendation**: **Do not adopt for internal compiler caches**. Keep the existing imperative [`WeakCache`](file:///home/michael/Project/magma/packages/library/src/common/runtime/weakcache.class.ts) and epoch-clearing pattern for compiler internals. Reserve Signals for user-facing continuous state.

---

## Proposal 6: Unified Stream $\to$ Signal Projection for Ecosystem Plugins

### 1.1 Motivation & Problem Statement
Tempo ecosystem features (such as `@magmacomputing/tempo-plugin-ticker` or `@magmacomputing/tempo-plugin-sync`) emit time events via [`Reactive<Tempo>`](file:///home/michael/Project/magma/packages/library/src/common/runtime/reactive.class.ts). 

Asynchronous streams are ideal for pipelines, queueing, and `for await` loops, but cannot be read synchronously inside UI component template render functions.

### 1.2 Proposed API
Because we already implemented `.toSignal()` and `.signal` on [`Reactive<T>`](file:///home/michael/Project/magma/packages/library/src/common/runtime/reactive.class.ts#L614), plugin instances can immediately expose `.toSignal()`:

```typescript
const ticker = Tempo.ticker('1s');

// Project the async stream into a synchronous reactive signal:
const clock = ticker.toSignal(Tempo.now());

// Read synchronously in UI rendering loop:
console.log(clock.get().format('HH:mm:ss'));
```

### 1.3 Implementation Mechanics
- `ticker.toSignal()` calls `this.#reactive.toSignal(initialValue)`.
- When the ticker stops or is disposed, the signal watcher unbinds cleanly.

### 1.4 Trade-offs & Assessment
- **Pros**: Zero architectural friction between streaming background workers/tickers and UI render trees. Already supported by `#library`'s `Reactive.toSignal()`!
- **Cons**: None; it is purely additive and leverages existing primitives.
- **Complexity**: Very Low (mostly typing and forwarding).
- **Priority**: **High**.

---

## 2. Anti-Patterns: Where Signals MUST NOT Be Used in Core Tempo

To preserve Tempo's high performance and architectural integrity, the following boundaries must remain inviolable:

| Anti-Pattern | Why It Must Be Avoided |
| :--- | :--- |
| **Reactive Instance Getters**<br>(e.g. `tempo.year` as a signal) | `Tempo` instances are **immutable value objects** decorated with [`@Immutable`](file:///home/michael/Project/magma/packages/tempo/src/tempo.class.ts#L99) and [`@Serializable`](file:///home/michael/Project/magma/packages/tempo/src/tempo.class.ts#L98). Wrapping temporal getters in Signals would increase heap allocation by $>10\times$ per instance and destroy immutability guarantees. |
| **Dependency Graphs in Arithmetic Hot Paths**<br>(e.g. `tempo.add()`, `tempo.diff()`) | Date/time math is a compute-bound micro-operation executed millions of times per second in batch operations. Dependency tracking graphs must never sit on these hot execution paths. |
| **Forced Mandatory Reactivity in Core Bundle** | Core Tempo must remain tree-shakeable and lightweight for backend/CLI users who only need static parsing and formatting. Reactive utilities must be cleanly modularized. |

---

## 3. Proposal Summary & Evaluation Matrix

| Proposal | Target Area | Value / Impact | Complexity | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **1. `Tempo.live()`** | Static Core / Clock API | **High** (Solves UI timer boilerplate) | Low | **Adopt** |
| **2. `tempo.toRelativeSignal()`** | Duration Module / Shorthand | **High** (Adaptive battery-saving updates) | Medium | **Adopt** |
| **3. `Interval.toSignal()`** | `Interval` Scheduling | **Medium** (Active session & booking tracking) | Low-Medium | **Adopt** |
| **4. `Tempo.locale` Signal** | Configuration / Intl | **Medium-High** (Effortless app-wide re-renders) | Low | **Adopt** |
| **5. Compiler DAG Invalidation** | Internal Engine | **Low** (Adds overhead to fast lookups) | Medium | **Reject** (Retain `WeakCache`) |
| **6. Stream $\to$ Signal Projection** | Ticker / Plugin SDK | **High** (Bridges async streams to UI templates) | Very Low | **Adopt** (Already built in `#library`) |

---

## 4. Next Steps for Consideration

We can review and decide on each proposal individually:
1. **Approve / Defer Proposal 1 (`Tempo.live()`)**: Determine whether live clocks belong in Core Tempo or `@magmacomputing/tempo-plugin-ticker`.
2. **Approve / Defer Proposal 2 (`toRelativeSignal()`)**: Evaluate API naming (`toRelativeSignal()` vs. `toSignal({ relative: true })`).
3. **Approve / Defer Proposal 3 (`Interval.toSignal()`)**: Evaluate desired properties (`isCurrent`, `isPast`, `isFuture`, `progress`).
4. **Approve / Defer Proposal 4 (`Tempo.locale`)**: Confirm if `_global` configuration should be reactive by default.
