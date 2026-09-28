# Resource Management & Lifecycle

Because Ticker execution loops are driven by asynchronous background timers (`setTimeout` / `setImmediate`), proper resource management is essential for preventing memory leaks, test suite hangs, and unhandled timer handles.

---

## 1. Explicit Resource Management (`using` & `await using`)

Tempo Ticker implements the standard TypeScript 5.2+ / ECMAScript Explicit Resource Management protocol (`Symbol.dispose` and `Symbol.asyncDispose`).

### Synchronous Disposer (`using`)
Ideal for callback-driven Tickers. The timer is automatically cleared the moment execution exits the block:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import '@magmacomputing/tempo-plugin-ticker/install';

{
  using ticker = Tempo.ticker(1, (t) => {
    updateUI(t);
  });

  // Perform operations within block...
} // ⚡ Ticker is automatically stopped and timers cleared here
```

### Asynchronous Disposer (`await using`)
Ideal for `for await` streaming loops:

```typescript
{
  await using stream = Tempo.ticker({ seconds: 1 });

  for await (const t of stream) {
    console.log('Pulse:', t.format('{hh}:{mi}:{ss}'));
    if (shouldStop) break; // Exiting loop automatically disposes the ticker
  }
} // ⚡ Generator finalized and timer unreferenced
```

---

## 2. Async Generator Streaming (`for await ... of`)

Every Ticker instance implements `Symbol.asyncIterator`, allowing you to consume pulses as a first-class async stream:

```typescript
const ticker = Tempo.ticker({ seconds: 2 });

async function processStream() {
  for await (const t of ticker) {
    console.log(`Stream tick: ${t.iso}`);
  }
}
```

When you `break` from a `for await` loop or call `ticker.stop()`, pending promises are immediately resolved, allowing the loop to exit cleanly without dangling promises.

---

## 3. Programmatic Lifecycle Controls

If you are managing long-lived tickers across components, you can use the object's control methods:

```typescript
const ticker = Tempo.ticker({ seconds: 1 });

// 1. Check live status and telemetry
console.log(ticker.info);
// { next: Tempo, ticks: 0, limit: undefined, interval: { seconds: 1 }, stopped: false }

// 2. Manually advance or trigger a pulse (e.g., from a user UI event)
ticker.pulse();

// 3. Stop execution and tear down timers
ticker.stop();
console.log(ticker.info.stopped); // true
```

---

## 4. Bounded Termination Conditions

Prevent runaway processes by defining built-in stopping criteria:

### A. Pulse Count Limit (`limit`)
Stops automatically after emitting $N$ pulses:

```typescript
// Stops after exactly 5 pulses
using ticker = Tempo.ticker({ seconds: 1, limit: 5 }, (t) => {
  console.log(`Pulse #${t.info?.ticks}`);
});

// Immediate zero-execution limit (strictly honored without pulsing)
using zeroTicker = Tempo.ticker({ limit: 0 }, (t) => console.log(t));
```

### B. Stop Boundary (`until`)
Stops when simulated or wall-clock time reaches an upper boundary (inclusive):

```typescript
using boundedTicker = Tempo.ticker({
  seconds: 10,
  seed: '2026-12-25T10:00:00Z',
  until: '2026-12-25T12:00:00Z' // Ceases when reaching 12:00:00
}, (t) => {
  console.log(t.format('{hh}:{mi}'));
});
```

---

## 5. 🧟 Avoiding "Zombie Tickers"

In a Node.js runtime, active timers (`setTimeout`) keep the event loop alive. An unstopped Ticker is a **"Zombie Ticker"** that continues to run indefinitely in the background.

### Operational Risks:
- **Process Hangs**: Node.js will not exit after test runs if background timers remain active.
- **Flaky Tests**: Leaked timers in one test can fire during subsequent tests, causing race conditions and unexpected state mutations.
- **Memory Leaks**: Tickers hold closures over callbacks, preventing garbage collection of attached data.

### Best-Practice Remediation:

```typescript
// ✅ BEST: Use 'using' or 'await using'
{
  using ticker = Tempo.ticker(1, (t) => { ... });
}

// ✅ GOOD: Use try...finally when capturing variables across test scopes
let ticker;
try {
  ticker = Tempo.ticker(1, (t) => { ... });
  // Test assertions...
} finally {
  ticker?.stop(); // Guarantees cleanup even if assertions throw
}
```

> [!CAUTION]
> Avoid raw `let ticker = Tempo.ticker(...)` without a `finally` block or `using` keyword in unit tests. If an `expect()` assertion throws, the `ticker.stop()` call will be bypassed, leaking a live timer into subsequent tests.
