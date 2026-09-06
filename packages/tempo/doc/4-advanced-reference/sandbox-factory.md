# Sandbox Factory Pattern

Tempo v2.5.0 introduces the **Sandbox Factory** pattern, allowing for deep isolation of configurations and parsing rules. This is particularly useful in complex applications where different modules may require different date-time aliases or behaviors without polluting the global `Tempo` namespace.

## The Problem
Historically, `Tempo.init()` modified the global library state. This meant that:
1. Only one set of custom `Event` or `Period` aliases could exist.
2. Large applications or libraries using Tempo internally would step on each other's configurations.
3. Testing multiple configurations required careful cleanup between tests.

## The Solution
`Tempo.create()` returns a **derived sandboxed class** with its own isolated configuration, registry, and plugin state. Each sandbox inherits from the caller, but runs with independent internal state.

### Lifecycle Methods
To understand when to use `Tempo.create()`, it helps to contrast it with the other initialization methods:

- **`Tempo.init({ options })`**
  **Concept:** Hard-reset to "out-of-the-box" factory defaults, then apply the provided configuration globally. All previous plugins, terms, and custom formats are purged.
- **`Tempo.use({ options })`**
  **Concept:** Additive mutation. Keep all existing global settings, plugins, and formats intact, but merge in new configurations.
- **`Tempo.create({ options })` / `Tempo.create(fn)` / `Tempo.create(options, fn)`**
  **Concept:** Sandbox Factory. Clone the current global state (inheriting all currently loaded plugins and settings), but branch it off into a brand new, isolated class. Any future changes made to this Sandbox will not affect the global `Tempo`, and vice-versa. Supports both long-lived derived class creation and ephemeral scoped callback execution with deterministic resource disposal.

### Overloaded Signatures & Usage Modes

`Tempo.create` supports three distinct execution patterns tailored for different application lifecycles:

```typescript
// 1. Derived Class Factory (Long-lived sandbox)
static create(options?: Options): typeof Tempo;

// 2. Scoped Callback Mode (Ephemeral auto-disposed sandbox)
static create<R>(fn: (sandbox: typeof Tempo) => R): R;

// 3. Configured Scoped Callback Mode (Custom options + auto-disposed sandbox)
static create<R>(options: Options, fn: (sandbox: typeof Tempo) => R): R;
```

#### Mode 1: Derived Class Factory
Use this mode when building long-lived domain services, multi-tenant app routers, or dedicated modules requiring custom configurations:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { FinancePlugin } from '@magmacomputing/tempo-plugin-finance';

// Create a specialized Sandbox for a Financial app
const FinTempo = Tempo.create({
  plugins: [FinancePlugin],
  pluginOptions: {
    finance: { fiscalYearStart: 7 } // July fiscal year
  },
  registry: {
    periods: {
      'market-open': '09:30',
      'market-close': '16:00'
    }
  }
});

// Standard Tempo remains untouched
const t1 = new Tempo('market-open'); // Error: Unknown alias
const t2 = new FinTempo('market-open'); // Success: 09:30
```

#### Mode 2: Scoped Callback Execution (`Tempo.create(fn)`)
For unit tests, request-scoped operations, or short-lived calculations, pass an execution callback. `Tempo.create` invokes your callback with a freshly isolated sandbox and **automatically disposes of it** when the function completes:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { AstroPlugin } from '@magmacomputing/tempo-plugin-astro';

// Synchronous callback: automatically disposed on return
const season = Tempo.create((sb) => {
  sb.use(AstroPlugin);
  return sb('2026-06-21').term.astronomy.season;
});

// Asynchronous callback: automatically disposed when the Promise settles
const result = await Tempo.create({ timeZone: 'Pacific/Auckland' }, async (sb) => {
  const data = await fetchFlightDeparture();
  return sb(data.departureTime).format('{full}');
});
```

#### Mode 3: Explicit Resource Management (`using`)
Sandboxed classes created via `Tempo.create()` implement the TC39 `Disposable` protocol (`Symbol.dispose`). In TypeScript 5.2+ and modern JavaScript runtimes supporting the `using` keyword, sandboxes can be scoped deterministically to code blocks:

```typescript
import { Tempo } from '@magmacomputing/tempo';
import { CustomPlugin } from './custom-plugin.js';

{
  using sb = Tempo.create({ discovery: 'ephemeral-batch' });
  sb.use(CustomPlugin);

  const formatted = sb('2026-05-10').format();
  console.log(formatted);
} // sb is automatically disposed here as execution leaves block scope!
```

### Deterministic Disposal & Memory Management

Every sandbox class exposes lifecycle disposal mechanisms to prevent memory leaks in high-turnover server environments:

- **`sb[Symbol.dispose]()`**: Purges the sandbox from internal state registries (`ClassStates`) and deletes the registered discovery symbol slot from `globalThis`.
- **`sb.isDisposed`**: Readonly boolean getter indicating whether the sandbox has been cleaned up.

```typescript
const sb = Tempo.create();
console.log(sb.isDisposed); // false

// Explicitly clean up when finished
sb[Symbol.dispose]();
console.log(sb.isDisposed); // true
```

## Traceability & Collision Management
When using sandboxes, it's important to know which configuration resolved an input. Tempo now records the **source** of every match in the `parse.result` array.

### Hierarchy of Resolution
When a conflict occurs (e.g., you redefine "noon"), Tempo resolves it by checking layers from **highest priority to lowest priority**:
1. **Local (Instance)**: Options passed to `new Tempo(val, options)`.
2. **Sandbox (Factory)**: Options passed to `Tempo.create(options)`.
3. **Plugins**: Aliases registered via `Tempo.use()`.
4. **Global Defaults**: Built-in aliases like "xmas", "midnight", etc.

### Checking the Trace
You can inspect the `parse.result` to see exactly which layer provided the definition:

```typescript
const t = new FinTempo('market-open');
console.log(t.parse.result);
/*
[
  {
    type: "Period",
    value: "market-open",
    source: "sandbox", // Resolved from FinTempo (factory/sandbox layer)
    match: "tm",
    ...
  }
]
*/
```

## Immutability & Security
Sandboxed classes created via `Tempo.create()` are protected by the same `@Immutable` and `@Serializable` decorators as the base class.
- The Sandbox class itself is hardened against static member modification.
- Instances of the Sandbox are frozen upon construction.
- The internal state is stored in a `WeakMap`, inaccessible to external code.

## Best Practices
1. **Create Once**: Create your application-specific Sandbox once and export it as your primary entry point.
2. **Prefer Sandboxes for Custom Aliases**: Avoid modifying the base `Tempo` class if your app is intended to be used as a library.
3. **Use Debug Mode**: When developing new aliases, set `debug: 'debug'` to receive console warnings about naming collisions.
