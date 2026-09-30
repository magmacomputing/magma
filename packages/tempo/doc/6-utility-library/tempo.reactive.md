# Reactive: High-Performance Push/Pull Streams

`Reactive<T>` is a modern, lightweight asynchronous stream primitive built into the Tempo Utility Library. It bridges the gap between push-based event listeners and pull-based async iterators without the overhead of heavy third-party reactive extensions.

<br>

## 1. Core Concepts: Push/Pull Duality

Unlike standard `EventEmitter` (push-only) or `AsyncGenerator` (pull-only), `Reactive<T>` operates seamlessly in both directions:

* **Producer Push (`stream.push(value)`)**: Dispatches the next value to a single pending pull waiter or buffers for future consumers.
* **Producer Cast (`stream.cast(value)`)**: Multicasts the value to **all** concurrent pull waiters and push listeners simultaneously (fan-out).
* **Consumer Pull (`await stream.pull()`)**: Pulls the next available value directly as `Promise<T | undefined>`, eliminating `{ value, done }` unwrapping boilerplate.
* **Consumer Push (`stream.on('data', listener)`)**: Subscribes callback listeners for event-driven workflows.
* **Consumer Iteration (`for await (const item of stream)`)**: Native ES2018 iteration with backpressure buffering and zero lost items.

```typescript
import { Reactive } from '@magmacomputing/tempo/library';

// Create a typed reactive stream
const stream = new Reactive<string>({ tag: 'TaskStream' });

// Producer pushes data
stream.push('First Event');
stream.cast('Broadcast Event'); // Casts to all active pull waiters and listeners

// Consumer pulls data directly
const first = await stream.pull();  // 'First Event'
const second = await stream.pull(); // 'Broadcast Event'
```

<br>

## 2. Push-Based Event Subscriptions

Register event listeners using familiar `on()`, `once()`, and `off()` methods.

```typescript
// Register data listener with early-stop capability
stream.on('data', (item, stop) => {
  console.log('Received:', item);
  if (item === 'HALT') stop(); // Completes the stream
});

// Register error or completion listeners
stream.on('error', (err) => console.error('Stream error:', err));
stream.on('end', () => console.log('Stream completed'));
```

### Deterministic Disposal with `using`

`stream.on()` returns a disposable `Reactive.Subscription` object conforming to the TC39 Explicit Resource Management standard:

```typescript
{
  using sub = stream.on('data', (data) => {
    console.log('Scoped data:', data);
  });
  
  // When execution leaves this scope, sub[Symbol.dispose]() is called automatically
}
```

You can also unsubscribe manually at any time via `sub.unsubscribe()` or `sub[Symbol.dispose]()`.

<br>

## 3. Pull-Based Async Iteration

`Reactive<T>` implements `AsyncIterable<T>`, making it natively consumable with `for await`:

```typescript
async function processEvents(stream: Reactive<number>) {
  for await (const value of stream) {
    console.log('Processing:', value);
  }
  console.log('All events processed!');
}
```

<br>

## 4. Stream Truncation with `.until()`

Easily terminate or gate a stream using an `AbortSignal`, a `Promise`, or another `Reactive` stream:

```typescript
const controller = new AbortController();
const boundedStream = stream.until(controller.signal);

// Or bound by another reactive event:
const stopper = new Reactive<void>();
const gated = stream.until(stopper);

// When stopper.push() or controller.abort() fires, gated stream cleanly completes
```

<br>

## 5. Resource Management & GC Safety

`Reactive<T>` implements both `Disposable` and `AsyncDisposable`:

```typescript
{
  using managedStream = new Reactive<number>();
  // Producer and consumer operations...
  // Stream is automatically completed upon block exit
}
```

### Automatic Finalization
Backed by `Finalizer`, any unclosed reactive stream that is dropped and garbage-collected will automatically settle pending promise waiters and tear down internal buffers, preventing orphaned promises and memory leaks.

<br>

## 6. Static Factory Methods

Convert existing collections, promises, or async iterables into reactive streams using `Reactive.from()`:

```typescript
// From an array
const streamFromArray = Reactive.from(['alpha', 'beta', 'gamma']);

// From an async iterable or Promise
const streamFromPromise = Reactive.from(fetchDataAsync());
```

<br>

## 7. Stream State Inspection

Inspect stream statistics and runtime status via `stream.state`:

```typescript
console.log(stream.state);
// {
//   tag: 'TaskStream',
//   active: true,
//   completed: false,
//   emitted: 42,
//   subscribers: 2,
//   queued: 0,
//   buffered: 0
// }
```
